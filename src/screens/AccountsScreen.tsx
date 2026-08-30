import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLedger } from '../context/LedgerContext';
import { useTheme } from '../context/ThemeContext';
import { Header, LimitProgressBar, ConfirmationModal } from '../components';
import { Account } from '../types';
import { formatCurrency } from '../utils';

interface AccountsScreenProps {
  onOpenAccountDetails: (account: Account) => void;
  onOpenAddAccount: () => void;
  onOpenAddTransaction: (accountId: string) => void;
}

export const AccountsScreen: React.FC<AccountsScreenProps> = ({ onOpenAccountDetails, onOpenAddAccount, onOpenAddTransaction }) => {
  const { theme } = useTheme();
  const { accounts, deleteAccount, updateAccount, refetch } = useLedger();

  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      if (refetch) await refetch();
    } catch {
      // Ignore refresh network errors in UI
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const filteredAccounts = React.useMemo(() => {
    return accounts.filter((acc) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        acc.name.toLowerCase().includes(q) ||
        acc.accountNumber.toLowerCase().includes(q) ||
        acc.type.toLowerCase().includes(q)
      );
    });
  }, [accounts, searchQuery]);

  const totalLimitAll = React.useMemo(() => {
    return accounts.reduce((sum, a) => sum + (a.isActive ? a.dailyLimit : 0), 0);
  }, [accounts]);

  const totalSendToday = React.useMemo(() => {
    return accounts.reduce((sum, a) => sum + (a.isActive ? a.todaySend : 0), 0);
  }, [accounts]);

  const handleDelete = (account: Account) => {
    setAccountToDelete(account);
  };

  const handleConfirmDelete = () => {
    if (accountToDelete) {
      deleteAccount(accountToDelete.id);
      setAccountToDelete(null);
    }
  };

  const handleToggleActive = (account: Account) => {
    updateAccount(account.id, { isActive: !account.isActive });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <Header
        title="bKash Numbers"
        subtitle={`${accounts.filter((a) => a.isActive).length} Active bKash Numbers`}
        showSearch
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search bKash number, account name..."
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
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>
                TOTAL DAILY SEND LIMIT ACROSS ALL NUMBERS
              </Text>
              <Text
                style={[styles.summaryAmount, { color: theme.text }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.65}
              >
                {formatCurrency(totalLimitAll)}
              </Text>
            </View>
            <View style={[styles.summaryBadge, { backgroundColor: theme.primaryLight, flexShrink: 0 }]}>
              <Text style={[styles.summaryBadgeText, { color: theme.primary }]} numberOfLines={1}>
                {accounts.length} bKash Numbers
              </Text>
            </View>
          </View>

          <LimitProgressBar
            usedAmount={totalSendToday}
            totalLimit={totalLimitAll}
            label="TODAY'S COMBINED SEND USAGE"
          />
        </View>

        {/* Accounts List */}
        <View style={styles.listHeader}>
          <Text style={[styles.listTitle, { color: theme.text }]}>bKash Numbers</Text>
          <TouchableOpacity
            onPress={onOpenAddAccount}
            style={[styles.addBtn, { backgroundColor: theme.primary }]}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={17} color="#FFFFFF" />
            <Text style={styles.addBtnTitle}>Add Number</Text>
          </TouchableOpacity>
        </View>

        {filteredAccounts.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="phone-portrait-outline" size={40} color={theme.textMuted} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No bKash Numbers Found</Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
              Add your first bKash agent, merchant or personal number.
            </Text>
            <TouchableOpacity
              onPress={onOpenAddAccount}
              style={[styles.emptyAddBtn, { backgroundColor: theme.primary }]}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={18} color="#FFFFFF" />
              <Text style={styles.emptyAddBtnText}>Add New Number</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredAccounts.map((account) => {
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

                    <View style={{ flex: 1, minWidth: 0, marginRight: 6 }}>
                      <View style={styles.nameRow}>
                        <Text
                          style={[styles.accountName, { color: theme.text }]}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
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
                  <View style={{ flex: 1, marginRight: 8, minWidth: 0 }}>
                    <Text style={[styles.balanceSmallLabel, { color: theme.textSecondary }]} numberOfLines={1}>
                      BALANCE
                    </Text>
                    <Text
                      style={[styles.balanceAmount, { color: theme.text }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.6}
                    >
                      {formatCurrency(account.balance)}
                    </Text>
                  </View>

                  <View style={[styles.rightStats, { flexShrink: 0 }]}>
                    <Text style={[styles.balanceSmallLabel, { color: theme.textSecondary }]} numberOfLines={1}>
                      REMAINING LIMIT
                    </Text>
                    <Text
                      style={[styles.remainingAmount, { color: theme.primary }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.6}
                    >
                      {formatCurrency(remaining)}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={[styles.smallBtn, { borderColor: theme.border }]}
                    onPress={() => onOpenAccountDetails(account)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="eye-outline" size={14} color={theme.textSecondary} />
                    <Text style={[styles.smallBtnText, { color: theme.textSecondary }]} numberOfLines={1}>
                      Full Details
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.smallPrimaryBtn, { backgroundColor: theme.primary }]}
                    onPress={() => onOpenAddTransaction(account.id)}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="swap-vertical" size={14} color="#FFFFFF" />
                    <Text style={styles.smallPrimaryBtnText} numberOfLines={1}>Add Entry</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={Boolean(accountToDelete)}
        title="Delete bKash Number"
        message={
          accountToDelete
            ? `Are you sure you want to remove "${accountToDelete.name}" (${accountToDelete.accountNumber})? This will delete the number and its association.`
            : ''
        }
        confirmText="Delete Number"
        cancelText="Cancel"
        type="danger"
        icon="trash-outline"
        onConfirm={handleConfirmDelete}
        onCancel={() => setAccountToDelete(null)}
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
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.4,
    lineHeight: 15,
    marginBottom: 4,
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
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    shadowColor: '#E2136E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  addBtnTitle: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  emptyContainer: {
    borderRadius: 18,
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    gap: 8,
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    marginTop: 4,
    shadowColor: '#E2136E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyAddBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4.5,
    paddingHorizontal: 7.5,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
    flexShrink: 0,
  },
  activeBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.2,
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
});