import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLedger } from '../context/LedgerContext';
import { useTheme } from '../context/ThemeContext';
import {
  TransactionItem,
  TransactionItemSkeleton,
  ConfirmationModal,
  FilterModal,
  EditTransactionModal,
  SearchBar,
  ActionSheetModal,
  AppHeader,
} from '../components';
import { useBounceScroll } from '../hooks';
import { Transaction } from '../types';
import { parseDate } from '../utils';

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

const TransactionsScreenComponent: React.FC<TransactionsScreenProps> = ({ onOpenAddTransaction }) => {
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const { transactions, isLoading, filters, setFilters, deleteTransaction, refetch } = useLedger();
  const { scrollProps, bounceStyle } = useBounceScroll();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [displayedCount, setDisplayedCount] = useState(PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTxForAction, setSelectedTxForAction] = useState<Transaction | null>(null);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
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
        const isSend = t.type === 'sm' || t.type === 'send' || t.type === 'send_money' || t.type === 'b2b';
        const isReceive = t.type === 'recev' || t.type === 'receive_money' || t.type === 'cash_in';
        const isCashOut = t.type === 'co' || t.type === 'cash_out';
        const isAdjustment = t.type === 'adjustment';

        if (filters.type === 'sm' && !isSend) return false;
        if (filters.type === 'recev' && !isReceive) return false;
        if (filters.type === 'co' && !isCashOut) return false;
        if (filters.type === 'adjustment' && !isAdjustment) return false;
      }

      // 3. Date Range Filter
      if (filters.dateRange && filters.dateRange !== 'all') {
        const tTime = parseDate(t.date).getTime();
        if (filters.dateRange === 'today' && tTime < startOfToday) return false;
        if (filters.dateRange === 'yesterday' && (tTime < startOfYesterday || tTime >= startOfToday)) return false;
        if (filters.dateRange === 'this_week' && tTime < startOfWeek) return false;
        if (filters.dateRange === 'this_month' && tTime < startOfMonth) return false;
      }

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
      list.sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());
    } else if (filters.sortBy === 'oldest') {
      list.sort((a, b) => parseDate(a.date).getTime() - parseDate(b.date).getTime());
    } else if (filters.sortBy === 'amount_high') {
      list.sort((a, b) => b.amount - a.amount);
    } else if (filters.sortBy === 'amount_low') {
      list.sort((a, b) => a.amount - b.amount);
    } else if (filters.sortBy === 'profit_high') {
      list.sort((a, b) => (b.profit || 0) - (a.profit || 0));
    }

    return list;
  }, [transactions, filters, searchQuery]);

  const paginationTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (paginationTimerRef.current) {
        clearTimeout(paginationTimerRef.current);
      }
    };
  }, []);

  const visibleTransactions = useMemo(() => {
    return filteredTransactions.slice(0, displayedCount);
  }, [filteredTransactions, displayedCount]);

  const hasMore = displayedCount < filteredTransactions.length;

  const handleEndReached = useCallback(() => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    if (paginationTimerRef.current) clearTimeout(paginationTimerRef.current);
    paginationTimerRef.current = setTimeout(() => {
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

  const handleOpenOptions = useCallback((tx: Transaction) => {
    setSelectedTxForAction(tx);
    setShowOptionsMenu(true);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Transaction }) => (
      <TransactionItem
        transaction={item}
        onOptionsPress={handleOpenOptions}
      />
    ),
    [handleOpenOptions]
  );

  const renderItemSeparator = useCallback(() => <View style={styles.itemSeparator} />, []);

  const keyExtractor = useCallback(
    (item: Transaction, index: number) => item.id || item.clientTxId || `tx_${index}`,
    []
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Top App Bar */}
      <AppHeader
        rightContent={
          <TouchableOpacity
            style={[
              styles.iconButton,
              { backgroundColor: theme.cardSecondary },
              activeFilterCount > 0 && { borderColor: theme.primary, borderWidth: 1.5 },
            ]}
            onPress={() => setFilterModalVisible(true)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={activeFilterCount > 0 ? 'options' : 'options-outline'}
              size={18}
              color={activeFilterCount > 0 ? theme.primary : theme.textSecondary}
            />
            {activeFilterCount > 0 && (
              <View style={[styles.filterBadge, { backgroundColor: theme.primary }]}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        }
      />

      {/* Search Header Section */}
      <View style={styles.filterContainer}>
        <SearchBar
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            setDisplayedCount(PAGE_SIZE);
          }}
          placeholder="Search phone number, note, amount..."
          onClear={() => setDisplayedCount(PAGE_SIZE)}
          style={styles.searchBox}
        />
      </View>

      {/* Transactions List */}
      <FlatList
        data={visibleTransactions}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={renderItemSeparator}
        showsVerticalScrollIndicator={false}
        initialNumToRender={10}
        maxToRenderPerBatch={8}
        windowSize={5}
        removeClippedSubviews={Platform.OS === 'android'}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
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

      {/* 3-Dot Transaction Options Action Sheet Modal */}
      <ActionSheetModal
        visible={showOptionsMenu}
        title="Transaction Options"
        subtitle={
          selectedTxForAction
            ? `৳${selectedTxForAction.amount.toLocaleString()} • ${selectedTxForAction.type.toUpperCase()}`
            : undefined
        }
        actions={[
          {
            id: 'edit',
            title: 'Edit Transaction',
            subtitle: 'Modify amount, number, cost, margin or date',
            icon: 'create-outline',
            onPress: () => {
              setShowOptionsMenu(false);
              setShowEditModal(true);
            },
          },
          {
            id: 'delete',
            title: 'Delete Transaction',
            subtitle: 'Permanently delete and revert balance impact',
            icon: 'trash-outline',
            isDestructive: true,
            onPress: () => {
              setShowOptionsMenu(false);
              setTransactionToDelete(selectedTxForAction);
            },
          },
        ]}
        onClose={() => setShowOptionsMenu(false)}
      />

      {/* Edit Transaction Modal */}
      <EditTransactionModal
        visible={showEditModal}
        transaction={selectedTxForAction}
        onClose={() => {
          setShowEditModal(false);
          setSelectedTxForAction(null);
        }}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={!!transactionToDelete}
        title="Delete Transaction"
        message={`Remove this transaction of ৳${transactionToDelete?.amount?.toLocaleString()}? Account balance will be restored.`}
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
    paddingBottom: 16,
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
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 0,
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
  /* 3-Dot Options Action Sheet Styles */
  optionsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  optionsSheetCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 16,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128, 128, 128, 0.35)',
    alignSelf: 'center',
    marginBottom: 12,
  },
  optionsSheetHeader: {
    paddingBottom: 14,
    borderBottomWidth: 1,
    marginBottom: 6,
    alignItems: 'center',
  },
  optionsSheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  optionsSheetSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  optionItemLast: {
    borderBottomWidth: 0,
  },
  optionIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTextContainer: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  optionDescription: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  optionsCancelBtn: {
    marginTop: 14,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsCancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
