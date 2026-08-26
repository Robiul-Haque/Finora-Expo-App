import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Account } from '../types/ledger';
import { useLedger } from '../context/LedgerContext';
import { useTheme } from '../context/ThemeContext';
import { LimitProgressBar } from './LimitProgressBar';
import { TransactionItem } from './TransactionItem';

interface AccountDetailsModalProps {
  account: Account | null;
  visible: boolean;
  onClose: () => void;
  onAddTransaction: (accId: string) => void;
}

export const AccountDetailsModal: React.FC<AccountDetailsModalProps> = ({
  account,
  visible,
  onClose,
  onAddTransaction,
}) => {
  const { theme } = useTheme();
  const { transactions, deleteAccount } = useLedger();

  const accountTransactions = useMemo(() => {
    if (!account) return [];
    return transactions.filter((t) => t.accountId === account.id);
  }, [transactions, account]);

  if (!account) return null;

  const remainingLimit = Math.max(0, account.dailyLimit - account.todaySend);

  const formatCurrency = (val: number) => {
    return '৳' + val.toLocaleString('en-US');
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Account',
      `Are you sure you want to delete ${account.name} (${account.accountNumber})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteAccount(account.id);
            onClose();
          },
        },
      ]
    );
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

            <TouchableOpacity onPress={handleDelete} style={styles.iconBtn}>
              <Ionicons name="trash-outline" size={20} color={theme.danger} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* Main Balance Card */}
            <View style={[styles.balanceCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.balanceCardLabel, { color: theme.textSecondary }]}>
                CURRENT BALANCE
              </Text>
              <Text style={[styles.balanceCardAmount, { color: theme.text }]}>
                {formatCurrency(account.balance)}
              </Text>

              <LimitProgressBar
                usedAmount={account.todaySend}
                totalLimit={account.dailyLimit}
                label="DAILY LIMIT UTILIZATION"
              />
            </View>

            {/* 4-Stat Metric Grid */}
            <View style={styles.statGrid}>
              {/* Stat 1: Today's Send */}
              <View style={[styles.statBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.statIconRow}>
                  <Ionicons name="arrow-up" size={16} color={theme.danger} />
                  <Text style={[styles.statBoxLabel, { color: theme.textSecondary }]}>Today's Send</Text>
                </View>
                <Text style={[styles.statBoxValue, { color: theme.text }]}>
                  {formatCurrency(account.todaySend)}
                </Text>
              </View>

              {/* Stat 2: Today's Profit */}
              <View style={[styles.statBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.statIconRow}>
                  <Ionicons name="trending-up" size={16} color={theme.success} />
                  <Text style={[styles.statBoxLabel, { color: theme.textSecondary }]}>Profit</Text>
                </View>
                <Text style={[styles.statBoxValue, { color: theme.success }]}>
                  +{formatCurrency(account.todayProfit)}
                </Text>
              </View>

              {/* Stat 3: Daily Limit */}
              <View style={[styles.statBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.statIconRow}>
                  <Ionicons name="shield-checkmark-outline" size={16} color={theme.primary} />
                  <Text style={[styles.statBoxLabel, { color: theme.textSecondary }]}>Daily Limit</Text>
                </View>
                <Text style={[styles.statBoxValue, { color: theme.text }]}>
                  {formatCurrency(account.dailyLimit)}
                </Text>
              </View>

              {/* Stat 4: Remaining Limit */}
              <View style={[styles.statBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.statIconRow}>
                  <Ionicons name="time-outline" size={16} color={theme.warning} />
                  <Text style={[styles.statBoxLabel, { color: theme.textSecondary }]}>Remaining</Text>
                </View>
                <Text style={[styles.statBoxValue, { color: theme.primary }]}>
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
            >
              <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
              <Text style={styles.addTxButtonText}>Log Transaction on this Account</Text>
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
                    No transactions recorded for this account yet.
                  </Text>
                </View>
              ) : (
                accountTransactions.map((tx) => (
                  <TransactionItem key={tx.id} transaction={tx} />
                ))
              )}
            </View>
          </ScrollView>
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
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 10,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  scrollBody: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  balanceCard: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    marginBottom: 14,
  },
  balanceCardLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  balanceCardAmount: {
    fontSize: 30,
    fontWeight: '900',
    marginVertical: 4,
    letterSpacing: -0.5,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statBox: {
    width: '48.5%',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  statIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  statBoxLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  statBoxValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  addTxButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 20,
  },
  addTxButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  historySection: {
    marginBottom: 40,
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
    borderRadius: 14,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
  },
});
