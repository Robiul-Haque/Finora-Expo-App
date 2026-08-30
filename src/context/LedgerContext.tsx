import React, { createContext, useContext, useMemo, useCallback } from 'react';
import { Account, Transaction, FilterOptions, LedgerMetrics } from '../types/ledger';
import {
  useAccountsQuery,
  useTransactionsQuery,
  useAddTransactionMutation,
  useDeleteTransactionMutation,
  useAddAccountMutation,
  useUpdateAccountMutation,
  useDeleteAccountMutation,
  useResetDatabaseMutation,
} from '../hooks/useLedgerQueries';
import { useFilterStore } from '../store/useFilterStore';

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

  // Memoized Mutation Handlers
  const addTransaction = useCallback(async (txData: Omit<Transaction, 'id' | 'date'>) => {
    await addTxMutation.mutateAsync(txData);
  }, [addTxMutation]);

  const deleteTransaction = useCallback(async (id: string) => {
    await deleteTxMutation.mutateAsync(id);
  }, [deleteTxMutation]);

  const addAccount = useCallback(async (
    accData: Omit<Account, 'id' | 'createdAt' | 'todaySend' | 'todayReceive' | 'todayProfit'>
  ) => {
    await addAccountMutation.mutateAsync(accData);
  }, [addAccountMutation]);

  const updateAccount = useCallback(async (id: string, updates: Partial<Account>) => {
    await updateAccountMutation.mutateAsync({ id, updates });
  }, [updateAccountMutation]);

  const deleteAccount = useCallback(async (id: string) => {
    await deleteAccountMutation.mutateAsync(id);
  }, [deleteAccountMutation]);

  const getAccountById = useCallback((id: string) => {
    return accounts.find((a) => a.id === id);
  }, [accounts]);

  const resetToMockData = useCallback(async () => {
    await resetDbMutation.mutateAsync();
  }, [resetDbMutation]);

  // High-performance memoized Metrics calculation
  const metrics: LedgerMetrics = useMemo(() => {
    const totalBalance = accounts.reduce((sum, acc) => (acc.isActive ? sum + acc.balance : sum), 0);
    const todayProfit = accounts.reduce((sum, acc) => sum + (acc.todayProfit || 0), 0);
    const todaySendTotal = accounts.reduce((sum, acc) => sum + (acc.todaySend || 0), 0);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    let monthlyIncome = 0;
    let monthlyExpense = 0;

    transactions.forEach((tx) => {
      const txTime = new Date(tx.date).getTime();
      if (txTime >= startOfMonth) {
        if (tx.type === 'receive_money' || tx.type === 'cash_in') {
          monthlyIncome += tx.amount;
        } else if (tx.type === 'send_money' || tx.type === 'cash_out' || tx.type === 'b2b') {
          monthlyExpense += tx.amount + (tx.cost || 0);
        }
      }
    });

    // Calculate net growth if data exists
    const growthPercent =
      monthlyExpense > 0 && monthlyIncome > 0
        ? Number((((monthlyIncome - monthlyExpense) / monthlyExpense) * 100).toFixed(1))
        : 0;

    return {
      totalBalance,
      monthlyIncome,
      monthlyExpense,
      todayProfit,
      todaySendTotal,
      balanceGrowthPercentage: Math.max(0, growthPercent),
    };
  }, [accounts, transactions]);

  // High-performance memoized Filtered Transactions
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
        const matchesAccount =
          tx.accountNumber?.toLowerCase().includes(query) ||
          tx.accountName?.toLowerCase().includes(query);
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

    // Fast sorting with zero Date heap allocation overhead
    if (filters.sortBy === 'newest') {
      list.sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));
    } else if (filters.sortBy === 'oldest') {
      list.sort((a, b) => (a.date > b.date ? 1 : a.date < b.date ? -1 : 0));
    } else if (filters.sortBy === 'amount_high') {
      list.sort((a, b) => b.amount - a.amount);
    } else if (filters.sortBy === 'amount_low') {
      list.sort((a, b) => a.amount - b.amount);
    } else if (filters.sortBy === 'profit_high') {
      list.sort((a, b) => (b.profit || 0) - (a.profit || 0));
    }

    return list;
  }, [transactions, filters]);

  // Context value memoized to eliminate unnecessary child re-renders
  const contextValue = useMemo<LedgerContextType>(() => ({
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
    refetch: refetchAll,
    isLoading,
    isFetching,
  }), [
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
