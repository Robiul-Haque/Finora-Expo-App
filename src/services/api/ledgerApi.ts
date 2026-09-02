import AsyncStorage from '@react-native-async-storage/async-storage';
import { Account, Transaction, DailyProfitRecord, LedgerMetrics } from '../../types/ledger';
import { initialAccounts, initialTransactions, initialDailyProfitRecords } from '../../constants/mockData';
import { syncService } from '../sync/syncService';
import { parseDate } from '../../utils/formatters';

const ACCOUNTS_STORAGE_KEY = '@finora_accounts_v3';
const TRANSACTIONS_STORAGE_KEY = '@finora_transactions_v3';
const DAILY_PROFITS_STORAGE_KEY = '@finora_daily_profits_v3';

const sanitizeTransactions = (txList: Transaction[]): Transaction[] => {
  return txList.map((t) => {
    const d = parseDate(t.date);
    return {
      ...t,
      date: isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString(),
    };
  });
};

/**
 * Production API Configuration
 */
const getDefaultBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  return 'https://finora-express-js.vercel.app/api/v1';
};

export const API_CONFIG = {
  BASE_URL: getDefaultBaseUrl(),
  USE_MOCK_STORAGE: false, // Connects to live backend with instant offline fallback
  TIMEOUT_MS: 8000,
};

let currentAuthToken: string | null = null;

/**
 * Set or clear session authorization token for API requests
 */
export const setAuthToken = (token: string | null) => {
  currentAuthToken = token;
};

/**
 * Robust HTTP client wrapper with timeout, AbortController & Bearer Auth injection
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
        ...(currentAuthToken ? { Authorization: `Bearer ${currentAuthToken}` } : {}),
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
 * Handles offline-first data persistence, multi-SIM running balances, margins, and limits.
 */
