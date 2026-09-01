import React, { useMemo, useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Alert, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Account, Transaction } from '../types/ledger';
import { useLedger } from '../context/LedgerContext';
import { useTheme } from '../context/ThemeContext';
import { TransactionItem } from './TransactionItem';
import { ConfirmationModal } from './ConfirmationModal';
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
  const { transactions, deleteAccount, updateAccount } = useLedger();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'send' | 'receive'>('all');

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

  const accountTransactions = useMemo(() => {
    if (!account) return [];
    return transactions.filter(
      (t) => t.accountId === account.id || t.accountNumber === account.accountNumber
    );
  }, [transactions, account]);

  const filteredTransactions = useMemo(() => {
    if (selectedFilter === 'all') return accountTransactions;
    return accountTransactions.filter((t) => t.type === selectedFilter);
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

          <TouchableOpacity
            onPress={() => setShowDeleteConfirm(true)}
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

            {/* SIM Status Control Card */}
            <View style={[styles.bentoCard, styles.fullWidthCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={[styles.leftIndicator, { backgroundColor: account.isActive ? theme.success : theme.textMuted }]} />
              <View style={styles.statusCardInner}>
                <View style={styles.statusInfoGroup}>
                  <Text style={[styles.bentoLabel, { color: theme.textSecondary }]}>SIM Account Status</Text>
                  <Text style={[styles.statusValueText, { color: account.isActive ? theme.success : theme.danger }]}>
                    {account.isActive ? 'Active (Operational)' : 'Disabled / Inactive (Paused)'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.statusToggleBtn,
                    {
                      backgroundColor: account.isActive
                        ? (isDarkMode ? 'rgba(255, 82, 82, 0.15)' : '#FEE2E2')
                        : (isDarkMode ? 'rgba(0, 200, 83, 0.15)' : '#DCFCE7'),
                      borderColor: account.isActive ? theme.danger : theme.success,
                    },
                  ]}
                  onPress={handleToggleStatus}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={account.isActive ? 'pause-circle-outline' : 'play-circle-outline'}
                    size={16}
                    color={account.isActive ? theme.danger : theme.success}
                    style={{ marginRight: 4 }}
                  />
                  <Text style={[styles.statusToggleBtnText, { color: account.isActive ? theme.danger : theme.success }]}>
                    {account.isActive ? 'Disable SIM' : 'Activate SIM'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Transaction History Section */}
          <View style={styles.historySection}>
            <View style={styles.historyHeader}>
              <Text style={[styles.historyTitle, { color: theme.text }]}>Transaction History</Text>
              {/* Filter Pills */}
              <View style={styles.filterPillsRow}>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    selectedFilter === 'all' && { backgroundColor: theme.primary },
                  ]}
                  onPress={() => setSelectedFilter('all')}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: selectedFilter === 'all' ? '#FFFFFF' : theme.textSecondary },
                    ]}
                  >
                    All
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    selectedFilter === 'send' && { backgroundColor: theme.primary },
                  ]}
                  onPress={() => setSelectedFilter('send')}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: selectedFilter === 'send' ? '#FFFFFF' : theme.textSecondary },
                    ]}
                  >
                    Send
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    selectedFilter === 'receive' && { backgroundColor: theme.success },
                  ]}
                  onPress={() => setSelectedFilter('receive')}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: selectedFilter === 'receive' ? '#FFFFFF' : theme.textSecondary },
                    ]}
                  >
                    Receive
                  </Text>
                </TouchableOpacity>
              </View>
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
                      <TransactionItem key={t.id} transaction={t} />
                    ))}
                  </View>
                )}

                {groupedTransactions.YESTERDAY.length > 0 && (
                  <View style={styles.groupContainer}>
                    <Text style={[styles.groupHeading, { color: theme.textMuted }]}>YESTERDAY</Text>
                    {groupedTransactions.YESTERDAY.map((t) => (
                      <TransactionItem key={t.id} transaction={t} />
                    ))}
                  </View>
                )}

                {groupedTransactions.EARLIER.length > 0 && (
                  <View style={styles.groupContainer}>
                    <Text style={[styles.groupHeading, { color: theme.textMuted }]}>EARLIER</Text>
                    {groupedTransactions.EARLIER.map((t) => (
                      <TransactionItem key={t.id} transaction={t} />
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
});