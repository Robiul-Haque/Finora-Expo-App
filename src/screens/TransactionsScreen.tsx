import React, { useState, useMemo } from 'react';
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
import { TransactionItem } from '../components/TransactionItem';
import { FilterModal } from '../components/FilterModal';
import { Transaction, TransactionType } from '../types/ledger';

interface TransactionsScreenProps {
  onOpenAddTransaction: () => void;
}

export const TransactionsScreen: React.FC<TransactionsScreenProps> = ({
  onOpenAddTransaction,
}) => {
  const { theme } = useTheme();
  const { filteredTransactions, filters, setFilters, deleteTransaction } = useLedger();

  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 600);
  }, []);

  const chips: { label: string; value: string }[] = [
    { label: 'All', value: 'all' },
    { label: 'Cash Out', value: 'cash_out' },
    { label: 'Cash In', value: 'receive_money' },
    { label: 'Send Money', value: 'send_money' },
    { label: 'B2B Float', value: 'b2b' },
  ];

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    const now = new Date();
    const todayStr = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toDateString();
    const yesterdayStr = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toDateString();

    const groups: { [key: string]: Transaction[] } = {
      TODAY: [],
      YESTERDAY: [],
      EARLIER: [],
    };

    filteredTransactions.forEach((tx) => {
      const txDate = new Date(tx.date).toDateString();
      if (txDate === todayStr) {
        groups.TODAY.push(tx);
      } else if (txDate === yesterdayStr) {
        groups.YESTERDAY.push(tx);
      } else {
        groups.EARLIER.push(tx);
      }
    });

    return groups;
  }, [filteredTransactions]);

  const hasActiveFilters =
    filters.accountId !== 'all' ||
    filters.dateRange !== 'all' ||
    filters.sortBy !== 'newest';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <Header
        title="bKash Ledger"
        subtitle={`${filteredTransactions.length} recorded entries`}
        showSearch
        searchQuery={filters.searchQuery}
        onSearchChange={(q) => setFilters({ searchQuery: q })}
        searchPlaceholder="Search bKash number, note, amount..."
        onFilterPress={() => setFilterModalVisible(true)}
      />

      {/* Horizontal Filter Chips */}
      <View style={styles.chipBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
          {chips.map((chip) => {
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
                onPress={() => setFilters({ type: chip.value })}
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

      {/* Transactions List */}
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
        {filteredTransactions.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="receipt-outline" size={44} color={theme.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No transactions found</Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
              No matching records for the selected filters.
            </Text>
            <TouchableOpacity
              style={[styles.emptyAddBtn, { backgroundColor: theme.primary }]}
              onPress={onOpenAddTransaction}
            >
              <Text style={styles.emptyAddBtnText}>Add New Transaction</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {groupedTransactions.TODAY.length > 0 && (
              <View style={styles.groupSection}>
                <View style={styles.groupHeader}>
                  <Text style={[styles.groupTitle, { color: theme.textSecondary }]}>TODAY</Text>
                  <Text style={[styles.groupCount, { color: theme.textMuted }]}>
                    {groupedTransactions.TODAY.length} records
                  </Text>
                </View>
                {groupedTransactions.TODAY.map((tx) => (
                  <TransactionItem
                    key={tx.id}
                    transaction={tx}
                    onDelete={() => deleteTransaction(tx.id)}
                  />
                ))}
              </View>
            )}

            {groupedTransactions.YESTERDAY.length > 0 && (
              <View style={styles.groupSection}>
                <View style={styles.groupHeader}>
                  <Text style={[styles.groupTitle, { color: theme.textSecondary }]}>YESTERDAY</Text>
                  <Text style={[styles.groupCount, { color: theme.textMuted }]}>
                    {groupedTransactions.YESTERDAY.length} records
                  </Text>
                </View>
                {groupedTransactions.YESTERDAY.map((tx) => (
                  <TransactionItem
                    key={tx.id}
                    transaction={tx}
                    onDelete={() => deleteTransaction(tx.id)}
                  />
                ))}
              </View>
            )}

            {groupedTransactions.EARLIER.length > 0 && (
              <View style={styles.groupSection}>
                <View style={styles.groupHeader}>
                  <Text style={[styles.groupTitle, { color: theme.textSecondary }]}>
                    EARLIER THIS MONTH
                  </Text>
                  <Text style={[styles.groupCount, { color: theme.textMuted }]}>
                    {groupedTransactions.EARLIER.length} records
                  </Text>
                </View>
                {groupedTransactions.EARLIER.map((tx) => (
                  <TransactionItem
                    key={tx.id}
                    transaction={tx}
                    onDelete={() => deleteTransaction(tx.id)}
                  />
                ))}
              </View>
            )}
          </>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={onOpenAddTransaction}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Filter Modal */}
      <FilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
      />
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
    paddingBottom: 60,
  },
  chipBar: {
    paddingVertical: 8,
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
  groupSection: {
    marginBottom: 18,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 6,
  },
  groupTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  groupCount: {
    fontSize: 11,
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
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
});
