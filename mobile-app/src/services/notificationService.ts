import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { apiService } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export interface NotificationData {
  type: 'announcement' | 'payment' | 'grade' | 'assignment' | 'exam' | 'general';
  title: string;
  body: string;
  data?: Record<string, any>;
}

class NotificationService {
  private pushToken: string | null = null;

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
        sound: 'default',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return false;
      }
      
      return true;
    }
    
    return false;
  }

  async registerForPushNotifications(): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return null;
      }

      const token = (await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
      })).data;

      this.pushToken = token;

      // Send token to backend for future notifications
      await this.sendTokenToBackend(token);

      return token;
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  }

  private async sendTokenToBackend(token: string) {
    try {
      // Send push token to backend
      await apiService.request('/notifications/register-token', {
        method: 'POST',
        body: JSON.stringify({ 
          token, 
          platform: Platform.OS,
          device_name: Device.deviceName || 'Unknown'
        }),
      });
    } catch (error) {
      console.error('Failed to send push token to backend:', error);
    }
  }

  async scheduleLocalNotification(notification: NotificationData, triggerSeconds: number) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: notification.title,
        body: notification.body,
        data: notification.data,
        sound: true,
      },
      trigger: triggerSeconds,
    });
  }

  async scheduleReminder(
    title: string,
    body: string,
    triggerDate: Date,
    data?: Record<string, any>
  ) {
    const seconds = Math.floor((triggerDate.getTime() - Date.now()) / 1000);
    
    if (seconds > 0) {
      await this.scheduleLocalNotification(
        { type: 'general', title, body, data },
        seconds
      );
    }
  }

  async cancelAllNotifications() {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.setBadgeCountAsync(0);
  }

  async getBadgeCount(): Promise<number> {
    return await Notifications.getBadgeCountAsync();
  }

  async setBadgeCount(count: number) {
    await Notifications.setBadgeCountAsync(count);
  }

  addNotificationListener(callback: (notification: Notifications.Notification) => void) {
    return Notifications.addNotificationReceivedListener(callback);
  }

  addNotificationResponseListener(
    callback: (response: Notifications.NotificationResponse) => void
  ) {
    return Notifications.addNotificationResponseReceivedListener(callback);
  }

  getPushToken(): string | null {
    return this.pushToken;
  }
}

export const notificationService = new NotificationService();
