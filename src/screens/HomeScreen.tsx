import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
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
        title="Finora"
        subtitle="Smart Business Ledger"
        showSearch
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search phone number, account..."
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
          title="Total Balance"
          value={formatCurrency(metrics.totalBalance)}
          subtitle="Real-time MFS & Reserve Ledger"
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
            { backgroundColor: isDarkMode ? '#064E3B' : '#ECFDF5', borderColor: theme.success },
          ]}
        >
          <View style={styles.profitBannerLeft}>
            <View style={[styles.profitIconBadge, { backgroundColor: theme.success }]}>
              <Ionicons name="sparkles" size={18} color="#FFFFFF" />
            </View>
            <View>
              <Text style={[styles.profitBannerTitle, { color: isDarkMode ? '#A7F3D0' : '#065F46' }]}>
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
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.profitBannerBtnText}>New Record</Text>
          </TouchableOpacity>
        </View>

        {/* Accounts Section Header */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>MFS & Bank Accounts</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
              {filteredAccounts.length} active business lines
            </Text>
          </View>

          <View style={styles.sortToggleGroup}>
            <TouchableOpacity
              style={[
                styles.sortButton,
                { backgroundColor: theme.card, borderColor: theme.border },
              ]}
              onPress={() => setSortHighToLow(!sortHighToLow)}
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
            >
              <Text style={[styles.seeAllBtnText, { color: theme.primary }]}>Manage</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Accounts Cards */}
        {filteredAccounts.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="search-outline" size={32} color={theme.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No accounts found</Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
              Try a different search or add a new account.
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
    paddingTop: 8,
    paddingBottom: 40,
  },
  analyticsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfCol: {
    flex: 1,
  },
  profitBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  profitBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profitIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profitBannerTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  profitBannerAmount: {
    fontSize: 18,
    fontWeight: '900',
  },
  profitBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
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
    marginVertical: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  sortToggleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  sortButtonText: {
    fontSize: 11,
    fontWeight: '600',
  },
  seeAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
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
    padding: 30,
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
