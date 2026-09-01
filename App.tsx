import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/services/queryClient';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { LedgerProvider } from './src/context/LedgerContext';
import { HomeScreen, TransactionsScreen, AccountsScreen, AnalyticsScreen } from './src/screens';
import { AddTransactionModal, AddAccountModal, AccountDetailsModal, ErrorBoundary, SplashScreen } from './src/components';
import { Account } from './src/types';

type TabType = 'home' | 'transactions' | 'accounts' | 'analytics';

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

const TabButtonComponent: React.FC<TabButtonProps> = ({
  tab,
  activeTab,
  label,
  activeIcon,
  inactiveIcon,
  onPress,
  activeColor,
  inactiveColor,
}) => {
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
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [showSplash, setShowSplash] = useState(true);

  // Modal States
  const [addTxVisible, setAddTxVisible] = useState(false);
  const [addAccountVisible, setAddAccountVisible] = useState(false);
  const [selectedAccountForDetails, setSelectedAccountForDetails] = useState<Account | null>(null);
  const [preselectedAccountIdForTx, setPreselectedAccountIdForTx] = useState<string | undefined>();

  const [visitedTabs, setVisitedTabs] = useState<Record<TabType, boolean>>({
    home: true,
    transactions: false,
    accounts: false,
    analytics: false,
  });

  const switchTab = React.useCallback((tab: TabType) => {
    setActiveTab(tab);
    setVisitedTabs((prev) => (prev[tab] ? prev : { ...prev, [tab]: true }));
  }, []);

  const handleOpenAddTx = React.useCallback((accountId?: string) => {
    setPreselectedAccountIdForTx(accountId);
    setAddTxVisible(true);
  }, []);

  const handleOpenAccountDetails = React.useCallback((acc: Account) => {
    setSelectedAccountForDetails(acc);
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

  return (
    <View style={[styles.rootContainer, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
        animated={false}
      />

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
            <TransactionsScreen onOpenAddTransaction={() => handleOpenAddTx()} />
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

        {visitedTabs.analytics && (
          <View style={[styles.screenPage, { display: activeTab === 'analytics' ? 'flex' : 'none' }]}>
            <AnalyticsScreen />
          </View>
        )}
      </View>

      {/* Floating Action Button (FAB) */}
      <TouchableOpacity
        style={[
          styles.fabContainer,
          {
            bottom: (insets.bottom > 0 ? insets.bottom : 12) + 84,
          },
        ]}
        onPress={() => handleOpenAddTx()}
        activeOpacity={0.92}
      >
        <View style={[styles.fabButton, { backgroundColor: theme.primary }]}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </View>
      </TouchableOpacity>

      {/* Modern Floating Island Bottom Navigation Bar */}
      <View style={[styles.floatingBarWrapper, { paddingBottom: Math.max(insets.bottom, 12) }]}>
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
        onClose={() => setSelectedAccountForDetails(null)}
        onAddTransaction={(accId) => handleOpenAddTx(accId)}
      />

      {/* Brand Splash Screen on Initial App Startup */}
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
    </View>
  );
};

export default function App() {
  useFonts({
    ...Ionicons.font,
    ionicons: require('./assets/fonts/Ionicons.ttf'),
    Ionicons: require('./assets/fonts/Ionicons.ttf'),
  });

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
  fabContainer: {
    position: 'absolute',
    right: 18,
    zIndex: 99,
  },
  fabButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingBarWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 4,
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
});