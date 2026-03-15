import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_URL = 'http://192.168.1.100:3000/api'; // UPDATE THIS

export default function DashboardScreen() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    students: 0,
    branches: 0,
    revenue: 0,
    courses: 0,
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const token = await AsyncStorage.getItem('dreamland_token');
      const userStr = await AsyncStorage.getItem('dreamland_user');

      if (!token || !userStr) {
        router.replace('/login');
        return;
      }

      const userData = JSON.parse(userStr);
      setUser(userData);

      // Fetch dashboard stats based on role
      await fetchStats(token);
    } catch (error) {
      console.error('Error loading user data:', error);
      router.replace('/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (token: string) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };

      if (['superadmin', 'branch_admin'].includes(user?.role)) {
        const [studentsRes, branchesRes] = await Promise.all([
          axios.get(`${API_URL}/students`, { headers }),
          axios.get(`${API_URL}/branches`, { headers }),
        ]);

        setStats({
          students: studentsRes.data.length || 0,
          branches: branchesRes.data.length || 0,
          revenue: 0,
          courses: 0,
        });
      } else if (user?.role === 'student') {
        const enrollmentsRes = await axios.get(`${API_URL}/enrollments`, { headers });
        setStats({
          students: 0,
          branches: 0,
          revenue: 0,
          courses: enrollmentsRes.data.length || 0,
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserData();
    setRefreshing(false);
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('dreamland_token');
          await AsyncStorage.removeItem('dreamland_user');
          router.replace('/login');
        },
      },
    ]);
  };

  const menuItems = [
    { id: 'profile', label: 'My Profile', icon: '👤', color: '#3B82F6' },
    { id: 'notifications', label: 'Notifications', icon: '🔔', color: '#F59E0B' },
  ];

  if (user?.role === 'superadmin' || user?.role === 'branch_admin') {
    menuItems.push(
      { id: 'ai-tools', label: 'AI Tools', icon: '🤖', color: '#8B5CF6' },
      { id: 'analytics', label: 'Analytics', icon: '📊', color: '#10B981' },
      { id: 'backup', label: 'Backup', icon: '💾', color: '#EF4444' }
    );
  }

  if (user?.role === 'parent') {
    menuItems.push({ id: 'parent-portal', label: 'Parent Portal', icon: '👨‍👩‍👧', color: '#06B6D4' });
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1e40af" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.userName}>{user?.full_name}</Text>
            <Text style={styles.userRole}>{user?.role?.toUpperCase()}</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutButtonText}>🚪</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          {user?.role === 'superadmin' || user?.role === 'branch_admin' ? (
            <>
              <View style={[styles.statCard, { backgroundColor: '#3B82F6' }]}>
                <Text style={styles.statIcon}>👨‍🎓</Text>
                <Text style={styles.statValue}>{stats.students}</Text>
                <Text style={styles.statLabel}>Students</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: '#10B981' }]}>
                <Text style={styles.statIcon}>🏫</Text>
                <Text style={styles.statValue}>{stats.branches}</Text>
                <Text style={styles.statLabel}>Branches</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: '#F59E0B' }]}>
                <Text style={styles.statIcon}>📚</Text>
                <Text style={styles.statValue}>12</Text>
                <Text style={styles.statLabel}>Programs</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: '#8B5CF6' }]}>
                <Text style={styles.statIcon}>💰</Text>
                <Text style={styles.statValue}>1.2M</Text>
                <Text style={styles.statLabel}>Revenue (ETB)</Text>
              </View>
            </>
          ) : user?.role === 'student' ? (
            <>
              <View style={[styles.statCard, { backgroundColor: '#3B82F6' }]}>
                <Text style={styles.statIcon}>📚</Text>
                <Text style={styles.statValue}>{stats.courses}</Text>
                <Text style={styles.statLabel}>My Courses</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: '#10B981' }]}>
                <Text style={styles.statIcon}>📊</Text>
                <Text style={styles.statValue}>3.5</Text>
                <Text style={styles.statLabel}>GPA</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: '#F59E0B' }]}>
                <Text style={styles.statIcon}>✅</Text>
                <Text style={styles.statValue}>95%</Text>
                <Text style={styles.statLabel}>Attendance</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: '#8B5CF6' }]}>
                <Text style={styles.statIcon}>💳</Text>
                <Text style={styles.statValue}>Cleared</Text>
                <Text style={styles.statLabel}>Finance</Text>
              </View>
            </>
          ) : (
            <View style={[styles.statCard, { backgroundColor: '#3B82F6', width: '100%' }]}>
              <Text style={styles.statIcon}>✨</Text>
              <Text style={styles.statLabel}>Welcome to Dreamland College App</Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.actionCard}
                onPress={() => {
                  Alert.alert('Coming Soon', `${item.label} feature is under development`);
                }}
              >
                <View style={[styles.actionIcon, { backgroundColor: item.color + '20' }]}>
                  <Text style={styles.actionIconText}>{item.icon}</Text>
                </View>
                <Text style={styles.actionLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Announcements</Text>
          <View style={styles.announcementCard}>
            <Text style={styles.announcementTitle}>📢 Registration Open</Text>
            <Text style={styles.announcementText}>
              Spring 2024 registration is now open. Please complete your registration before the deadline.
            </Text>
            <Text style={styles.announcementDate}>2 hours ago</Text>
          </View>
          <View style={styles.announcementCard}>
            <Text style={styles.announcementTitle}>🎓 Exam Schedule</Text>
            <Text style={styles.announcementText}>
              Final exam schedule has been published. Check your course pages for details.
            </Text>
            <Text style={styles.announcementDate}>1 day ago</Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
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
  loadingText: {
    marginTop: 10,
    color: '#6B7280',
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#1e40af',
    padding: 20,
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcomeText: {
    color: '#93C5FD',
    fontSize: 14,
  },
  userName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 2,
  },
  userRole: {
    color: '#60A5FA',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  logoutButton: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutButtonText: {
    fontSize: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 15,
    gap: 15,
  },
  statCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statIcon: {
    fontSize: 32,
    marginBottom: 10,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: '#fff',
    marginTop: 5,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 15,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: '30%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  actionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionIconText: {
    fontSize: 24,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  announcementCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  announcementTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  announcementText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  announcementDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 10,
  },
});
