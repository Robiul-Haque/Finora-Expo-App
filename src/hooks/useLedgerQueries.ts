import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ledgerApi } from '../services/api/ledgerApi';
import { Account, Transaction } from '../types/ledger';

/**
 * Standard Query Keys Factory for TanStack Query
 */
export const ledgerKeys = {
  all: ['ledger'] as const,
  accounts: () => [...ledgerKeys.all, 'accounts'] as const,
  transactions: () => [...ledgerKeys.all, 'transactions'] as const,
};

/**
 * Hook to fetch accounts
 */
export const useAccountsQuery = () => {
  return useQuery({
    queryKey: ledgerKeys.accounts(),
    queryFn: () => ledgerApi.getAccounts(),
    staleTime: 1000 * 60 * 5, // 5 mins fresh cache
  });
};

/**
 * Hook to fetch transactions
 */
export const useTransactionsQuery = () => {
  return useQuery({
    queryKey: ledgerKeys.transactions(),
    queryFn: () => ledgerApi.getTransactions(),
    staleTime: 1000 * 60 * 5,
  });
};

/**
 * Hook to create transaction with Optimistic UI updates
 */
export const useAddTransactionMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (txData: Omit<Transaction, 'id' | 'date'>) => ledgerApi.createTransaction(txData),
    // Optimistic Update: Instantly reflect in UI before API finishes
    onMutate: async (newTxData) => {
      await queryClient.cancelQueries({ queryKey: ledgerKeys.transactions() });
      await queryClient.cancelQueries({ queryKey: ledgerKeys.accounts() });

      const previousTransactions = queryClient.getQueryData<Transaction[]>(ledgerKeys.transactions()) || [];
      const previousAccounts = queryClient.getQueryData<Account[]>(ledgerKeys.accounts()) || [];

      // Optimistic transaction object
      const optimisticTx: Transaction = {
        ...newTxData,
        id: 'optimistic_' + Date.now(),
        date: new Date().toISOString(),
      };

      // Optimistically update transactions cache
      queryClient.setQueryData<Transaction[]>(ledgerKeys.transactions(), [
        optimisticTx,
        ...previousTransactions,
      ]);

      // Optimistically update accounts cache
      const updatedAccounts = previousAccounts.map((acc) => {
        if (acc.id === newTxData.accountId) {
          let newBalance = acc.balance;
          let newTodaySend = acc.todaySend;
          let newTodayReceive = acc.todayReceive;
          let newTodayProfit = acc.todayProfit + (newTxData.profit || 0);

          if (newTxData.type === 'send_money' || newTxData.type === 'cash_out' || newTxData.type === 'b2b') {
            newBalance -= newTxData.amount + (newTxData.cost || 0);
            newTodaySend += newTxData.amount;
          } else if (newTxData.type === 'receive_money' || newTxData.type === 'cash_in') {
            newBalance += newTxData.amount;
            newTodayReceive += newTxData.amount;
          } else if (newTxData.type === 'adjustment') {
            newBalance += newTxData.amount;
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

      queryClient.setQueryData<Account[]>(ledgerKeys.accounts(), updatedAccounts);

      return { previousTransactions, previousAccounts };
    },
    onError: () => {
      // Graceful offline fallback: keep local data without throwing UI crashes
      queryClient.invalidateQueries({ queryKey: ledgerKeys.transactions() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.accounts() });
    },
    onSettled: () => {
      // Re-sync with storage
      queryClient.invalidateQueries({ queryKey: ledgerKeys.transactions() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.accounts() });
    },
  });
};

/**
 * Hook to delete transaction with instant Optimistic Cache update
 */
export const useDeleteTransactionMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => ledgerApi.deleteTransaction(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ledgerKeys.transactions() });
      const prevTxs = queryClient.getQueryData<Transaction[]>(ledgerKeys.transactions()) || [];
      queryClient.setQueryData<Transaction[]>(
        ledgerKeys.transactions(),
        prevTxs.filter((t) => t.id !== id)
      );
      return { prevTxs };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ledgerKeys.transactions() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.accounts() });
    },
  });
};

/**
 * Hook to create a new bKash account with instant Optimistic Cache update
 */
export const useAddAccountMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (accData: Omit<Account, 'id' | 'createdAt' | 'todaySend' | 'todayReceive' | 'todayProfit'>) =>
      ledgerApi.createAccount(accData),
    onMutate: async (newAcc) => {
      await queryClient.cancelQueries({ queryKey: ledgerKeys.accounts() });
      const prevAccounts = queryClient.getQueryData<Account[]>(ledgerKeys.accounts()) || [];
      const optimisticAcc: Account = {
        ...newAcc,
        id: 'acc_opt_' + Date.now(),
        monthlyLimit: newAcc.monthlyLimit || 300000,
        monthlyLimitUsed: 0,
        remainingLimit: newAcc.monthlyLimit || 300000,
        todaySend: 0,
        todayReceive: 0,
        todayProfit: 0,
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueryData<Account[]>(ledgerKeys.accounts(), [optimisticAcc, ...prevAccounts]);
      return { prevAccounts };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ledgerKeys.accounts() });
    },
  });
};

/**
 * Hook to update account with instant Optimistic Cache update
 */
export const useUpdateAccountMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Account> }) =>
      ledgerApi.updateAccount(id, updates),
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ledgerKeys.accounts() });
      const prevAccounts = queryClient.getQueryData<Account[]>(ledgerKeys.accounts()) || [];
      queryClient.setQueryData<Account[]>(
        ledgerKeys.accounts(),
        prevAccounts.map((a) => (a.id === id ? { ...a, ...updates } : a))
      );
      return { prevAccounts };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ledgerKeys.accounts() });
    },
  });
};

/**
 * Hook to delete account with instant Optimistic Cache update
 */
export const useDeleteAccountMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => ledgerApi.deleteAccount(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ledgerKeys.accounts() });
      const prevAccounts = queryClient.getQueryData<Account[]>(ledgerKeys.accounts()) || [];
      queryClient.setQueryData<Account[]>(
        ledgerKeys.accounts(),
        prevAccounts.filter((a) => a.id !== id)
      );
      return { prevAccounts };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ledgerKeys.accounts() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.transactions() });
    },
  });
};

/**
 * Hook to reset database
 */
export const useResetDatabaseMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => ledgerApi.resetDatabase(),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ledgerKeys.all });
    },
  });
};