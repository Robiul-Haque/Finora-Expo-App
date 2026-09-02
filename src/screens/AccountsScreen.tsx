import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLedger } from '../context/LedgerContext';
import { useTheme } from '../context/ThemeContext';
import { AccountCard, AccountCardSkeleton, ConfirmationModal, SearchBar, AppHeader } from '../components';
import { Account } from '../types';

interface AccountsScreenProps {
  onOpenAccountDetails: (account: Account) => void;
  onOpenAddAccount: () => void;
  onOpenAddTransaction: (accountId: string) => void;
}

const AccountsScreenComponent: React.FC<AccountsScreenProps> = ({
  onOpenAccountDetails,
  onOpenAddAccount,
  onOpenAddTransaction,
}) => {
  const { theme } = useTheme();
  const { accounts, isLoading, deleteAccount, refetch } = useLedger();

  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      if (refetch) await refetch();
    } catch {
      // Offline fallback
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        acc.name.toLowerCase().includes(q) ||
        acc.accountNumber.toLowerCase().includes(q)
      );
    });
  }, [accounts, searchQuery]);

  const handleConfirmDelete = () => {
    if (accountToDelete) {
      deleteAccount(accountToDelete.id);
      setAccountToDelete(null);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Top App Bar */}
      <AppHeader />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.bounceContainer}>
          {/* Search Header */}
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search phone numbers..."
            style={styles.searchBox}
          />

          {/* Large Section Title */}
          <View style={styles.titleRow}>
            <Text style={[styles.screenHeading, { color: theme.text }]}>Accounts</Text>
            <TouchableOpacity
              style={[styles.addAccountBtn, { backgroundColor: theme.primary }]}
              onPress={onOpenAddAccount}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.addAccountBtnText}>Add SIM</Text>
            </TouchableOpacity>
          </View>

        {/* Accounts List */}
        <View style={styles.accountsGrid}>
          {isLoading && accounts.length === 0 ? (
            <>
              <AccountCardSkeleton />
              <AccountCardSkeleton />
              <AccountCardSkeleton />
            </>
          ) : filteredAccounts.length === 0 ? (
            <View style={[styles.emptyContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Ionicons name="card-outline" size={36} color={theme.textMuted} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No accounts found</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                {searchQuery ? `No accounts matching "${searchQuery}"` : 'Tap "Add SIM" to register your first account.'}
              </Text>
            </View>
          ) : (
            filteredAccounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                onPress={onOpenAccountDetails}
                onAddTransactionPress={onOpenAddTransaction}
              />
            ))
          )}
        </View>

        <View style={{ height: 80 }} />
        </View>
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        visible={!!accountToDelete}
        title="Delete Account"
        message={`Delete account ${accountToDelete?.accountNumber}? All transaction history under this account will also be permanently deleted.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setAccountToDelete(null)}
      />
    </SafeAreaView>
  );
};

export const AccountsScreen = React.memo(AccountsScreenComponent);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerCenterBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBadgeImage: {
    width: 26,
    height: 26,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 0,
  },
  screenHeading: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  addAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  addAccountBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 105,
  },
  bounceContainer: {
    gap: 16,
  },
  searchBox: {
    height: 48,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    padding: 0,
  },
  accountsGrid: {
    gap: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 36,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
});