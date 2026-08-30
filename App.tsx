import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, StatusBar, Animated } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './src/services/queryClient';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { LedgerProvider } from './src/context/LedgerContext';
import { HomeScreen, TransactionsScreen, AccountsScreen, AnalyticsScreen } from './src/screens';
import { SplashScreen, AddTransactionModal, AddAccountModal, AccountDetailsModal, ErrorBoundary } from './src/components';
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
  activeBgColor: string;
}

const AnimatedTabButtonComponent: React.FC<TabButtonProps> = ({ tab, activeTab, label, activeIcon, inactiveIcon, onPress, activeColor, inactiveColor, activeBgColor }) => {
  const isActive = activeTab === tab;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: isActive ? 1.05 : 1,
      friction: 5,
      tension: 100,
      useNativeDriver: true,
    }).start();
  }, [isActive]);

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 70,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1.05,
        friction: 4,
        tension: 110,
        useNativeDriver: true,
      }),
    ]).start();
    onPress();
  };

  return (
    <TouchableOpacity
      style={styles.tabItem}
      onPress={handlePress}
      activeOpacity={0.75}
    >
      <Animated.View
        style={[
          styles.tabPill,
          isActive && { backgroundColor: activeBgColor },
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <Ionicons
          name={isActive ? activeIcon : inactiveIcon}
          size={21}
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
      </Animated.View>
    </TouchableOpacity>
  );
};

const AnimatedTabButton = React.memo(AnimatedTabButtonComponent);

const MainApp: React.FC = () => {
  const { theme, isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [showSplash, setShowSplash] = useState(true);

  // Screen fade animation on tab switch
  const screenFadeAnim = useRef(new Animated.Value(1)).current;
  const addBtnScale = useRef(new Animated.Value(1)).current;

  // Modal States
  const [addTxVisible, setAddTxVisible] = useState(false);
  const [addAccountVisible, setAddAccountVisible] = useState(false);
  const [selectedAccountForDetails, setSelectedAccountForDetails] = useState<Account | null>(null);
  const [preselectedAccountIdForTx, setPreselectedAccountIdForTx] = useState<string | undefined>();

  const switchTab = React.useCallback((tab: TabType) => {
    setActiveTab((current) => {
      if (tab === current) return current;
      Animated.sequence([
        Animated.timing(screenFadeAnim, {
          toValue: 0.85,
          duration: 70,
          useNativeDriver: true,
        }),
        Animated.timing(screenFadeAnim, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start();
      return tab;
    });
  }, []);

  const handleOpenAddTx = React.useCallback((accountId?: string) => {
    // Button spring bounce
    Animated.sequence([
      Animated.timing(addBtnScale, {
        toValue: 0.82,
        duration: 70,
        useNativeDriver: true,
      }),
      Animated.spring(addBtnScale, {
        toValue: 1,
        friction: 4,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();
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

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomeScreen
            onOpenAccountDetails={handleOpenAccountDetails}
            onOpenAddTransaction={handleOpenAddTx}
            onNavigateToTransactions={handleNavigateToTransactions}
            onNavigateToAccounts={handleNavigateToAccounts}
          />
        );
      case 'transactions':
        return (
          <TransactionsScreen onOpenAddTransaction={() => handleOpenAddTx()} />
        );
      case 'accounts':
        return (
          <AccountsScreen
            onOpenAccountDetails={handleOpenAccountDetails}
            onOpenAddAccount={handleOpenAddAccount}
            onOpenAddTransaction={handleOpenAddTx}
          />
        );
      case 'analytics':
        return <AnalyticsScreen />;
      default:
        return null;
    }
  };

  return (
    <View style={[styles.rootContainer, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
        animated={true}
      />

      {/* Main Content Area with Smooth Fast Transitions */}
      <Animated.View style={[styles.screenContainer, { opacity: screenFadeAnim }]}>
        {renderActiveScreen()}
      </Animated.View>

      {/* Modern Floating Island Bottom Navigation Bar */}
      <View style={styles.floatingBarWrapper}>
        <View
          style={[
            styles.bottomTabBar,
            {
              backgroundColor: theme.tabBarBg,
              borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.07)',
            },
          ]}
        >
          {/* Tab 1: Home */}
          <AnimatedTabButton
            tab="home"
            activeTab={activeTab}
            label="Home"
            activeIcon="home"
            inactiveIcon="home-outline"
            onPress={() => switchTab('home')}
            activeColor={theme.tabBarActive}
            inactiveColor={theme.tabBarInactive}
            activeBgColor={theme.primaryLight}
          />

          {/* Tab 2: Transactions */}
          <AnimatedTabButton
            tab="transactions"
            activeTab={activeTab}
            label="Ledger"
            activeIcon="receipt"
            inactiveIcon="receipt-outline"
            onPress={() => switchTab('transactions')}
            activeColor={theme.tabBarActive}
            inactiveColor={theme.tabBarInactive}
            activeBgColor={theme.primaryLight}
          />

          {/* Center Elevated Quick Action (+) Button */}
          <TouchableOpacity
            style={styles.centerBtnTouchArea}
            onPress={() => handleOpenAddTx()}
            activeOpacity={0.9}
          >
            <Animated.View
              style={[
                styles.centerAddButton,
                {
                  backgroundColor: theme.primary,
                  borderColor: theme.tabBarBg,
                  transform: [{ scale: addBtnScale }],
                },
              ]}
            >
              <Ionicons name="add" size={30} color="#FFFFFF" />
            </Animated.View>
          </TouchableOpacity>

          {/* Tab 3: Accounts / Numbers */}
          <AnimatedTabButton
            tab="accounts"
            activeTab={activeTab}
            label="Numbers"
            activeIcon="phone-portrait"
            inactiveIcon="phone-portrait-outline"
            onPress={() => switchTab('accounts')}
            activeColor={theme.tabBarActive}
            inactiveColor={theme.tabBarInactive}
            activeBgColor={theme.primaryLight}
          />

          {/* Tab 4: Analytics */}
          <AnimatedTabButton
            tab="analytics"
            activeTab={activeTab}
            label="Analytics"
            activeIcon="pie-chart"
            inactiveIcon="pie-chart-outline"
            onPress={() => switchTab('analytics')}
            activeColor={theme.tabBarActive}
            inactiveColor={theme.tabBarInactive}
            activeBgColor={theme.primaryLight}
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
    </View>
  );
};

export default function App() {
  useFonts({
    ...Ionicons.font,
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
  },
  floatingBarWrapper: {
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
    paddingTop: 4,
  },
  bottomTabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRadius: 28,
    borderWidth: 1.2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabPill: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 16,
    minWidth: 54,
  },
  tabLabel: {
    fontSize: 10.5,
    marginTop: 2,
    letterSpacing: 0.2,
  },
  centerBtnTouchArea: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -34,
    marginHorizontal: 4,
  },
  centerAddButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 4.5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#E2136E',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.5,
    shadowRadius: 14,
    elevation: 12,
  },
});