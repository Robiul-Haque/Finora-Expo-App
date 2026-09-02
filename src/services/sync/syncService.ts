import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Transaction } from '../../types/ledger';

const SYNC_QUEUE_KEY = '@finora_sync_queue_v1';
const MAX_RETRIES = 5;

export type BatchSyncExecutor = (items: any[]) => Promise<{ syncedIds: string[]; failedIds: string[] }>;

export type SyncOperationType =
  | 'CREATE_TRANSACTION'
  | 'UPDATE_TRANSACTION'
  | 'DELETE_TRANSACTION'
  | 'CREATE_ACCOUNT'
  | 'UPDATE_ACCOUNT'
  | 'DELETE_ACCOUNT';

export interface SyncQueueItem {
  id: string;
  clientTxId: string;
  type: SyncOperationType;
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
  private unsubscribeNetInfo?: () => void;
  private syncExecutor?: BatchSyncExecutor;

  public setSyncExecutor(executor: BatchSyncExecutor) {
    this.syncExecutor = executor;
  }

  constructor() {
    // Listen for network reconnect
    this.unsubscribeNetInfo = NetInfo.addEventListener((state) => {
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
   * Generic enqueue for any offline mutation
   */
  public async enqueueItem(
    type: SyncOperationType,
    clientTxId: string,
    payload: any
  ): Promise<SyncQueueItem> {
    const queue = await this.getQueue();

    // Prevent duplicate enqueue of identical operation
    const existingIndex = queue.findIndex(
      (item) => item.clientTxId === clientTxId && item.type === type
    );
    if (existingIndex !== -1) {
      return queue[existingIndex];
    }

    const item: SyncQueueItem = {
      id: 'sync_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
      clientTxId,
      type,
      payload,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };

    queue.push(item);
    await this.saveQueue(queue);

    // If online, trigger background process
    const net = await NetInfo.fetch();
    const isOnline = Boolean(net.isConnected && (net.isInternetReachable ?? true));
    if (isOnline && !this.isSyncing) {
      this.processQueue();
    }

    return item;
  }

  /**
   * Enqueue a transaction creation for offline synchronization
   */
  public async enqueueTransaction(
    txData: Omit<Transaction, 'id' | 'date'> & { clientTxId: string }
  ): Promise<SyncQueueItem> {
    return this.enqueueItem('CREATE_TRANSACTION', txData.clientTxId, txData);
  }

  /**
   * Enqueue a transaction update for offline synchronization
   */
  public async enqueueUpdateTransaction(
    id: string,
    updates: Partial<Transaction>
  ): Promise<SyncQueueItem> {
    return this.enqueueItem('UPDATE_TRANSACTION', id, { id, updates });
  }

  /**
   * Enqueue a transaction deletion for offline synchronization
   */
  public async enqueueDeleteTransaction(id: string): Promise<SyncQueueItem> {
    return this.enqueueItem('DELETE_TRANSACTION', id, { id });
  }

  /**
   * Enqueue an account creation for offline synchronization
   */
  public async enqueueCreateAccount(accountData: any): Promise<SyncQueueItem> {
    const key = accountData.id || ('acc_' + Date.now());
    return this.enqueueItem('CREATE_ACCOUNT', key, accountData);
  }

  /**
   * Enqueue an account update for offline synchronization
   */
  public async enqueueUpdateAccount(id: string, updates: any): Promise<SyncQueueItem> {
    return this.enqueueItem('UPDATE_ACCOUNT', id, { id, updates });
  }

  /**
   * Enqueue an account deletion for offline synchronization
   */
  public async enqueueDeleteAccount(id: string): Promise<SyncQueueItem> {
    return this.enqueueItem('DELETE_ACCOUNT', id, { id });
  }

  private getBackoffDelay(retryCount: number): number {
    return Math.min(60000, 1000 * Math.pow(2, retryCount));
  }

  /**
   * Process all pending items in the offline queue with Batch Sync & Exponential Backoff
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

      const now = Date.now();
      const readyToSync: SyncQueueItem[] = [];
      const backingOff: SyncQueueItem[] = [];

      for (const item of queue) {
        const lastAttemptTime = item.lastAttempt ? new Date(item.lastAttempt).getTime() : 0;
        const requiredDelay = this.getBackoffDelay(item.retryCount);
        if (now - lastAttemptTime >= requiredDelay) {
          readyToSync.push(item);
        } else {
          backingOff.push(item);
        }
      }

      const remainingQueue: SyncQueueItem[] = [...backingOff];

      if (readyToSync.length > 0 && this.syncExecutor) {
        try {
          const syncResult = await this.syncExecutor(readyToSync);
          const syncedSet = new Set(syncResult.syncedIds || []);

          for (const item of readyToSync) {
            if (syncedSet.has(item.clientTxId) || syncedSet.has(item.id)) {
              successCount++;
            } else {
              item.retryCount += 1;
              item.lastAttempt = new Date().toISOString();
              if (item.retryCount < MAX_RETRIES) {
                remainingQueue.push(item);
              } else {
                failedCount++;
              }
            }
          }
        } catch {
          // Retry with incremented count on next attempt
          for (const item of readyToSync) {
            item.retryCount += 1;
            item.lastAttempt = new Date().toISOString();
            if (item.retryCount < MAX_RETRIES) {
              remainingQueue.push(item);
            } else {
              failedCount++;
            }
          }
        }
      } else {
        remainingQueue.push(...readyToSync);
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

  /**
   * Cleanup method to avoid memory leak
   */
  public destroy() {
    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
    }
    this.listeners.clear();
  }
}

export const syncService = new SyncService();
export default syncService;
