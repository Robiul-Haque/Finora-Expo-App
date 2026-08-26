import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Account, Transaction, FilterOptions, LedgerMetrics, TransactionType } from '../types/ledger';
import { initialAccounts, initialTransactions } from '../constants/mockData';

interface LedgerContextType {
  accounts: Account[];
  transactions: Transaction[];
  metrics: LedgerMetrics;
  filters: FilterOptions;
  filteredTransactions: Transaction[];
  setFilters: (newFilters: Partial<FilterOptions>) => void;
  resetFilters: () => void;
  addTransaction: (tx: Omit<Transaction, 'id' | 'date'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addAccount: (acc: Omit<Account, 'id' | 'createdAt' | 'todaySend' | 'todayReceive' | 'todayProfit'>) => Promise<void>;
  updateAccount: (id: string, updates: Partial<Account>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  getAccountById: (id: string) => Account | undefined;
  resetToMockData: () => Promise<void>;
  isLoading: boolean;
}

const defaultFilters: FilterOptions = {
  accountId: 'all',
  type: 'all',
  dateRange: 'all',
  sortBy: 'newest',
  searchQuery: '',
};

const ACCOUNTS_STORAGE_KEY = '@finora_accounts_v1';
const TRANSACTIONS_STORAGE_KEY = '@finora_transactions_v1';

const LedgerContext = createContext<LedgerContextType>({} as LedgerContextType);

export const LedgerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [filters, setFiltersState] = useState<FilterOptions>(defaultFilters);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load from local storage
  useEffect(() => {
    const loadStoredData = async () => {
      try {
        const storedAccounts = await AsyncStorage.getItem(ACCOUNTS_STORAGE_KEY);
        const storedTransactions = await AsyncStorage.getItem(TRANSACTIONS_STORAGE_KEY);

        if (storedAccounts) {
          setAccounts(JSON.parse(storedAccounts));
        } else {
          await AsyncStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(initialAccounts));
        }

        if (storedTransactions) {
          setTransactions(JSON.parse(storedTransactions));
        } else {
          await AsyncStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(initialTransactions));
        }
      } catch (error) {
        console.error('Error loading ledger data from AsyncStorage:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStoredData();
  }, []);

  // Save changes to storage
  const saveAccounts = async (newAccounts: Account[]) => {
    setAccounts(newAccounts);
    try {
      await AsyncStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(newAccounts));
    } catch (e) {
      console.error('Error saving accounts:', e);
    }
  };

  const saveTransactions = async (newTransactions: Transaction[]) => {
    setTransactions(newTransactions);
    try {
      await AsyncStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(newTransactions));
    } catch (e) {
      console.error('Error saving transactions:', e);
    }
  };

