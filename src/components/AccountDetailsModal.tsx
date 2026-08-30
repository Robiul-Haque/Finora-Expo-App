import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Account } from '../types/ledger';
import { useLedger } from '../context/LedgerContext';
import { useTheme } from '../context/ThemeContext';
import { LimitProgressBar } from './LimitProgressBar';
import { TransactionItem } from './TransactionItem';
import { ConfirmationModal } from './ConfirmationModal';
import { formatCurrency } from '../utils';

interface AccountDetailsModalProps {
  account: Account | null;
  visible: boolean;
  onClose: () => void;
  onAddTransaction: (accId: string) => void;
}

export const AccountDetailsModal: React.FC<AccountDetailsModalProps> = ({ visible, account, onClose, onAddTransaction }) => {
  const { theme } = useTheme();
  const { transactions, updateAccount, deleteAccount } = useLedger();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const accountTransactions = useMemo(() => {
    if (!account) return [];
    return transactions.filter((t) => t.accountId === account.id);
  }, [account, transactions]);

  if (!account) return null;

  const remainingLimit = Math.max(0, account.dailyLimit - account.todaySend);

  const handleConfirmDelete = async () => {
    setShowDeleteConfirm(false);
    await deleteAccount(account.id);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
          {/* Header */}
          <View style={[styles.header, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <TouchableOpacity onPress={onClose} style={styles.iconBtn}>
              <Ionicons name="arrow-back" size={22} color={theme.text} />
            </TouchableOpacity>

            <View style={styles.headerTitleContainer}>
              <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
                {account.name}
              </Text>
              <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
                {account.accountNumber}
              </Text>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={() => updateAccount(account.id, { isActive: !account.isActive })}
                style={[
                  styles.activeBadge,
                  {
                    backgroundColor: account.isActive
                      ? theme.successLight
                      : theme.cardSecondary,
                  },
                ]}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text
                  style={[
                    styles.activeBadgeText,
                    { color: account.isActive ? theme.success : theme.textMuted },
                  ]}
                  numberOfLines={1}
                >
                  {account.isActive ? 'Active' : 'Inactive'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setShowDeleteConfirm(true)} style={styles.iconBtn}>
                <Ionicons name="trash-outline" size={20} color={theme.danger} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            style={styles.scrollContainer}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Main Balance Card */}
            <View style={[styles.balanceCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.balanceCardLabel, { color: theme.textSecondary }]}>
                CURRENT FLOAT BALANCE
              </Text>
              <Text
                style={[styles.balanceCardAmount, { color: theme.text }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.65}
              >
                {formatCurrency(account.balance)}
              </Text>

              <View style={styles.progressBarWrapper}>
                <LimitProgressBar
                  usedAmount={account.todaySend}
                  totalLimit={account.dailyLimit}
                  label="DAILY LIMIT UTILIZATION"
                />
              </View>
            </View>

            {/* 4-Stat Metric Grid */}
            <View style={styles.statGrid}>
              {/* Stat 1: Today's Send */}
              <View style={[styles.statBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.statBoxHeader}>
                  <Text style={[styles.statBoxLabel, { color: theme.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">
                    Today's Send
                  </Text>
                  <View style={[styles.statIconBadge, { backgroundColor: theme.dangerLight }]}>
                    <Ionicons name="arrow-up" size={13} color={theme.danger} />
                  </View>
                </View>
                <Text
                  style={[styles.statBoxValue, { color: theme.text }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.6}
                >
                  {formatCurrency(account.todaySend)}
                </Text>
              </View>

              {/* Stat 2: Today's Profit */}
              <View style={[styles.statBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.statBoxHeader}>
                  <Text style={[styles.statBoxLabel, { color: theme.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">
                    Today's Profit
                  </Text>
                  <View style={[styles.statIconBadge, { backgroundColor: theme.successLight }]}>
                    <Ionicons name="trending-up" size={13} color={theme.success} />
                  </View>
                </View>
                <Text
                  style={[styles.statBoxValue, { color: theme.success }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.6}
                >
                  +{formatCurrency(account.todayProfit)}
                </Text>
              </View>

              {/* Stat 3: Daily Limit */}
              <View style={[styles.statBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.statBoxHeader}>
                  <Text style={[styles.statBoxLabel, { color: theme.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">
                    Daily Limit
                  </Text>
                  <View style={[styles.statIconBadge, { backgroundColor: theme.primaryLight }]}>
                    <Ionicons name="shield-checkmark-outline" size={13} color={theme.primary} />
                  </View>
                </View>
                <Text
                  style={[styles.statBoxValue, { color: theme.text }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.6}
                >
                  {formatCurrency(account.dailyLimit)}
                </Text>
              </View>

              {/* Stat 4: Remaining Limit */}
              <View style={[styles.statBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.statBoxHeader}>
                  <Text style={[styles.statBoxLabel, { color: theme.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">
                    Remaining
                  </Text>
                  <View style={[styles.statIconBadge, { backgroundColor: theme.warningLight }]}>
                    <Ionicons name="time-outline" size={13} color={theme.warning} />
                  </View>
                </View>
                <Text
                  style={[styles.statBoxValue, { color: theme.primary }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.6}
                >
                  {formatCurrency(remainingLimit)}
                </Text>
              </View>
            </View>

            {/* Quick Action Button */}
            <TouchableOpacity
              style={[styles.addTxButton, { backgroundColor: theme.primary }]}
              onPress={() => {
                onClose();
                onAddTransaction(account.id);
              }}
              activeOpacity={0.75}
            >
              <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
              <Text style={styles.addTxButtonText}>Log bKash Entry on this Number</Text>
            </TouchableOpacity>

            {/* Account History */}
            <View style={styles.historySection}>
              <View style={styles.historyHeader}>
                <Text style={[styles.historyTitle, { color: theme.text }]}>Transaction History</Text>
                <Text style={[styles.historyCount, { color: theme.textSecondary }]}>
                  {accountTransactions.length} records
                </Text>
              </View>

              {accountTransactions.length === 0 ? (
                <View style={[styles.emptyBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Ionicons name="receipt-outline" size={32} color={theme.textMuted} />
                  <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                    No bKash transactions recorded for this number yet.
                  </Text>
                </View>
              ) : (
                accountTransactions.map((tx) => (
                  <TransactionItem key={tx.id} transaction={tx} />
                ))
              )}
            </View>
          </ScrollView>

          {/* Delete Number Confirmation Modal */}
          <ConfirmationModal
            visible={showDeleteConfirm}
            title="Delete bKash Number"
            message={`Are you sure you want to remove "${account.name}" (${account.accountNumber})? All associated records will be deleted.`}
            confirmText="Delete Number"
            cancelText="Cancel"
            type="danger"
            icon="trash-outline"
            onConfirm={handleConfirmDelete}
            onCancel={() => setShowDeleteConfirm(false)}
          />
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
    height: '92%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  iconBtn: {
    padding: 6,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    flexShrink: 0,
  },
  activeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  balanceCard: {
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 18,
    borderWidth: 1,
    marginBottom: 14,
  },
  balanceCardLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  balanceCardAmount: {
    fontSize: 30,
    fontWeight: '900',
    marginVertical: 6,
    letterSpacing: -0.5,
  },
  progressBarWrapper: {
    marginTop: 10,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statBox: {
    width: '48.5%',
    flexGrow: 1,
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  statBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 4,
  },
  statIconBadge: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statBoxLabel: {
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
    letterSpacing: 0.2,
  },
  statBoxValue: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  addTxButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
    marginBottom: 20,
  },
  addTxButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  historySection: {
    marginBottom: 20,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  historyCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyBox: {
    borderRadius: 16,
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});