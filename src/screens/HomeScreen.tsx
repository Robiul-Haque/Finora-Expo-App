import React, { useState, useMemo, useCallback } from 'react';
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
import { ExcelTableSkeleton, SearchBar, AppHeader, ActionSheetModal, ExcelTableView } from '../components';
import { Account } from '../types';

interface HomeScreenProps {
  onOpenAccountDetails: (account: Account) => void;
  onOpenAddTransaction: (accountId?: string) => void;
  onNavigateToTransactions: () => void;
  onNavigateToAccounts: () => void;
}

type SortOption = 'balance_desc' | 'balance_asc' | 'limit_asc';

const HomeScreenComponent: React.FC<HomeScreenProps> = ({
  onOpenAccountDetails,
  onOpenAddTransaction,
}) => {
  const { theme, isDarkMode } = useTheme();
  const { accounts, isLoading, refetch } = useLedger();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('balance_desc');
  const [showSortModal, setShowSortModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (refetch) await refetch();
    } catch {
      // Offline fallback
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const isCustomSorted = sortOption !== 'balance_desc';

  const filteredAccounts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const result = !q
      ? accounts
      : accounts.filter((acc) =>
        acc.name.toLowerCase().includes(q) ||
        acc.accountNumber.toLowerCase().includes(q)
      );

    switch (sortOption) {
      case 'balance_desc':
        return [...result].sort((a, b) => b.balance - a.balance);
      case 'balance_asc':
        return [...result].sort((a, b) => a.balance - b.balance);
      case 'limit_asc':
        return [...result].sort((a, b) => (a.remainingLimit || 0) - (b.remainingLimit || 0));
      default:
        return result;
    }
  }, [accounts, searchQuery, sortOption]);


  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Stitch Top App Bar */}
      <AppHeader
        rightContent={
          <TouchableOpacity
            style={[
              styles.iconButton,
              { backgroundColor: theme.cardSecondary },
              isCustomSorted && { borderColor: theme.primary, borderWidth: 1.5 },
            ]}
            onPress={() => setShowSortModal(true)}
            activeOpacity={0.7}
            accessibilityLabel="Sort and Filter SIMs"
          >
            <Ionicons
              name={isCustomSorted ? 'options' : 'options-outline'}
              size={18}
              color={isCustomSorted ? theme.primary : theme.textSecondary}
            />
            {isCustomSorted && (
              <View style={[styles.filterBadge, { backgroundColor: theme.primary }]}>
                <Text style={styles.filterBadgeText}>1</Text>
              </View>
            )}
          </TouchableOpacity>
        }
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
        <View style={styles.bounceContainer}>
          {/* Controls Section: Clean Search */}
          <View style={styles.controlsSection}>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by phone number..."
              style={styles.searchBox}
            />
          </View>

          {/* Responsive Spreadsheet Data Table */}
          {isLoading && accounts.length === 0 ? (
            <ExcelTableSkeleton />
          ) : filteredAccounts.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Ionicons name="search-outline" size={32} color={theme.textMuted} />
              <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                No SIM accounts matching "{searchQuery}"
              </Text>
            </View>
          ) : (
            <ExcelTableView
              accounts={filteredAccounts}
              onSelectAccount={onOpenAccountDetails}
              onAddTransaction={onOpenAddTransaction}
            />
          )}
        </View>
      </ScrollView>

      {/* Sort & Filter SIMs Bottom Sheet Modal */}
      <ActionSheetModal
        visible={showSortModal}
        title="Sort Options"
        actions={[
          {
            id: 'balance_desc',
            title: 'Balance: High -> Low',
            icon: 'arrow-down-circle-outline',
            badge:
              sortOption === 'balance_desc'
                ? {
                  text: 'Active',
                  color: theme.primary,
                  bg: isDarkMode ? 'rgba(26, 115, 232, 0.2)' : theme.primaryLight,
                }
                : undefined,
            onPress: () => setSortOption('balance_desc'),
          },
          {
            id: 'balance_asc',
            title: 'Balance: Low -> High',
            icon: 'arrow-up-circle-outline',
            badge:
              sortOption === 'balance_asc'
                ? {
                  text: 'Active',
                  color: theme.primary,
                  bg: isDarkMode ? 'rgba(26, 115, 232, 0.2)' : theme.primaryLight,
                }
                : undefined,
            onPress: () => setSortOption('balance_asc'),
          },
          {
            id: 'limit_asc',
            title: 'Limit Remaining: Low -> High',
            icon: 'speedometer-outline',
            badge:
              sortOption === 'limit_asc'
                ? {
                  text: 'Active',
                  color: theme.primary,
                  bg: isDarkMode ? 'rgba(26, 115, 232, 0.2)' : theme.primaryLight,
                }
                : undefined,
            onPress: () => setSortOption('limit_asc'),
          },
        ]}
        onClose={() => setShowSortModal(false)}
      />
    </SafeAreaView>
  );
};

export const HomeScreen = React.memo(HomeScreenComponent);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 90,
  },
  bounceContainer: {
    gap: 12,
  },
  controlsSection: {
    position: 'relative',
    zIndex: 10,
  },
  searchBox: {
    height: 44,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  accountsGrid: {
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 36,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    marginTop: 10,
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});