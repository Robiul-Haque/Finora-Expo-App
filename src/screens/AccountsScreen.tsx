import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLedger } from '../context/LedgerContext';
import { useTheme } from '../context/ThemeContext';
import { Header } from '../components/Header';
import { Account } from '../types/ledger';
import { LimitProgressBar } from '../components/LimitProgressBar';

interface AccountsScreenProps {
  onOpenAccountDetails: (account: Account) => void;
  onOpenAddAccount: () => void;
  onOpenAddTransaction: (accountId: string) => void;
}

export const AccountsScreen: React.FC<AccountsScreenProps> = ({
  onOpenAccountDetails,
  onOpenAddAccount,
  onOpenAddTransaction,
}) => {
  const { theme } = useTheme();
  const { accounts, deleteAccount, updateAccount } = useLedger();

  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 600);
  }, []);

  const formatCurrency = (val: number) => {
    return '৳' + val.toLocaleString('en-US');
  };

  const filteredAccounts = accounts.filter((acc) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      acc.name.toLowerCase().includes(q) ||
      acc.accountNumber.toLowerCase().includes(q) ||
      acc.type.toLowerCase().includes(q)
    );
  });

  const totalLimitAll = accounts.reduce((sum, a) => sum + (a.isActive ? a.dailyLimit : 0), 0);
  const totalSendToday = accounts.reduce((sum, a) => sum + (a.isActive ? a.todaySend : 0), 0);

  const handleDelete = (account: Account) => {
    Alert.alert('Delete Account', `Are you sure you want to delete ${account.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteAccount(account.id),
      },
    ]);
  };

  const handleToggleActive = (account: Account) => {
    updateAccount(account.id, { isActive: !account.isActive });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <Header
        title="bKash Business Lines"
        subtitle={`${accounts.filter((a) => a.isActive).length} Active bKash SIMs`}
        showSearch
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search bKash accounts, SIM number..."
      />

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
        {/* Aggregate Limit Card */}
        <View style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.summaryTop}>
            <View>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>
                TOTAL BKASH DAILY LIMIT ALLOCATION
              </Text>
              <Text style={[styles.summaryAmount, { color: theme.text }]}>
                {formatCurrency(totalLimitAll)}
              </Text>
            </View>
            <View style={[styles.summaryBadge, { backgroundColor: theme.primaryLight }]}>
              <Text style={[styles.summaryBadgeText, { color: theme.primary }]}>
                {accounts.length} bKash Lines
              </Text>
            </View>
          </View>

          <LimitProgressBar
            usedAmount={totalSendToday}
            totalLimit={totalLimitAll}
            label="AGGREGATE USAGE TODAY"
          />
        </View>

        {/* Accounts List */}
        <View style={styles.listHeader}>
          <Text style={[styles.listTitle, { color: theme.text }]}>bKash SIMs & Counters</Text>
          <TouchableOpacity onPress={onOpenAddAccount} style={styles.addTextBtn} activeOpacity={0.7}>
            <Ionicons name="add-circle" size={16} color={theme.primary} />
            <Text style={[styles.addTextBtnTitle, { color: theme.primary }]}>Add Line</Text>
          </TouchableOpacity>
        </View>

        {filteredAccounts.map((account) => {
          const remaining = Math.max(0, account.dailyLimit - account.todaySend);

          return (
            <TouchableOpacity
              key={account.id}
              activeOpacity={0.75}
              onPress={() => onOpenAccountDetails(account)}
              style={[
                styles.accountRowCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  opacity: account.isActive ? 1 : 0.65,
                },
              ]}
            >
              <View style={styles.accountCardTop}>
                <View style={styles.accountCardLeft}>
                  <View
                    style={[
                      styles.avatarBox,
                      {
                        backgroundColor:
                          account.type === 'agent'
                            ? '#E2136E18'
                            : account.type === 'merchant'
                            ? '#BE123C18'
                            : account.type === 'personal'
                            ? '#9D174D18'
                            : '#E2136E18',
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        account.type === 'agent'
                          ? 'phone-portrait-outline'
                          : account.type === 'merchant'
                          ? 'qr-code-outline'
                          : account.type === 'personal'
                          ? 'person-circle-outline'
                          : 'phone-portrait-outline'
                      }
                      size={22}
                      color={
                        account.type === 'agent'
                          ? '#E2136E'
                          : account.type === 'merchant'
                          ? '#BE123C'
                          : account.type === 'personal'
                          ? '#9D174D'
                          : '#E2136E'
                      }
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.nameRow}>
                      <Text style={[styles.accountName, { color: theme.text }]} numberOfLines={1}>
                        {account.name}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleToggleActive(account)}
                        style={[
                          styles.activeBadge,
                          {
                            backgroundColor: account.isActive
                              ? theme.successLight
                              : theme.cardSecondary,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.activeBadgeText,
                            { color: account.isActive ? theme.success : theme.textMuted },
                          ]}
                        >
                          {account.isActive ? 'Active' : 'Inactive'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={[styles.accountNumber, { color: theme.textSecondary }]} numberOfLines={1}>
                      {account.accountNumber}
                    </Text>
                  </View>
                </View>

                <View style={styles.actionIcons}>
                  <TouchableOpacity
                    onPress={() => handleDelete(account)}
                    style={styles.iconAction}
                  >
                    <Ionicons name="trash-outline" size={18} color={theme.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.balanceRow}>
                <View>
                  <Text style={[styles.balanceSmallLabel, { color: theme.textSecondary }]}>
                    BALANCE
                  </Text>
                  <Text style={[styles.balanceAmount, { color: theme.text }]}>
                    {formatCurrency(account.balance)}
                  </Text>
                </View>

                <View style={styles.rightStats}>
                  <Text style={[styles.balanceSmallLabel, { color: theme.textSecondary }]}>
                    REMAINING LIMIT
                  </Text>
                  <Text style={[styles.remainingAmount, { color: theme.primary }]}>
                    {formatCurrency(remaining)}
                  </Text>
                </View>
              </View>

              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[styles.smallBtn, { borderColor: theme.border }]}
                  onPress={() => onOpenAccountDetails(account)}
                >
                  <Ionicons name="eye-outline" size={14} color={theme.textSecondary} />
                  <Text style={[styles.smallBtnText, { color: theme.textSecondary }]}>
                    Full Details
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.smallPrimaryBtn, { backgroundColor: theme.primary }]}
                  onPress={() => onOpenAddTransaction(account.id)}
                >
                  <Ionicons name="swap-vertical" size={14} color="#FFFFFF" />
                  <Text style={styles.smallPrimaryBtnText}>Add Entry</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.primary }]}
        onPress={onOpenAddAccount}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
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
  summaryCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  summaryAmount: {
    fontSize: 24,
    fontWeight: '900',
    marginTop: 2,
  },
  summaryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  summaryBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  addTextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addTextBtnTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  accountRowCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  accountCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accountCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  accountName: {
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 1,
  },
  activeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  accountNumber: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  actionIcons: {
    flexDirection: 'row',
    gap: 4,
  },
  iconAction: {
    padding: 6,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
  },
  balanceSmallLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  balanceAmount: {
    fontSize: 20,
    fontWeight: '800',
    marginTop: 2,
  },
  rightStats: {
    alignItems: 'flex-end',
  },
  remainingAmount: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  smallBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  smallPrimaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  smallPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
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
