import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
      <Header title="bKash Analytics & Profit" subtitle="Agent Commission & Performance" />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Net Profit Summary */}
        <StatCard
          title="All-Time Commission Earned"
          value={formatCurrency(totalProfitCalculated)}
          subtitle="Total agent profit from Cash Out & transfers"
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
              subtitle="Cash out / B2B charges"
            />
          </View>
          <View style={styles.colItem}>
            <StatCard
              title="Today's Profit"
              value={formatCurrency(metrics.todayProfit)}
              iconName="cash-outline"
              isPositive
              subtitle="Commission today"
            />
          </View>
        </View>

        {/* Volume Breakdown */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>bKash Transaction Volume</Text>
          <View style={styles.metricRow}>
            <View style={styles.metricItem}>
              <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
                Cash Out / Send
              </Text>
              <Text style={[styles.metricNumber, { color: theme.danger }]}>
                {totalSendCount}
              </Text>
            </View>
            <View style={[styles.metricDivider, { backgroundColor: theme.border }]} />
            <View style={styles.metricItem}>
              <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>
                Cash In / Receive
              </Text>
              <Text style={[styles.metricNumber, { color: theme.success }]}>
                {totalReceiveCount}
              </Text>
            </View>
          </View>
        </View>

        {/* Channel Share */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>bKash SIM Balance Float Share</Text>
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
          activeOpacity={0.7}
        >
          <Ionicons name="refresh-outline" size={16} color={theme.textSecondary} />
          <Text style={[styles.resetButtonText, { color: theme.textSecondary }]}>
            Reset to bKash Demo Data
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
    paddingTop: 4,
    paddingBottom: 30,
  },
  twoCol: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  colItem: {
    flex: 1,
  },
  card: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  metricItem: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  metricNumber: {
    fontSize: 22,
    fontWeight: '900',
    marginTop: 3,
  },
  metricDivider: {
    width: 1,
    height: '100%',
  },
  channelRow: {
    marginBottom: 10,
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
    fontWeight: '500',
  },
  resetButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
  },
  resetButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
