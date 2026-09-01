import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLedger } from '../context/LedgerContext';
import { useTheme } from '../context/ThemeContext';
import { StatCard, LimitProgressBar, ConfirmationModal } from '../components';
import { useBounceScroll } from '../hooks';
import { ledgerApi } from '../services/api/ledgerApi';
import { DailyProfitRecord } from '../types';
import { formatCurrency } from '../utils';

const AnalyticsScreenComponent: React.FC = () => {
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const { metrics, accounts, transactions, resetToMockData } = useLedger();
  const { scrollProps, bounceStyle } = useBounceScroll();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [dailyProfits, setDailyProfits] = useState<DailyProfitRecord[]>([]);

  useEffect(() => {
    ledgerApi.getDailyProfits().then(setDailyProfits);
  }, []);

  const totalSendCount = transactions.filter((t) => t.type === 'sm' || t.type === 'send_money').length;
  const totalReceiveCount = transactions.filter((t) => t.type === 'recev' || t.type === 'receive_money').length;
  const totalMarginCalculated = transactions.reduce((sum, t) => sum + (t.margin || t.profit || 0), 0);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Top App Bar */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.divider }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.logoBadge, { backgroundColor: theme.primaryLight }]}>
            <Ionicons name="bar-chart-outline" size={20} color={theme.primary} />
          </View>
          <View style={styles.headerTitleGroup}>
            <Text style={[styles.appTitle, { color: theme.primary }]}>Analytics & Profit</Text>
            <Text style={[styles.appSubtitle, { color: theme.textSecondary }]}>Margin & Daily Performance</Text>
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
        </View>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        {...scrollProps}
      >
        <Animated.View style={bounceStyle}>
          {/* Net Profit Summary */}
          <StatCard
            title="Total Margin / Commission Earned"
            value={formatCurrency(totalMarginCalculated)}
            subtitle="Cumulative Profit Across All SIM Transactions"
            badgeText="Verified"
            isPositive
            iconName="trending-up"
            variant="primary"
          />

        {/* 2-Column Overview */}
        <View style={styles.twoCol}>
          <View style={styles.colItem}>
            <StatCard
              title="Today's Margin"
              value={formatCurrency(metrics.todayProfit)}
              iconName="cash-outline"
              isPositive
              subtitle="Daily Profit"
            />
          </View>
          <View style={styles.colItem}>
            <StatCard
              title="Remaining Limit"
              value={formatCurrency(metrics.totalLimitRemaining)}
              iconName="speedometer-outline"
              isPositive={metrics.totalLimitRemaining > 100000}
              subtitle="Send Limit"
            />
          </View>
        </View>

        {/* Daily Profit Growth Ledger (PR.xlsx Daily Profit Sheet) */}
        {dailyProfits.length > 0 && (
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.cardHeaderRow}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Daily Profit Log (PR.xlsx)</Text>
              <Text style={[styles.cardBadge, { color: theme.primary }]}>Monthly Growth</Text>
            </View>

            <View style={styles.tableHeader}>
              <Text style={[styles.thText, { color: theme.textSecondary, flex: 1 }]}>Day</Text>
              <Text style={[styles.thText, { color: theme.textSecondary, flex: 1.5, textAlign: 'right' }]}>
                Cumulative
              </Text>
              <Text style={[styles.thText, { color: theme.textSecondary, flex: 1.5, textAlign: 'right' }]}>
                Daily Profit
              </Text>
            </View>

            {dailyProfits.slice(0, 8).map((dp, idx) => (
              <View key={idx} style={[styles.tableRow, { borderBottomColor: theme.border }]}>
                <Text style={[styles.tdText, { color: theme.text, flex: 1 }]} numberOfLines={1}>
                  {dp.date}
                </Text>
                <Text style={[styles.tdText, { color: theme.textSecondary, flex: 1.5, textAlign: 'right' }]}>
                  {formatCurrency(dp.cumulativeMargin)}
                </Text>
                <Text style={[styles.tdProfit, { color: theme.success, flex: 1.5, textAlign: 'right' }]}>
                  +{formatCurrency(dp.dailyProfit)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Transaction Counts */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Ledger Transaction Volume</Text>
          <View style={styles.metricRow}>
            <View style={styles.metricItem}>
              <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Send / Outflow (Sm)</Text>
              <Text style={[styles.metricNumber, { color: theme.danger }]}>{totalSendCount}</Text>
            </View>
            <View style={[styles.metricDivider, { backgroundColor: theme.border }]} />
            <View style={styles.metricItem}>
              <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Receive / Inflow (recev)</Text>
              <Text style={[styles.metricNumber, { color: theme.success }]}>{totalReceiveCount}</Text>
            </View>
          </View>
        </View>

        {/* SIM Balance Share */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>SIM Float Share by Account</Text>
          {accounts.slice(0, 6).map((acc) => {
            const share =
              metrics.totalBalance > 0 ? Math.round((acc.balance / metrics.totalBalance) * 100) : 0;
            return (
              <View key={acc.id} style={styles.channelRow}>
                <View style={styles.channelHeader}>
                  <Text style={[styles.channelName, { color: theme.text, flex: 1, marginRight: 8 }]} numberOfLines={1}>
                    {acc.name}
                  </Text>
                  <Text style={[styles.channelAmount, { color: theme.textSecondary, flexShrink: 0 }]}>
                    {formatCurrency(acc.balance)} ({share}%)
                  </Text>
                </View>
                <LimitProgressBar usedAmount={acc.balance} totalLimit={metrics.totalBalance} />
              </View>
            );
          })}
        </View>

        {/* Reset Data Option */}
        <TouchableOpacity
          style={[styles.resetButton, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}
          onPress={() => setShowResetConfirm(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh-outline" size={16} color={theme.textSecondary} />
          <Text style={[styles.resetButtonText, { color: theme.textSecondary }]}>Reset to PR.xlsx Seed Data</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
        </Animated.View>
      </ScrollView>

      {/* Clear Data Confirmation Modal */}
      <ConfirmationModal
        visible={showResetConfirm}
        title="Reset Ledger Data"
        message="Reset all data back to the clean PR.xlsx master seed dataset?"
        confirmText="Reset Data"
        cancelText="Cancel"
        type="primary"
        icon="refresh-outline"
        onConfirm={() => {
          setShowResetConfirm(false);
          resetToMockData();
        }}
        onCancel={() => setShowResetConfirm(false)}
      />
    </SafeAreaView>
  );
};

export const AnalyticsScreen = React.memo(AnalyticsScreenComponent);

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
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleGroup: {
    gap: 2,
  },
  appTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
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
    paddingBottom: 90,
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
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  cardBadge: {
    fontSize: 11,
    fontWeight: '700',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150,150,150,0.2)',
  },
  thText: {
    fontSize: 11,
    fontWeight: '700',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tdText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tdProfit: {
    fontSize: 12,
    fontWeight: '800',
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