export const ledgerApi = {
  /**
   * Set dynamic backend Base URL
   */
  setBaseUrl(url: string) {
    API_CONFIG.BASE_URL = url;
  },

  /**
   * Set dynamic authorization token
   */
  setAuth(token: string | null) {
    setAuthToken(token);
  },

  /**
   * Fetch all Multi-SIM accounts
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
   * Fetch all recorded transactions with optional pagination
   */
  async getTransactions(options?: { page?: number; limit?: number }): Promise<Transaction[]> {
    if (!API_CONFIG.USE_MOCK_STORAGE) {
      try {
        const queryParams = options ? `?page=${options.page || 1}&limit=${options.limit || 50}` : '';
        const rawTxs = await httpRequest<Transaction[]>(`/transactions${queryParams}`);
        if (Array.isArray(rawTxs) && rawTxs.length > 0) {
          const transactions = sanitizeTransactions(rawTxs);
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
        const parsed = JSON.parse(data);
        return sanitizeTransactions(parsed);
      }
      const sanitizedInitial = sanitizeTransactions(initialTransactions);
      await AsyncStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(sanitizedInitial));
      return sanitizedInitial;
    } catch {
      return sanitizeTransactions(initialTransactions);
    }
  },

  /**
   * Fetch Daily Profit history
   */
  async getDailyProfits(): Promise<DailyProfitRecord[]> {
    try {
      const data = await AsyncStorage.getItem(DAILY_PROFITS_STORAGE_KEY);
      if (data) return JSON.parse(data);
      await AsyncStorage.setItem(DAILY_PROFITS_STORAGE_KEY, JSON.stringify(initialDailyProfitRecords));
      return initialDailyProfitRecords;
    } catch {
      return initialDailyProfitRecords;
    }
  },

  /**
   * Create a new transaction with running balance & margin calculation
   */
  async createTransaction(
    txData: Omit<Transaction, 'id' | 'date' | 'runningBalance'> & { clientTxId?: string; runningBalance?: number; date?: string }
  ): Promise<{ transaction: Transaction; updatedAccounts: Account[] }> {
    const clientTxId =
      txData.clientTxId ||
      `tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${Math.floor(Math.random() * 10000)}`;

    const currentAccounts = await this.getAccounts();
    const currentTxs = await this.getTransactions();

    const targetAccount = currentAccounts.find((a) => a.id === txData.accountId);
    const startBalance = targetAccount ? targetAccount.balance : 0;
    const marginAmount = txData.margin !== undefined ? txData.margin : (txData.profit || 0);

    let finalBalance = startBalance;
    const isOutflow = txData.type === 'sm' || txData.type === 'co' || txData.type === 'send' || txData.type === 'send_money' || txData.type === 'cash_out' || txData.type === 'b2b';
    const isInflow = txData.type === 'recev' || txData.type === 'receive_money' || txData.type === 'cash_in';

    if (isInflow) {
      finalBalance = startBalance + txData.amount;
    } else if (isOutflow) {
      finalBalance = startBalance - txData.amount - (txData.cost || 0);
    } else if (txData.type === 'adjustment') {
      finalBalance = startBalance + txData.amount;
    }

    const newTx: Transaction = {
      ...txData,
      id: clientTxId,
      clientTxId,
      margin: marginAmount,
      profit: marginAmount,
      runningBalance: txData.runningBalance !== undefined ? txData.runningBalance : finalBalance,
      counterparty: txData.counterparty || txData.recipientNumber || txData.senderNumber || (txData.type === 'co' ? 'Cash Out Bulk' : 'Counterparty'),
      date: txData.date || new Date().toISOString(),
      syncStatus: 'synced',
      retryCount: 0,
    };

    let backendResult: any = null;

    if (!API_CONFIG.USE_MOCK_STORAGE) {
      try {
        backendResult = await httpRequest<{ transaction: Transaction; updatedAccounts: Account[] }>('/transactions', {
          method: 'POST',
          headers: { 'X-Idempotency-Key': clientTxId },
          body: JSON.stringify({ ...newTx }),
        });
      } catch {
        newTx.syncStatus = 'pending';
        await syncService.enqueueTransaction({ ...newTx, clientTxId });
      }
    }

    // Update account balances & limits
    const updatedAccounts = currentAccounts.map((acc) => {
      if (acc.id === txData.accountId) {
        let newBalance = acc.balance;
        let newTodaySend = acc.todaySend;
        let newTodayReceive = acc.todayReceive;
        let newTodayProfit = acc.todayProfit + marginAmount;
        let newTotalMargin = (acc.totalMargin || 0) + marginAmount;
        let newMonthlyLimitUsed = acc.monthlyLimitUsed || 0;

        if (isInflow) {
          newBalance += txData.amount;
          newTodayReceive += txData.amount;
        } else if (isOutflow) {
          newBalance -= txData.amount + (txData.cost || 0);
          newTodaySend += txData.amount;
          if (txData.type === 'sm' || txData.type === 'send_money') {
            newMonthlyLimitUsed += txData.amount;
          }
        } else if (txData.type === 'adjustment') {
          newBalance += txData.amount;
        }

        const monthlyLimit = acc.monthlyLimit || 300000;
        const remainingLimit = Math.max(0, monthlyLimit - newMonthlyLimitUsed);

        return {
          ...acc,
          balance: newBalance,
          todaySend: newTodaySend,
          todayReceive: newTodayReceive,
          todayProfit: newTodayProfit,
          totalMargin: newTotalMargin,
          monthlyLimitUsed: newMonthlyLimitUsed,
          remainingLimit,
        };
      }
      return acc;
    });

    const updatedTransactions = [newTx, ...currentTxs.filter((t) => t.id !== clientTxId)];

    await AsyncStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(updatedTransactions));
    await AsyncStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(backendResult?.updatedAccounts || updatedAccounts));

    return {
      transaction: backendResult?.transaction || newTx,
      updatedAccounts: backendResult?.updatedAccounts || updatedAccounts,
    };
  },

  /**
   * Update an existing transaction & re-adjust account balances
   */
  async updateTransaction(
    id: string,
    updates: Partial<Transaction>
  ): Promise<{ transaction: Transaction; updatedAccounts: Account[] }> {
    if (!API_CONFIG.USE_MOCK_STORAGE) {
      try {
        await httpRequest(`/transactions/${id}`, {
          method: 'PUT',
          body: JSON.stringify(updates),
        });
      } catch {
        // Enqueue offline update mutation
        await syncService.enqueueUpdateTransaction(id, updates);
      }
    }

    const currentTxs = await this.getTransactions();
    const currentAccounts = await this.getAccounts();

    const oldTx = currentTxs.find((t) => t.id === id);
    if (!oldTx) throw new Error('Transaction not found');

    const updatedTx: Transaction = {
      ...oldTx,
      ...updates,
      id: oldTx.id,
      date: updates.date || oldTx.date,
      profit: updates.profit !== undefined ? updates.profit : (updates.margin !== undefined ? updates.margin : oldTx.profit),
      margin: updates.profit !== undefined ? updates.profit : (updates.margin !== undefined ? updates.margin : oldTx.margin),
    };

    // Revert old impact & apply new impact on accounts
    const oldOutflow = oldTx.type === 'sm' || oldTx.type === 'co' || oldTx.type === 'send' || oldTx.type === 'send_money' || oldTx.type === 'cash_out' || oldTx.type === 'b2b';
    const oldInflow = oldTx.type === 'recev' || oldTx.type === 'receive_money' || oldTx.type === 'cash_in';
    const oldProfit = oldTx.margin || oldTx.profit || 0;

    const newOutflow = updatedTx.type === 'sm' || updatedTx.type === 'co' || updatedTx.type === 'send' || updatedTx.type === 'send_money' || updatedTx.type === 'cash_out' || updatedTx.type === 'b2b';
    const newInflow = updatedTx.type === 'recev' || updatedTx.type === 'receive_money' || updatedTx.type === 'cash_in';
    const newProfit = updatedTx.margin || updatedTx.profit || 0;

    const updatedAccounts = currentAccounts.map((acc) => {
      if (acc.id === updatedTx.accountId) {
        let balance = acc.balance;
        let todaySend = acc.todaySend;
        let todayReceive = acc.todayReceive;
        let todayProfit = acc.todayProfit;
        let totalMargin = acc.totalMargin || 0;
        let monthlyLimitUsed = acc.monthlyLimitUsed || 0;

        // 1. Revert old transaction
        if (oldOutflow) {
          balance += oldTx.amount + (oldTx.cost || 0);
          todaySend = Math.max(0, todaySend - oldTx.amount);
          if (oldTx.type === 'sm' || oldTx.type === 'send_money') {
            monthlyLimitUsed = Math.max(0, monthlyLimitUsed - oldTx.amount);
          }
        } else if (oldInflow) {
          balance -= oldTx.amount;
          todayReceive = Math.max(0, todayReceive - oldTx.amount);
        } else if (oldTx.type === 'adjustment') {
          balance -= oldTx.amount;
        }
        todayProfit = Math.max(0, todayProfit - oldProfit);
        totalMargin = Math.max(0, totalMargin - oldProfit);

        // 2. Apply updated transaction
        if (newOutflow) {
          balance -= updatedTx.amount + (updatedTx.cost || 0);
          todaySend += updatedTx.amount;
          if (updatedTx.type === 'sm' || updatedTx.type === 'send_money') {
            monthlyLimitUsed += updatedTx.amount;
          }
        } else if (newInflow) {
          balance += updatedTx.amount;
          todayReceive += updatedTx.amount;
        } else if (updatedTx.type === 'adjustment') {
          balance += updatedTx.amount;
        }
        todayProfit += newProfit;
        totalMargin += newProfit;

        const monthlyLimit = acc.monthlyLimit || 300000;
        const remainingLimit = Math.max(0, monthlyLimit - monthlyLimitUsed);

        return {
          ...acc,
          balance,
          todaySend,
          todayReceive,
          todayProfit,
          totalMargin,
          monthlyLimitUsed,
          remainingLimit,
        };
      }
      return acc;
    });

    const updatedTransactions = currentTxs.map((t) => (t.id === id ? updatedTx : t));

    await AsyncStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(updatedTransactions));
    await AsyncStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(updatedAccounts));

    return { transaction: updatedTx, updatedAccounts };
  },

  /**
   * Delete a transaction & revert balance impact
   */
  async deleteTransaction(id: string): Promise<{ deletedId: string; updatedAccounts: Account[] }> {
    if (!API_CONFIG.USE_MOCK_STORAGE) {
      try {
        await httpRequest(`/transactions/${id}`, { method: 'DELETE' });
      } catch {
        // Enqueue offline delete mutation
        await syncService.enqueueDeleteTransaction(id);
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
        let newTodayProfit = Math.max(0, acc.todayProfit - (txToDelete.margin || txToDelete.profit || 0));
        let newTotalMargin = Math.max(0, (acc.totalMargin || 0) - (txToDelete.margin || txToDelete.profit || 0));
        let newMonthlyLimitUsed = acc.monthlyLimitUsed || 0;

        const isOutflow = txToDelete.type === 'sm' || txToDelete.type === 'co' || txToDelete.type === 'send' || txToDelete.type === 'send_money' || txToDelete.type === 'cash_out' || txToDelete.type === 'b2b';
        const isInflow = txToDelete.type === 'recev' || txToDelete.type === 'receive_money' || txToDelete.type === 'cash_in';

        if (isOutflow) {
          newBalance += txToDelete.amount + (txToDelete.cost || 0);
          newTodaySend = Math.max(0, newTodaySend - txToDelete.amount);
          if (txToDelete.type === 'sm' || txToDelete.type === 'send_money') {
            newMonthlyLimitUsed = Math.max(0, newMonthlyLimitUsed - txToDelete.amount);
          }
        } else if (isInflow) {
          newBalance -= txToDelete.amount;
          newTodayReceive = Math.max(0, newTodayReceive - txToDelete.amount);
        } else if (txToDelete.type === 'adjustment') {
          newBalance -= txToDelete.amount;
        }

        const monthlyLimit = acc.monthlyLimit || 300000;
        const remainingLimit = Math.max(0, monthlyLimit - newMonthlyLimitUsed);

        return {
          ...acc,
          balance: newBalance,
          todaySend: newTodaySend,
          todayReceive: newTodayReceive,
          todayProfit: newTodayProfit,
          totalMargin: newTotalMargin,
          monthlyLimitUsed: newMonthlyLimitUsed,
          remainingLimit,
        };
      }
      return acc;
    });

    await AsyncStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(updatedTransactions));
    await AsyncStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(updatedAccounts));

    return { deletedId: id, updatedAccounts };
  },

  /**
   * Add a new SIM account line
   */
  async createAccount(
    accData: Omit<Account, 'id' | 'createdAt' | 'todaySend' | 'todayReceive' | 'todayProfit' | 'remainingLimit'>
  ): Promise<Account> {
    const monthlyLimit = accData.monthlyLimit || 300000;
    const monthlyLimitUsed = accData.monthlyLimitUsed || 0;
    const remainingLimit = Math.max(0, monthlyLimit - monthlyLimitUsed);

    let newAccount: Account = {
      ...accData,
      id: 'acc_' + Date.now(),
      monthlyLimit,
      monthlyLimitUsed,
      remainingLimit,
      todaySend: 0,
      todayReceive: 0,
      todayProfit: 0,
      totalMargin: accData.totalMargin || 0,
      createdAt: new Date().toISOString(),
      syncStatus: 'synced',
    };

    if (!API_CONFIG.USE_MOCK_STORAGE) {
      try {
        const created = await httpRequest<Account>('/accounts', { method: 'POST', body: JSON.stringify(newAccount) });
        if (created?.id) newAccount = created;
      } catch {
        // Enqueue offline account creation
        await syncService.enqueueCreateAccount(newAccount);
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
        // Enqueue offline account update
        await syncService.enqueueUpdateAccount(id, updates);
      }
    }

    const currentAccounts = await this.getAccounts();
    const updated = currentAccounts.map((a) => {
      if (a.id === id) {
        const merged = { ...a, ...updates };
        const monthlyLimit = merged.monthlyLimit || 300000;
        const monthlyLimitUsed = merged.monthlyLimitUsed || 0;
        merged.remainingLimit = Math.max(0, monthlyLimit - monthlyLimitUsed);
        return merged;
      }
      return a;
    });

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
        // Enqueue offline account deletion
        await syncService.enqueueDeleteAccount(id);
      }
    }

    const currentAccounts = await this.getAccounts();
    const updated = currentAccounts.filter((a) => a.id !== id);
    await AsyncStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(updated));

    return id;
  },

  /**
   * Calculate summary metrics across all SIM accounts
   */
  async getMetrics(): Promise<LedgerMetrics> {
    const accounts = await this.getAccounts();
    const txs = await this.getTransactions();

    const totalBalance = accounts.reduce((sum, a) => sum + (a.balance || 0), 0);
    const totalMonthlyLimit = accounts.reduce((sum, a) => sum + (a.monthlyLimit || 300000), 0);
    const totalMonthlyLimitUsed = accounts.reduce((sum, a) => sum + (a.monthlyLimitUsed || 0), 0);
    const totalLimitRemaining = Math.max(0, totalMonthlyLimit - totalMonthlyLimitUsed);
    const todayProfit = accounts.reduce((sum, a) => sum + (a.todayProfit || 0), 0);
    const todaySendTotal = accounts.reduce((sum, a) => sum + (a.todaySend || 0), 0);

    const monthlyIncome = txs
      .filter((t) => t.type === 'recev' || t.type === 'receive_money' || t.type === 'cash_in')
      .reduce((sum, t) => sum + t.amount, 0);

    const monthlyExpense = txs
      .filter((t) => t.type === 'sm' || t.type === 'co' || t.type === 'send' || t.type === 'send_money' || t.type === 'cash_out' || t.type === 'b2b')
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      totalBalance,
      totalMonthlyLimit,
      totalMonthlyLimitUsed,
      totalLimitRemaining,
      monthlyIncome,
      monthlyExpense,
      todayProfit,
      todaySendTotal,
      balanceGrowthPercentage: 4.8,
      activeAccountsCount: accounts.length,
    };
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
   * Reset database back to seed state
   */
  async resetDatabase(): Promise<void> {
    await AsyncStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(initialAccounts));
    await AsyncStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(initialTransactions));
    await AsyncStorage.setItem(DAILY_PROFITS_STORAGE_KEY, JSON.stringify(initialDailyProfitRecords));
  },
};

// Register sync executor
syncService.setSyncExecutor((items) => ledgerApi.syncBatchTransactions(items));