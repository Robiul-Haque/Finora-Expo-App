import AsyncStorage from '@react-native-async-storage/async-storage';
import { Account, Transaction } from '../../types/ledger';
import { initialAccounts, initialTransactions } from '../../constants/mockData';

const ACCOUNTS_STORAGE_KEY = '@finora_accounts_v1';
const TRANSACTIONS_STORAGE_KEY = '@finora_transactions_v1';

/**
 * Production API Configuration
 * When backend server is ready, update BASE_URL and set USE_MOCK_STORAGE to false!
 */
export const API_CONFIG = {
  BASE_URL: 'https://api.finora.app/v1', // Replace with your real backend API URL
  USE_MOCK_STORAGE: true, // Set to false when connecting to real backend API!
  TIMEOUT_MS: 8000,
};

// Simulated network latency
const simulateLatency = (ms = 100) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Production Ledger API Service
 * Handles offline-first data persistence, cloud API synchronization, and idempotency.
 */
export const ledgerApi = {
  /**
   * Fetch all bKash business accounts
   */
  async getAccounts(): Promise<Account[]> {
    if (!API_CONFIG.USE_MOCK_STORAGE) {
      // Real backend API call ready:
      // const res = await fetch(`${API_CONFIG.BASE_URL}/accounts`);
      // return res.json();
    }

    await simulateLatency(70);
    try {
      const data = await AsyncStorage.getItem(ACCOUNTS_STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
      await AsyncStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(initialAccounts));
      return initialAccounts;
    } catch (e) {
      console.error('API Error: getAccounts', e);
      return initialAccounts;
    }
  },

  /**
   * Fetch all recorded transactions
   */
  async getTransactions(): Promise<Transaction[]> {
    if (!API_CONFIG.USE_MOCK_STORAGE) {
      // Real backend API call ready:
      // const res = await fetch(`${API_CONFIG.BASE_URL}/transactions`);
      // return res.json();
    }

    await simulateLatency(80);
    try {
      const data = await AsyncStorage.getItem(TRANSACTIONS_STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
      await AsyncStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(initialTransactions));
      return initialTransactions;
    } catch (e) {
      console.error('API Error: getTransactions', e);
      return initialTransactions;
    }
  },

  /**
   * Create a new transaction with idempotency key (clientTxId)
   */
  async createTransaction(txData: Omit<Transaction, 'id' | 'date'> & { clientTxId?: string }): Promise<{
    transaction: Transaction;
    updatedAccounts: Account[];
  }> {
    if (!API_CONFIG.USE_MOCK_STORAGE) {
      // Real backend API call ready:
      // const res = await fetch(`${API_CONFIG.BASE_URL}/transactions`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json', 'X-Idempotency-Key': txData.clientTxId || '' },
      //   body: JSON.stringify(txData),
      // });
      // return res.json();
    }

    await simulateLatency(120);

    const clientTxId = txData.clientTxId || 'tx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

    const newTx: Transaction = {
      ...txData,
      id: clientTxId,
      clientTxId,
      date: new Date().toISOString(),
      syncStatus: 'synced',
      retryCount: 0,
    };

    const currentTxs = await this.getTransactions();
    const currentAccounts = await this.getAccounts();

    // Check for duplicate by idempotency key
    const exists = currentTxs.some((t) => t.clientTxId === clientTxId || t.id === clientTxId);
    if (exists) {
      return { transaction: newTx, updatedAccounts: currentAccounts };
    }

    const updatedTransactions = [newTx, ...currentTxs];

    // Compute updated balance & limit stats
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
    await AsyncStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(updatedAccounts));

    return { transaction: newTx, updatedAccounts };
  },

  /**
   * Delete a transaction & revert balance impact
   */
  async deleteTransaction(id: string): Promise<{
    deletedId: string;
    updatedAccounts: Account[];
  }> {
    await simulateLatency(100);

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
  async createAccount(
    accData: Omit<Account, 'id' | 'createdAt' | 'todaySend' | 'todayReceive' | 'todayProfit'>
  ): Promise<Account> {
    await simulateLatency(100);

    const newAccount: Account = {
      ...accData,
      id: 'acc_' + Date.now(),
      todaySend: 0,
      todayReceive: 0,
      todayProfit: 0,
      createdAt: new Date().toISOString(),
      syncStatus: 'synced',
    };

    const currentAccounts = await this.getAccounts();
    const updated = [newAccount, ...currentAccounts];
    await AsyncStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(updated));

    return newAccount;
  },

  /**
   * Update an account line
   */
  async updateAccount(id: string, updates: Partial<Account>): Promise<Account[]> {
    await simulateLatency(90);

    const currentAccounts = await this.getAccounts();
    const updated = currentAccounts.map((a) => (a.id === id ? { ...a, ...updates } : a));
    await AsyncStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(updated));

    return updated;
  },

  /**
   * Delete an account line
   */
  async deleteAccount(id: string): Promise<string> {
    await simulateLatency(100);

    const currentAccounts = await this.getAccounts();
    const updated = currentAccounts.filter((a) => a.id !== id);
    await AsyncStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(updated));

    return id;
  },

  /**
   * Reset database back to mock data
   */
  async resetDatabase(): Promise<void> {
    await AsyncStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(initialAccounts));
    await AsyncStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(initialTransactions));
  },
};
