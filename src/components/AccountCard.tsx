import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Account } from '../types/ledger';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency } from '../utils';

/**
 * AccountCard Component
 * --------------------
 * Represents an individual SIM / Ledger Account card on the Accounts screen.
 * 
 * Features & Business Logic:
 * 1. Financial Performance Metrics:
 *    - Dynamically calculates Profit, Cost, and Net Profit based on timeFilter ('daily' or 'monthly').
 *    - Formula: Net Profit = Profit - Cost
 * 2. 90% Critical Threshold Warning:
 *    - When either daily usage or monthly limit usage reaches >= 90%, the card highlights
 *      with theme.danger (indicator bar, border, and progress bar).
 * 3. Compact Layout:
 *    - Redundant send/remaining rows are omitted to keep cards slim. Full breakdown
 *      is accessible via AccountDetailsModal when tapping the card.
 */
export interface AccountFinancialMetrics {
  profit: number;
  cost: number;
  netProfit: number;
}

interface AccountCardProps {
  account: Account;
  onPress: (account: Account) => void;
  onAddTransactionPress?: (accountId: string) => void;
  timeFilter?: 'daily' | 'monthly';
  metrics?: AccountFinancialMetrics;
}

const AccountCardComponent: React.FC<AccountCardProps> = ({
  account,
  onPress,
  timeFilter = 'daily',
  metrics = {
    profit: account.todayProfit || 0,
    cost: 0,
    netProfit: account.todayProfit || 0,
  },
}) => {
  const { theme } = useTheme();

  // Limit and usage calculation
  const monthlyLimit = account.monthlyLimit || 300000;
  const monthlyLimitUsed = account.monthlyLimitUsed !== undefined ? account.monthlyLimitUsed : account.todaySend;
  const remainingLimit = account.remainingLimit !== undefined ? account.remainingLimit : Math.max(0, monthlyLimit - monthlyLimitUsed);

  // Critical threshold check: triggers red warning when >= 90% is used on either limit
  const usageRatio = monthlyLimit > 0 ? monthlyLimitUsed / monthlyLimit : 0;
  const dailyLimit = account.dailyLimit || 300000;
  const dailyRatio = dailyLimit > 0 ? (account.todaySend || 0) / dailyLimit : 0;
  const effectiveRatio = Math.max(usageRatio, dailyRatio);
  const usagePercentage = Math.min(100, Math.round(effectiveRatio * 100));
  const isCritical = usagePercentage >= 90;

  const indicatorColor = isCritical ? theme.danger : account.isActive ? theme.primary : theme.textMuted;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={() => onPress(account)}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: account.isActive ? theme.card : theme.cardSecondary,
            borderColor: isCritical ? theme.dangerLight : theme.border,
            opacity: account.isActive ? 1 : 0.65,
          },
        ]}
      >
        {/* Left Status 4px Indicator */}
        <View style={[styles.leftIndicator, { backgroundColor: indicatorColor }]} />

        <View style={styles.contentContainer}>
          {/* Top Row: Phone Number & Clean Status Pill */}
          <View style={styles.topRow}>
            <View style={styles.phoneGroup}>
              <Text style={[styles.phoneNumber, { color: account.isActive ? theme.text : theme.textMuted }]} numberOfLines={1}>
                {account.accountNumber}
              </Text>
              {account.name && account.name !== account.accountNumber && (
                <Text style={[styles.accountSubName, { color: theme.textSecondary }]} numberOfLines={1}>
                  {account.name} {!account.isActive && '(Inactive)'}
                </Text>
              )}
            </View>

            {/* Clean Status Pill (Active / Disabled) */}
            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor: account.isActive ? theme.primaryLight : theme.cardSecondary,
                },
              ]}
            >
              <Text
                style={[
                  styles.statusPillText,
                  { color: account.isActive ? theme.primary : theme.textMuted },
                ]}
              >
                {account.isActive ? 'Active' : 'Disabled'}
              </Text>
            </View>
          </View>

          {/* Current Balance */}
          <View style={styles.balanceSection}>
            <Text style={[styles.balanceLabel, { color: theme.textMuted }]}>CURRENT BALANCE</Text>
            <Text
              style={[styles.balanceAmount, { color: account.isActive ? theme.text : theme.textMuted }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {formatCurrency(account.balance)}
            </Text>
          </View>

          {/* 3-Column Performance Metrics (Profit | Cost | Net Profit) */}
          <View
            style={[
              styles.metricsGrid,
              {
                backgroundColor: theme.cardSecondary,
                borderColor: theme.border,
              },
            ]}
          >
            <View style={styles.metricsCol}>
              <Text style={[styles.metricsLabel, { color: theme.textMuted }]} numberOfLines={1}>
                {timeFilter === 'daily' ? 'DAILY PROFIT' : 'M. PROFIT'}
              </Text>
              <Text
                style={[
                  styles.metricsValue,
                  { color: metrics.profit > 0 ? theme.success : theme.textMuted },
                ]}
                numberOfLines={1}
              >
                {metrics.profit > 0 ? `+${formatCurrency(metrics.profit)}` : formatCurrency(0)}
              </Text>
            </View>

            <View style={[styles.metricsDivider, { backgroundColor: theme.border }]} />

            <View style={styles.metricsCol}>
              <Text style={[styles.metricsLabel, { color: theme.textMuted }]} numberOfLines={1}>
                {timeFilter === 'daily' ? 'DAILY COST' : 'M. COST'}
              </Text>
              <Text
                style={[
                  styles.metricsValue,
                  { color: metrics.cost > 0 ? theme.danger : theme.textMuted },
                ]}
                numberOfLines={1}
              >
                {metrics.cost > 0 ? `-${formatCurrency(metrics.cost)}` : formatCurrency(0)}
              </Text>
            </View>

            <View style={[styles.metricsDivider, { backgroundColor: theme.border }]} />

            <View style={styles.metricsCol}>
              <Text style={[styles.metricsLabel, { color: theme.textMuted }]} numberOfLines={1}>
                NET PROFIT
              </Text>
              <Text
                style={[
                  styles.metricsValue,
                  {
                    color:
                      metrics.netProfit > 0
                        ? theme.success
                        : metrics.netProfit < 0
                        ? theme.danger
                        : theme.textMuted,
                    fontWeight: '700',
                  },
                ]}
                numberOfLines={1}
              >
                {metrics.netProfit > 0
                  ? `+${formatCurrency(metrics.netProfit)}`
                  : formatCurrency(metrics.netProfit)}
              </Text>
            </View>
          </View>

          {/* 2-Column Info Grid (Today Send & Remaining Limit) - Commented out to keep cards compact
          <View
            style={[
              styles.infoGrid,
              {
                backgroundColor: isCritical
                  ? theme.dangerLight
                  : theme.cardSecondary,
              },
            ]}
          >
            <View style={styles.infoCol}>
              <Text
                style={[
                  styles.infoLabel,
                  { color: isCritical ? theme.danger : theme.textMuted },
                ]}
              >
                TODAY SEND
              </Text>
              <Text
                style={[
                  styles.infoValue,
                  { color: isCritical ? theme.danger : theme.text },
                ]}
                numberOfLines={1}
              >
                {formatCurrency(account.todaySend || 0)}
              </Text>
            </View>

            <View style={styles.infoCol}>
              <Text
                style={[
                  styles.infoLabel,
                  { color: isCritical ? theme.danger : theme.textMuted },
                ]}
              >
                REMAINING LIMIT
              </Text>
              <Text
                style={[
                  styles.infoValue,
                  { color: isCritical ? theme.danger : theme.text },
                ]}
                numberOfLines={1}
              >
                {formatCurrency(remainingLimit)}
              </Text>
            </View>
          </View>
          */}

          {/* Limit Usage Bar Section */}
          <View style={styles.limitSection}>
            <View style={styles.limitHeader}>
              <Text
                style={[
                  styles.limitLabel,
                  { color: isCritical ? theme.danger : theme.textMuted },
                ]}
              >
                {isCritical ? 'CRITICAL USAGE' : 'LIMIT USAGE'}
              </Text>
              <Text
                style={[
                  styles.limitPercentage,
                  { color: isCritical ? theme.danger : theme.textMuted },
                ]}
              >
                {usagePercentage}%
              </Text>
            </View>

            {/* Progress Bar Track */}
            <View
              style={[
                styles.progressTrack,
                {
                  backgroundColor: isCritical
                    ? theme.dangerLight
                    : theme.progressBarBg,
                },
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(100, Math.max(0, usagePercentage))}%`,
                    backgroundColor: isCritical ? theme.danger : theme.primary,
                  },
                ]}
              />
            </View>

            <Text style={[styles.totalLimitText, { color: theme.textMuted }]}>
              Total: {formatCurrency(monthlyLimit)}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export const AccountCard = React.memo(AccountCardComponent);

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1.5,
  },
  leftIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    zIndex: 2,
  },
  contentContainer: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    paddingLeft: 18,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  phoneGroup: {
    flex: 1,
    marginRight: 8,
  },
  phoneNumber: {
    fontFamily: 'monospace',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.6,
    lineHeight: 20,
  },
  accountSubName: {
    fontSize: 11,
    marginTop: 2,
    fontWeight: '500',
  },
  profitBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 8,
    gap: 3,
    marginTop: 1,
  },
  profitIcon: {
    marginTop: 0.5,
  },
  profitText: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 6,
    marginTop: 1,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  balanceSection: {
    marginTop: 1,
  },
  balanceLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  balanceAmount: {
    fontSize: 21,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  infoGrid: {
    flexDirection: 'row',
    borderRadius: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
    gap: 12,
    marginTop: 1,
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  limitSection: {
    marginTop: 1,
  },
  limitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3.5,
  },
  limitLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  limitPercentage: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  progressTrack: {
    height: 5,
    borderRadius: 2.5,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2.5,
  },
  totalLimitText: {
    fontSize: 9.5,
    textAlign: 'right',
    marginTop: 3,
    fontWeight: '500',
  },
  metricsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 7,
    paddingHorizontal: 8,
    marginTop: 2,
  },
  metricsCol: {
    flex: 1,
    alignItems: 'center',
  },
  metricsDivider: {
    width: 1,
    height: 22,
    marginHorizontal: 3,
  },
  metricsLabel: {
    fontSize: 8.5,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  metricsValue: {
    fontSize: 12,
    fontWeight: '700',
  },
});