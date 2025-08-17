import { doc, getDoc, enableNetwork, disableNetwork } from 'firebase/firestore';
import { db } from './firebase';
import { logger } from './logger';

interface ConnectionStatus {
  isOnline: boolean;
  lastConnected: Date | null;
  retryCount: number;
}

class FirebaseConnectionManager {
  private connectionStatus: ConnectionStatus = {
    isOnline: false,
    lastConnected: null,
    retryCount: 0,
  };

  private listeners: ((status: ConnectionStatus) => void)[] = [];
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 2000; // 2 seconds

  constructor() {
    this.startMonitoring();
  }

  private startMonitoring() {
    // Check connection every 30 seconds
    this.checkInterval = setInterval(() => {
      this.checkConnection();
    }, 30000);

    // Initial check
    this.checkConnection();
  }

  private async checkConnection(): Promise<boolean> {
    try {
      // Try to read a small document to test connection
      const testDoc = doc(db, 'connection-test', 'test');
      await getDoc(testDoc);
      
      this.updateConnectionStatus(true);
      return true;
    } catch (error: any) {
      logger.warn('Firebase connection check failed', error);
      
      // Check if it's a network error
      if (error.code === 'unavailable' || error.code === 'failed-precondition') {
        this.updateConnectionStatus(false);
        this.attemptReconnection();
      }
      
      return false;
    }
  }

  private updateConnectionStatus(isOnline: boolean) {
    const wasOnline = this.connectionStatus.isOnline;
    
    this.connectionStatus = {
      isOnline,
      lastConnected: isOnline ? new Date() : this.connectionStatus.lastConnected,
      retryCount: isOnline ? 0 : this.connectionStatus.retryCount,
    };

    // Notify listeners only if status changed
    if (wasOnline !== isOnline) {
      this.notifyListeners();
      
      if (isOnline) {
        logger.info('Firebase connection restored');
      } else {
        logger.warn('Firebase connection lost');
      }
    }
  }

  private async attemptReconnection() {
    if (this.connectionStatus.retryCount >= this.MAX_RETRIES) {
      logger.error('Max Firebase reconnection attempts reached');
      return;
    }

    this.connectionStatus.retryCount++;
    
    try {
      // Try to disable and re-enable network
      await disableNetwork(db);
      await new Promise(resolve => setTimeout(resolve, 1000));
      await enableNetwork(db);
      
      // Check if connection is restored
      const isConnected = await this.checkConnection();
      
      if (!isConnected) {
        // Wait before next retry
        setTimeout(() => {
          this.attemptReconnection();
        }, this.RETRY_DELAY * this.connectionStatus.retryCount);
      }
    } catch (error) {
      logger.error('Firebase reconnection attempt failed', error);
      
      // Wait before next retry
      setTimeout(() => {
        this.attemptReconnection();
      }, this.RETRY_DELAY * this.connectionStatus.retryCount);
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => {
      try {
        listener(this.connectionStatus);
      } catch (error) {
        logger.error('Error in Firebase connection listener', error);
      }
    });
  }

  // Public methods
  public getStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  public addListener(listener: (status: ConnectionStatus) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  public async forceReconnect(): Promise<boolean> {
    this.connectionStatus.retryCount = 0;
    return this.checkConnection();
  }

  public cleanup() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.listeners.length = 0;
  }
}

// Create singleton instance
export const firebaseConnectionManager = new FirebaseConnectionManager();

// Hook for React components
export function useFirebaseConnection() {
  const [status, setStatus] = React.useState<ConnectionStatus>(
    firebaseConnectionManager.getStatus()
  );

  React.useEffect(() => {
    const unsubscribe = firebaseConnectionManager.addListener(setStatus);
    return unsubscribe;
  }, []);

  return {
    ...status,
    forceReconnect: firebaseConnectionManager.forceReconnect,
  };
}

// For environments where React is not available
let React: any;
try {
  React = require('react');
} catch {
  // React not available, hook will not work
}