  const setFilters = (newFilters: Partial<FilterOptions>) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }));
  };

  const resetFilters = () => {
    setFiltersState(defaultFilters);
  };

  // Add new transaction and balance updates
  const addTransaction = async (txData: Omit<Transaction, 'id' | 'date'>) => {
    const newTx: Transaction = {
      ...txData,
      id: 'tx_' + Date.now(),
      date: new Date().toISOString(),
    };

    const updatedTransactions = [newTx, ...transactions];

    // Update account balances & limits
    const updatedAccounts = accounts.map((acc) => {
      if (acc.id === txData.accountId) {
        let newBalance = acc.balance;
        let newTodaySend = acc.todaySend;
        let newTodayReceive = acc.todayReceive;
        let newTodayProfit = acc.todayProfit + (txData.profit || 0);

        if (txData.type === 'send_money' || txData.type === 'cash_out') {
          newBalance -= txData.amount + (txData.cost || 0);
          newTodaySend += txData.amount;
        } else if (txData.type === 'receive_money') {
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

    await saveTransactions(updatedTransactions);
    await saveAccounts(updatedAccounts);
  };

  const deleteTransaction = async (id: string) => {
    const txToDelete = transactions.find((t) => t.id === id);
    if (!txToDelete) return;

    const updatedTransactions = transactions.filter((t) => t.id !== id);

    // Revert account impact
    const updatedAccounts = accounts.map((acc) => {
      if (acc.id === txToDelete.accountId) {
        let newBalance = acc.balance;
        let newTodaySend = acc.todaySend;
        let newTodayReceive = acc.todayReceive;
        let newTodayProfit = Math.max(0, acc.todayProfit - (txToDelete.profit || 0));

        if (txToDelete.type === 'send_money' || txToDelete.type === 'cash_out') {
          newBalance += txToDelete.amount + (txToDelete.cost || 0);
          newTodaySend = Math.max(0, newTodaySend - txToDelete.amount);
        } else if (txToDelete.type === 'receive_money') {
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

    await saveTransactions(updatedTransactions);
    await saveAccounts(updatedAccounts);
  };

  const addAccount = async (
    accData: Omit<Account, 'id' | 'createdAt' | 'todaySend' | 'todayReceive' | 'todayProfit'>
  ) => {
    const newAccount: Account = {
      ...accData,
      id: 'acc_' + Date.now(),
      todaySend: 0,
      todayReceive: 0,
      todayProfit: 0,
      createdAt: new Date().toISOString(),
    };

    const updated = [newAccount, ...accounts];
    await saveAccounts(updated);
  };

  const updateAccount = async (id: string, updates: Partial<Account>) => {
    const updated = accounts.map((a) => (a.id === id ? { ...a, ...updates } : a));
    await saveAccounts(updated);
  };

  const deleteAccount = async (id: string) => {
    const updated = accounts.filter((a) => a.id !== id);
    await saveAccounts(updated);
  };

  const getAccountById = (id: string) => {
    return accounts.find((a) => a.id === id);
  };

  const resetToMockData = async () => {
    await saveAccounts(initialAccounts);
    await saveTransactions(initialTransactions);
  };

  // Metrics computation
  const metrics: LedgerMetrics = useMemo(() => {
    const totalBalance = accounts.reduce((sum, acc) => (acc.isActive ? sum + acc.balance : sum), 0);
    const todayProfit = accounts.reduce((sum, acc) => sum + (acc.todayProfit || 0), 0);
    const todaySendTotal = accounts.reduce((sum, acc) => sum + (acc.todaySend || 0), 0);

    // Calculate monthly income / expenses from transactions
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    let monthlyIncome = 0;
    let monthlyExpense = 0;

    transactions.forEach((tx) => {
      const txTime = new Date(tx.date).getTime();
      if (txTime >= startOfMonth) {
        if (tx.type === 'receive_money') {
          monthlyIncome += tx.amount;
        } else if (tx.type === 'send_money' || tx.type === 'cash_out') {
          monthlyExpense += tx.amount + (tx.cost || 0);
        }
      }
    });

    return {
      totalBalance,
      monthlyIncome: monthlyIncome || 45200,
      monthlyExpense: monthlyExpense || 28150,
      todayProfit: todayProfit || 850,
      todaySendTotal: todaySendTotal || 42000,
      balanceGrowthPercentage: 2.4,
    };
  }, [accounts, transactions]);

  // Filtered transactions computation
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 86400000;
    const startOfWeek = startOfToday - 7 * 86400000;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    let list = transactions.filter((tx) => {
      // Account filter
      if (filters.accountId !== 'all' && tx.accountId !== filters.accountId) {
        return false;
      }

      // Type filter
      if (filters.type !== 'all' && tx.type !== filters.type) {
        return false;
      }

      // Date range filter
      const txTime = new Date(tx.date).getTime();
      if (filters.dateRange === 'today' && txTime < startOfToday) {
        return false;
      }
      if (filters.dateRange === 'yesterday' && (txTime < startOfYesterday || txTime >= startOfToday)) {
        return false;
      }
      if (filters.dateRange === 'this_week' && txTime < startOfWeek) {
        return false;
      }
      if (filters.dateRange === 'this_month' && txTime < startOfMonth) {
        return false;
      }

      // Search query filter
      if (filters.searchQuery.trim()) {
        const query = filters.searchQuery.toLowerCase().trim();
        const matchesAccount = tx.accountNumber?.toLowerCase().includes(query) || tx.accountName?.toLowerCase().includes(query);
        const matchesRecipient = tx.recipientNumber?.toLowerCase().includes(query);
        const matchesSender = tx.senderNumber?.toLowerCase().includes(query);
        const matchesNote = tx.note?.toLowerCase().includes(query);
        const matchesAmount = tx.amount.toString().includes(query);

        if (!matchesAccount && !matchesRecipient && !matchesSender && !matchesNote && !matchesAmount) {
          return false;
        }
      }

      return true;
    });

    // Sorting
    list = [...list].sort((a, b) => {
      if (filters.sortBy === 'newest') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      if (filters.sortBy === 'oldest') {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      if (filters.sortBy === 'amount_high') {
        return b.amount - a.amount;
      }
      if (filters.sortBy === 'amount_low') {
        return a.amount - b.amount;
      }
      if (filters.sortBy === 'profit_high') {
        return (b.profit || 0) - (a.profit || 0);
      }
      return 0;
    });

    return list;
  }, [transactions, filters]);

  return (
    <LedgerContext.Provider
      value={{
        accounts,
        transactions,
        metrics,
        filters,
        filteredTransactions,
        setFilters,
        resetFilters,
        addTransaction,
        deleteTransaction,
        addAccount,
        updateAccount,
        deleteAccount,
        getAccountById,
        resetToMockData,
        isLoading,
      }}
    >
      {children}
    </LedgerContext.Provider>
  );
};

export const useLedger = () => useContext(LedgerContext);
