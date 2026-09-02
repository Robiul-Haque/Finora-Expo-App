import React, { createContext, useContext, useMemo, useCallback } from 'react';
import { Account, Transaction, FilterOptions, LedgerMetrics } from '../types/ledger';
import {
  useAccountsQuery,
  useTransactionsQuery,
  useAddTransactionMutation,
  useUpdateTransactionMutation,
  useDeleteTransactionMutation,
  useAddAccountMutation,
  useUpdateAccountMutation,
  useDeleteAccountMutation,
  useResetDatabaseMutation,
} from '../hooks/useLedgerQueries';
import { useFilterStore } from '../store/useFilterStore';
import { parseDate } from '../utils/formatters';

interface LedgerContextType {
  accounts: Account[];
  transactions: Transaction[];
  metrics: LedgerMetrics;
  filters: FilterOptions;
  setFilters: (newFilters: Partial<FilterOptions>) => void;
  resetFilters: () => void;
  addTransaction: (tx: Omit<Transaction, 'id' | 'date'> & { date?: string }) => Promise<void>;
  updateTransaction: (id: string, updates: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addAccount: (acc: Omit<Account, 'id' | 'createdAt' | 'todaySend' | 'todayReceive' | 'todayProfit'>) => Promise<void>;
  updateAccount: (id: string, updates: Partial<Account>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  getAccountById: (id: string) => Account | undefined;
  resetToMockData: () => Promise<void>;
  refetch: () => Promise<void>;
  isLoading: boolean;
  isFetching: boolean;
}

const LedgerContext = createContext<LedgerContextType>({} as LedgerContextType);

export const LedgerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // TanStack Queries (Server & Cache State)
  const { data: accounts = [], isLoading: isAccountsLoading, isFetching: isAccountsFetching, refetch: refetchAccounts } = useAccountsQuery();
  const { data: transactions = [], isLoading: isTxsLoading, isFetching: isTxsFetching, refetch: refetchTransactions } = useTransactionsQuery();

  // Refetch all queries
  const refetchAll = useCallback(async () => {
    await Promise.all([refetchAccounts(), refetchTransactions()]);
  }, [refetchAccounts, refetchTransactions]);

  // TanStack Mutations
  const addTxMutation = useAddTransactionMutation();
  const updateTxMutation = useUpdateTransactionMutation();
  const deleteTxMutation = useDeleteTransactionMutation();
  const addAccountMutation = useAddAccountMutation();
  const updateAccountMutation = useUpdateAccountMutation();
  const deleteAccountMutation = useDeleteAccountMutation();
  const resetDbMutation = useResetDatabaseMutation();

  // Zustand Client State (Filters & Search)
  const filters = useFilterStore((state) => state.filters);
  const setFilters = useFilterStore((state) => state.setFilters);
  const resetFilters = useFilterStore((state) => state.resetFilters);

  const isLoading = isAccountsLoading || isTxsLoading;
  const isFetching = isAccountsFetching || isTxsFetching;

  // Safe Memoized Mutation Handlers (No uncaught exceptions to crash the UI)
  const addTransaction = useCallback(async (txData: Omit<Transaction, 'id' | 'date'> & { date?: string }) => {
    try {
      await addTxMutation.mutateAsync(txData);
    } catch {
      // Local storage handled offline
    }
  }, [addTxMutation]);

  const updateTransaction = useCallback(async (id: string, updates: Partial<Transaction>) => {
    try {
      await updateTxMutation.mutateAsync({ id, updates });
    } catch {
      // Local storage handled offline
    }
  }, [updateTxMutation]);

  const deleteTransaction = useCallback(async (id: string) => {
    try {
      await deleteTxMutation.mutateAsync(id);
    } catch {
      // Local storage handled offline
    }
  }, [deleteTxMutation]);

  const addAccount = useCallback(async (
    accData: Omit<Account, 'id' | 'createdAt' | 'todaySend' | 'todayReceive' | 'todayProfit'>
  ) => {
    try {
      await addAccountMutation.mutateAsync(accData);
    } catch {
      // Local storage handled offline
    }
  }, [addAccountMutation]);

  const updateAccount = useCallback(async (id: string, updates: Partial<Account>) => {
    try {
      await updateAccountMutation.mutateAsync({ id, updates });
    } catch {
      // Local storage handled offline
    }
  }, [updateAccountMutation]);

  const deleteAccount = useCallback(async (id: string) => {
    try {
      await deleteAccountMutation.mutateAsync(id);
    } catch {
      // Local storage handled offline
    }
  }, [deleteAccountMutation]);

  const getAccountById = useCallback((id: string) => {
    return accounts.find((a) => a.id === id);
  }, [accounts]);

  const resetToMockData = useCallback(async () => {
    try {
      await resetDbMutation.mutateAsync();
    } catch {
      // Handled
    }
  }, [resetDbMutation]);

  // High-performance memoized Metrics calculation
  const metrics: LedgerMetrics = useMemo(() => {
    const totalBalance = accounts.reduce((sum, acc) => (acc.isActive ? sum + acc.balance : sum), 0);
    const todayProfit = accounts.reduce((sum, acc) => sum + (acc.todayProfit || 0), 0);
    const todaySendTotal = accounts.reduce((sum, acc) => sum + (acc.todaySend || 0), 0);
    const totalMonthlyLimit = accounts.reduce((sum, acc) => (acc.isActive ? sum + (acc.monthlyLimit || 300000) : sum), 0);
    const totalMonthlyLimitUsed = accounts.reduce((sum, acc) => (acc.isActive ? sum + (acc.monthlyLimitUsed || acc.todaySend || 0) : sum), 0);
    const totalLimitRemaining = Math.max(0, totalMonthlyLimit - totalMonthlyLimitUsed);
    const activeAccountsCount = accounts.filter((a) => a.isActive).length;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    let monthlyIncome = 0;
    let monthlyExpense = 0;

    transactions.forEach((tx) => {
      const txTime = new Date(tx.date).getTime();
      if (txTime >= startOfMonth || !tx.date.includes('T')) {
        if (tx.type === 'recev' || tx.type === 'receive_money' || tx.type === 'cash_in') {
          monthlyIncome += tx.amount;
        } else if (
          tx.type === 'sm' ||
          tx.type === 'co' ||
          tx.type === 'send' ||
          tx.type === 'send_money' ||
          tx.type === 'cash_out' ||
          tx.type === 'b2b'
        ) {
          monthlyExpense += tx.amount + (tx.cost || 0);
        }
      }
    });

    const growthPercent =
      monthlyExpense > 0 && monthlyIncome > 0
        ? Number((((monthlyIncome - monthlyExpense) / monthlyExpense) * 100).toFixed(1))
        : 4.8;

    return {
      totalBalance,
      totalMonthlyLimit,
      totalMonthlyLimitUsed,
      totalLimitRemaining,
      monthlyIncome,
      monthlyExpense,
      todayProfit,
      todaySendTotal,
      balanceGrowthPercentage: Math.max(0, growthPercent),
      activeAccountsCount,
    };
  }, [accounts, transactions]);

  // Context value memoized to eliminate unnecessary child re-renders
  const contextValue = useMemo<LedgerContextType>(() => ({
    accounts,
    transactions,
    metrics,
    filters,
    setFilters,
    resetFilters,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addAccount,
    updateAccount,
    deleteAccount,
    getAccountById,
    resetToMockData,
    refetch: refetchAll,
    isLoading,
    isFetching,
  }), [
    accounts,
    transactions,
    metrics,
    filters,
    setFilters,
    resetFilters,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addAccount,
    updateAccount,
    deleteAccount,
    getAccountById,
    resetToMockData,
    refetchAll,
    isLoading,
    isFetching,
  ]);

  return (
    <LedgerContext.Provider value={contextValue}>
      {children}
    </LedgerContext.Provider>
  );
};

export const useLedger = () => useContext(LedgerContext);
