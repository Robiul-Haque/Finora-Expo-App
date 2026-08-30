import AsyncStorage from '@react-native-async-storage/async-storage';
import { Account, Transaction } from '../../types/ledger';
import { initialAccounts, initialTransactions } from '../../constants/mockData';
import { syncService } from '../sync/syncService';

const ACCOUNTS_STORAGE_KEY = '@finora_accounts_v1';
const TRANSACTIONS_STORAGE_KEY = '@finora_transactions_v1';

/**
 * Production API Configuration
 * Supports Android Emulator (10.0.2.2), iOS/Web (localhost), and local LAN backend servers.
 */
const getDefaultBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;

  return 'https://finora-express-js.vercel.app/api/v1';
};

export const API_CONFIG = {
  BASE_URL: getDefaultBaseUrl(),
  USE_MOCK_STORAGE: false, // Set to false to connect to Express backend!
  TIMEOUT_MS: 10000,
};

/**
 * Robust HTTP client wrapper with timeout & AbortController
 */
async function httpRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);

  const url = `${API_CONFIG.BASE_URL}${endpoint}`;
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(options.headers || {}),
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const message = errorBody?.message || errorBody?.error || `HTTP Error ${response.status}: ${response.statusText}`;
      throw new Error(message);
    }

    const data = await response.json();
    return data?.data ?? data;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') throw new Error('Network request timed out. Please check your connection.');
    throw error;
  }
}

/**
 * Production Ledger API Service
 * Handles offline-first data persistence, cloud API synchronization, and idempotency.
 */
