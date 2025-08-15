// Offline queue manager for PWA functionality
// Handles storing operations when offline and syncing when back online

interface QueuedOperation {
  id: string;
  type: 'create_tournament' | 'log_game' | 'update_match';
  data: any;
  timestamp: number;
  retryCount: number;
}

class OfflineQueue {
  private dbName = 'pbstats-offline';
  private dbVersion = 1;
  private storeName = 'operations';
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async addOperation(type: QueuedOperation['type'], data: any): Promise<string> {
    if (!this.db) {
      await this.init();
    }

    const operation: QueuedOperation = {
      id: crypto.randomUUID(),
      type,
      data,
      timestamp: Date.now(),
      retryCount: 0,
    };

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.add(operation);

      request.onsuccess = () => {
        resolve(operation.id);
      };

      request.onerror = () => {
        reject(new Error('Failed to add operation to queue'));
      };
    });
  }

  async getQueuedOperations(): Promise<QueuedOperation[]> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error('Failed to get queued operations'));
      };
    });
  }

  async removeOperation(id: string): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(id);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to remove operation from queue'));
      };
    });
  }

  async updateRetryCount(id: string, retryCount: number): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const operation = getRequest.result;
        if (operation) {
          operation.retryCount = retryCount;
          const updateRequest = store.put(operation);
          
          updateRequest.onsuccess = () => {
            resolve();
          };
          
          updateRequest.onerror = () => {
            reject(new Error('Failed to update retry count'));
          };
        } else {
          reject(new Error('Operation not found'));
        }
      };

      getRequest.onerror = () => {
        reject(new Error('Failed to get operation for update'));
      };
    });
  }

  async syncOperations(): Promise<{ success: number; failed: number }> {
    const operations = await this.getQueuedOperations();
    let success = 0;
    let failed = 0;

    for (const operation of operations) {
      try {
        await this.executeOperation(operation);
        await this.removeOperation(operation.id);
        success++;
      } catch (error) {
        console.error(`Failed to sync operation ${operation.id}:`, error);
        
        // Increment retry count, but remove if too many retries
        if (operation.retryCount >= 3) {
          await this.removeOperation(operation.id);
          failed++;
        } else {
          await this.updateRetryCount(operation.id, operation.retryCount + 1);
          failed++;
        }
      }
    }

    return { success, failed };
  }

  private async executeOperation(operation: QueuedOperation): Promise<void> {
    // Import the action functions dynamically to avoid circular dependencies
    switch (operation.type) {
      case 'create_tournament':
        const { createTournament } = await import('@/app/tournaments/actions');
        await createTournament(operation.data);
        break;
        
      case 'log_game':
        // Game logging would be implemented here
        throw new Error('Game logging sync not implemented yet');
        
      case 'update_match':
        // Match updates would be implemented here
        throw new Error('Match update sync not implemented yet');
        
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  async clear(): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(new Error('Failed to clear queue'));
      };
    });
  }
}

// Singleton instance
export const offlineQueue = new OfflineQueue();

// Utility functions for checking online status
export const isOnline = (): boolean => {
  return navigator.onLine;
};

export const onOnlineStatusChange = (callback: (isOnline: boolean) => void): (() => void) => {
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
};