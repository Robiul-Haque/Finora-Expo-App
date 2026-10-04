import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Account } from '../types/ledger';
import { useTheme } from '../context/ThemeContext';

interface ExcelTableViewProps {
  accounts: Account[];
  onSelectAccount: (account: Account) => void;
  onAddTransaction: (accountId: string) => void;
}

type SortColumn = 'number' | 'balance' | 'dailyLimit' | 'used' | 'remaining';
type SortDirection = 'asc' | 'desc';

/**
 * Formats phone number into first 4 digits and last 4 digits (e.g. 0171..3880)
 * to maximize horizontal space and avoid column wrapping on mobile.
 */
export const format4Plus4 = (num: string): string => {
  if (!num) return '';
  const digits = num.replace(/\D/g, '');
  if (digits.length >= 8) {
    return `${digits.slice(0, 4)}..${digits.slice(-4)}`;
  }
  return num;
};

const cellNumberCache = new Map<number, string>();
const MAX_CELL_CACHE = 500;

/**
 * Clean comma-separated number formatting for spreadsheet cells (e.g. 161,450)
 * Uses bounded cache for optimal 60fps scrolling
 */
export const formatCellNumber = (val: number | undefined | null): string => {
  const num = typeof val === 'number' ? val : Number(val || 0);
  if (isNaN(num)) return '0';
  const cached = cellNumberCache.get(num);
  if (cached) return cached;
  const formatted = num.toLocaleString('en-US');
  if (cellNumberCache.size >= MAX_CELL_CACHE) {
    const firstKey = cellNumberCache.keys().next().value;
    if (firstKey !== undefined) cellNumberCache.delete(firstKey);
  }
  cellNumberCache.set(num, formatted);
  return formatted;
};

interface ExcelTableRowProps {
  account: Account;
  index: number;
  isDarkMode: boolean;
  textColor: string;
  textSecondaryColor: string;
  dangerColor: string;
  primaryColor: string;
  altRowBgColor: string;
  gridBorderColor: string;
  onSelectAccount: (account: Account) => void;
  onAddTransaction: (accountId: string) => void;
}

