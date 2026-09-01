import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLedger } from '../context/LedgerContext';
import { useTheme } from '../context/ThemeContext';
import { TransactionItem, TransactionItemSkeleton, ConfirmationModal, FilterModal } from '../components';
import { useBounceScroll } from '../hooks';
import { Transaction } from '../types';

const PAGE_SIZE = 25;

interface TransactionsScreenProps {
  onOpenAddTransaction?: () => void;
}

const STITCH_FILTER_CHIPS: { label: string; value: string }[] = [
  { label: 'All', value: 'all' },
  { label: 'Send Money', value: 'sm' },
  { label: 'Receive Money', value: 'recev' },
  { label: 'Balance Adjustment', value: 'adjustment' },
];

const TransactionsScreenComponent: React.FC<TransactionsScreenProps> = () => {
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const { transactions, isLoading, filters, setFilters, deleteTransaction, refetch } = useLedger();
  const { scrollProps, bounceStyle } = useBounceScroll();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [displayedCount, setDisplayedCount] = useState(PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    setDisplayedCount(PAGE_SIZE);
    try {
      if (refetch) await refetch();
    } catch {
      // Offline fallback
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  // Active filter count (excluding default values)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.accountId && filters.accountId !== 'all') count++;
    if (filters.type && filters.type !== 'all') count++;
    if (filters.dateRange && filters.dateRange !== 'all') count++;
    if (filters.sortBy && filters.sortBy !== 'newest') count++;
    return count;
  }, [filters]);

  // Filtering transactions based on global filters and local search
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 86400000;
    const startOfWeek = startOfToday - 7 * 86400000;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    const list = transactions.filter((t) => {
      // 1. Account Filter
      if (filters.accountId && filters.accountId !== 'all' && t.accountId !== filters.accountId && t.accountNumber !== filters.accountId) {
        return false;
      }

      // 2. Type Filter
      if (filters.type && filters.type !== 'all') {
        if (filters.type === 'sm' && !(t.type === 'sm' || t.type === 'co' || t.type === 'send' || t.type === 'send_money')) return false;
        if (filters.type === 'recev' && !(t.type === 'recev' || t.type === 'receive_money' || t.type === 'cash_in')) return false;
        if (filters.type === 'co' && !(t.type === 'co' || t.type === 'cash_out')) return false;
        if (filters.type === 'send' && !(t.type === 'send' || t.type === 'b2b')) return false;
        if (filters.type === 'adjustment' && t.type !== 'adjustment') return false;
      }

      // 3. Date Range Filter
      const txTime = new Date(t.date).getTime();
      if (filters.dateRange === 'today' && txTime < startOfToday) return false;
      if (filters.dateRange === 'yesterday' && (txTime < startOfYesterday || txTime >= startOfToday)) return false;
      if (filters.dateRange === 'this_week' && txTime < startOfWeek) return false;
      if (filters.dateRange === 'this_month' && txTime < startOfMonth) return false;

      // 4. Search Query match
      const q = searchQuery.toLowerCase().trim();
      if (q) {
        const matchesQuery =
          (t.accountNumber && t.accountNumber.toLowerCase().includes(q)) ||
          (t.accountName && t.accountName.toLowerCase().includes(q)) ||
          (t.recipientNumber && t.recipientNumber.toLowerCase().includes(q)) ||
          (t.senderNumber && t.senderNumber.toLowerCase().includes(q)) ||
          (t.counterparty && t.counterparty.toLowerCase().includes(q)) ||
          (t.note && t.note.toLowerCase().includes(q)) ||
          t.amount.toString().includes(q);
        if (!matchesQuery) return false;
      }

      return true;
    });

    // 5. Sorting
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
  }, [transactions, filters, searchQuery]);

  const visibleTransactions = useMemo(() => {
    return filteredTransactions.slice(0, displayedCount);
  }, [filteredTransactions, displayedCount]);

  const hasMore = displayedCount < filteredTransactions.length;

  const handleEndReached = useCallback(() => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    setTimeout(() => {
      setDisplayedCount((prev) => Math.min(prev + PAGE_SIZE, filteredTransactions.length));
      setIsLoadingMore(false);
    }, 150);
  }, [hasMore, isLoadingMore, filteredTransactions.length]);

  const handleConfirmDelete = () => {
    if (transactionToDelete) {
      deleteTransaction(transactionToDelete.id);
      setTransactionToDelete(null);
    }
  };

  const renderItem = useCallback(
    ({ item }: { item: Transaction }) => (
      <TransactionItem transaction={item} onPress={() => setTransactionToDelete(item)} />
    ),
    []
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Stitch Top App Bar */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.divider }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.logoBadge, { backgroundColor: theme.primaryLight }]}>
            <Ionicons name="journal-outline" size={18} color={theme.primary} />
          </View>
        </View>

        <Text style={[styles.headerCenterTitle, { color: theme.text }]}>Transactions</Text>

        <View style={styles.headerRight}>
          {/* Theme Toggle Button */}
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: theme.cardSecondary }]}
            onPress={toggleTheme}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isDarkMode ? 'sunny-outline' : 'moon-outline'}
              size={18}
              color={theme.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search & Filter Header Section */}
      <View style={[styles.filterContainer, { backgroundColor: theme.card, borderBottomColor: theme.divider }]}>
        {/* Search Input with Clear Button */}
        <View style={[styles.searchBox, { backgroundColor: theme.inputBg, borderBottomColor: theme.border }]}>
          <Ionicons name="search" size={18} color={theme.textMuted} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search phone number, note, amount..."
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={(text) => {
              setSearchQuery(text);
              setDisplayedCount(PAGE_SIZE);
            }}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Chips Reel */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
          {STITCH_FILTER_CHIPS.map((chip) => {
            const isSelected = (filters.type || 'all') === chip.value;
            return (
              <TouchableOpacity
                key={chip.value}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isSelected ? theme.primary : theme.cardSecondary,
                    borderColor: isSelected ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => {
                  setFilters({ type: chip.value });
                  setDisplayedCount(PAGE_SIZE);
                }}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: isSelected ? '#FFFFFF' : theme.textSecondary },
                    isSelected && styles.chipTextSelected,
                  ]}
                >
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Transactions List */}
      <FlatList
        data={visibleTransactions}
        renderItem={({ item }) => (
          <Animated.View style={bounceStyle}>
            {renderItem({ item })}
          </Animated.View>
        )}
        keyExtractor={(item) => item.id || String(item.clientTxId)}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
        showsVerticalScrollIndicator={false}
        {...scrollProps}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={7}
        removeClippedSubviews={Platform.OS === 'android'}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          isLoading && transactions.length === 0 ? (
            <View style={{ gap: 8 }}>
              <TransactionItemSkeleton />
              <TransactionItemSkeleton />
              <TransactionItemSkeleton />
              <TransactionItemSkeleton />
            </View>
          ) : (
            <View style={[styles.emptyContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Ionicons name="receipt-outline" size={36} color={theme.textMuted} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No transactions found</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                {searchQuery || activeFilterCount > 0
                  ? 'No transactions matched the current filters or search query.'
                  : 'Transactions will appear here once recorded.'}
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.loadingMore}>
              <ActivityIndicator size="small" color={theme.primary} />
            </View>
          ) : (
            <View style={{ height: 80 }} />
          )
        }
      />

      {/* Advanced Filter Modal */}
      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={!!transactionToDelete}
        title="Delete Transaction"
        message={`Remove this transaction of ৳${transactionToDelete?.amount?.toLocaleString()}?`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setTransactionToDelete(null)}
      />
    </SafeAreaView>
  );
};

export const TransactionsScreen = React.memo(TransactionsScreenComponent);

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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenterTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    top: -2,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '800',
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 10,
    borderBottomWidth: 1,
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
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    padding: 0,
  },
  chipsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextSelected: {
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 105,
  },
  itemSeparator: {
    height: 10,
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
  loadingMore: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
