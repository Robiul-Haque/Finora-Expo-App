import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLedger } from '../context/LedgerContext';
import { useTheme } from '../context/ThemeContext';
import { AccountCard, AccountCardSkeleton, ConfirmationModal, SearchBar, AppHeader } from '../components';
import { Account } from '../types';
import { isSameDay, isSameMonth, formatCurrency } from '../utils';

interface AccountsScreenProps {
  onOpenAccountDetails: (account: Account) => void;
  onOpenAddAccount: () => void;
  onOpenAddTransaction: (accountId: string) => void;
}

const AccountsScreenComponent: React.FC<AccountsScreenProps> = ({
  onOpenAccountDetails,
  onOpenAddAccount,
  onOpenAddTransaction,
}) => {
  const { theme, isDarkMode } = useTheme();
  const { accounts, transactions, isLoading, deleteAccount, refetch } = useLedger();

  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState<'daily' | 'monthly'>('daily');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      if (refetch) await refetch();
    } catch {
      // Offline fallback
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const filteredAccounts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return accounts;
    return accounts.filter((acc) =>
      acc.name.toLowerCase().includes(q) ||
      acc.accountNumber.toLowerCase().includes(q)
    );
  }, [accounts, searchQuery]);

  /**
   * FINANCIAL METRICS AGGREGATOR (PER ACCOUNT)
   * ------------------------------------------
   * Calculates Profit, Cost, and Net Profit for every SIM based on active timeFilter ('daily' | 'monthly'):
   * 
   * Formulas:
   * - Daily: Matches transactions where date === Today (isSameDay)
   * - Monthly: Matches transactions where date is in current month (isSameMonth)
   * - Profit = Sum of transaction profit (or margin) for that account
   * - Cost = Sum of transaction cost for that account
   * - Net Profit = Profit - Cost
   * 
   * Fallback:
   * If raw transaction history is paginated or not yet synced, falls back to
   * summarized account metrics (account.todayProfit or account.totalMargin).
   */
  const accountMetricsMap = useMemo(() => {
    const map: Record<string, { profit: number; cost: number; netProfit: number }> = {};
    const hasTxMap: Record<string, boolean> = {};
    const now = new Date();

    // Initialize all accounts with zero
    for (const acc of accounts) {
      map[acc.id] = { profit: 0, cost: 0, netProfit: 0 };
    }

    // Accumulate from transactions
    for (const tx of transactions) {
      if (!tx.accountId && !tx.accountNumber) continue;
      const isMatch = timeFilter === 'daily' ? isSameDay(tx.date, now) : isSameMonth(tx.date, now);
      if (isMatch) {
        const matchedAcc = accounts.find(
          (a) => a.id === tx.accountId || a.accountNumber === tx.accountId || a.accountNumber === tx.accountNumber
        );
        const targetId = matchedAcc ? matchedAcc.id : tx.accountId;
        if (!map[targetId]) {
          map[targetId] = { profit: 0, cost: 0, netProfit: 0 };
        }
        hasTxMap[targetId] = true;
        const profit = Number(tx.profit ?? tx.margin ?? 0);
        const cost = Number(tx.cost ?? 0);
        map[targetId].profit += profit;
        map[targetId].cost += cost;
      }
    }

    // Fallback for summarized stats ONLY when raw transaction items aren't present
    for (const acc of accounts) {
      const current = map[acc.id] || { profit: 0, cost: 0, netProfit: 0 };
      if (!hasTxMap[acc.id]) {
        if (timeFilter === 'daily' && (acc.todayProfit || 0) > 0) {
          current.profit = acc.todayProfit || 0;
        } else if (timeFilter === 'monthly' && (acc.totalMargin || 0) > 0) {
          current.profit = acc.totalMargin || 0;
        }
      }
      current.netProfit = current.profit - current.cost;
      map[acc.id] = current;
    }

    return map;
  }, [accounts, transactions, timeFilter]);

  /**
   * TOTAL FINANCIAL METRICS AGGREGATOR
   * ----------------------------------
   * Aggregates Profit, Cost, and Net Profit across all active/filtered accounts
   * for the selected time filter ('daily' | 'monthly').
   */
  const totalMetrics = useMemo(() => {
    let profit = 0;
    let cost = 0;

    const listToSum = searchQuery.trim() ? filteredAccounts : accounts;
    for (const acc of listToSum) {
      const metric = accountMetricsMap[acc.id];
      if (metric) {
        profit += metric.profit;
        cost += metric.cost;
      }
    }

    const netProfit = profit - cost;

    return {
      profit,
      cost,
      netProfit,
    };
  }, [accounts, filteredAccounts, accountMetricsMap, searchQuery]);

  const handleConfirmDelete = () => {
    if (accountToDelete) {
      deleteAccount(accountToDelete.id);
      setAccountToDelete(null);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Top App Bar */}
      <AppHeader />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        <View style={styles.bounceContainer}>
          {/* Search Header */}
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search phone numbers..."
            style={styles.searchBox}
          />

          {/* Section Title & Action Row */}
          <View style={styles.titleRow}>
            <Text style={[styles.screenHeading, { color: theme.text }]}>Accounts</Text>

            <View style={styles.titleRightActions}>
              {/* Filter Dropdown Button (Daily / Monthly) */}
              <TouchableOpacity
                style={[
                  styles.filterDropdownBtn,
                  { backgroundColor: theme.cardSecondary, borderColor: theme.border },
                ]}
                onPress={() => setShowFilterMenu(true)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={timeFilter === 'daily' ? 'today-outline' : 'calendar-outline'}
                  size={13}
                  color={theme.primary}
                />
                <Text style={[styles.filterDropdownBtnText, { color: theme.text }]}>
                  {timeFilter === 'daily' ? 'Daily' : 'Monthly'}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={12}
                  color={theme.textSecondary}
                />
              </TouchableOpacity>

              {/* Add SIM Button */}
              <TouchableOpacity
                style={[styles.addAccountBtn, { backgroundColor: theme.primary }]}
                onPress={onOpenAddAccount}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={styles.addAccountBtnText}>Add SIM</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* TOTAL FINANCIAL SUMMARY CARDS (Clean Minimal 3-Pillar Row) */}
          <View style={styles.summaryMetricsRow}>
            {/* Total Profit */}
            <View
              style={[
                styles.summaryMetricItem,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={styles.metricItemHeader}>
                <Ionicons name="arrow-up-circle" size={13} color={theme.success} />
                <Text style={[styles.summaryMetricLabel, { color: theme.textMuted }]} numberOfLines={1}>
                  {timeFilter === 'daily' ? 'DAY PROFIT' : 'M. PROFIT'}
                </Text>
              </View>
              <Text
                style={[
                  styles.summaryMetricValue,
                  { color: totalMetrics.profit > 0 ? theme.success : theme.text },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.65}
              >
                {totalMetrics.profit > 0 ? `+${formatCurrency(totalMetrics.profit)}` : formatCurrency(0)}
              </Text>
            </View>

            {/* Total Cost */}
            <View
              style={[
                styles.summaryMetricItem,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={styles.metricItemHeader}>
                <Ionicons name="arrow-down-circle" size={13} color={theme.danger} />
                <Text style={[styles.summaryMetricLabel, { color: theme.textMuted }]} numberOfLines={1}>
                  {timeFilter === 'daily' ? 'DAY COST' : 'M. COST'}
                </Text>
              </View>
              <Text
                style={[
                  styles.summaryMetricValue,
                  { color: totalMetrics.cost > 0 ? theme.danger : theme.textMuted },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.65}
              >
                {totalMetrics.cost > 0 ? `-${formatCurrency(totalMetrics.cost)}` : formatCurrency(0)}
              </Text>
            </View>

            {/* Net Profit */}
            <View
              style={[
                styles.summaryMetricItem,
                {
                  backgroundColor:
                    totalMetrics.netProfit >= 0
                      ? isDarkMode
                        ? 'rgba(0, 200, 83, 0.12)'
                        : '#EAF7EE'
                      : isDarkMode
                      ? 'rgba(255, 82, 82, 0.12)'
                      : '#FDECEA',
                  borderColor:
                    totalMetrics.netProfit >= 0
                      ? isDarkMode
                        ? 'rgba(0, 200, 83, 0.3)'
                        : '#A3E3B5'
                      : isDarkMode
                      ? 'rgba(255, 82, 82, 0.3)'
                      : '#F8B4B4',
                },
              ]}
            >
              <View style={styles.metricItemHeader}>
                <Ionicons
                  name={totalMetrics.netProfit >= 0 ? 'sparkles' : 'alert-circle'}
                  size={13}
                  color={totalMetrics.netProfit >= 0 ? theme.success : theme.danger}
                />
                <Text
                  style={[
                    styles.summaryMetricLabel,
                    {
                      color: totalMetrics.netProfit >= 0 ? theme.success : theme.danger,
                      fontWeight: '700',
                    },
                  ]}
                  numberOfLines={1}
                >
                  NET PROFIT
                </Text>
              </View>
              <Text
                style={[
                  styles.summaryMetricValue,
                  {
                    color:
                      totalMetrics.netProfit > 0
                        ? theme.success
                        : totalMetrics.netProfit < 0
                        ? theme.danger
                        : theme.text,
                    fontWeight: '800',
                  },
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.65}
              >
                {totalMetrics.netProfit > 0
                  ? `+${formatCurrency(totalMetrics.netProfit)}`
                  : formatCurrency(totalMetrics.netProfit)}
              </Text>
            </View>
          </View>

          {/* Accounts List */}
          <View style={styles.accountsGrid}>
            {isLoading && accounts.length === 0 ? (
              <>
                <AccountCardSkeleton />
                <AccountCardSkeleton />
                <AccountCardSkeleton />
              </>
            ) : filteredAccounts.length === 0 ? (
              <View style={[styles.emptyContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Ionicons name="card-outline" size={36} color={theme.textMuted} />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>No accounts found</Text>
                <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                  {searchQuery ? `No accounts matching "${searchQuery}"` : 'Tap "Add SIM" to register your first account.'}
                </Text>
              </View>
            ) : (
              filteredAccounts.map((account) => (
                <AccountCard
                  key={account.id}
                  account={account}
                  timeFilter={timeFilter}
                  metrics={accountMetricsMap[account.id]}
                  onPress={onOpenAccountDetails}
                  onAddTransactionPress={onOpenAddTransaction}
                />
              ))
            )}
          </View>

        <View style={{ height: 80 }} />
        </View>
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={!!accountToDelete}
        title="Delete Account"
        message={`Delete account ${accountToDelete?.accountNumber}? All transaction history under this account will also be permanently deleted.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setAccountToDelete(null)}
      />

      {/* Filter Dropdown Menu Modal */}
      <Modal
        visible={showFilterMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowFilterMenu(false)}
      >
        <TouchableOpacity
          style={styles.dropdownModalOverlay}
          activeOpacity={1}
          onPress={() => setShowFilterMenu(false)}
        >
          <View
            style={[
              styles.dropdownMenuBox,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.dropdownMenuItem,
                timeFilter === 'daily' && { backgroundColor: theme.primaryLight },
              ]}
              onPress={() => {
                setTimeFilter('daily');
                setShowFilterMenu(false);
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name="today"
                size={14}
                color={timeFilter === 'daily' ? theme.primary : theme.textSecondary}
              />
              <Text
                style={[
                  styles.dropdownMenuItemText,
                  { color: timeFilter === 'daily' ? theme.primary : theme.text },
                  timeFilter === 'daily' && styles.dropdownMenuItemTextActive,
                ]}
              >
                Daily (Today)
              </Text>
              {timeFilter === 'daily' && (
                <Ionicons name="checkmark" size={15} color={theme.primary} />
              )}
            </TouchableOpacity>

            <View style={[styles.dropdownMenuDivider, { backgroundColor: theme.divider }]} />

            <TouchableOpacity
              style={[
                styles.dropdownMenuItem,
                timeFilter === 'monthly' && { backgroundColor: theme.primaryLight },
              ]}
              onPress={() => {
                setTimeFilter('monthly');
                setShowFilterMenu(false);
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name="calendar"
                size={14}
                color={timeFilter === 'monthly' ? theme.primary : theme.textSecondary}
              />
              <Text
                style={[
                  styles.dropdownMenuItemText,
                  { color: timeFilter === 'monthly' ? theme.primary : theme.text },
                  timeFilter === 'monthly' && styles.dropdownMenuItemTextActive,
                ]}
              >
                Monthly (This Month)
              </Text>
              {timeFilter === 'monthly' && (
                <Ionicons name="checkmark" size={15} color={theme.primary} />
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
};

export const AccountsScreen = React.memo(AccountsScreenComponent);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerCenterBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBadgeImage: {
    width: 26,
    height: 26,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 0,
  },
  screenHeading: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  addAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  addAccountBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 105,
  },
  bounceContainer: {
    gap: 16,
  },
  searchBox: {
    height: 48,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    padding: 0,
  },
  summaryMetricsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
    marginTop: 0,
  },
  summaryMetricItem: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
  },
  metricItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  summaryMetricLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  summaryMetricValue: {
    fontSize: 13.5,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  accountsGrid: {
    gap: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 36,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
  titleRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterDropdownBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dropdownModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 155,
    paddingRight: 100,
  },
  dropdownMenuBox: {
    width: 175,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  dropdownMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginHorizontal: 4,
  },
  dropdownMenuItemText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: '500',
  },
  dropdownMenuItemTextActive: {
    fontWeight: '700',
  },
  dropdownMenuDivider: {
    height: 1,
    marginVertical: 2,
  },
});