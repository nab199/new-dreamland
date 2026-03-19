/**
 * Offline Storage Utility
 * Uses IndexedDB for storing data when offline
 */

const DB_NAME = 'DreamlandOfflineDB';
const DB_VERSION = 1;

export interface OfflineData {
  id?: number;
  type: string;
  data: any;
  timestamp: number;
  synced: boolean;
  syncAttempts: number;
}

export interface PendingAction {
  id?: number;
  action: string;
  endpoint: string;
  method: string;
  payload: any;
  timestamp: number;
  synced: boolean;
  syncAttempts: number;
  lastSyncAttempt?: number;
}

let db: IDBDatabase | null = null;

/**
 * Initialize the database
 */
export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[OfflineDB] Failed to open database');
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      console.log('[OfflineDB] Database opened successfully');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Create offline data store
      if (!database.objectStoreNames.contains('offlineData')) {
        const dataStore = database.createObjectStore('offlineData', {
          keyPath: 'id',
          autoIncrement: true,
        });
        dataStore.createIndex('type', 'type', { unique: false });
        dataStore.createIndex('synced', 'synced', { unique: false });
        dataStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Create pending actions store
      if (!database.objectStoreNames.contains('pendingActions')) {
        const actionsStore = database.createObjectStore('pendingActions', {
          keyPath: 'id',
          autoIncrement: true,
        });
        actionsStore.createIndex('synced', 'synced', { unique: false });
        actionsStore.createIndex('endpoint', 'endpoint', { unique: false });
        actionsStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

/**
 * Store data for offline access
 */
export async function storeOfflineData(
  type: string,
  data: any,
  key?: string
): Promise<number> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['offlineData'], 'readwrite');
    const store = transaction.objectStore('offlineData');

    const record: OfflineData = {
      type,
      data,
      timestamp: Date.now(),
      synced: false,
      syncAttempts: 0,
    };

    const request = key ? store.put({ ...record, id: parseInt(key) }) : store.add(record);

    request.onsuccess = () => {
      console.log('[OfflineDB] Data stored offline:', type);
      resolve(request.result as number);
    };

    request.onerror = () => {
      console.error('[OfflineDB] Failed to store data:', request.error);
      reject(request.error);
    };
  });
}

/**
 * Get offline data by type
 */
export async function getOfflineData(type: string): Promise<OfflineData[]> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['offlineData'], 'readonly');
    const store = transaction.objectStore('offlineData');
    const index = store.index('type');

    const request = index.getAll(type);

    request.onsuccess = () => {
      resolve(request.result as OfflineData[]);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Get all offline data
 */
export async function getAllOfflineData(): Promise<OfflineData[]> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['offlineData'], 'readonly');
    const store = transaction.objectStore('offlineData');

    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result as OfflineData[]);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Delete offline data
 */
export async function deleteOfflineData(key: number): Promise<void> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['offlineData'], 'readwrite');
    const store = transaction.objectStore('offlineData');

    const request = store.delete(key);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Clear all offline data
 */
export async function clearOfflineData(): Promise<void> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['offlineData'], 'readwrite');
    const store = transaction.objectStore('offlineData');

    const request = store.clear();

    request.onsuccess = () => {
      console.log('[OfflineDB] All offline data cleared');
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Add a pending action to be synced when online
 */
export async function addPendingAction(
  action: string,
  endpoint: string,
  method: string,
  payload: any
): Promise<number> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['pendingActions'], 'readwrite');
    const store = transaction.objectStore('pendingActions');

    const record: PendingAction = {
      action,
      endpoint,
      method,
      payload,
      timestamp: Date.now(),
      synced: false,
      syncAttempts: 0,
    };

    const request = store.add(record);

    request.onsuccess = () => {
      console.log('[OfflineDB] Pending action added:', action);
      resolve(request.result as number);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Get all pending actions
 */
export async function getPendingActions(): Promise<PendingAction[]> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['pendingActions'], 'readonly');
    const store = transaction.objectStore('pendingActions');

    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result as PendingAction[]);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Mark action as synced
 */
export async function markActionAsSynced(id: number): Promise<void> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['pendingActions'], 'readwrite');
    const store = transaction.objectStore('pendingActions');

    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const data = getRequest.result as PendingAction;
      if (data) {
        data.synced = true;
        const putRequest = store.put(data);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        resolve();
      }
    };

    getRequest.onerror = () => {
      reject(getRequest.error);
    };
  });
}

/**
 * Increment sync attempts for an action
 */
export async function incrementSyncAttempts(id: number): Promise<void> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['pendingActions'], 'readwrite');
    const store = transaction.objectStore('pendingActions');

    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const data = getRequest.result as PendingAction;
      if (data) {
        data.syncAttempts++;
        data.lastSyncAttempt = Date.now();
        const putRequest = store.put(data);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        resolve();
      }
    };

    getRequest.onerror = () => {
      reject(getRequest.error);
    };
  });
}

/**
 * Delete a pending action
 */
export async function deletePendingAction(id: number): Promise<void> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['pendingActions'], 'readwrite');
    const store = transaction.objectStore('pendingActions');

    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Clear all pending actions
 */
export async function clearPendingActions(): Promise<void> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['pendingActions'], 'readwrite');
    const store = transaction.objectStore('pendingActions');

    const request = store.clear();

    request.onsuccess = () => {
      console.log('[OfflineDB] All pending actions cleared');
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

/**
 * Get unsynced actions
 */
export async function getUnsyncedActions(): Promise<PendingAction[]> {
  const actions = await getPendingActions();
  return actions.filter((action) => !action.synced);
}

/**
 * Get storage statistics
 */
export async function getStorageStats(): Promise<{
  offlineDataCount: number;
  pendingActionsCount: number;
  unsyncedActionsCount: number;
}> {
  const database = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(['offlineData', 'pendingActions'], 'readonly');
    const dataStore = transaction.objectStore('offlineData');
    const actionsStore = transaction.objectStore('pendingActions');

    const dataCountRequest = dataStore.count();
    const actionsCountRequest = actionsStore.count();

    dataCountRequest.onsuccess = () => {
      actionsCountRequest.onsuccess = () => {
        getUnsyncedActions()
          .then((unsynced) => {
            resolve({
              offlineDataCount: dataCountRequest.result as number,
              pendingActionsCount: actionsCountRequest.result as number,
              unsyncedActionsCount: unsynced.length,
            });
          })
          .catch(reject);
      };
    };

    dataCountRequest.onerror = () => reject(dataCountRequest.error);
    actionsCountRequest.onerror = () => reject(actionsCountRequest.error);
  });
}

export default {
  initDB,
  storeOfflineData,
  getOfflineData,
  getAllOfflineData,
  deleteOfflineData,
  clearOfflineData,
  addPendingAction,
  getPendingActions,
  markActionAsSynced,
  incrementSyncAttempts,
  deletePendingAction,
  clearPendingActions,
  getUnsyncedActions,
  getStorageStats,
};