export const ledgerApi = {
  /**
   * Set dynamic backend Base URL (e.g. for physical devices over Wi-Fi)
   */
  setBaseUrl(url: string) {
    API_CONFIG.BASE_URL = url;
  },

  /**
   * Fetch all bKash business accounts
   */
  async getAccounts(): Promise<Account[]> {
    if (!API_CONFIG.USE_MOCK_STORAGE) {
      try {
        const accounts = await httpRequest<Account[]>('/accounts');
        if (Array.isArray(accounts) && accounts.length > 0) {
          await AsyncStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
          return accounts;
        }
      } catch {
        // Fallback to local cache on API failure
      }
    }

    // Fallback to local cache
    try {
      const data = await AsyncStorage.getItem(ACCOUNTS_STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
      await AsyncStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(initialAccounts));
      return initialAccounts;
    } catch {
      return initialAccounts;
    }
  },

  /**
   * Fetch all recorded transactions
   */
  async getTransactions(): Promise<Transaction[]> {
    if (!API_CONFIG.USE_MOCK_STORAGE) {
      try {
        const transactions = await httpRequest<Transaction[]>('/transactions');
        if (Array.isArray(transactions)) {
          await AsyncStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(transactions));
          return transactions;
        }
      } catch {
        // Fallback to local cache on API failure
      }
    }

    // Fallback to local cache
    try {
      const data = await AsyncStorage.getItem(TRANSACTIONS_STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
      await AsyncStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(initialTransactions));
      return initialTransactions;
    } catch {
      return initialTransactions;
    }
  },

  /**
   * Create a new transaction with idempotency key (clientTxId)
   */
  async createTransaction(txData: Omit<Transaction, 'id' | 'date'> & { clientTxId?: string }): Promise<{ transaction: Transaction; updatedAccounts: Account[] }> {
    const clientTxId = txData.clientTxId || 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

    const newTx: Transaction = {
      ...txData,
      id: clientTxId,
      clientTxId,
      date: new Date().toISOString(),
      syncStatus: 'synced',
      retryCount: 0,
    };

    let apiSucceeded = false;
    let backendResult: any = null;

    if (!API_CONFIG.USE_MOCK_STORAGE) {
      try {
        backendResult = await httpRequest<{ transaction: Transaction; updatedAccounts: Account[] }>('/transactions', {
          method: 'POST',
          headers: { 'X-Idempotency-Key': clientTxId },
          body: JSON.stringify({ ...txData, clientTxId }),
        });
        apiSucceeded = true;
      } catch {
        newTx.syncStatus = 'pending';
        await syncService.enqueueTransaction({ ...txData, clientTxId });
      }
    }

    // Always update local cache for instant UI feedback
    const currentTxs = await this.getTransactions();
    const currentAccounts = await this.getAccounts();

    // Check duplicate by idempotency
    const exists = currentTxs.some((t) => t.clientTxId === clientTxId || t.id === clientTxId);
    if (exists && !apiSucceeded) return { transaction: newTx, updatedAccounts: currentAccounts };

    const updatedTransactions = [newTx, ...currentTxs.filter((t) => t.id !== clientTxId)];

    // Recalculate account balance locally
    const updatedAccounts = currentAccounts.map((acc) => {
      if (acc.id === txData.accountId) {
        let newBalance = acc.balance;
        let newTodaySend = acc.todaySend;
        let newTodayReceive = acc.todayReceive;
        let newTodayProfit = acc.todayProfit + (txData.profit || 0);

        if (txData.type === 'send_money' || txData.type === 'cash_out' || txData.type === 'b2b') {
          newBalance -= txData.amount + (txData.cost || 0);
          newTodaySend += txData.amount;
        } else if (txData.type === 'receive_money' || txData.type === 'cash_in') {
          newBalance += txData.amount;
          newTodayReceive += txData.amount;
        } else if (txData.type === 'adjustment') {
          newBalance += txData.amount;
        }

        return {
          ...acc,
          balance: newBalance,
          todaySend: newTodaySend,
          todayReceive: newTodayReceive,
          todayProfit: newTodayProfit,
        };
      }
      return acc;
    });

    await AsyncStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(updatedTransactions));
    await AsyncStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(backendResult?.updatedAccounts || updatedAccounts));

    return {
      transaction: backendResult?.transaction || newTx,
      updatedAccounts: backendResult?.updatedAccounts || updatedAccounts,
    };
  },

  /**
   * Delete a transaction & revert balance impact
   */
  async deleteTransaction(id: string): Promise<{ deletedId: string; updatedAccounts: Account[]; }> {
    if (!API_CONFIG.USE_MOCK_STORAGE) {
      try {
        await httpRequest(`/transactions/${id}`, { method: 'DELETE' });
      } catch {
        // Continue with local update
      }
    }

    const currentTxs = await this.getTransactions();
    const currentAccounts = await this.getAccounts();

    const txToDelete = currentTxs.find((t) => t.id === id);
    if (!txToDelete) throw new Error('Transaction not found');

    const updatedTransactions = currentTxs.filter((t) => t.id !== id);

    const updatedAccounts = currentAccounts.map((acc) => {
      if (acc.id === txToDelete.accountId) {
        let newBalance = acc.balance;
        let newTodaySend = acc.todaySend;
        let newTodayReceive = acc.todayReceive;
        let newTodayProfit = Math.max(0, acc.todayProfit - (txToDelete.profit || 0));

        if (txToDelete.type === 'send_money' || txToDelete.type === 'cash_out' || txToDelete.type === 'b2b') {
          newBalance += txToDelete.amount + (txToDelete.cost || 0);
          newTodaySend = Math.max(0, newTodaySend - txToDelete.amount);
        } else if (txToDelete.type === 'receive_money' || txToDelete.type === 'cash_in') {
          newBalance -= txToDelete.amount;
          newTodayReceive = Math.max(0, newTodayReceive - txToDelete.amount);
        } else if (txToDelete.type === 'adjustment') {
          newBalance -= txToDelete.amount;
        }

        return {
          ...acc,
          balance: newBalance,
          todaySend: newTodaySend,
          todayReceive: newTodayReceive,
          todayProfit: newTodayProfit,
        };
      }
      return acc;
    });

    await AsyncStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(updatedTransactions));
    await AsyncStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(updatedAccounts));

    return { deletedId: id, updatedAccounts };
  },

  /**
   * Add a new bKash account line
   */
  async createAccount(accData: Omit<Account, 'id' | 'createdAt' | 'todaySend' | 'todayReceive' | 'todayProfit'>): Promise<Account> {
    let newAccount: Account = {
      ...accData,
      id: 'acc_' + Date.now(),
      todaySend: 0,
      todayReceive: 0,
      todayProfit: 0,
      createdAt: new Date().toISOString(),
      syncStatus: 'synced',
    };

    if (!API_CONFIG.USE_MOCK_STORAGE) {
      try {
        const created = await httpRequest<Account>('/accounts', { method: 'POST', body: JSON.stringify(accData), });
        if (created?.id) newAccount = created;
      } catch {
        // Fallback to local
      }
    }

    const currentAccounts = await this.getAccounts();
    const updated = [newAccount, ...currentAccounts];
    await AsyncStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(updated));

    return newAccount;
  },

  /**
   * Update an account line
   */
  async updateAccount(id: string, updates: Partial<Account>): Promise<Account[]> {
    if (!API_CONFIG.USE_MOCK_STORAGE) {
      try {
        await httpRequest(`/accounts/${id}`, {
          method: 'PATCH',
          body: JSON.stringify(updates),
        });
      } catch {
        // Fallback to local
      }
    }

    const currentAccounts = await this.getAccounts();
    const updated = currentAccounts.map((a) => (a.id === id ? { ...a, ...updates } : a));
    await AsyncStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(updated));

    return updated;
  },

  /**
   * Delete an account line
   */
  async deleteAccount(id: string): Promise<string> {
    if (!API_CONFIG.USE_MOCK_STORAGE) {
      try {
        await httpRequest(`/accounts/${id}`, { method: 'DELETE' });
      } catch {
        // Fallback to local
      }
    }

    const currentAccounts = await this.getAccounts();
    const updated = currentAccounts.filter((a) => a.id !== id);
    await AsyncStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(updated));

    return id;
  },

  /**
   * Batch sync offline transactions
   */
  async syncBatchTransactions(items: any[]): Promise<{ syncedIds: string[]; failedIds: string[] }> {
    if (!API_CONFIG.USE_MOCK_STORAGE) {
      try {
        return await httpRequest<{ syncedIds: string[]; failedIds: string[] }>('/transactions/sync', {
          method: 'POST',
          body: JSON.stringify({ items }),
        });
      } catch {
        // Return IDs on error
      }
    }
    return { syncedIds: items.map((i) => i.clientTxId || i.id), failedIds: [] };
  },

  /**
   * Reset database back to clean empty state or mock
   */
  async resetDatabase(): Promise<void> {
    await AsyncStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify([]));
    await AsyncStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify([]));
  },
};

// Break circular dependency by registering sync executor after definition
syncService.setSyncExecutor((items) => ledgerApi.syncBatchTransactions(items));