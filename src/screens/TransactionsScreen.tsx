import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLedger } from '../context/LedgerContext';
import { useTheme } from '../context/ThemeContext';
import { Header, NetworkStatusBanner, TransactionItem, FilterModal, ConfirmationModal } from '../components';
import { Transaction } from '../types';

const PAGE_SIZE = 15;

interface TransactionsScreenProps {
  onOpenAddTransaction: () => void;
}

const FILTER_CHIPS: { label: string; value: string }[] = [
  { label: 'All', value: 'all' },
  { label: 'Cash Out', value: 'cash_out' },
  { label: 'Cash In', value: 'receive_money' },
  { label: 'Send Money', value: 'send_money' },
  { label: 'B2B Float', value: 'b2b' },
];

export const TransactionsScreen: React.FC<TransactionsScreenProps> = ({ onOpenAddTransaction }) => {
  const { theme } = useTheme();
  const { filteredTransactions, filters, setFilters, deleteTransaction, refetch } = useLedger();

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
      // Ignore refresh network errors in UI
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  // Infinite Scroll / Paginated slicing
  const visibleTransactions = useMemo(() => {
    return filteredTransactions.slice(0, displayedCount);
  }, [filteredTransactions, displayedCount]);

  const hasMore = displayedCount < filteredTransactions.length;

  const handleEndReached = useCallback(() => {
    if (!hasMore || isLoadingMore) return;

    setIsLoadingMore(true);
    // Simulate smooth next-page API call batch
    setTimeout(() => {
      setDisplayedCount((prev) => Math.min(prev + PAGE_SIZE, filteredTransactions.length));
      setIsLoadingMore(false);
    }, 300);
  }, [hasMore, isLoadingMore, filteredTransactions.length]);

  const handleConfirmDeleteTransaction = () => {
    if (transactionToDelete) {
      deleteTransaction(transactionToDelete.id);
      setTransactionToDelete(null);
    }
  };

  const renderItem = useCallback(({ item }: { item: Transaction }) => (
    <TransactionItem
      transaction={item}
      onPress={() => setTransactionToDelete(item)}
    />
  ), []);

  const hasActiveFilters =
    filters.accountId !== 'all' ||
    filters.dateRange !== 'all' ||
    filters.sortBy !== 'newest';

  // Render Header Chips
  const renderHeader = () => (
    <View>
      <NetworkStatusBanner />

      {/* Horizontal Filter Chips */}
      <View style={styles.chipBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
          {FILTER_CHIPS.map((chip) => {
            const isSelected = filters.type === chip.value;
            return (
              <TouchableOpacity
                key={chip.value}
                style={[
                  styles.chip,
                  {
                    backgroundColor: isSelected ? theme.primary : theme.card,
                    borderColor: isSelected ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => {
                  setFilters({ type: chip.value });
                  setDisplayedCount(PAGE_SIZE);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: isSelected ? '#FFFFFF' : theme.text, fontWeight: isSelected ? '700' : '600' },
                  ]}
                >
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}

          <TouchableOpacity
            style={[
              styles.filterSettingsChip,
              {
                backgroundColor: hasActiveFilters ? theme.primaryLight : theme.card,
                borderColor: hasActiveFilters ? theme.primary : theme.border,
              },
            ]}
            onPress={() => setFilterModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="options"
              size={14}
              color={hasActiveFilters ? theme.primary : theme.textSecondary}
            />
            <Text
              style={[
                styles.chipText,
                { color: hasActiveFilters ? theme.primary : theme.textSecondary, fontWeight: hasActiveFilters ? '700' : '600' },
              ]}
            >
              Filters {hasActiveFilters ? '●' : ''}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {filteredTransactions.length > 0 && (
        <View style={styles.listMetaRow}>
          <Text style={[styles.listMetaText, { color: theme.textSecondary }]}>
            Showing {visibleTransactions.length} of {filteredTransactions.length} entries
          </Text>
        </View>
      )}
    </View>
  );

  // Render Footer loading spinner for Infinite Scroll
  const renderFooter = () => {
    if (isLoadingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator size="small" color={theme.primary} />
          <Text style={[styles.footerLoaderText, { color: theme.textSecondary }]}>
            Loading more records...
          </Text>
        </View>
      );
    }
    if (filteredTransactions.length > 0 && !hasMore) {
      return (
        <View style={styles.footerEndRow}>
          <Text style={[styles.footerEndText, { color: theme.textMuted }]}>
            All {filteredTransactions.length} transactions loaded
          </Text>
        </View>
      );
    }
    return <View style={{ height: 60 }} />;
  };

  // Render Empty State
  const renderEmpty = () => (
    <View style={[styles.emptyContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Ionicons name="receipt-outline" size={44} color={theme.textMuted} />
      <Text style={[styles.emptyTitle, { color: theme.text }]}>No transactions found</Text>
      <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
        No matching records for the selected filters.
      </Text>
      <TouchableOpacity
        style={[styles.emptyAddBtn, { backgroundColor: theme.primary }]}
        onPress={onOpenAddTransaction}
        activeOpacity={0.8}
      >
        <Text style={styles.emptyAddBtnText}>Add New Transaction</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <Header
        title="bKash Ledger"
        subtitle={`${filteredTransactions.length} recorded entries`}
        showSearch
        searchQuery={filters.searchQuery}
        onSearchChange={(q) => {
          setFilters({ searchQuery: q });
          setDisplayedCount(PAGE_SIZE);
        }}
        searchPlaceholder="Search bKash number, note, amount..."
        onFilterPress={() => setFilterModalVisible(true)}
      />

      {/* High-Performance Virtualized Infinite-Scroll FlatList */}
      <FlatList
        data={visibleTransactions}
        keyExtractor={(item) => item.clientTxId || item.id}
        renderItem={renderItem}
        getItemLayout={(_data, index) => ({
          length: 86,
          offset: 86 * index,
          index,
        })}
        ListHeaderComponent={renderHeader}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={12}
        maxToRenderPerBatch={10}
        windowSize={7}
        removeClippedSubviews={Platform.OS === 'android'}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      />

      {/* Filter Modal */}
      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
      />

      {/* Delete Transaction Confirmation Modal */}
      <ConfirmationModal
        visible={Boolean(transactionToDelete)}
        title="Delete Transaction"
        message={
          transactionToDelete
            ? `Are you sure you want to remove this ৳${transactionToDelete.amount.toLocaleString('en-US')} ${transactionToDelete.type.replace('_', ' ').toUpperCase()} record?`
            : ''
        }
        confirmText="Delete Record"
        cancelText="Cancel"
        type="danger"
        icon="trash-outline"
        onConfirm={handleConfirmDeleteTransaction}
        onCancel={() => setTransactionToDelete(null)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  chipBar: {
    paddingVertical: 8,
    marginHorizontal: -16,
  },
  chipScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
  },
  filterSettingsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  listMetaRow: {
    paddingVertical: 6,
    paddingHorizontal: 2,
    marginBottom: 4,
  },
  listMetaText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
  },
  footerLoaderText: {
    fontSize: 12,
    fontWeight: '600',
  },
  footerEndRow: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingBottom: 60,
  },
  footerEndText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  emptyContainer: {
    borderRadius: 18,
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginTop: 20,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 10,
  },
  emptyAddBtn: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyAddBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
