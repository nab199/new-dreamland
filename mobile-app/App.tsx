import React, { useState, useEffect } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { apiService } from './src/services/api';
import { notificationService } from './src/services/notificationService';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import CoursesScreen from './src/screens/CoursesScreen';
import DigitalIDScreen from './src/screens/DigitalIDScreen';
import AssignmentsScreen from './src/screens/AssignmentsScreen';
import ExamScheduleScreen from './src/screens/ExamScheduleScreen';
import ProfileScreen from './src/screens/ProfileScreen';

// Keep splash screen visible while loading resources
SplashScreen.preventAutoHideAsync();

// Main App Content with Navigation
function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<'home' | 'courses' | 'id' | 'assignments' | 'exams' | 'profile'>('home');

  useEffect(() => {
    setupNotifications();
  }, [isAuthenticated]);

  const setupNotifications = async () => {
    if (isAuthenticated) {
      // Setup notification listeners
      notificationService.addNotificationResponseListener((response) => {
        console.log('Notification tapped:', response.notification.request.content.data);
        // Handle navigation based on notification data
      });
    }
  };

  const handleLogout = () => {
    setCurrentTab('home');
  };

  const handleLoginSuccess = () => {
    // User logged in successfully
  };

  if (isLoading) {
    return null; // Splash screen is visible
  }

  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#059669" />
      
      {/* Main Content Area */}
      <View style={styles.content}>
        {currentTab === 'home' && <HomeScreen />}
        {currentTab === 'courses' && <CoursesScreen />}
        {currentTab === 'id' && <DigitalIDScreen />}
        {currentTab === 'assignments' && <AssignmentsScreen />}
        {currentTab === 'exams' && <ExamScheduleScreen />}
        {currentTab === 'profile' && <ProfileScreen onLogout={handleLogout} />}
      </View>

      {/* Bottom Tab Navigation */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, currentTab === 'home' && styles.tabItemActive]}
          onPress={() => setCurrentTab('home')}
        >
          <Text style={[styles.tabIcon, currentTab === 'home' && styles.tabIconActive]}>
            🏠
          </Text>
          <Text style={[styles.tabLabel, currentTab === 'home' && styles.tabLabelActive]}>
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, currentTab === 'courses' && styles.tabItemActive]}
          onPress={() => setCurrentTab('courses')}
        >
          <Text style={[styles.tabIcon, currentTab === 'courses' && styles.tabIconActive]}>
            📚
          </Text>
          <Text style={[styles.tabLabel, currentTab === 'courses' && styles.tabLabelActive]}>
            Courses
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, currentTab === 'id' && styles.tabItemActive]}
          onPress={() => setCurrentTab('id')}
        >
          <Text style={[styles.tabIcon, currentTab === 'id' && styles.tabIconActive]}>
            💳
          </Text>
          <Text style={[styles.tabLabel, currentTab === 'id' && styles.tabLabelActive]}>
            ID Card
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, currentTab === 'assignments' && styles.tabItemActive]}
          onPress={() => setCurrentTab('assignments')}
        >
          <Text style={[styles.tabIcon, currentTab === 'assignments' && styles.tabIconActive]}>
            📝
          </Text>
          <Text style={[styles.tabLabel, currentTab === 'assignments' && styles.tabLabelActive]}>
            Assignments
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, currentTab === 'exams' && styles.tabItemActive]}
          onPress={() => setCurrentTab('exams')}
        >
          <Text style={[styles.tabIcon, currentTab === 'exams' && styles.tabIconActive]}>
            📅
          </Text>
          <Text style={[styles.tabLabel, currentTab === 'exams' && styles.tabLabelActive]}>
            Exams
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, currentTab === 'profile' && styles.tabItemActive]}
          onPress={() => setCurrentTab('profile')}
        >
          <Text style={[styles.tabIcon, currentTab === 'profile' && styles.tabIconActive]}>
            👤
          </Text>
          <Text style={[styles.tabLabel, currentTab === 'profile' && styles.tabLabelActive]}>
            Profile
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// Import types needed for AppContent
import { Text, TouchableOpacity } from 'react-native';

// Root App Component
export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Pre-load fonts, make any API calls you need to do here
        await Font.loadAsync({
          // Add custom fonts if needed
        });
        
        // Artificial delay to ensure assets are loaded
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  const onLayoutRootView = async () => {
    if (appIsReady) {
      await SplashScreen.hideAsync();
    }
  };

  if (!appIsReady) {
    return null;
  }

  return (
    <View style={styles.container} onLayout={onLayoutRootView}>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingBottom: 20,
    paddingTop: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabItemActive: {
    borderTopWidth: 2,
    borderTopColor: '#059669',
  },
  tabIcon: {
    fontSize: 22,
    marginBottom: 2,
  },
  tabIconActive: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  tabLabelActive: {
    color: '#059669',
    fontWeight: '600',
  },
});
