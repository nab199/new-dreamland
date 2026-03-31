import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { apiService } from '../services/api';
import { offlineCache } from '../services/offlineCache';
import { ExamSchedule } from '../types';

export default function ExamScheduleScreen() {
  const [exams, setExams] = useState<ExamSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'upcoming' | 'past'>('all');

  useEffect(() => {
    loadExams();
  }, []);

  const loadExams = async () => {
    try {
      // Try cache first
      const cached = await offlineCache.getCachedExamSchedule();
      if (cached) {
        setExams(cached);
      }

      const response = await apiService.getExamSchedule();
      if (response.data) {
        setExams(response.data);
        await offlineCache.cacheExamSchedule(response.data);
      }
    } catch (error) {
      console.error('Error loading exam schedule:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadExams();
  };

  const filterExams = () => {
    const now = new Date();
    
    if (selectedFilter === 'upcoming') {
      return exams.filter(exam => new Date(exam.exam_date) >= now);
    } else if (selectedFilter === 'past') {
      return exams.filter(exam => new Date(exam.exam_date) < now);
    }
    return exams;
  };

  const getDaysUntilExam = (examDate: string): number => {
    const exam = new Date(examDate);
    const now = new Date();
    const diffTime = exam.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    const date = new Date(`2000-01-01 ${timeString}`);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredExams = filterExams();

  // Group exams by date
  const groupedExams = filteredExams.reduce((acc, exam) => {
    const dateKey = exam.exam_date.split('T')[0] || exam.exam_date;
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(exam);
    return acc;
  }, {} as Record<string, ExamSchedule[]>);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Exam Schedule</Text>
          <Text style={styles.headerSubtitle}>
            {filteredExams.length} exam{filteredExams.length !== 1 ? 's' : ''} scheduled
          </Text>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterTab, selectedFilter === 'all' && styles.filterTabActive]}
            onPress={() => setSelectedFilter('all')}
          >
            <Text
              style={[
                styles.filterTabText,
                selectedFilter === 'all' && styles.filterTabTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, selectedFilter === 'upcoming' && styles.filterTabActive]}
            onPress={() => setSelectedFilter('upcoming')}
          >
            <Text
              style={[
                styles.filterTabText,
                selectedFilter === 'upcoming' && styles.filterTabTextActive,
              ]}
            >
              Upcoming
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, selectedFilter === 'past' && styles.filterTabActive]}
            onPress={() => setSelectedFilter('past')}
          >
            <Text
              style={[
                styles.filterTabText,
                selectedFilter === 'past' && styles.filterTabTextActive,
              ]}
            >
              Past
            </Text>
          </TouchableOpacity>
        </View>

        {filteredExams.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No exams found</Text>
          </View>
        ) : (
          Object.entries(groupedExams).map(([date, dateExams]) => {
            const daysUntil = getDaysUntilExam(date);
            const isToday = daysUntil === 0;
            const isPast = daysUntil < 0;

            return (
              <View key={date} style={styles.dateGroup}>
                <View
                  style={[
                    styles.dateHeader,
                    isToday && styles.dateHeaderToday,
                    isPast && styles.dateHeaderPast,
                  ]}
                >
                  <Text style={styles.dateHeaderText}>
                    {formatDate(date)}
                    {isToday && ' • Today'}
                    {isPast && ' • Completed'}
                    {!isToday && !isPast && ` • ${daysUntil} day${daysUntil !== 1 ? 's' : ''} left`}
                  </Text>
                </View>

                {dateExams.map((exam) => (
                  <View key={exam.id} style={styles.examCard}>
                    <View style={styles.examHeader}>
                      <View style={styles.examCodeContainer}>
                        <Text style={styles.examCode}>{exam.course_code}</Text>
                      </View>
                      <View style={styles.seatBadge}>
                        <Text style={styles.seatLabel}>Seat</Text>
                        <Text style={styles.seatNumber}>{exam.seat_number}</Text>
                      </View>
                    </View>

                    <Text style={styles.examTitle}>{exam.course_title}</Text>

                    <View style={styles.examDetails}>
                      <View style={styles.examDetailItem}>
                        <Text style={styles.examDetailIcon}>🕐</Text>
                        <Text style={styles.examDetailText}>{formatTime(exam.exam_time)}</Text>
                      </View>
                      <View style={styles.examDetailItem}>
                        <Text style={styles.examDetailIcon}>📍</Text>
                        <Text style={styles.examDetailText}>{exam.room}</Text>
                      </View>
                    </View>

                    {!isPast && (
                      <View style={styles.reminderBanner}>
                        <Text style={styles.reminderText}>
                          📌 Arrive 30 minutes early with your Digital ID
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            );
          })
        )}

        <View style={styles.infoBox}>
          <Text style={styles.infoBoxTitle}>📋 Exam Guidelines</Text>
          <Text style={styles.infoBoxText}>
            • Bring your Digital ID card (shown in the app){'\n'}
            • Arrive at least 30 minutes before exam time{'\n'}
            • Check your seat number before entering the hall{'\n'}
            • No electronic devices allowed in exam hall{'\n'}
            • Follow all invigilator instructions
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  header: {
    backgroundColor: '#059669',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.8,
    marginTop: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#059669',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  emptyState: {
    margin: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 16,
  },
  dateGroup: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  dateHeader: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  dateHeaderToday: {
    backgroundColor: '#ECFDF5',
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
  },
  dateHeaderPast: {
    backgroundColor: '#F9FAFB',
    opacity: 0.7,
  },
  dateHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  examCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  examHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  examCodeContainer: {
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  examCode: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  seatBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
  },
  seatLabel: {
    fontSize: 10,
    color: '#92400E',
    fontWeight: '500',
  },
  seatNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400E',
  },
  examTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  examDetails: {
    flexDirection: 'row',
    gap: 20,
  },
  examDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  examDetailIcon: {
    fontSize: 16,
  },
  examDetailText: {
    fontSize: 14,
    color: '#6B7280',
  },
  reminderBanner: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 12,
  },
  reminderText: {
    fontSize: 12,
    color: '#1D4ED8',
    fontWeight: '500',
  },
  infoBox: {
    margin: 16,
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#059669',
  },
  infoBoxTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 8,
  },
  infoBoxText: {
    fontSize: 13,
    color: '#047857',
    lineHeight: 22,
  },
});
