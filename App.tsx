import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Font from 'expo-font';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/services/queryClient';
import { ledgerKeys } from './src/hooks/useLedgerQueries';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { LedgerProvider, useLedger } from './src/context/LedgerContext';
import { HomeScreen, TransactionsScreen, AccountsScreen } from './src/screens';
import { AddTransactionModal, AddAccountModal, AccountDetailsModal, ErrorBoundary, SplashScreen, OfflineBanner, UserFriendlyToast } from './src/components';
import { Account } from './src/types';
import { initializeThemeSync } from './src/store/useThemeStore';
import { setupCrashPrevention } from './src/utils/crashPrevention';

// Initialize global crash prevention before any rendering or async logic
setupCrashPrevention();

type TabType = 'home' | 'transactions' | 'accounts';

interface TabButtonProps {
  tab: TabType;
  activeTab: TabType;
  label: string;
  activeIcon: keyof typeof Ionicons.glyphMap;
  inactiveIcon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  activeColor: string;
  inactiveColor: string;
}

const TabButtonComponent: React.FC<TabButtonProps> = ({ tab, activeTab, label, activeIcon, inactiveIcon, onPress, activeColor, inactiveColor }) => {
  const isActive = activeTab === tab;

  return (
    <TouchableOpacity
      style={styles.tabItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.tabPill}>
        <Ionicons
          name={isActive ? activeIcon : inactiveIcon}
          size={20}
          color={isActive ? activeColor : inactiveColor}
        />
        <Text
          style={[
            styles.tabLabel,
            {
              color: isActive ? activeColor : inactiveColor,
              fontWeight: isActive ? '800' : '600',
            },
          ]}
        >
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const TabButton = React.memo(TabButtonComponent);

const MainApp: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { theme, isDarkMode } = useTheme();
  const { accounts } = useLedger();
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [showSplash, setShowSplash] = useState(true);

  // Modal States
  const [addTxVisible, setAddTxVisible] = useState(false);
  const [addAccountVisible, setAddAccountVisible] = useState(false);
  const [selectedAccountIdForDetails, setSelectedAccountIdForDetails] = useState<string | null>(null);
  const [preselectedAccountIdForTx, setPreselectedAccountIdForTx] = useState<string | undefined>();

  const selectedAccountForDetails = React.useMemo(() => {
    if (!selectedAccountIdForDetails) return null;
    return accounts.find((a) => a.id === selectedAccountIdForDetails) || null;
  }, [accounts, selectedAccountIdForDetails]);

  const [visitedTabs, setVisitedTabs] = useState<Record<TabType, boolean>>({
    home: true,
    transactions: false,
    accounts: false,
  });

  // Pre-warm secondary tabs smoothly only AFTER splash screen has finished,
  // completely freeing the JS thread so splash animations never freeze
  useEffect(() => {
    if (!showSplash) {
      const idleTimer = setTimeout(() => {
        setVisitedTabs({
          home: true,
          transactions: true,
          accounts: true,
        });
      }, 250);
      return () => clearTimeout(idleTimer);
    }
  }, [showSplash]);

  const switchTab = React.useCallback((tab: TabType) => {
    setActiveTab(tab);
    setVisitedTabs((prev) => (prev[tab] ? prev : { ...prev, [tab]: true }));
  }, []);

  const handleOpenAddTx = React.useCallback((accountId?: string) => {
    setPreselectedAccountIdForTx(accountId);
    setAddTxVisible(true);
  }, []);

  const handleOpenAccountDetails = React.useCallback((acc: Account) => {
    setSelectedAccountIdForDetails(acc.id);
  }, []);

  const handleNavigateToTransactions = React.useCallback(() => {
    switchTab('transactions');
  }, [switchTab]);

  const handleNavigateToAccounts = React.useCallback(() => {
    switchTab('accounts');
  }, [switchTab]);

  const handleOpenAddAccount = React.useCallback(() => {
    setAddAccountVisible(true);
  }, []);

  // Equal outer gap for floating bottom navigation bar
  const menuOuterGap = 16;
  const menuBottomGap = insets.bottom > 0 ? insets.bottom + 8 : menuOuterGap;

  return (
    <View style={[styles.rootContainer, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
        animated={false}
      />

      {/* Floating Subtle Offline Banner (Auto-shows when offline, auto-removes on reconnection) */}
      <View style={[styles.offlineBannerContainer, { top: insets.top + 2 }]} pointerEvents="none">
        <OfflineBanner />
      </View>

      {/* Global User-Friendly Warning & Toast Notifications */}
      <UserFriendlyToast />

      {/* Main Content Area: Instant Zero-Lag Lazy-Preserved Tab Views */}
      <View style={styles.screenContainer}>
        <View style={[styles.screenPage, { display: activeTab === 'home' ? 'flex' : 'none' }]}>
          <HomeScreen
            onOpenAccountDetails={handleOpenAccountDetails}
            onOpenAddTransaction={handleOpenAddTx}
            onNavigateToTransactions={handleNavigateToTransactions}
            onNavigateToAccounts={handleNavigateToAccounts}
          />
        </View>

        {visitedTabs.transactions && (
          <View style={[styles.screenPage, { display: activeTab === 'transactions' ? 'flex' : 'none' }]}>
            <TransactionsScreen onOpenAddTransaction={handleOpenAddTx} />
          </View>
        )}

        {visitedTabs.accounts && (
          <View style={[styles.screenPage, { display: activeTab === 'accounts' ? 'flex' : 'none' }]}>
            <AccountsScreen
              onOpenAccountDetails={handleOpenAccountDetails}
              onOpenAddAccount={handleOpenAddAccount}
              onOpenAddTransaction={handleOpenAddTx}
            />
          </View>
        )}
      </View>

      {/* Modern Floating Island Bottom Navigation Bar - hidden during splash */}
      {!showSplash && (
        <View
          style={[
            styles.floatingBarWrapper,
            {
              paddingHorizontal: menuOuterGap,
              paddingBottom: menuBottomGap,
            },
          ]}
          pointerEvents="box-none"
        >
        <View
          style={[
            styles.bottomTabBar,
            {
              backgroundColor: theme.tabBarBg,
              borderColor: theme.border,
            },
          ]}
        >
          {/* Tab 1: Home */}
          <TabButton
            tab="home"
            activeTab={activeTab}
            label="Home"
            activeIcon="home"
            inactiveIcon="home-outline"
            onPress={() => switchTab('home')}
            activeColor={theme.tabBarActive}
            inactiveColor={theme.tabBarInactive}
          />

          {/* Tab 2: Transactions */}
          <TabButton
            tab="transactions"
            activeTab={activeTab}
            label="Transactions"
            activeIcon="receipt"
            inactiveIcon="receipt-outline"
            onPress={() => switchTab('transactions')}
            activeColor={theme.tabBarActive}
            inactiveColor={theme.tabBarInactive}
          />

          {/* Tab 3: Accounts */}
          <TabButton
            tab="accounts"
            activeTab={activeTab}
            label="Accounts"
            activeIcon="card"
            inactiveIcon="card-outline"
            onPress={() => switchTab('accounts')}
            activeColor={theme.tabBarActive}
            inactiveColor={theme.tabBarInactive}
          />
        </View>
      </View>
    )}

      {/* Modals Stack */}
      <AddTransactionModal
        visible={addTxVisible}
        onClose={() => setAddTxVisible(false)}
        preselectedAccountId={preselectedAccountIdForTx}
      />

      <AddAccountModal
        visible={addAccountVisible}
        onClose={() => setAddAccountVisible(false)}
      />

      <AccountDetailsModal
        account={selectedAccountForDetails}
        visible={!!selectedAccountForDetails}
        onClose={() => setSelectedAccountIdForDetails(null)}
        onAddTransaction={handleOpenAddTx}
      />

      {/* Brand Splash Screen on Initial App Startup */}
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
    </View>
  );
};

export default function App() {
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    async function prepareApp() {
      try {
        const [, , cachedAccRaw, cachedTxRaw] = await Promise.all([
          initializeThemeSync(),
          Font.loadAsync({
            ...Ionicons.font,
            Ionicons: require('./assets/fonts/Ionicons.ttf'),
            ionicons: require('./assets/fonts/Ionicons.ttf'),
          }),
          AsyncStorage.getItem('@finora_accounts_v4').catch(() => null),
          AsyncStorage.getItem('@finora_transactions_v4').catch(() => null),
        ]);

        if (cachedAccRaw) {
          try {
            const accs = JSON.parse(cachedAccRaw);
            if (Array.isArray(accs) && accs.length > 0) {
              queryClient.setQueryData(ledgerKeys.accounts(), accs);
            }
          } catch {}
        }

        if (cachedTxRaw) {
          try {
            const txs = JSON.parse(cachedTxRaw);
            if (Array.isArray(txs) && txs.length > 0) {
              queryClient.setQueryData(ledgerKeys.transactions(), txs);
            }
          } catch {}
        }
      } catch (e) {
        console.warn('App preparation error:', e);
      } finally {
        setAppReady(true);
      }
    }
    prepareApp();
  }, []);

  if (!appReady) {
    return null;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <ThemeProvider>
            <LedgerProvider>
              <MainApp />
            </LedgerProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  screenContainer: {
    flex: 1,
    width: '100%',
    maxWidth: 720,
    alignSelf: 'center',
  },
  screenPage: {
    flex: 1,
    width: '100%',
  },
  floatingBarWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'transparent',
    zIndex: 90,
    alignItems: 'center',
  },
  bottomTabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderRadius: 24,
    borderWidth: 1,
    width: '100%',
    maxWidth: 480,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 2,
  },
  tabPill: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    width: '100%',
  },
  tabLabel: {
    fontSize: 10.5,
    marginTop: 2,
    letterSpacing: 0.2,
  },
  offlineBannerContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
  },
});