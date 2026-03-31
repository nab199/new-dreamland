import AsyncStorage from '@react-native-async-storage/async-storage';

interface CachedData<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class OfflineCacheService {
  private readonly CACHE_PREFIX = '@dreamland_cache_';
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  private getKey(key: string): string {
    return `${this.CACHE_PREFIX}${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await AsyncStorage.getItem(this.getKey(key));
      
      if (!cached) {
        return null;
      }

      const parsed: CachedData<T> = JSON.parse(cached);
      
      if (Date.now() > parsed.expiresAt) {
        // Cache expired
        await AsyncStorage.removeItem(this.getKey(key));
        return null;
      }

      return parsed.data;
    } catch (error) {
      console.error('Cache read error:', error);
      return null;
    }
  }

  async set<T>(key: string, data: T, ttlMs: number = this.DEFAULT_TTL): Promise<void> {
    try {
      const cached: CachedData<T> = {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttlMs,
      };
      
      await AsyncStorage.setItem(this.getKey(key), JSON.stringify(cached));
    } catch (error) {
      console.error('Cache write error:', error);
    }
  }

  async remove(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.getKey(key));
    } catch (error) {
      console.error('Cache remove error:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  // Offline queue for actions that need to sync when online
  async addToOfflineQueue(action: {
    type: string;
    endpoint: string;
    method: string;
    body?: any;
    timestamp: number;
  }): Promise<void> {
    try {
      const queue = await this.getOfflineQueue();
      queue.push(action);
      await AsyncStorage.setItem(
        '@dreamland_offline_queue',
        JSON.stringify(queue)
      );
    } catch (error) {
      console.error('Add to offline queue error:', error);
    }
  }

  async getOfflineQueue(): Promise<any[]> {
    try {
      const queue = await AsyncStorage.getItem('@dreamland_offline_queue');
      return queue ? JSON.parse(queue) : [];
    } catch (error) {
      console.error('Get offline queue error:', error);
      return [];
    }
  }

  async clearOfflineQueue(): Promise<void> {
    try {
      await AsyncStorage.removeItem('@dreamland_offline_queue');
    } catch (error) {
      console.error('Clear offline queue error:', error);
    }
  }

  async removeFirstFromQueue(): Promise<void> {
    try {
      const queue = await this.getOfflineQueue();
      queue.shift();
      await AsyncStorage.setItem(
        '@dreamland_offline_queue',
        JSON.stringify(queue)
      );
    } catch (error) {
      console.error('Remove from queue error:', error);
    }
  }

  // Cache specific data types
  async cacheStudentData(studentId: number, data: any): Promise<void> {
    await this.set(`student_${studentId}`, data, 10 * 60 * 1000); // 10 minutes
  }

  async getCachedStudentData(studentId: number): Promise<any | null> {
    return await this.get(`student_${studentId}`);
  }

  async cacheCourses(courses: any[]): Promise<void> {
    await this.set('my_courses', courses, 5 * 60 * 1000);
  }

  async getCachedCourses(): Promise<any[] | null> {
    return await this.get('my_courses');
  }

  async cacheAnnouncements(announcements: any[]): Promise<void> {
    await this.set('announcements', announcements, 2 * 60 * 1000); // 2 minutes
  }

  async getCachedAnnouncements(): Promise<any[] | null> {
    return await this.get('announcements');
  }

  async cacheExamSchedule(schedule: any[]): Promise<void> {
    await this.set('exam_schedule', schedule, 15 * 60 * 1000); // 15 minutes
  }

  async getCachedExamSchedule(): Promise<any[] | null> {
    return await this.get('exam_schedule');
  }

  async cacheAssignments(assignments: any[]): Promise<void> {
    await this.set('assignments', assignments, 5 * 60 * 1000);
  }

  async getCachedAssignments(): Promise<any[] | null> {
    return await this.get('assignments');
  }
}

export const offlineCache = new OfflineCacheService();
