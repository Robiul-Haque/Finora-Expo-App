import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { LedgerProvider } from './src/context/LedgerContext';
import { SplashScreen } from './src/components/SplashScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { TransactionsScreen } from './src/screens/TransactionsScreen';
import { AccountsScreen } from './src/screens/AccountsScreen';
import { AnalyticsScreen } from './src/screens/AnalyticsScreen';
import { AddTransactionModal } from './src/components/AddTransactionModal';
import { AddAccountModal } from './src/components/AddAccountModal';
import { AccountDetailsModal } from './src/components/AccountDetailsModal';
import { Account } from './src/types/ledger';

type TabType = 'home' | 'transactions' | 'accounts' | 'analytics';

const MainApp: React.FC = () => {
  const { theme, isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [showSplash, setShowSplash] = useState(true);

  // Modal States
  const [addTxVisible, setAddTxVisible] = useState(false);
  const [addAccountVisible, setAddAccountVisible] = useState(false);
  const [selectedAccountForDetails, setSelectedAccountForDetails] = useState<Account | null>(null);
  const [preselectedAccountIdForTx, setPreselectedAccountIdForTx] = useState<string | undefined>();

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  const handleOpenAddTx = (accountId?: string) => {
    setPreselectedAccountIdForTx(accountId);
    setAddTxVisible(true);
  };

  const renderActiveScreen = () => {
    switch (activeTab) {
      case 'home':
        return (
          <HomeScreen
            onOpenAccountDetails={(acc) => setSelectedAccountForDetails(acc)}
            onOpenAddTransaction={handleOpenAddTx}
            onNavigateToTransactions={() => setActiveTab('transactions')}
            onNavigateToAccounts={() => setActiveTab('accounts')}
          />
        );
      case 'transactions':
        return (
          <TransactionsScreen onOpenAddTransaction={() => handleOpenAddTx()} />
        );
      case 'accounts':
        return (
          <AccountsScreen
            onOpenAccountDetails={(acc) => setSelectedAccountForDetails(acc)}
            onOpenAddAccount={() => setAddAccountVisible(true)}
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
      />

      {/* Main Content Area */}
      <View style={styles.screenContainer}>{renderActiveScreen()}</View>

      {/* Modern Bottom Navigation Bar */}
      <View
        style={[
          styles.bottomTabBar,
          {
            backgroundColor: theme.tabBarBg,
            borderTopColor: theme.border,
          },
        ]}
      >
        {/* Tab 1: Home */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('home')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === 'home' ? 'home' : 'home-outline'}
            size={22}
            color={activeTab === 'home' ? theme.tabBarActive : theme.tabBarInactive}
          />
          <Text
            style={[
              styles.tabLabel,
              {
                color: activeTab === 'home' ? theme.tabBarActive : theme.tabBarInactive,
                fontWeight: activeTab === 'home' ? '700' : '500',
              },
            ]}
          >
            Home
          </Text>
        </TouchableOpacity>

        {/* Tab 2: Transactions */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('transactions')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === 'transactions' ? 'receipt' : 'receipt-outline'}
            size={22}
            color={activeTab === 'transactions' ? theme.tabBarActive : theme.tabBarInactive}
          />
          <Text
            style={[
              styles.tabLabel,
              {
                color: activeTab === 'transactions' ? theme.tabBarActive : theme.tabBarInactive,
                fontWeight: activeTab === 'transactions' ? '700' : '500',
              },
            ]}
          >
            Ledger
          </Text>
        </TouchableOpacity>

        {/* Center Quick Action (+) Button */}
        <TouchableOpacity
          style={[styles.centerAddButton, { backgroundColor: theme.primary }]}
          onPress={() => handleOpenAddTx()}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={26} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Tab 3: Accounts */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('accounts')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === 'accounts' ? 'wallet' : 'wallet-outline'}
            size={22}
            color={activeTab === 'accounts' ? theme.tabBarActive : theme.tabBarInactive}
          />
          <Text
            style={[
              styles.tabLabel,
              {
                color: activeTab === 'accounts' ? theme.tabBarActive : theme.tabBarInactive,
                fontWeight: activeTab === 'accounts' ? '700' : '500',
              },
            ]}
          >
            Accounts
          </Text>
        </TouchableOpacity>

        {/* Tab 4: Analytics */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('analytics')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={activeTab === 'analytics' ? 'pie-chart' : 'pie-chart-outline'}
            size={22}
            color={activeTab === 'analytics' ? theme.tabBarActive : theme.tabBarInactive}
          />
          <Text
            style={[
              styles.tabLabel,
              {
                color: activeTab === 'analytics' ? theme.tabBarActive : theme.tabBarInactive,
                fontWeight: activeTab === 'analytics' ? '700' : '500',
              },
            ]}
          >
            Analytics
          </Text>
        </TouchableOpacity>
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
  return (
    <ThemeProvider>
      <LedgerProvider>
        <MainApp />
      </LedgerProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
  },
  screenContainer: {
    flex: 1,
  },
  bottomTabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    flex: 1,
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 3,
  },
  centerAddButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
});
