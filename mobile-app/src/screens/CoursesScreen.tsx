import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { offlineCache } from '../services/offlineCache';
import { Course, Enrollment } from '../types';

export default function CoursesScreen() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<(Course & { enrollment?: Enrollment })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      // Try cache first
      const cached = await offlineCache.getCachedCourses();
      if (cached) {
        setCourses(cached);
      }

      const response = await apiService.getMyCourses();
      if (response.data) {
        setCourses(response.data);
        await offlineCache.cacheCourses(response.data);
      }
    } catch (error) {
      console.error('Error loading courses:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadCourses();
  };

  const getGradeColor = (grade?: string) => {
    if (!grade) return '#6B7280';
    const gradeValue = parseFloat(grade);
    if (gradeValue >= 90) return '#059669';
    if (gradeValue >= 80) return '#10B981';
    if (gradeValue >= 70) return '#F59E0B';
    if (gradeValue >= 60) return '#F97316';
    return '#DC2626';
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Courses</Text>
        <Text style={styles.headerSubtitle}>
          {courses.length} course{courses.length !== 1 ? 's' : ''} enrolled
        </Text>
      </View>

      {courses.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No courses found</Text>
          <Text style={styles.emptySubtext}>
            You haven't enrolled in any courses yet.
          </Text>
        </View>
      ) : (
        <View style={styles.coursesList}>
          {courses.map((course, index) => (
            <TouchableOpacity key={course.id} style={styles.courseCard}>
              <View style={styles.courseHeader}>
                <View style={styles.courseCodeBadge}>
                  <Text style={styles.courseCode}>{course.code}</Text>
                </View>
                <Text style={styles.courseCredits}>{course.credits} Credits</Text>
              </View>

              <Text style={styles.courseTitle}>{course.title}</Text>

              {course.program && (
                <Text style={styles.courseProgram}>{course.program}</Text>
              )}

              {course.enrollment?.grade && (
                <View style={styles.gradeContainer}>
                  <Text style={styles.gradeLabel}>Current Grade:</Text>
                  <View
                    style={[
                      styles.gradeBadge,
                      { backgroundColor: getGradeColor(course.enrollment.grade) },
                    ]}
                  >
                    <Text style={styles.gradeValue}>{course.enrollment.grade}%</Text>
                  </View>
                </View>
              )}

              <View style={styles.courseFooter}>
                <View style={styles.statusIndicator}>
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor:
                          course.enrollment?.status === 'completed'
                            ? '#059669'
                            : '#0284C7',
                      },
                    ]}
                  />
                  <Text style={styles.statusText}>
                    {course.enrollment?.status === 'completed'
                      ? 'Completed'
                      : 'In Progress'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.infoBox}>
        <Text style={styles.infoBoxTitle}>📖 Course Tips</Text>
        <Text style={styles.infoBoxText}>
          • Check assignments regularly for new submissions{'\n'}
          • Attend all scheduled lectures and labs{'\n'}
          • Contact your instructor for any clarifications{'\n'}
          • Review course materials before exams
        </Text>
      </View>
    </ScrollView>
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
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#9CA3AF',
    fontSize: 14,
    textAlign: 'center',
  },
  coursesList: {
    padding: 16,
  },
  courseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  courseCodeBadge: {
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  courseCode: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  courseCredits: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  courseProgram: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  gradeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  gradeLabel: {
    fontSize: 13,
    color: '#6B7280',
  },
  gradeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  gradeValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  courseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#6B7280',
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
