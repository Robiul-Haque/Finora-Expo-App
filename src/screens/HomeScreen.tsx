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
import { AccountCard, AccountCardSkeleton } from '../components';
import { useBounceScroll } from '../hooks';
import { Account } from '../types';

interface HomeScreenProps {
  onOpenAccountDetails: (account: Account) => void;
  onOpenAddTransaction: (accountId?: string) => void;
  onNavigateToTransactions: () => void;
  onNavigateToAccounts: () => void;
}

type SortOption = 'balance_desc' | 'balance_asc' | 'limit_asc';

const HomeScreenComponent: React.FC<HomeScreenProps> = ({
  onOpenAccountDetails,
  onOpenAddTransaction,
}) => {
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const { accounts, isLoading, refetch } = useLedger();
  const { scrollProps, bounceStyle } = useBounceScroll();

  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState<SortOption>('balance_desc');
  const [showSortPicker, setShowSortPicker] = useState(false);

  const filteredAccounts = useMemo(() => {
    let result = accounts.filter((acc) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        acc.name.toLowerCase().includes(q) ||
        acc.accountNumber.toLowerCase().includes(q)
      );
    });

    switch (sortOption) {
      case 'balance_desc':
        return [...result].sort((a, b) => b.balance - a.balance);
      case 'balance_asc':
        return [...result].sort((a, b) => a.balance - b.balance);
      case 'limit_asc':
        return [...result].sort((a, b) => (a.remainingLimit || 0) - (b.remainingLimit || 0));
      default:
        return result;
    }
  }, [accounts, searchQuery, sortOption]);

  const sortLabel = useMemo(() => {
    switch (sortOption) {
      case 'balance_desc':
        return 'Balance: High -> Low';
      case 'balance_asc':
        return 'Balance: Low -> High';
      case 'limit_asc':
        return 'Limit Remaining: Low -> High';
    }
  }, [sortOption]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Stitch Top App Bar */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.divider }]}>
        <View style={styles.headerLeft}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.logoBadgeImage}
            resizeMode="contain"
          />
          <View style={styles.headerTitleGroup}>
            <Text style={[styles.appTitle, { color: theme.primary }]}>Finora</Text>
            <Text style={[styles.appSubtitle, { color: theme.textSecondary }]}>Smart Business Ledger</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: theme.cardSecondary }]}
            onPress={toggleTheme}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isDarkMode ? 'sunny-outline' : 'moon-outline'}
              size={18}
              color={theme.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: theme.cardSecondary }]}
            activeOpacity={0.7}
          >
            <Ionicons
              name="settings-outline"
              size={18}
              color={theme.textSecondary}
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        {...scrollProps}
      >
        <Animated.View style={[bounceStyle, styles.bounceContainer]}>
          {/* Controls Section: Search & Sort */}
          <View style={styles.controlsSection}>
          {/* Search Box */}
          <View
            style={[
              styles.searchBox,
              {
                backgroundColor: theme.inputBg,
                borderBottomColor: theme.border,
              },
            ]}
          >
            <Ionicons name="search" size={18} color={theme.textMuted} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search phone numbers..."
              placeholderTextColor={theme.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color={theme.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Sort Selector */}
          <TouchableOpacity
            style={[
              styles.sortBox,
              {
                backgroundColor: theme.cardSecondary,
                borderColor: theme.border,
              },
            ]}
            onPress={() => setShowSortPicker(!showSortPicker)}
            activeOpacity={0.8}
          >
            <Text style={[styles.sortText, { color: theme.text }]}>{sortLabel}</Text>
            <Ionicons name="chevron-down" size={16} color={theme.textMuted} />
          </TouchableOpacity>

          {/* Sort Dropdown */}
          {showSortPicker && (
            <View style={[styles.sortDropdown, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <TouchableOpacity
                style={[
                  styles.sortItem,
                  sortOption === 'balance_desc' && { backgroundColor: theme.primaryLight },
                ]}
                onPress={() => {
                  setSortOption('balance_desc');
                  setShowSortPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.sortItemText,
                    { color: sortOption === 'balance_desc' ? theme.primary : theme.text },
                  ]}
                >
                  Balance: High -&gt; Low
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.sortItem,
                  sortOption === 'balance_asc' && { backgroundColor: theme.primaryLight },
                ]}
                onPress={() => {
                  setSortOption('balance_asc');
                  setShowSortPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.sortItemText,
                    { color: sortOption === 'balance_asc' ? theme.primary : theme.text },
                  ]}
                >
                  Balance: Low -&gt; High
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.sortItem,
                  sortOption === 'limit_asc' && { backgroundColor: theme.primaryLight },
                ]}
                onPress={() => {
                  setSortOption('limit_asc');
                  setShowSortPicker(false);
                }}
              >
                <Text
                  style={[
                    styles.sortItemText,
                    { color: sortOption === 'limit_asc' ? theme.primary : theme.text },
                  ]}
                >
                  Limit Remaining: Low -&gt; High
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Account Cards Grid */}
        <View style={styles.accountsGrid}>
          {isLoading && accounts.length === 0 ? (
            <>
              <AccountCardSkeleton />
              <AccountCardSkeleton />
              <AccountCardSkeleton />
            </>
          ) : filteredAccounts.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Ionicons name="search-outline" size={32} color={theme.textMuted} />
              <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
                No SIM accounts matching "{searchQuery}"
              </Text>
            </View>
          ) : (
            filteredAccounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                onPress={() => onOpenAccountDetails(account)}
                onAddTransactionPress={() => onOpenAddTransaction(account.id)}
              />
            ))
          )}
        </View>

        <View style={{ height: 80 }} />
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

export const HomeScreen = React.memo(HomeScreenComponent);

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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadgeImage: {
    width: 36,
    height: 36,
  },
  headerTitleGroup: {
    gap: 1,
  },
  appTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  appSubtitle: {
    fontSize: 11,
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  controlsSection: {
    gap: 10,
    position: 'relative',
    zIndex: 10,
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
  sortBox: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  sortText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sortDropdown: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: -4,
  },
  sortItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0, 0, 0, 0.06)',
  },
  sortItemText: {
    fontSize: 13,
    fontWeight: '600',
  },
  accountsGrid: {
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 36,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    marginTop: 10,
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});