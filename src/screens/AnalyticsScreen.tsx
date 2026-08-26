import React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLedger } from '../context/LedgerContext';
import { useTheme } from '../context/ThemeContext';
import { Header } from '../components/Header';
import { StatCard } from '../components/StatCard';
import { LimitProgressBar } from '../components/LimitProgressBar';

export const AnalyticsScreen: React.FC = () => {
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const { metrics, accounts, transactions, resetToMockData } = useLedger();

  const formatCurrency = (val: number) => {
    return '৳' + val.toLocaleString('en-US');
  };

  const totalSendCount = transactions.filter((t) => t.type === 'send_money').length;
  const totalReceiveCount = transactions.filter((t) => t.type === 'receive_money').length;
  const totalProfitCalculated = transactions.reduce((sum, t) => sum + (t.profit || 0), 0);
  const totalFeesPaid = transactions.reduce((sum, t) => sum + (t.cost || 0), 0);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <Header title="Analytics & Profit" subtitle="Performance Breakdown" />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Net Profit Summary */}
        <StatCard
          title="All-Time Recorded Profit"
          value={formatCurrency(totalProfitCalculated)}
          subtitle="Net earnings from commission & fees"
          badgeText="Verified"
          isPositive
          iconName="trending-up"
          variant="primary"
        />

        {/* 2-Column Fee vs Profit */}
        <View style={styles.twoCol}>
          <View style={styles.colItem}>
            <StatCard
              title="Total Fees Paid"
              value={formatCurrency(totalFeesPaid)}
              iconName="card-outline"
              isPositive={false}
              subtitle="Cash out / send costs"
            />
          </View>
          <View style={styles.colItem}>
            <StatCard
              title="Daily Profit"
              value={formatCurrency(metrics.todayProfit)}
              iconName="cash-outline"
              isPositive
              subtitle="Earned today"
            />
          </View>
        </View>

        {/* Volume Breakdown */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Transaction Volume</Text>
          <View style={styles.metricRow}>
            <View style={styles.metricItem}>
              <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
                Send Transactions
              </Text>
              <Text style={[styles.metricNumber, { color: theme.danger }]}>
                {totalSendCount}
              </Text>
            </View>
            <View style={[styles.metricDivider, { backgroundColor: theme.border }]} />
            <View style={styles.metricItem}>
              <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
                Receive Transactions
              </Text>
              <Text style={[styles.metricNumber, { color: theme.success }]}>
                {totalReceiveCount}
              </Text>
            </View>
          </View>
        </View>

        {/* Channel Share */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Channel Balance Share</Text>
          {accounts.map((acc) => {
            const share =
              metrics.totalBalance > 0
                ? Math.round((acc.balance / metrics.totalBalance) * 100)
                : 0;
            return (
              <View key={acc.id} style={styles.channelRow}>
                <View style={styles.channelHeader}>
                  <Text style={[styles.channelName, { color: theme.text }]}>{acc.name}</Text>
                  <Text style={[styles.channelAmount, { color: theme.textSecondary }]}>
                    {formatCurrency(acc.balance)} ({share}%)
                  </Text>
                </View>
                <LimitProgressBar usedAmount={acc.balance} totalLimit={metrics.totalBalance} />
              </View>
            );
          })}
        </View>

        {/* Reset / Developer Option */}
        <TouchableOpacity
          style={[styles.resetButton, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}
          onPress={resetToMockData}
        >
          <Ionicons name="refresh-outline" size={16} color={theme.textSecondary} />
          <Text style={[styles.resetButtonText, { color: theme.textSecondary }]}>
            Reset to Sample Prototype Data
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
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
    paddingBottom: 40,
  },
  twoCol: {
    flexDirection: 'row',
    gap: 12,
  },
  colItem: {
    flex: 1,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 12,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  metricNumber: {
    fontSize: 24,
    fontWeight: '900',
    marginTop: 4,
  },
  metricDivider: {
    width: 1,
    height: '100%',
  },
  channelRow: {
    marginBottom: 12,
  },
  channelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  channelName: {
    fontSize: 13,
    fontWeight: '700',
  },
  channelAmount: {
    fontSize: 12,
  },
  resetButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 10,
  },
  resetButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
