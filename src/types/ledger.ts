export type AccountType = 'agent' | 'merchant' | 'personal' | 'corporate' | 'bkash';

export type TransactionType = 'cash_out' | 'cash_in' | 'send_money' | 'receive_money' | 'b2b' | 'adjustment';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  accountNumber: string;
  balance: number;
  dailyLimit: number;
  todaySend: number;
  todayReceive: number;
  todayProfit: number;
  isActive: boolean;
  color?: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  accountNumber: string;
  accountName: string;
  type: TransactionType;
  amount: number;
  recipientNumber?: string;
  senderNumber?: string;
  cost: number;
  profit: number;
  date: string; // ISO string
  note?: string;
}

export type DateFilter = 'all' | 'today' | 'yesterday' | 'this_week' | 'this_month';

export type SortFilter = 'newest' | 'oldest' | 'amount_high' | 'amount_low' | 'profit_high';

export interface FilterOptions {
  accountId: string;
  type: string; // 'all' | TransactionType
  dateRange: DateFilter;
  sortBy: SortFilter;
  searchQuery: string;
}

export interface LedgerMetrics {
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpense: number;
  todayProfit: number;
  todaySendTotal: number;
  balanceGrowthPercentage: number;
}
