export type AccountCarrier = 'gp' | 'banglalink' | 'robi' | 'airtel' | 'teletalk' | 'mfs';

export type AccountType = 'agent' | 'merchant' | 'personal' | 'corporate' | 'bkash';

// PR.xlsx types: 'recev' (Inflow/Receive), 'sm' (Send Money), 'co' (Cash Out), 'send' (Shop Bill), 'adjustment'
export type TransactionType =
  | 'recev'
  | 'sm'
  | 'co'
  | 'send'
  | 'adjustment'
  | 'cash_out'
  | 'cash_in'
  | 'send_money'
  | 'receive_money'
  | 'b2b';

export type SyncStatus = 'synced' | 'pending' | 'failed';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  accountNumber: string;
  shortCode?: string;
  carrier?: AccountCarrier;
  balance: number;
  monthlyLimit: number;
  monthlyLimitUsed: number;
  remainingLimit: number;
  dailyLimit?: number;
  todaySend: number;
  todayReceive: number;
  todayProfit: number;
  totalMargin?: number;
  isActive: boolean;
  color?: string;
  createdAt: string;
  syncStatus?: SyncStatus;
}

export interface Transaction {
  id: string;
  clientTxId?: string; // Idempotency key for offline sync
  accountId: string;
  accountNumber: string;
  accountName: string;
  type: TransactionType;
  amount: number;
  margin: number; // Commission / Margin earned on transaction (PR.xlsx 'Mergin')
  runningBalance: number; // Balance after this transaction (PR.xlsx 'b/l')
  counterparty?: string; // Customer phone, Sakil, Shop bill, etc. (PR.xlsx 'Number')
  recipientNumber?: string;
  senderNumber?: string;
  cost: number;
  profit: number; // Equal to margin
  date: string; // ISO string
  note?: string;
  syncStatus?: SyncStatus;
  retryCount?: number;
  lastError?: string;
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

export interface DailyProfitRecord {
  date: string;
  cumulativeMargin: number;
  dailyProfit: number;
  inflow: number;
  outflow: number;
  txCount: number;
}

export interface LedgerMetrics {
  totalBalance: number;
  totalMonthlyLimit: number;
  totalMonthlyLimitUsed: number;
  totalLimitRemaining: number;
  monthlyIncome: number;
  monthlyExpense: number;
  todayProfit: number; // Today's total margin
  todaySendTotal: number;
  balanceGrowthPercentage: number;
  activeAccountsCount: number;
}