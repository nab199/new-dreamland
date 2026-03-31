import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { offlineCache } from '../services/offlineCache';
import { Announcement } from '../types';

export default function HomeScreen() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [stats, setStats] = useState({
    courses: 0,
    assignments: 0,
    pendingPayments: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    try {
      // Load announcements
      const cachedAnnouncements = await offlineCache.getCachedAnnouncements();
      if (cachedAnnouncements) {
        setAnnouncements(cachedAnnouncements);
      }

      const [announcementsRes, coursesRes, assignmentsRes] = await Promise.all([
        apiService.getAnnouncements(),
        apiService.getMyCourses(),
        apiService.getAssignments(),
      ]);

      if (announcementsRes.data) {
        setAnnouncements(announcementsRes.data);
        await offlineCache.cacheAnnouncements(announcementsRes.data);
      }

      if (coursesRes.data) {
        setStats(prev => ({ ...prev, courses: coursesRes.data?.length || 0 }));
        await offlineCache.cacheCourses(coursesRes.data);
      }

      if (assignmentsRes.data) {
        const pending = assignmentsRes.data.filter(
          (a: any) => !a.submitted && new Date(a.due_date) > new Date()
        ).length;
        setStats(prev => ({ ...prev, assignments: pending }));
        await offlineCache.cacheAssignments(assignmentsRes.data);
      }
    } catch (error) {
      console.error('Error loading home data:', error);
      // Use cached data if available
      const cachedCourses = await offlineCache.getCachedCourses();
      const cachedAssignments = await offlineCache.getCachedAssignments();
      
      if (cachedCourses) {
        setStats(prev => ({ ...prev, courses: cachedCourses.length }));
      }
      if (cachedAssignments) {
        const pending = cachedAssignments.filter(
          (a: any) => !a.submitted && new Date(a.due_date) > new Date()
        ).length;
        setStats(prev => ({ ...prev, assignments: pending }));
      }
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#DC2626';
      case 'medium':
        return '#F59E0B';
      default:
        return '#059669';
    }
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
        <Text style={styles.greeting}>{getGreeting()},</Text>
        <Text style={styles.name}>{user?.full_name || 'Student'}</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.courses}</Text>
          <Text style={styles.statLabel}>Courses</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.assignments}</Text>
          <Text style={styles.statLabel}>Pending Assignments</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.pendingPayments}</Text>
          <Text style={styles.statLabel}>Pending Payments</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Announcements</Text>
        {announcements.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No new announcements</Text>
          </View>
        ) : (
          announcements.map((announcement) => (
            <TouchableOpacity
              key={announcement.id}
              style={styles.announcementCard}
            >
              <View
                style={[
                  styles.priorityBadge,
                  { backgroundColor: getPriorityColor(announcement.priority) },
                ]}
              />
              <View style={styles.announcementContent}>
                <Text style={styles.announcementTitle}>{announcement.title}</Text>
                <Text style={styles.announcementPreview} numberOfLines={2}>
                  {announcement.content}
                </Text>
                <Text style={styles.announcementDate}>
                  {new Date(announcement.created_at).toLocaleDateString()}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity style={styles.quickActionCard}>
            <Text style={styles.quickActionIcon}>📚</Text>
            <Text style={styles.quickActionLabel}>My Courses</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionCard}>
            <Text style={styles.quickActionIcon}>📝</Text>
            <Text style={styles.quickActionLabel}>Assignments</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionCard}>
            <Text style={styles.quickActionIcon}>📅</Text>
            <Text style={styles.quickActionLabel}>Exam Schedule</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionCard}>
            <Text style={styles.quickActionIcon}>💳</Text>
            <Text style={styles.quickActionLabel}>Digital ID</Text>
          </TouchableOpacity>
        </View>
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
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  greeting: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: -20,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#059669',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  announcementCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  priorityBadge: {
    width: 4,
    borderRadius: 2,
    marginRight: 12,
  },
  announcementContent: {
    flex: 1,
  },
  announcementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  announcementPreview: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  announcementDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  quickActions: {
    marginTop: 24,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionCard: {
    width: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  quickActionIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
});
