import React, { useState } from 'react';
import {View,Text,StyleSheet,Modal,TouchableOpacity,ScrollView} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DateFilter, SortFilter } from '../types/ledger';
import { useLedger } from '../context/LedgerContext';
import { useTheme } from '../context/ThemeContext';

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
}

export const FilterModal: React.FC<FilterModalProps> = ({ visible, onClose }) => {
  const { theme } = useTheme();
  const { filters, setFilters, resetFilters, accounts } = useLedger();

  const [selectedAccountId, setSelectedAccountId] = useState(filters.accountId);
  const [selectedType, setSelectedType] = useState(filters.type);
  const [selectedDate, setSelectedDate] = useState<DateFilter>(filters.dateRange);
  const [selectedSort, setSelectedSort] = useState<SortFilter>(filters.sortBy);

  const handleApply = () => {
    setFilters({
      accountId: selectedAccountId,
      type: selectedType,
      dateRange: selectedDate,
      sortBy: selectedSort,
    });
    onClose();
  };

  const handleReset = () => {
    setSelectedAccountId('all');
    setSelectedType('all');
    setSelectedDate('all');
    setSelectedSort('newest');
    resetFilters();
    onClose();
  };

  const typeOptions: { label: string; value: string }[] = [
    { label: 'All Types', value: 'all' },
    { label: 'Cash Out', value: 'cash_out' },
    { label: 'Cash In', value: 'receive_money' },
    { label: 'Send Money', value: 'send_money' },
    { label: 'B2B Float', value: 'b2b' },
    { label: 'Adjustment', value: 'adjustment' },
  ];

  const dateOptions: { label: string; value: DateFilter }[] = [
    { label: 'All Dates', value: 'all' },
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: 'This Week', value: 'this_week' },
    { label: 'This Month', value: 'this_month' },
  ];

  const sortOptions: { label: string; value: SortFilter }[] = [
    { label: 'Newest First (Recent)', value: 'newest' },
    { label: 'Oldest First', value: 'oldest' },
    { label: 'Highest Amount First', value: 'amount_high' },
    { label: 'Lowest Amount First', value: 'amount_low' },
    { label: 'Highest Profit First', value: 'profit_high' },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitleGroup}>
              <Ionicons name="filter" size={20} color={theme.primary} />
              <Text style={[styles.modalTitle, { color: theme.text }]}>Filter Transactions</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* Account Selector */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>ACCOUNT</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
                <TouchableOpacity
                  style={[
                    styles.chip,
                    {
                      backgroundColor: selectedAccountId === 'all' ? theme.primary : theme.cardSecondary,
                      borderColor: selectedAccountId === 'all' ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => setSelectedAccountId('all')}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: selectedAccountId === 'all' ? '#FFFFFF' : theme.text },
                    ]}
                  >
                    All Accounts
                  </Text>
                </TouchableOpacity>

                {accounts.map((acc) => {
                  const isSelected = selectedAccountId === acc.id;
                  return (
                    <TouchableOpacity
                      key={acc.id}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isSelected ? theme.primary : theme.cardSecondary,
                          borderColor: isSelected ? theme.primary : theme.border,
                        },
                      ]}
                      onPress={() => setSelectedAccountId(acc.id)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: isSelected ? '#FFFFFF' : theme.text },
                        ]}
                      >
                        {acc.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Type Selector */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
                TRANSACTION TYPE
              </Text>
              <View style={styles.wrapGrid}>
                {typeOptions.map((opt) => {
                  const isSelected = selectedType === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.gridChip,
                        {
                          backgroundColor: isSelected ? theme.primary : theme.cardSecondary,
                          borderColor: isSelected ? theme.primary : theme.border,
                        },
                      ]}
                      onPress={() => setSelectedType(opt.value)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: isSelected ? '#FFFFFF' : theme.text },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Date Selector */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>DATE RANGE</Text>
              <View style={styles.wrapGrid}>
                {dateOptions.map((opt) => {
                  const isSelected = selectedDate === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.gridChip,
                        {
                          backgroundColor: isSelected ? theme.primary : theme.cardSecondary,
                          borderColor: isSelected ? theme.primary : theme.border,
                        },
                      ]}
                      onPress={() => setSelectedDate(opt.value)}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          { color: isSelected ? '#FFFFFF' : theme.text },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Sort Selector */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>SORT BY</Text>
              <View style={styles.sortList}>
                {sortOptions.map((opt) => {
                  const isSelected = selectedSort === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.sortRow,
                        {
                          backgroundColor: isSelected ? theme.primaryLight : 'transparent',
                          borderColor: isSelected ? theme.primary : theme.border,
                        },
                      ]}
                      onPress={() => setSelectedSort(opt.value)}
                    >
                      <Text
                        style={[
                          styles.sortText,
                          { color: isSelected ? theme.primary : theme.text, fontWeight: isSelected ? '700' : '500' },
                        ]}
                      >
                        {opt.label}
                      </Text>
                      <Ionicons
                        name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                        size={18}
                        color={isSelected ? theme.primary : theme.textMuted}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={[styles.buttonRow, { borderTopColor: theme.border }]}>
            <TouchableOpacity
              style={[styles.resetBtn, { borderColor: theme.border }]}
              onPress={handleReset}
              activeOpacity={0.7}
            >
              <Text style={[styles.resetBtnText, { color: theme.textSecondary }]}>Reset All</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.applyBtn, { backgroundColor: theme.primary }]}
              onPress={handleApply}
              activeOpacity={0.8}
            >
              <Text style={styles.applyBtnText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    maxHeight: '85%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  scrollBody: {
    paddingHorizontal: 20,
  },
  section: {
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  wrapGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  sortList: {
    gap: 6,
  },
  sortRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  sortText: {
    fontSize: 13,
  },
  buttonRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  resetBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  applyBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});