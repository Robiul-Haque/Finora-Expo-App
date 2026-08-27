import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLedger } from '../context/LedgerContext';
import { useTheme } from '../context/ThemeContext';
import { Header } from '../components/Header';
import { StatCard } from '../components/StatCard';
import { AccountCard } from '../components/AccountCard';
import { TransactionItem } from '../components/TransactionItem';
import { Account } from '../types/ledger';

interface HomeScreenProps {
  onOpenAccountDetails: (account: Account) => void;
  onOpenAddTransaction: (accountId?: string) => void;
  onNavigateToTransactions: () => void;
  onNavigateToAccounts: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onOpenAccountDetails,
  onOpenAddTransaction,
  onNavigateToTransactions,
  onNavigateToAccounts,
}) => {
  const { theme, isDarkMode } = useTheme();
  const { accounts, transactions, metrics, resetToMockData } = useLedger();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortHighToLow, setSortHighToLow] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 600);
  }, []);

  // Format currency
  const formatCurrency = (val: number) => {
    return '৳' + val.toLocaleString('en-US');
  };

  // Filter & sort accounts
  const filteredAccounts = accounts
    .filter((acc) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        acc.name.toLowerCase().includes(q) ||
        acc.accountNumber.toLowerCase().includes(q) ||
        acc.type.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => (sortHighToLow ? b.balance - a.balance : a.balance - b.balance));

  // Top recent 4 transactions
  const recentTransactions = transactions.slice(0, 4);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <Header
        title="Finora bKash"
        subtitle="bKash Business Ledger"
        showSearch
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search bKash number, line..."
      />

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
        {/* Total Balance Card */}
        <StatCard
          title="Total bKash Float"
          value={formatCurrency(metrics.totalBalance)}
          subtitle="Real-time Balance Across All Lines"
          badgeText={`+${metrics.balanceGrowthPercentage}% vs last month`}
          isPositive
          iconName="wallet-outline"
          variant="primary"
          onPress={() => onOpenAddTransaction()}
        />

        {/* 2-Column Analytics Overview */}
        <View style={styles.analyticsRow}>
          <View style={styles.halfCol}>
            <StatCard
              title="Monthly Income"
              value={formatCurrency(metrics.monthlyIncome)}
              iconName="arrow-down-circle"
              isPositive
              subtitle="Cash In / Received"
            />
          </View>

          <View style={styles.halfCol}>
            <StatCard
              title="Monthly Expense"
              value={formatCurrency(metrics.monthlyExpense)}
              iconName="arrow-up-circle"
              isPositive={false}
              subtitle="Send Money / Costs"
            />
          </View>
        </View>

        {/* Today's Profit Highlight Banner */}
        <View
          style={[
            styles.profitBanner,
            {
              backgroundColor: theme.successLight,
              borderColor: isDarkMode ? 'rgba(52, 211, 153, 0.25)' : 'rgba(5, 150, 105, 0.2)',
            },
          ]}
        >
          <View style={styles.profitBannerLeft}>
            <View style={[styles.profitIconBadge, { backgroundColor: theme.success }]}>
              <Ionicons name="sparkles" size={18} color="#FFFFFF" />
            </View>
            <View>
              <Text style={[styles.profitBannerTitle, { color: isDarkMode ? '#6EE7B7' : '#065F46' }]}>
                Today's Net Profit
              </Text>
              <Text style={[styles.profitBannerAmount, { color: theme.success }]}>
                +{formatCurrency(metrics.todayProfit)}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.profitBannerBtn, { backgroundColor: theme.success }]}
            onPress={() => onOpenAddTransaction()}
            activeOpacity={0.75}
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.profitBannerBtnText}>New Record</Text>
          </TouchableOpacity>
        </View>

        {/* Accounts Section Header */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>bKash Business Lines</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
              {filteredAccounts.length} active SIMs / counters
            </Text>
          </View>

          <View style={styles.sortToggleGroup}>
            <TouchableOpacity
              style={[
                styles.sortButton,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
              onPress={() => setSortHighToLow(!sortHighToLow)}
              activeOpacity={0.7}
            >
              <Ionicons
                name={sortHighToLow ? 'arrow-down' : 'arrow-up'}
                size={14}
                color={theme.primary}
              />
              <Text style={[styles.sortButtonText, { color: theme.textSecondary }]}>
                {sortHighToLow ? 'High -> Low' : 'Low -> High'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.seeAllBtn, { backgroundColor: theme.primaryLight }]}
              onPress={onNavigateToAccounts}
              activeOpacity={0.7}
            >
              <Text style={[styles.seeAllBtnText, { color: theme.primary }]}>Manage</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Accounts Cards */}
        {filteredAccounts.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="search-outline" size={32} color={theme.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No bKash lines found</Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
              Try a different search or add a new bKash line.
            </Text>
          </View>
        ) : (
          filteredAccounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onPress={() => onOpenAccountDetails(account)}
              onAddTransactionPress={() => onOpenAddTransaction(account.id)}
            />
          ))
        )}

        {/* Recent Transactions Section */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Transactions</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
              Latest ledger activity
            </Text>
          </View>

          <TouchableOpacity onPress={onNavigateToTransactions}>
            <Text style={[styles.seeAllText, { color: theme.primary }]}>View All</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Transactions List */}
        {recentTransactions.map((tx) => (
          <TransactionItem
            key={tx.id}
            transaction={tx}
            onPress={() => onNavigateToTransactions()}
          />
        ))}

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 30,
  },
  analyticsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  halfCol: {
    flex: 1,
  },
  profitBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 13,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  profitBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  profitIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profitBannerTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  profitBannerAmount: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  profitBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 10,
  },
  profitBannerBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  sortToggleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 9,
    borderWidth: 1,
  },
  sortButtonText: {
    fontSize: 11,
    fontWeight: '600',
  },
  seeAllBtn: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 9,
  },
  seeAllBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyCard: {
    borderRadius: 16,
    padding: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
  },
});
