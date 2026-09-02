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
    mutationFn: (txData: Omit<Transaction, 'id' | 'date'> & { date?: string }) => ledgerApi.createTransaction(txData),
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
        date: newTxData.date || new Date().toISOString(),
      };

      // Optimistically update transactions cache
      queryClient.setQueryData<Transaction[]>(ledgerKeys.transactions(), [
        optimisticTx,
        ...previousTransactions,
      ]);

      // Optimistically update accounts cache
      const isOutflow =
        newTxData.type === 'sm' ||
        newTxData.type === 'co' ||
        newTxData.type === 'send' ||
        newTxData.type === 'send_money' ||
        newTxData.type === 'cash_out' ||
        newTxData.type === 'b2b';
      const isInflow =
        newTxData.type === 'recev' ||
        newTxData.type === 'receive_money' ||
        newTxData.type === 'cash_in';

      const updatedAccounts = previousAccounts.map((acc) => {
        if (acc.id === newTxData.accountId) {
          let newBalance = acc.balance;
          let newTodaySend = acc.todaySend;
          let newTodayReceive = acc.todayReceive;
          let newTodayProfit = acc.todayProfit + (newTxData.profit || 0);
          let newTotalMargin = (acc.totalMargin || 0) + (newTxData.profit || 0);
          let newMonthlyLimitUsed = acc.monthlyLimitUsed || 0;

          if (isOutflow) {
            newBalance -= newTxData.amount + (newTxData.cost || 0);
            newTodaySend += newTxData.amount;
            if (newTxData.type === 'sm' || newTxData.type === 'send_money') {
              newMonthlyLimitUsed += newTxData.amount;
            }
          } else if (isInflow) {
            newBalance += newTxData.amount;
            newTodayReceive += newTxData.amount;
          } else if (newTxData.type === 'adjustment') {
            newBalance += newTxData.amount;
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
      await queryClient.cancelQueries({ queryKey: ledgerKeys.accounts() });

      const prevTxs = queryClient.getQueryData<Transaction[]>(ledgerKeys.transactions()) || [];
      const prevAccounts = queryClient.getQueryData<Account[]>(ledgerKeys.accounts()) || [];
      const txToDelete = prevTxs.find((t) => t.id === id);

      queryClient.setQueryData<Transaction[]>(
        ledgerKeys.transactions(),
        prevTxs.filter((t) => t.id !== id)
      );

      if (txToDelete) {
        const isOutflow =
          txToDelete.type === 'sm' ||
          txToDelete.type === 'co' ||
          txToDelete.type === 'send' ||
          txToDelete.type === 'send_money' ||
          txToDelete.type === 'cash_out' ||
          txToDelete.type === 'b2b';
        const isInflow =
          txToDelete.type === 'recev' ||
          txToDelete.type === 'receive_money' ||
          txToDelete.type === 'cash_in';

        const updatedAccounts = prevAccounts.map((acc) => {
          if (acc.id === txToDelete.accountId) {
            let newBalance = acc.balance;
            let newTodaySend = acc.todaySend;
            let newTodayReceive = acc.todayReceive;
            let newTodayProfit = Math.max(0, acc.todayProfit - (txToDelete.profit || 0));
            let newTotalMargin = Math.max(0, (acc.totalMargin || 0) - (txToDelete.profit || 0));
            let newMonthlyLimitUsed = acc.monthlyLimitUsed || 0;

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

        queryClient.setQueryData<Account[]>(ledgerKeys.accounts(), updatedAccounts);
      }

      return { prevTxs, prevAccounts };
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ledgerKeys.transactions() });
      queryClient.invalidateQueries({ queryKey: ledgerKeys.accounts() });
    },
  });
};

/**
 * Hook to update a transaction with instant Optimistic Cache update
 */
export const useUpdateTransactionMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Transaction> }) =>
      ledgerApi.updateTransaction(id, updates),
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ledgerKeys.transactions() });
      await queryClient.cancelQueries({ queryKey: ledgerKeys.accounts() });

      const prevTxs = queryClient.getQueryData<Transaction[]>(ledgerKeys.transactions()) || [];
      const prevAccounts = queryClient.getQueryData<Account[]>(ledgerKeys.accounts()) || [];

      const oldTx = prevTxs.find((t) => t.id === id);
      if (!oldTx) return { prevTxs, prevAccounts };

      const updatedTx: Transaction = {
        ...oldTx,
        ...updates,
      };

      queryClient.setQueryData<Transaction[]>(
        ledgerKeys.transactions(),
        prevTxs.map((t) => (t.id === id ? updatedTx : t))
      );

      // Optimistically adjust accounts
      const oldOutflow = oldTx.type === 'sm' || oldTx.type === 'co' || oldTx.type === 'send' || oldTx.type === 'send_money' || oldTx.type === 'cash_out' || oldTx.type === 'b2b';
      const oldInflow = oldTx.type === 'recev' || oldTx.type === 'receive_money' || oldTx.type === 'cash_in';
      const oldProfit = oldTx.margin || oldTx.profit || 0;

      const newOutflow = updatedTx.type === 'sm' || updatedTx.type === 'co' || updatedTx.type === 'send' || updatedTx.type === 'send_money' || updatedTx.type === 'cash_out' || updatedTx.type === 'b2b';
      const newInflow = updatedTx.type === 'recev' || updatedTx.type === 'receive_money' || updatedTx.type === 'cash_in';
      const newProfit = updatedTx.margin || updatedTx.profit || 0;

      const updatedAccounts = prevAccounts.map((acc) => {
        if (acc.id === updatedTx.accountId) {
          let balance = acc.balance;
          let todaySend = acc.todaySend;
          let todayReceive = acc.todayReceive;
          let todayProfit = acc.todayProfit;
          let totalMargin = acc.totalMargin || 0;
          let monthlyLimitUsed = acc.monthlyLimitUsed || 0;

          // Revert old
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

          // Apply new
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

      queryClient.setQueryData<Account[]>(ledgerKeys.accounts(), updatedAccounts);

      return { prevTxs, prevAccounts };
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