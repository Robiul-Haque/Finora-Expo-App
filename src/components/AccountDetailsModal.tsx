import React, { useMemo, useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Alert, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Account, Transaction } from '../types/ledger';
import { useLedger } from '../context/LedgerContext';
import { useTheme } from '../context/ThemeContext';
import { TransactionItem } from './TransactionItem';
import { ConfirmationModal } from './ConfirmationModal';
import { EditTransactionModal } from './EditTransactionModal';
import { ActionSheetModal } from './ActionSheetModal';
import { formatCurrency } from '../utils';

interface AccountDetailsModalProps {
  account: Account | null;
  visible: boolean;
  onClose: () => void;
  onAddTransaction: (accId: string) => void;
}

const AccountDetailsModalComponent: React.FC<AccountDetailsModalProps> = ({
  visible,
  account,
  onClose,
  onAddTransaction,
}) => {
  const { theme, isDarkMode } = useTheme();
  const { transactions, deleteAccount, updateAccount, deleteTransaction } = useLedger();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showHistoryFilterModal, setShowHistoryFilterModal] = useState(false);
  const [selectedTxForAction, setSelectedTxForAction] = useState<Transaction | null>(null);
  const [showTxOptionsMenu, setShowTxOptionsMenu] = useState(false);
  const [showTxDeleteConfirm, setShowTxDeleteConfirm] = useState(false);
  const [showEditTxModal, setShowEditTxModal] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'send' | 'receive' | 'cash_out' | 'adjustment'>('all');

  const historyFilterOptions: { label: string; value: 'all' | 'send' | 'receive' | 'cash_out' | 'adjustment' }[] = useMemo(
    () => [
      { label: 'All', value: 'all' },
      { label: 'Send Money', value: 'send' },
      { label: 'Receive Money', value: 'receive' },
      { label: 'Cash Out', value: 'cash_out' },
      { label: 'Adjustment', value: 'adjustment' },
    ],
    []
  );

  const currentHistoryFilterLabel = useMemo(() => {
    const found = historyFilterOptions.find((o) => o.value === selectedFilter);
    return found ? found.label : 'All';
  }, [selectedFilter, historyFilterOptions]);

  const isClosing = useRef(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  const filterDropdownFade = useRef(new Animated.Value(0)).current;
  const filterDropdownScale = useRef(new Animated.Value(0.94)).current;

  useEffect(() => {
    if (visible) {
      isClosing.current = false;
      fadeAnim.setValue(0);
      slideAnim.setValue(40);
      setShowOptionsMenu(false);
      setShowDeleteConfirm(false);
      setShowHistoryFilterModal(false);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  useEffect(() => {
    if (showHistoryFilterModal) {
      filterDropdownFade.setValue(0);
      filterDropdownScale.setValue(0.94);
      Animated.parallel([
        Animated.timing(filterDropdownFade, {
          toValue: 1,
          duration: 160,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(filterDropdownScale, {
          toValue: 1,
          damping: 18,
          mass: 0.8,
          stiffness: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showHistoryFilterModal]);

  const handleClose = () => {
    if (isClosing.current) return;
    isClosing.current = true;
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 130,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 40,
        duration: 130,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const accountTransactions = useMemo(() => {
    if (!account) return [];
    return transactions.filter(
      (t) => t.accountId === account.id || t.accountNumber === account.accountNumber
    );
  }, [transactions, account]);

  const filteredTransactions = useMemo(() => {
    if (selectedFilter === 'all') return accountTransactions;
    return accountTransactions.filter((t) => {
      const isSend = t.type === 'sm' || t.type === 'send' || t.type === 'send_money' || t.type === 'b2b';
      const isReceive = t.type === 'recev' || t.type === 'receive_money' || t.type === 'cash_in';
      const isCashOut = t.type === 'co' || t.type === 'cash_out';
      const isAdjustment = t.type === 'adjustment';

      if (selectedFilter === 'send') return isSend;
      if (selectedFilter === 'receive') return isReceive;
      if (selectedFilter === 'cash_out') return isCashOut;
      if (selectedFilter === 'adjustment') return isAdjustment;
      return true;
    });
  }, [accountTransactions, selectedFilter]);

  const groupedTransactions = useMemo(() => {
    const today = new Date().toDateString();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = yesterdayDate.toDateString();

    const groups: { TODAY: Transaction[]; YESTERDAY: Transaction[]; EARLIER: Transaction[] } = {
      TODAY: [],
      YESTERDAY: [],
      EARLIER: [],
    };

    filteredTransactions.forEach((t) => {
      const txDate = new Date(t.date).toDateString();
      if (txDate === today) {
        groups.TODAY.push(t);
      } else if (txDate === yesterday) {
        groups.YESTERDAY.push(t);
      } else {
        groups.EARLIER.push(t);
      }
    });

    return groups;
  }, [filteredTransactions]);

  if (!account) return null;

  const monthlyLimit = account.monthlyLimit || 300000;
  const monthlyLimitUsed = account.monthlyLimitUsed !== undefined ? account.monthlyLimitUsed : account.todaySend;
  const remainingLimit = account.remainingLimit !== undefined ? account.remainingLimit : Math.max(0, monthlyLimit - monthlyLimitUsed);
  const todayProfit = account.todayProfit || account.totalMargin || 0;

  const usageRatio = monthlyLimit > 0 ? monthlyLimitUsed / monthlyLimit : 0;
  const usagePercentage = Math.min(100, Math.round(usageRatio * 100));

  const handleConfirmDelete = async () => {
    setShowDeleteConfirm(false);
    await deleteAccount(account.id);
    onClose();
  };

  const handleToggleStatus = async () => {
    try {
      await updateAccount(account.id, { isActive: !account.isActive });
    } catch {
      Alert.alert('Error', 'Failed to update SIM status.');
    }
  };

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={handleClose}>
      <Animated.View style={[styles.container, { backgroundColor: theme.background, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {/* Top App Bar Header */}
        <View style={[styles.topHeader, { backgroundColor: theme.card, borderBottomColor: theme.divider }]}>
          <TouchableOpacity onPress={handleClose} style={styles.headerBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={22} color={theme.text} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={[styles.headerPhoneNumber, { color: theme.text }]}>
              {account.accountNumber}
            </Text>
            {account.name && account.name !== account.accountNumber && (
              <Text style={[styles.headerAccountName, { color: theme.textSecondary }]}>
                {account.name}
              </Text>
            )}
          </View>

          {/* 3-Dot Options Menu Button */}
          <TouchableOpacity
            onPress={() => setShowOptionsMenu(true)}
            style={styles.headerBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="ellipsis-vertical" size={20} color={theme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollBody}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={true}
          alwaysBounceVertical={true}
          overScrollMode="always"
        >
          {/* Bento Summary Grid */}
          <View style={styles.bentoSection}>
            {/* Balance Card (Full Width) */}
            <View style={[styles.bentoCard, styles.fullWidthCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={[styles.leftIndicator, { backgroundColor: account.isActive ? theme.primary : theme.textMuted }]} />
              <View style={styles.bentoCardInner}>
                <Text style={[styles.bentoLabel, { color: theme.textSecondary }]}>Current Balance</Text>
                <Text style={[styles.bentoBigBalance, { color: account.isActive ? theme.text : theme.textMuted }]}>
                  {formatCurrency(account.balance)}
                </Text>
              </View>
            </View>

            {/* 2-Column: Today's Send & Profit */}
            <View style={styles.twoColRow}>
              {/* Today's Send */}
              <View style={[styles.bentoCard, styles.halfCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.bentoCardInner}>
                  <Text style={[styles.bentoLabel, { color: theme.textSecondary }]}>Today's Send</Text>
                  <Text style={[styles.bentoMediumValue, { color: account.isActive ? theme.text : theme.textMuted }]}>
                    {formatCurrency(account.todaySend || 0)}
                  </Text>
                </View>
              </View>

              {/* Profit */}
              <View style={[styles.bentoCard, styles.halfCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={[styles.leftIndicator, { backgroundColor: account.isActive ? theme.success : theme.textMuted }]} />
                <View style={styles.bentoCardInner}>
                  <Text style={[styles.bentoLabel, { color: theme.textSecondary }]}>Profit</Text>
                  <View style={styles.profitValueRow}>
                    <Ionicons name="trending-up" size={14} color={account.isActive ? theme.success : theme.textMuted} />
                    <Text style={[styles.bentoMediumValue, { color: account.isActive ? theme.success : theme.textMuted }]}>
                      +{formatCurrency(todayProfit)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Limits Card (Full Width) */}
            <View style={[styles.bentoCard, styles.fullWidthCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.bentoCardInner}>
                <View style={styles.limitRow}>
                  <Text style={[styles.bentoLabel, { color: theme.textSecondary }]}>Limit</Text>
                  <Text style={[styles.limitValue, { color: theme.text }]}>
                    {formatCurrency(monthlyLimit)}
                  </Text>
                </View>

                {/* Limit Progress Bar */}
                <View style={[styles.limitTrack, { backgroundColor: theme.progressBarBg }]}>
                  <View
                    style={[
                      styles.limitFill,
                      {
                        width: `${Math.min(100, Math.max(0, usagePercentage))}%`,
                        backgroundColor: !account.isActive ? theme.textMuted : usagePercentage >= 90 ? theme.danger : theme.primary,
                      },
                    ]}
                  />
                </View>

                <View style={styles.limitRow}>
                  <Text style={[styles.bentoLabel, { color: theme.textSecondary }]}>Remaining</Text>
                  <Text style={[styles.limitValue, { color: theme.text }]}>
                    {formatCurrency(remainingLimit)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Transaction History Section */}
          <View style={styles.historySection}>
            <View style={styles.historyHeader}>
              <Text style={[styles.historyTitle, { color: theme.text }]}>Transaction History</Text>

              {/* Compact Filter Dropdown Button */}
              <TouchableOpacity
                style={[
                  styles.historyFilterBtn,
                  {
                    backgroundColor:
                      selectedFilter !== 'all'
                        ? isDarkMode
                          ? 'rgba(26, 115, 232, 0.15)'
                          : '#F0F6FF'
                        : theme.cardSecondary,
                    borderColor: selectedFilter !== 'all' ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => setShowHistoryFilterModal(true)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.historyFilterBtnText,
                    { color: selectedFilter !== 'all' ? theme.primary : theme.textSecondary },
                  ]}
                  numberOfLines={1}
                >
                  {currentHistoryFilterLabel}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={14}
                  color={selectedFilter !== 'all' ? theme.primary : theme.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {/* Grouped Lists */}
            {filteredTransactions.length === 0 ? (
              <View style={[styles.emptyHistory, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}>
                <Ionicons name="receipt-outline" size={32} color={theme.textMuted} />
                <Text style={[styles.emptyHistoryText, { color: theme.textSecondary }]}>
                  No transactions recorded for this SIM.
                </Text>
              </View>
            ) : (
              <>
                {groupedTransactions.TODAY.length > 0 && (
                  <View style={styles.groupContainer}>
                    <Text style={[styles.groupHeading, { color: theme.textMuted }]}>TODAY</Text>
                    {groupedTransactions.TODAY.map((t) => (
                      <TransactionItem
                        key={t.id}
                        transaction={t}
                        onOptionsPress={(tx) => {
                          setSelectedTxForAction(tx);
                          setShowTxOptionsMenu(true);
                        }}
                      />
                    ))}
                  </View>
                )}

                {groupedTransactions.YESTERDAY.length > 0 && (
                  <View style={styles.groupContainer}>
                    <Text style={[styles.groupHeading, { color: theme.textMuted }]}>YESTERDAY</Text>
                    {groupedTransactions.YESTERDAY.map((t) => (
                      <TransactionItem
                        key={t.id}
                        transaction={t}
                        onOptionsPress={(tx) => {
                          setSelectedTxForAction(tx);
                          setShowTxOptionsMenu(true);
                        }}
                      />
                    ))}
                  </View>
                )}

                {groupedTransactions.EARLIER.length > 0 && (
                  <View style={styles.groupContainer}>
                    <Text style={[styles.groupHeading, { color: theme.textMuted }]}>EARLIER</Text>
                    {groupedTransactions.EARLIER.map((t) => (
                      <TransactionItem
                        key={t.id}
                        transaction={t}
                        onOptionsPress={(tx) => {
                          setSelectedTxForAction(tx);
                          setShowTxOptionsMenu(true);
                        }}
                      />
                    ))}
                  </View>
                )}
              </>
            )}
          </View>

          <View style={{ height: 80 }} />
        </ScrollView>

        {/* Quick Add Transaction FAB / Disabled Notice */}
        {account.isActive ? (
          <TouchableOpacity
            style={[styles.accountFab, { backgroundColor: theme.primary }]}
            onPress={() => {
              onClose();
              onAddTransaction(account.id);
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
            <Text style={styles.fabText}>New Transaction</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.disabledNoticeBar, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}>
            <Ionicons name="alert-circle-outline" size={18} color={theme.textMuted} style={{ marginRight: 8 }} />
            <Text style={[styles.disabledNoticeText, { color: theme.textSecondary }]}>
              SIM is disabled. Activate it above to add transactions.
            </Text>
          </View>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmationModal
          visible={showDeleteConfirm}
          title="Delete Account"
          message={`Are you sure you want to remove account ${account.accountNumber}? This will not delete its past transactions.`}
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
          onConfirm={handleConfirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />

        {/* 3-Dot Account Options Action Sheet Modal */}
        <ActionSheetModal
          visible={showOptionsMenu}
          title="Manage SIM Account"
          subtitle={`${account.accountNumber}${account.name ? ` • ${account.name}` : ''}`}
          actions={[
            {
              id: 'toggle_status',
              title: account.isActive ? 'Deactivate SIM (Pause)' : 'Activate SIM Account',
              subtitle: account.isActive
                ? 'Mark as inactive and pause operations'
                : 'Mark as active for transactions',
              icon: account.isActive ? 'pause-circle-outline' : 'checkmark-circle-outline',
              iconColor: account.isActive ? theme.warning : theme.success,
              iconBgColor: account.isActive
                ? isDarkMode
                  ? 'rgba(227, 116, 0, 0.18)'
                  : '#FEF3C7'
                : isDarkMode
                ? 'rgba(0, 200, 83, 0.18)'
                : '#DCFCE7',
              badge: {
                text: account.isActive ? 'Active' : 'Disabled',
                color: account.isActive ? theme.success : theme.danger,
                bg: account.isActive
                  ? isDarkMode
                    ? 'rgba(0, 200, 83, 0.15)'
                    : '#DCFCE7'
                  : isDarkMode
                  ? 'rgba(255, 82, 82, 0.15)'
                  : '#FEE2E2',
              },
              onPress: handleToggleStatus,
            },
            {
              id: 'delete_account',
              title: 'Delete SIM Account',
              subtitle: 'Permanently remove this SIM from ledger',
              icon: 'trash-outline',
              isDestructive: true,
              onPress: () => setShowDeleteConfirm(true),
            },
          ]}
          onClose={() => setShowOptionsMenu(false)}
        />

        {/* History Type Filter Dropdown Modal */}
        <Modal
          visible={showHistoryFilterModal}
          transparent
          animationType="none"
          onRequestClose={() => setShowHistoryFilterModal(false)}
        >
          <Animated.View style={[styles.dropdownModalOverlay, { opacity: filterDropdownFade }]}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={() => setShowHistoryFilterModal(false)}
            />
            <Animated.View
              style={[
                styles.dropdownModalCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  transform: [{ scale: filterDropdownScale }],
                },
              ]}
            >
              <View style={[styles.dropdownModalHeader, { borderBottomColor: theme.divider }]}>
                <Text style={[styles.dropdownModalTitle, { color: theme.text }]}>
                  Filter History
                </Text>
              </View>

              {historyFilterOptions.map((opt) => {
                const isSelected = selectedFilter === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.dropdownModalItem,
                      { borderBottomColor: theme.divider },
                      isSelected && {
                        backgroundColor: isDarkMode ? 'rgba(26, 115, 232, 0.15)' : '#F0F6FF',
                      },
                    ]}
                    onPress={() => {
                      setSelectedFilter(opt.value);
                      setShowHistoryFilterModal(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.dropdownModalItemText,
                        { color: isSelected ? theme.primary : theme.text },
                        isSelected && { fontWeight: '700' },
                      ]}
                    >
                      {opt.label}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={18} color={theme.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                style={[styles.dropdownCancelBtn, { backgroundColor: theme.cardSecondary }]}
                onPress={() => setShowHistoryFilterModal(false)}
                activeOpacity={0.8}
              >
                <Text style={[styles.dropdownCancelBtnText, { color: theme.textSecondary }]}>
                  Close
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </Modal>

        {/* 3-Dot Transaction Options Action Sheet Modal */}
        <ActionSheetModal
          visible={showTxOptionsMenu}
          title="Transaction Options"
          subtitle={
            selectedTxForAction
              ? `৳${selectedTxForAction.amount.toLocaleString()} • ${selectedTxForAction.type.toUpperCase()}`
              : undefined
          }
          actions={[
            {
              id: 'edit_tx',
              title: 'Edit Transaction',
              subtitle: 'Modify amount, number, cost, margin or date',
              icon: 'create-outline',
              onPress: () => setShowEditTxModal(true),
            },
            {
              id: 'delete_tx',
              title: 'Delete Transaction',
              subtitle: 'Permanently delete and revert balance impact',
              icon: 'trash-outline',
              isDestructive: true,
              onPress: () => setShowTxDeleteConfirm(true),
            },
          ]}
          onClose={() => setShowTxOptionsMenu(false)}
        />

        {/* Edit Transaction Modal */}
        <EditTransactionModal
          visible={showEditTxModal}
          transaction={selectedTxForAction}
          onClose={() => {
            setShowEditTxModal(false);
            setSelectedTxForAction(null);
          }}
        />

        {/* Delete Transaction Confirmation Modal */}
        <ConfirmationModal
          visible={showTxDeleteConfirm}
          title="Delete Transaction"
          message={`Are you sure you want to delete this transaction of ৳${selectedTxForAction?.amount?.toLocaleString()}? Account balance will be restored.`}
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
          onConfirm={async () => {
            if (selectedTxForAction) {
              await deleteTransaction(selectedTxForAction.id);
              setShowTxDeleteConfirm(false);
              setSelectedTxForAction(null);
            }
          }}
          onCancel={() => {
            setShowTxDeleteConfirm(false);
            setSelectedTxForAction(null);
          }}
        />
      </Animated.View>
    </Modal>
  );
};

export const AccountDetailsModal = React.memo(AccountDetailsModalComponent);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  headerPhoneNumber: {
    fontFamily: 'monospace',
    fontSize: 16,
    fontWeight: '700',
  },
  headerAccountName: {
    fontSize: 11,
    marginTop: 1,
  },
  scrollBody: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  bentoSection: {
    gap: 12,
  },
  bentoCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  fullWidthCard: {
    width: '100%',
  },
  twoColRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfCard: {
    flex: 1,
  },
  leftIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    zIndex: 2,
  },
  bentoCardInner: {
    padding: 16,
    paddingLeft: 18,
    gap: 4,
  },
  bentoLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  bentoBigBalance: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  bentoMediumValue: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 2,
  },
  profitValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  limitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  limitValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  limitTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginVertical: 8,
  },
  limitFill: {
    height: '100%',
    borderRadius: 4,
  },
  historySection: {
    marginTop: 4,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  filterPillsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  groupContainer: {
    marginBottom: 14,
  },
  groupHeading: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 2,
  },
  emptyHistory: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  emptyHistoryText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  statusCardInner: {
    padding: 14,
    paddingLeft: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusInfoGroup: {
    flex: 1,
    marginRight: 10,
    gap: 2,
  },
  statusValueText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  statusToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusToggleBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  accountFab: {
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  disabledNoticeBar: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
  },
  disabledNoticeText: {
    fontSize: 12.5,
    fontWeight: '600',
    textAlign: 'center',
    flexShrink: 1,
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
  statusBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
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
  /* Compact History Filter Button */
  historyFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  historyFilterBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  /* History Filter Modal Overlay Styles */
  dropdownModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 9999,
  },
  dropdownModalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 24,
  },
  dropdownModalHeader: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dropdownModalTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  dropdownModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dropdownModalItemText: {
    fontSize: 13.5,
    fontWeight: '500',
  },
  dropdownCancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownCancelBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
});