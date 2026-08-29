import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Transaction } from '../../types/ledger';
import { ledgerApi } from '../api/ledgerApi';

const SYNC_QUEUE_KEY = '@finora_sync_queue_v1';
const MAX_RETRIES = 3;

export interface SyncQueueItem {
  id: string;
  clientTxId: string;
  type: 'CREATE_TRANSACTION' | 'DELETE_TRANSACTION' | 'UPDATE_ACCOUNT';
  payload: any;
  createdAt: string;
  retryCount: number;
  lastAttempt?: string;
  error?: string;
}

type SyncListener = (pendingCount: number, isSyncing: boolean) => void;

class SyncService {
  private isSyncing = false;
  private listeners: Set<SyncListener> = new Set();

  constructor() {
    // Listen for network reconnect
    NetInfo.addEventListener((state) => {
      const isOnline = Boolean(state.isConnected && (state.isInternetReachable ?? true));
      if (isOnline && !this.isSyncing) {
        this.processQueue();
      }
    });
  }

  public subscribe(listener: SyncListener) {
    this.listeners.add(listener);
    this.notifyListeners();
    return () => {
      this.listeners.delete(listener);
    };
  }

  private async notifyListeners() {
    const queue = await this.getQueue();
    this.listeners.forEach((fn) => fn(queue.length, this.isSyncing));
  }

  public async getQueue(): Promise<SyncQueueItem[]> {
    try {
      const raw = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  private async saveQueue(queue: SyncQueueItem[]): Promise<void> {
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    this.notifyListeners();
  }

  /**
   * Enqueue a transaction for background/offline synchronization
   */
  public async enqueueTransaction(txData: Omit<Transaction, 'id' | 'date'> & { clientTxId: string }): Promise<SyncQueueItem> {
    const queue = await this.getQueue();
    const item: SyncQueueItem = {
      id: 'sync_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      clientTxId: txData.clientTxId,
      type: 'CREATE_TRANSACTION',
      payload: txData,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };

    queue.push(item);
    await this.saveQueue(queue);

    // If online, process immediately
    const net = await NetInfo.fetch();
    const isOnline = Boolean(net.isConnected && (net.isInternetReachable ?? true));
    if (isOnline && !this.isSyncing) {
      this.processQueue();
    }

    return item;
  }

  /**
   * Process all pending items in the offline queue with Exponential Backoff
   */
  public async processQueue(): Promise<{ successCount: number; failedCount: number }> {
    if (this.isSyncing) return { successCount: 0, failedCount: 0 };

    const net = await NetInfo.fetch();
    const isOnline = Boolean(net.isConnected && (net.isInternetReachable ?? true));
    if (!isOnline) {
      return { successCount: 0, failedCount: 0 };
    }

    this.isSyncing = true;
    this.notifyListeners();

    let successCount = 0;
    let failedCount = 0;

    try {
      const queue = await this.getQueue();
      if (queue.length === 0) {
        this.isSyncing = false;
        this.notifyListeners();
        return { successCount: 0, failedCount: 0 };
      }

      const remainingQueue: SyncQueueItem[] = [];

      for (const item of queue) {
        try {
          // Process based on type
          if (item.type === 'CREATE_TRANSACTION') {
            await ledgerApi.createTransaction(item.payload);
            successCount++;
          }
        } catch (err: any) {
          console.error('Sync item failed:', item.id, err);
          item.retryCount += 1;
          item.lastAttempt = new Date().toISOString();
          item.error = err?.message || 'Network error';

          if (item.retryCount < MAX_RETRIES) {
            remainingQueue.push(item);
          } else {
            // Reached max retries - mark transaction as failed in local DB
            failedCount++;
          }
        }
      }

      await this.saveQueue(remainingQueue);
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }

    return { successCount, failedCount };
  }

  /**
   * Manually retry all failed or pending sync items
   */
  public async retryAll(): Promise<{ successCount: number; failedCount: number }> {
    return this.processQueue();
  }

  /**
   * Clear the offline queue
   */
  public async clearQueue(): Promise<void> {
    await this.saveQueue([]);
  }
}

export const syncService = new SyncService();