const ExcelTableRow = React.memo<ExcelTableRowProps>(({
  account,
  index,
  isDarkMode,
  textColor,
  textSecondaryColor,
  dangerColor,
  primaryColor,
  altRowBgColor,
  gridBorderColor,
  onSelectAccount,
  onAddTransaction,
}) => {
  const used = account.monthlyLimitUsed !== undefined ? account.monthlyLimitUsed : account.todaySend;
  const totalLimit = account.monthlyLimit || 300000;
  const remaining =
    account.remainingLimit !== undefined ? account.remainingLimit : Math.max(0, totalLimit - used);
  const isLowLimit = remaining <= 30000;
  const dailyLimitVal = account.dailyLimit !== undefined ? account.dailyLimit : 300000;
  const isLowBalance = account.balance < 5000;
  const usedRatio = dailyLimitVal > 0 ? used / dailyLimitVal : 0;
  const isHighUsed = usedRatio >= 0.85;

  const rowBg = index % 2 === 1 ? altRowBgColor : 'transparent';

  return (
    <TouchableOpacity
      style={[
        styles.row,
        {
          backgroundColor: rowBg,
          borderBottomColor: gridBorderColor,
        },
      ]}
      onPress={() => onSelectAccount(account)}
      activeOpacity={0.65}
    >
      {/* SIM Number: First 4 + Last 4 */}
      <View style={[styles.cell, styles.colNumber]}>
        <View style={styles.numberRow}>
          <Text
            style={[
              styles.monoNumberText,
              {
                color: textColor,
                fontWeight: '600',
              },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit={true}
            minimumFontScale={0.8}
          >
            {format4Plus4(account.accountNumber)}
          </Text>
        </View>
      </View>

      {/* Current Balance */}
      <View style={[styles.cell, styles.colBalance]}>
        <Text
          style={[
            styles.monoAmountText,
            {
              color: isLowBalance ? dangerColor : textColor,
              fontWeight: isLowBalance ? '700' : '700',
            },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit={true}
          minimumFontScale={0.75}
        >
          {formatCellNumber(account.balance)}
        </Text>
      </View>

      {/* Daily Limit */}
      <View style={[styles.cell, styles.colDailyLimit]}>
        <Text
          style={[
            styles.monoAmountText,
            {
              color: textSecondaryColor,
              fontWeight: '600',
            },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit={true}
          minimumFontScale={0.75}
        >
          {formatCellNumber(dailyLimitVal)}
        </Text>
      </View>

      {/* Limit Used */}
      <View style={[styles.cell, styles.colUsed]}>
        <Text
          style={[
            styles.monoAmountText,
            {
              color: isHighUsed ? dangerColor : textSecondaryColor,
              fontWeight: isHighUsed ? '700' : '500',
            },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit={true}
          minimumFontScale={0.75}
        >
          {formatCellNumber(used)}
        </Text>
      </View>

      {/* Limit Remaining */}
      <View style={[styles.cell, styles.colRemaining]}>
        <Text
          style={[
            styles.monoAmountText,
            {
              color: isLowLimit ? dangerColor : textColor,
              fontWeight: isLowLimit ? '700' : '600',
            },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit={true}
          minimumFontScale={0.75}
        >
          {formatCellNumber(remaining)}
        </Text>
      </View>

      {/* Action (+) Button */}
      <TouchableOpacity
        style={[styles.cell, styles.colAction]}
        onPress={() => onAddTransaction(account.id)}
        hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
        accessibilityLabel={`Add transaction for ${account.accountNumber}`}
      >
        <View
          style={[
            styles.actionButton,
            { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0' },
          ]}
        >
          <Ionicons name="add" size={12} color={primaryColor} />
        </View>
      </TouchableOpacity>
    </TouchableOpacity>
  );
});

export const ExcelTableView: React.FC<ExcelTableViewProps> = ({
  accounts,
  onSelectAccount,
  onAddTransaction,
}) => {
  const { theme, isDarkMode } = useTheme();
  const [sortColumn, setSortColumn] = useState<SortColumn>('balance');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Handle column header press to sort
  const handleSort = (col: SortColumn) => {
    if (sortColumn === col) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(col);
      setSortDirection(col === 'number' ? 'asc' : 'desc');
    }
  };

  // Sort accounts based on current sort column & direction
  const sortedAccounts = useMemo(() => {
    return [...accounts].sort((a, b) => {
      let comparison = 0;
      if (sortColumn === 'number') {
        comparison = a.accountNumber.localeCompare(b.accountNumber);
      } else if (sortColumn === 'balance') {
        comparison = (a.balance || 0) - (b.balance || 0);
      } else if (sortColumn === 'dailyLimit') {
        const limitA = a.dailyLimit !== undefined ? a.dailyLimit : 300000;
        const limitB = b.dailyLimit !== undefined ? b.dailyLimit : 300000;
        comparison = limitA - limitB;
      } else if (sortColumn === 'used') {
        const usedA = a.monthlyLimitUsed !== undefined ? a.monthlyLimitUsed : a.todaySend;
        const usedB = b.monthlyLimitUsed !== undefined ? b.monthlyLimitUsed : b.todaySend;
        comparison = usedA - usedB;
      } else if (sortColumn === 'remaining') {
        const remA =
          a.remainingLimit !== undefined
            ? a.remainingLimit
            : Math.max(0, (a.monthlyLimit || 300000) - (a.monthlyLimitUsed || 0));
        const remB =
          b.remainingLimit !== undefined
            ? b.remainingLimit
            : Math.max(0, (b.monthlyLimit || 300000) - (b.monthlyLimitUsed || 0));
        comparison = remA - remB;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [accounts, sortColumn, sortDirection]);

  // Calculate totals for spreadsheet footer row
  const totals = useMemo(() => {
    return accounts.reduce(
      (acc, curr) => {
        acc.balance += curr.balance || 0;
        acc.dailyLimit += curr.dailyLimit !== undefined ? curr.dailyLimit : 300000;
        acc.used += curr.monthlyLimitUsed !== undefined ? curr.monthlyLimitUsed : (curr.todaySend || 0);
        const rem =
          curr.remainingLimit !== undefined
            ? curr.remainingLimit
            : Math.max(0, (curr.monthlyLimit || 300000) - (curr.monthlyLimitUsed || curr.todaySend || 0));
        acc.remaining += rem;
        return acc;
      },
      { balance: 0, dailyLimit: 0, used: 0, remaining: 0 }
    );
  }, [accounts]);

  const getSortIcon = (col: SortColumn) => {
    if (sortColumn !== col) {
      return <Ionicons name="swap-vertical" size={10} color={theme.textMuted} style={styles.sortIcon} />;
    }
    return (
      <Ionicons
        name={sortDirection === 'asc' ? 'chevron-up' : 'chevron-down'}
        size={11}
        color={theme.primary}
        style={styles.sortIcon}
      />
    );
  };

  // Modern subtle Excel color scheme
  const gridBorderColor = isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#E2E8F0';
  const headerBgColor = isDarkMode ? '#20242B' : '#F1F5F9';
  const altRowBgColor = isDarkMode ? 'rgba(255, 255, 255, 0.025)' : '#F8FAFC';

  return (
    <View style={[styles.container, { backgroundColor: theme.card, borderColor: gridBorderColor }]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        persistentScrollbar={true}
        nestedScrollEnabled={true}
        bounces={true}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.tableInner}>
          {/* Clean Spreadsheet Header */}
          <View style={[styles.headerRow, { backgroundColor: headerBgColor, borderBottomColor: gridBorderColor }]}>
            {/* SIM Column - Left Aligned */}
            <TouchableOpacity
              style={[styles.headerCell, styles.colNumber]}
              onPress={() => handleSort('number')}
              activeOpacity={0.7}
            >
              <View style={styles.headerTitleRowLeft}>
                <Text style={[styles.headerMainText, { color: theme.text }]}>SIM NO</Text>
                {getSortIcon('number')}
              </View>
            </TouchableOpacity>

            {/* Balance Column - Centered */}
            <TouchableOpacity
              style={[styles.headerCell, styles.colBalance]}
              onPress={() => handleSort('balance')}
              activeOpacity={0.7}
            >
              <View style={styles.headerTitleRowCenter}>
                <Text style={[styles.headerMainText, { color: theme.text }]}>BALANCE</Text>
                {getSortIcon('balance')}
              </View>
            </TouchableOpacity>

            {/* Daily Limit Column - Centered */}
            <TouchableOpacity
              style={[styles.headerCell, styles.colDailyLimit]}
              onPress={() => handleSort('dailyLimit')}
              activeOpacity={0.7}
            >
              <View style={styles.headerTitleRowCenter}>
                <Text style={[styles.headerMainText, { color: theme.text }]}>DAILY LIMIT</Text>
                {getSortIcon('dailyLimit')}
              </View>
            </TouchableOpacity>

            {/* Limit Used Column - Centered */}
            <TouchableOpacity
              style={[styles.headerCell, styles.colUsed]}
              onPress={() => handleSort('used')}
              activeOpacity={0.7}
            >
              <View style={styles.headerTitleRowCenter}>
                <Text style={[styles.headerMainText, { color: theme.text }]}>USED</Text>
                {getSortIcon('used')}
              </View>
            </TouchableOpacity>

            {/* Monthly Limit Column - Centered */}
            <TouchableOpacity
              style={[styles.headerCell, styles.colRemaining]}
              onPress={() => handleSort('remaining')}
              activeOpacity={0.7}
            >
              <View style={styles.headerTitleRowCenter}>
                <Text style={[styles.headerMainText, { color: theme.text }]}>MONTHLY LIMIT</Text>
                {getSortIcon('remaining')}
              </View>
            </TouchableOpacity>

            {/* Quick Action Column - Right Aligned */}
            <View style={[styles.headerCell, styles.colAction]}>
              <Text style={[styles.headerMainText, { color: theme.text }]}>ADD</Text>
            </View>
          </View>

          {/* Spreadsheet Data Rows */}
          {sortedAccounts.map((account, index) => (
            <ExcelTableRow
              key={account.id || account.accountNumber || String(index)}
              account={account}
              index={index}
              isDarkMode={isDarkMode}
              textColor={theme.text}
              textSecondaryColor={theme.textSecondary}
              dangerColor={theme.danger}
              primaryColor={theme.primary}
              altRowBgColor={altRowBgColor}
              gridBorderColor={gridBorderColor}
              onSelectAccount={onSelectAccount}
              onAddTransaction={onAddTransaction}
            />
          ))}

          {/* Spreadsheet Total Footer Row */}
          {accounts.length > 0 && (
            <View
              style={[
                styles.totalRow,
                {
                  backgroundColor: headerBgColor,
                  borderTopColor: gridBorderColor,
                },
              ]}
            >
              <View style={[styles.cell, styles.colNumber]}>
                <Text style={[styles.totalLabelText, { color: theme.text }]}>TOTAL</Text>
              </View>
              <View style={[styles.cell, styles.colBalance]}>
                <Text
                  style={[styles.totalAmountText, { color: theme.text }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit={true}
                  minimumFontScale={0.7}
                >
                  {formatCellNumber(totals.balance)}
                </Text>
              </View>
              <View style={[styles.cell, styles.colDailyLimit]}>
                <Text
                  style={[styles.totalAmountText, { color: theme.textSecondary }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit={true}
                  minimumFontScale={0.7}
                >
                  {formatCellNumber(totals.dailyLimit)}
                </Text>
              </View>
              <View style={[styles.cell, styles.colUsed]}>
                <Text
                  style={[styles.totalAmountText, { color: theme.textSecondary }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit={true}
                  minimumFontScale={0.7}
                >
                  {formatCellNumber(totals.used)}
                </Text>
              </View>
              <View style={[styles.cell, styles.colRemaining]}>
                <Text
                  style={[styles.totalAmountText, { color: theme.text }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit={true}
                  minimumFontScale={0.7}
                >
                  {formatCellNumber(totals.remaining)}
                </Text>
              </View>
              <View style={[styles.cell, styles.colAction]} />
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
    marginBottom: 8,
  },
  scrollContent: {
    minWidth: '100%',
  },
  tableInner: {
    minWidth: 512,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  headerCell: {
    justifyContent: 'center',
    minHeight: 24,
  },
  headerTitleRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 2,
  },
  headerTitleRowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  headerMainText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  sortIcon: {
    marginLeft: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 42,
  },
  cell: {
    justifyContent: 'center',
  },
  colNumber: {
    width: 94,
    paddingLeft: 8,
    paddingRight: 4,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  colBalance: {
    width: 88,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colDailyLimit: {
    width: 98,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colUsed: {
    width: 80,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colRemaining: {
    width: 104,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colAction: {
    width: 48,
    paddingRight: 8,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  highlightPill: {
    width: 3,
    height: 14,
    borderRadius: 1.5,
  },
  monoNumberText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: -0.2,
    textAlign: 'left',
  },
  monoAmountText: {
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  actionButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    borderTopWidth: 1.5,
    minHeight: 38,
  },
  totalLabelText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    textAlign: 'left',
  },
  totalAmountText: {
    fontSize: 11,
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
});

