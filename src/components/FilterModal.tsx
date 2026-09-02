import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TouchableWithoutFeedback,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DateFilter, SortFilter } from '../types/ledger';
import { useLedger } from '../context/LedgerContext';
import { useTheme } from '../context/ThemeContext';

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
}

const FilterModalComponent: React.FC<FilterModalProps> = ({ visible, onClose }) => {
  const { theme, isDarkMode } = useTheme();
  const { filters, setFilters, resetFilters, accounts } = useLedger();

  const [selectedAccountId, setSelectedAccountId] = useState(filters.accountId);
  const [selectedType, setSelectedType] = useState(filters.type);
  const [selectedDate, setSelectedDate] = useState<DateFilter>(filters.dateRange);
  const [selectedSort, setSelectedSort] = useState<SortFilter>(filters.sortBy);
  const [showAccountPicker, setShowAccountPicker] = useState(false);

  const slideAnim = useRef(new Animated.Value(400)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(400);
      fadeAnim.setValue(0);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 400,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  React.useEffect(() => {
    if (visible) {
      setSelectedAccountId(filters.accountId);
      setSelectedType(filters.type);
      setSelectedDate(filters.dateRange);
      setSelectedSort(filters.sortBy);
      setShowAccountPicker(false);
    }
  }, [visible, filters]);

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

  const selectedAccountLabel = React.useMemo(() => {
    if (selectedAccountId === 'all') return 'All Accounts';
    const acc = accounts.find((a) => a.id === selectedAccountId || a.accountNumber === selectedAccountId);
    return acc ? `${acc.accountNumber} (${acc.name || 'SIM'})` : 'All Accounts';
  }, [selectedAccountId, accounts]);

  const dateOptions: { label: string; value: DateFilter }[] = [
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: 'This Week', value: 'this_week' },
    { label: 'This Month', value: 'this_month' },
  ];

  const typeOptions: { label: string; value: string }[] = [
    { label: 'Send Money', value: 'sm' },
    { label: 'Receive Money', value: 'recev' },
    { label: 'Cash Out', value: 'co' },
    { label: 'Adjustment', value: 'adjustment' },
  ];

  const sortOptions: { label: string; value: SortFilter }[] = [
    { label: 'Newest', value: 'newest' },
    { label: 'Oldest', value: 'oldest' },
    { label: 'Amount High/Low', value: 'amount_high' },
    { label: 'Profit High', value: 'profit_high' },
  ];

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <Animated.View
              style={[
                styles.bottomSheet,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              {/* Drag Handle & Header */}
              <View style={[styles.sheetHeader, { borderBottomColor: theme.divider }]}>
                {/* Drag Handle Pill */}
                <View style={[styles.dragHandle, { backgroundColor: theme.border }]} />

                <View style={styles.headerRow}>
                  <Text style={[styles.headerTitle, { color: theme.text }]}>Filters</Text>
                  <TouchableOpacity onPress={handleClose} style={styles.closeBtn} activeOpacity={0.7}>
                    <Ionicons name="close" size={20} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Scrollable Body */}
              <ScrollView
                style={styles.scrollBody}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                {/* Section 1: Account */}
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>ACCOUNT</Text>
                  <TouchableOpacity
                    style={[
                      styles.dropdownField,
                      {
                        backgroundColor: theme.card,
                        borderColor: showAccountPicker ? theme.primary : theme.border,
                      },
                    ]}
                    onPress={() => setShowAccountPicker(!showAccountPicker)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.dropdownText, { color: theme.text }]} numberOfLines={1}>
                      {selectedAccountLabel}
                    </Text>
                    <Ionicons
                      name={showAccountPicker ? 'chevron-up' : 'chevron-down'}
                      size={18}
                      color={theme.textSecondary}
                    />
                  </TouchableOpacity>

                  {/* Account Dropdown Options List with fixed scrollable height */}
                  {showAccountPicker && (
                    <View
                      style={[
                        styles.accountDropdownList,
                        { backgroundColor: theme.cardSecondary, borderColor: theme.border },
                      ]}
                    >
                      <ScrollView
                        style={styles.accountDropdownScroll}
                        nestedScrollEnabled={true}
                        showsVerticalScrollIndicator={true}
                      >
                        <TouchableOpacity
                          style={[
                            styles.accountOption,
                            selectedAccountId === 'all' && { backgroundColor: theme.primaryLight },
                          ]}
                          onPress={() => {
                            setSelectedAccountId('all');
                            setShowAccountPicker(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.accountOptionText,
                              { color: selectedAccountId === 'all' ? theme.primary : theme.text },
                            ]}
                          >
                            All Accounts
                          </Text>
                          {selectedAccountId === 'all' && (
                            <Ionicons name="checkmark" size={16} color={theme.primary} />
                          )}
                        </TouchableOpacity>

                        {accounts.map((acc) => {
                          const isSelected =
                            selectedAccountId === acc.id || selectedAccountId === acc.accountNumber;
                          return (
                            <TouchableOpacity
                              key={acc.id}
                              style={[
                                styles.accountOption,
                                isSelected && { backgroundColor: theme.primaryLight },
                              ]}
                              onPress={() => {
                                setSelectedAccountId(acc.id);
                                setShowAccountPicker(false);
                              }}
                            >
                              <Text
                                style={[
                                  styles.accountOptionText,
                                  { color: isSelected ? theme.primary : theme.text },
                                ]}
                              >
                                {acc.accountNumber} ({acc.name})
                              </Text>
                              {isSelected && (
                                <Ionicons name="checkmark" size={16} color={theme.primary} />
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  )}
                </View>

                {/* Section 2: Date */}
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>DATE</Text>
                  <View style={styles.datePillsWrap}>
                    {dateOptions.map((opt) => {
                      const isSelected = selectedDate === opt.value;
                      return (
                        <TouchableOpacity
                          key={opt.value}
                          style={[
                            styles.datePill,
                            {
                              backgroundColor: isSelected ? (isDarkMode ? 'rgba(26, 115, 232, 0.15)' : '#F0F6FF') : theme.card,
                              borderColor: isSelected ? theme.primary : theme.border,
                            },
                          ]}
                          onPress={() => setSelectedDate(isSelected ? 'all' : opt.value)}
                          activeOpacity={0.75}
                        >
                          <Text
                            style={[
                              styles.datePillText,
                              { color: isSelected ? theme.primary : theme.text },
                              isSelected && styles.datePillTextSelected,
                            ]}
                          >
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Section 3: Type */}
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>TYPE</Text>
                  <View style={styles.typeGrid}>
                    {typeOptions.map((opt) => {
                      const isSelected = selectedType === opt.value;
                      return (
                        <TouchableOpacity
                          key={opt.value}
                          style={[
                            styles.typeCard,
                            {
                              backgroundColor: isSelected
                                ? (isDarkMode ? 'rgba(26, 115, 232, 0.15)' : '#F0F6FF')
                                : theme.card,
                              borderColor: isSelected ? theme.primary : theme.border,
                            },
                          ]}
                          onPress={() => setSelectedType(isSelected ? 'all' : opt.value)}
                          activeOpacity={0.75}
                        >
                          <Text
                            style={[
                              styles.typeCardText,
                              { color: isSelected ? theme.primary : theme.text },
                              isSelected && styles.typeCardTextSelected,
                            ]}
                          >
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Section 4: Sort By */}
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>SORT BY</Text>
                  <View style={styles.sortCardList}>
                    {sortOptions.map((opt) => {
                      const isSelected = selectedSort === opt.value;
                      return (
                        <TouchableOpacity
                          key={opt.value}
                          style={[
                            styles.sortCard,
                            {
                              backgroundColor: isSelected
                                ? (isDarkMode ? 'rgba(26, 115, 232, 0.08)' : '#F8FAFC')
                                : theme.card,
                              borderColor: isSelected ? theme.primary : theme.border,
                            },
                          ]}
                          onPress={() => setSelectedSort(opt.value)}
                          activeOpacity={0.75}
                        >
                          <Ionicons
                            name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                            size={18}
                            color={isSelected ? theme.primary : theme.textMuted}
                            style={styles.radioIcon}
                          />
                          <Text
                            style={[
                              styles.sortCardText,
                              { color: isSelected ? theme.primary : theme.text },
                              isSelected && styles.sortCardTextSelected,
                            ]}
                          >
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </ScrollView>

              {/* Sticky Bottom Actions */}
              <View
                style={[
                  styles.sheetFooter,
                  { borderTopColor: theme.divider, backgroundColor: theme.card },
                ]}
              >
                <TouchableOpacity
                  style={[styles.applyBtn, { backgroundColor: theme.primary }]}
                  onPress={handleApply}
                  activeOpacity={0.88}
                >
                  <Text style={styles.applyBtnText}>Apply Filters</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export const FilterModal = React.memo(FilterModalComponent);

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    maxHeight: '82%',
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
  },
  sheetHeader: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 10,
  },
  headerRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
  },
  scrollBody: {
    paddingHorizontal: 16,
  },
  scrollContent: {
    paddingTop: 14,
    paddingBottom: 24,
    gap: 16,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  dropdownField: {
    height: 46,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  dropdownText: {
    fontSize: 13.5,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  accountDropdownList: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 4,
    maxHeight: 180,
  },
  accountDropdownScroll: {
    maxHeight: 180,
  },
  accountOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  accountOptionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  datePillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  datePill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  datePillText: {
    fontSize: 12,
    fontWeight: '500',
  },
  datePillTextSelected: {
    fontWeight: '700',
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeCard: {
    width: '48.5%',
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeCardText: {
    fontSize: 12,
    fontWeight: '500',
  },
  typeCardTextSelected: {
    fontWeight: '700',
  },
  sortCardList: {
    gap: 7,
  },
  sortCard: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  radioIcon: {
    marginRight: 10,
  },
  sortCardText: {
    fontSize: 13,
    fontWeight: '500',
  },
  sortCardTextSelected: {
    fontWeight: '700',
  },
  sheetFooter: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  resetBtn: {
    flex: 1,
    height: 46,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  applyBtn: {
    flex: 2,
    height: 46,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    color: '#FFFFFF',
    fontSize: 13.5,
    fontWeight: '700',
  },
});