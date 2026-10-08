import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { Account, Transaction, DailyProfitRecord, LedgerMetrics } from '../../types/ledger';
import syncServiceInstance, { syncService as namedSyncService } from '../sync/syncService';
const syncService = syncServiceInstance || namedSyncService;
import { parseDate, isSameDay, isSameMonth } from '../../utils/formatters';

const checkIsOnline = async (): Promise<boolean> => {
  try {
    const net = await NetInfo.fetch();
    return Boolean(net.isConnected && (net.isInternetReachable ?? true));
  } catch {
    return false;
  }
};

const ACCOUNTS_STORAGE_KEY = '@finora_accounts_v4';
const TRANSACTIONS_STORAGE_KEY = '@finora_transactions_v4';
const DAILY_PROFITS_STORAGE_KEY = '@finora_daily_profits_v4';

const sanitizeTransactions = (txList: Transaction[]): Transaction[] => {
  return txList
    .filter((t) => t.type !== 'co' && t.type !== 'cash_out')
    .map((t) => {
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
  TIMEOUT_MS: 4500,
};

let currentAuthToken: string | null = null;

/**
 * Set or clear session authorization token for API requests
 */
export const setAuthToken = (token: string | null) => {
  currentAuthToken = token;
};

/**
 * Robust & Secure HTTP client wrapper with timeout, AbortController & Secure Client identification
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
        'X-Client-App': 'Finora-Secure-Client',
        'X-Requested-With': 'XMLHttpRequest',
        ...(currentAuthToken ? { Authorization: `Bearer ${currentAuthToken}` } : {}),
        ...(options.headers || {}),
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      // Sanitize error message to prevent leaking internal backend / database stack traces
      let safeMessage = `Request failed (${response.status})`;
      if (typeof errorBody?.message === 'string' && errorBody.message.length < 120 && !errorBody.message.includes('at ')) {
        safeMessage = errorBody.message;
      }
      throw new Error(safeMessage);
    }

    const data = await response.json();
    return data?.data ?? data;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') throw new Error('Request timed out. Please check your connection.');
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
      return [];
    } catch {
      return [];
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
          const serverTxs = sanitizeTransactions(rawTxs);
          const localData = await AsyncStorage.getItem(TRANSACTIONS_STORAGE_KEY);
          let mergedTxs = serverTxs;
          if (localData) {
            try {
              const localTxs: Transaction[] = JSON.parse(localData);
              const pendingTxs = localTxs.filter((t) => t.syncStatus === 'pending');
              if (pendingTxs.length > 0) {
                const serverIdSet = new Set(serverTxs.map((t) => t.id));
                const pendingToPrepend = pendingTxs.filter((p) => !serverIdSet.has(p.id));
                mergedTxs = [...pendingToPrepend, ...serverTxs];
              }
            } catch {
              // Graceful fallback
            }
          }
          await AsyncStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(mergedTxs));
          return mergedTxs;
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
        const sanitized = sanitizeTransactions(parsed);
        if (sanitized.length !== parsed.length) {
          await AsyncStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(sanitized));
        }
        return sanitized;
      }
      return [];
    } catch {
      return [];
    }
  },

  /**
   * Fetch Daily Profit history
   */
  async getDailyProfits(): Promise<DailyProfitRecord[]> {
    try {
      const data = await AsyncStorage.getItem(DAILY_PROFITS_STORAGE_KEY);
      if (data) return JSON.parse(data);
      return [];
    } catch {
      return [];
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
      accountName: txData.accountName || targetAccount?.name || 'Account',
      accountNumber: txData.accountNumber || targetAccount?.accountNumber || '',
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
      const isOnline = await checkIsOnline();
      if (!isOnline) {
        newTx.syncStatus = 'pending';
        await syncService.enqueueTransaction({ ...newTx, clientTxId });
      } else {
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
    }

    // Update account balances & limits
    const isTxToday = isSameDay(newTx.date);
    const isTxThisMonth = isSameMonth(newTx.date);

    const updatedAccounts = currentAccounts.map((acc) => {
      if (acc.id === txData.accountId) {
        let newBalance = acc.balance;
        let newTodaySend = acc.todaySend;
        let newTodayReceive = acc.todayReceive;
        let newTodayProfit = acc.todayProfit + (isTxToday ? marginAmount : 0);
        let newTotalMargin = (acc.totalMargin || 0) + marginAmount;
        let newMonthlyLimitUsed = acc.monthlyLimitUsed || 0;

        if (isInflow) {
          newBalance += txData.amount;
          if (isTxToday) newTodayReceive += txData.amount;
        } else if (isOutflow) {
          newBalance -= txData.amount + (txData.cost || 0);
          if (isTxToday) newTodaySend += txData.amount;
          if (isTxThisMonth && (txData.type === 'sm' || txData.type === 'send_money')) {
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
      const isOnline = await checkIsOnline();
      if (!isOnline) {
        await syncService.enqueueUpdateTransaction(id, updates);
      } else {
        try {
          await httpRequest(`/transactions/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
          });
        } catch {
          await syncService.enqueueUpdateTransaction(id, updates);
        }
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
    const isOldToday = isSameDay(oldTx.date);
    const isOldThisMonth = isSameMonth(oldTx.date);

    const newOutflow = updatedTx.type === 'sm' || updatedTx.type === 'co' || updatedTx.type === 'send' || updatedTx.type === 'send_money' || updatedTx.type === 'cash_out' || updatedTx.type === 'b2b';
    const newInflow = updatedTx.type === 'recev' || updatedTx.type === 'receive_money' || updatedTx.type === 'cash_in';
    const newProfit = updatedTx.margin || updatedTx.profit || 0;
    const isNewToday = isSameDay(updatedTx.date);
    const isNewThisMonth = isSameMonth(updatedTx.date);

    const updatedAccounts = currentAccounts.map((acc) => {
      let balance = acc.balance;
      let todaySend = acc.todaySend;
      let todayReceive = acc.todayReceive;
      let todayProfit = acc.todayProfit;
      let totalMargin = acc.totalMargin || 0;
      let monthlyLimitUsed = acc.monthlyLimitUsed || 0;

      // 1. Revert old transaction if this account was the source
      if (acc.id === oldTx.accountId) {
        if (oldOutflow) {
          balance += oldTx.amount + (oldTx.cost || 0);
          if (isOldToday) todaySend = Math.max(0, todaySend - oldTx.amount);
          if (isOldThisMonth && (oldTx.type === 'sm' || oldTx.type === 'send_money')) {
            monthlyLimitUsed = Math.max(0, monthlyLimitUsed - oldTx.amount);
          }
        } else if (oldInflow) {
          balance -= oldTx.amount;
          if (isOldToday) todayReceive = Math.max(0, todayReceive - oldTx.amount);
        } else if (oldTx.type === 'adjustment') {
          balance -= oldTx.amount;
        }
        if (isOldToday) todayProfit = Math.max(0, todayProfit - oldProfit);
        totalMargin = Math.max(0, totalMargin - oldProfit);
      }

      // 2. Apply updated transaction if this account is the target
      if (acc.id === updatedTx.accountId) {
        if (newOutflow) {
          balance -= updatedTx.amount + (updatedTx.cost || 0);
          if (isNewToday) todaySend += updatedTx.amount;
          if (isNewThisMonth && (updatedTx.type === 'sm' || updatedTx.type === 'send_money')) {
            monthlyLimitUsed += updatedTx.amount;
          }
        } else if (newInflow) {
          balance += updatedTx.amount;
          if (isNewToday) todayReceive += updatedTx.amount;
        } else if (updatedTx.type === 'adjustment') {
          balance += updatedTx.amount;
        }
        if (isNewToday) todayProfit += newProfit;
        totalMargin += newProfit;
      }

      if (acc.id === oldTx.accountId || acc.id === updatedTx.accountId) {
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
      const isOnline = await checkIsOnline();
      if (!isOnline) {
        await syncService.enqueueDeleteTransaction(id);
      } else {
        try {
          await httpRequest(`/transactions/${id}`, { method: 'DELETE' });
        } catch {
          await syncService.enqueueDeleteTransaction(id);
        }
      }
    }

    const currentTxs = await this.getTransactions();
    const currentAccounts = await this.getAccounts();

    const txToDelete = currentTxs.find((t) => t.id === id);
    if (!txToDelete) throw new Error('Transaction not found');

    const updatedTransactions = currentTxs.filter((t) => t.id !== id);

    const isTxToday = isSameDay(txToDelete.date);
    const isTxThisMonth = isSameMonth(txToDelete.date);

    const updatedAccounts = currentAccounts.map((acc) => {
      if (acc.id === txToDelete.accountId) {
        let newBalance = acc.balance;
        let newTodaySend = acc.todaySend;
        let newTodayReceive = acc.todayReceive;
        let newTodayProfit = acc.todayProfit;
        let newTotalMargin = Math.max(0, (acc.totalMargin || 0) - (txToDelete.margin || txToDelete.profit || 0));
        let newMonthlyLimitUsed = acc.monthlyLimitUsed || 0;

        const isOutflow = txToDelete.type === 'sm' || txToDelete.type === 'co' || txToDelete.type === 'send' || txToDelete.type === 'send_money' || txToDelete.type === 'cash_out' || txToDelete.type === 'b2b';
        const isInflow = txToDelete.type === 'recev' || txToDelete.type === 'receive_money' || txToDelete.type === 'cash_in';

        if (isOutflow) {
          newBalance += txToDelete.amount + (txToDelete.cost || 0);
          if (isTxToday) newTodaySend = Math.max(0, newTodaySend - txToDelete.amount);
          if (isTxThisMonth && (txToDelete.type === 'sm' || txToDelete.type === 'send_money')) {
            newMonthlyLimitUsed = Math.max(0, newMonthlyLimitUsed - txToDelete.amount);
          }
        } else if (isInflow) {
          newBalance -= txToDelete.amount;
          if (isTxToday) newTodayReceive = Math.max(0, newTodayReceive - txToDelete.amount);
        } else if (txToDelete.type === 'adjustment') {
          newBalance -= txToDelete.amount;
        }

        if (isTxToday) {
          newTodayProfit = Math.max(0, acc.todayProfit - (txToDelete.margin || txToDelete.profit || 0));
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
    // 1. Check for duplicates BEFORE network call or queueing
    const currentAccounts = await this.getAccounts();
    const cleanNum = accData.accountNumber.replace(/[\s\-\(\)]/g, '');
    const isDup = currentAccounts.some(
      (a) => a.accountNumber.replace(/[\s\-\(\)]/g, '') === cleanNum
    );
    if (isDup) {
      throw new Error('This phone number already exists in your accounts.');
    }

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
      const isOnline = await checkIsOnline();
      if (!isOnline) {
        newAccount.syncStatus = 'pending';
        await syncService.enqueueCreateAccount(newAccount);
      } else {
        try {
          const created = await httpRequest<Account>('/accounts', { method: 'POST', body: JSON.stringify(newAccount) });
          if (created?.id) newAccount = created;
        } catch {
          newAccount.syncStatus = 'pending';
          await syncService.enqueueCreateAccount(newAccount);
        }
      }
    }

    const updated = [newAccount, ...currentAccounts];
    await AsyncStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(updated));

    return newAccount;
  },

  /**
   * Update an account line
   */
  async updateAccount(id: string, updates: Partial<Account>): Promise<Account[]> {
    if (!API_CONFIG.USE_MOCK_STORAGE) {
      const isOnline = await checkIsOnline();
      if (!isOnline) {
        await syncService.enqueueUpdateAccount(id, updates);
      } else {
        try {
          await httpRequest(`/accounts/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(updates),
          });
        } catch {
          await syncService.enqueueUpdateAccount(id, updates);
        }
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
      const isOnline = await checkIsOnline();
      if (!isOnline) {
        await syncService.enqueueDeleteAccount(id);
      } else {
        try {
          await httpRequest(`/accounts/${id}`, { method: 'DELETE' });
        } catch {
          await syncService.enqueueDeleteAccount(id);
        }
      }
    }

    const currentAccounts = await this.getAccounts();
    const updated = currentAccounts.filter((a) => a.id !== id);
    await AsyncStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(updated));

    // Cascade delete: remove all transactions under this account
    const currentTxs = await this.getTransactions();
    const updatedTxs = currentTxs.filter((t) => t.accountId !== id);
    await AsyncStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(updatedTxs));

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

    let monthlyIncome = 0;
    let monthlyExpense = 0;

    for (let i = 0; i < txs.length; i++) {
      const t = txs[i];
      if (isSameMonth(t.date)) {
        if (t.type === 'recev' || t.type === 'receive_money' || t.type === 'cash_in') {
          monthlyIncome += t.amount;
        } else if (
          t.type === 'sm' ||
          t.type === 'co' ||
          t.type === 'send' ||
          t.type === 'send_money' ||
          t.type === 'cash_out' ||
          t.type === 'b2b'
        ) {
          monthlyExpense += t.amount;
        }
      }
    }

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
        const res = await httpRequest<{ syncedIds?: string[]; failedIds?: string[] }>('/transactions/sync', {
          method: 'POST',
          body: JSON.stringify({ items }),
        });
        const synced = res?.syncedIds || [];
        if (synced.length > 0) {
          await this.markTransactionsAsSynced(synced);
        }
        return {
          syncedIds: synced,
          failedIds: res?.failedIds || [],
        };
      } catch {
        // Fallback: If /transactions/sync is not available, execute item-by-item
        const syncedIds: string[] = [];
        const failedIds: string[] = [];

        for (const item of items) {
          try {
            if (item.type === 'CREATE_TRANSACTION') {
              await httpRequest('/transactions', {
                method: 'POST',
                headers: { 'X-Idempotency-Key': item.clientTxId },
                body: JSON.stringify(item.payload),
              });
              syncedIds.push(item.clientTxId || item.id);
            } else if (item.type === 'UPDATE_TRANSACTION') {
              await httpRequest(`/transactions/${item.payload.id}`, {
                method: 'PUT',
                body: JSON.stringify(item.payload.updates),
              });
              syncedIds.push(item.id);
            } else if (item.type === 'DELETE_TRANSACTION') {
              await httpRequest(`/transactions/${item.payload.id}`, {
                method: 'DELETE',
              });
              syncedIds.push(item.id);
            } else if (item.type === 'CREATE_ACCOUNT') {
              await httpRequest('/accounts', {
                method: 'POST',
                body: JSON.stringify(item.payload),
              });
              syncedIds.push(item.id);
            } else if (item.type === 'UPDATE_ACCOUNT') {
              await httpRequest(`/accounts/${item.payload.id}`, {
                method: 'PATCH',
                body: JSON.stringify(item.payload.updates),
              });
              syncedIds.push(item.id);
            } else if (item.type === 'DELETE_ACCOUNT') {
              await httpRequest(`/accounts/${item.payload.id}`, {
                method: 'DELETE',
              });
              syncedIds.push(item.id);
            } else {
              syncedIds.push(item.id);
            }
          } catch {
            failedIds.push(item.id);
          }
        }

        if (syncedIds.length > 0) {
          await this.markTransactionsAsSynced(syncedIds);
        }

        return { syncedIds, failedIds };
      }
    }
    return { syncedIds: items.map((i) => i.clientTxId || i.id), failedIds: [] };
  },

  /**
   * Helper to mark local transactions as 'synced' in AsyncStorage
   */
  async markTransactionsAsSynced(syncedIds: string[]): Promise<void> {
    try {
      const data = await AsyncStorage.getItem(TRANSACTIONS_STORAGE_KEY);
      if (!data) return;
      const txs: Transaction[] = JSON.parse(data);
      const set = new Set(syncedIds);
      let changed = false;
      const updated = txs.map((t) => {
        if ((set.has(t.id) || (t.clientTxId && set.has(t.clientTxId))) && t.syncStatus === 'pending') {
          changed = true;
          return { ...t, syncStatus: 'synced' as const };
        }
        return t;
      });
      if (changed) {
        await AsyncStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(updated));
      }
    } catch {
      // Ignore
    }
  },

  /**
   * Reset local database cache to force fresh pull from live server
   */
  async resetDatabase(): Promise<void> {
    await AsyncStorage.removeItem(ACCOUNTS_STORAGE_KEY);
    await AsyncStorage.removeItem(TRANSACTIONS_STORAGE_KEY);
    await AsyncStorage.removeItem(DAILY_PROFITS_STORAGE_KEY);
  },
};

// Register sync executor safely
if (syncService && typeof syncService.setSyncExecutor === 'function') {
  syncService.setSyncExecutor((items) => ledgerApi.syncBatchTransactions(items));
}