import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Account } from '../types/ledger';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency } from '../utils';

interface AccountCardProps {
  account: Account;
  onPress: (account: Account) => void;
  onAddTransactionPress?: (accountId: string) => void;
}

const AccountCardComponent: React.FC<AccountCardProps> = ({ account, onPress, onAddTransactionPress }) => {
  const { theme, isDarkMode } = useTheme();

  const monthlyLimit = account.monthlyLimit || 300000;
  const monthlyLimitUsed = account.monthlyLimitUsed !== undefined ? account.monthlyLimitUsed : account.todaySend;
  const remainingLimit = account.remainingLimit !== undefined ? account.remainingLimit : Math.max(0, monthlyLimit - monthlyLimitUsed);
  const totalMargin = account.totalMargin !== undefined ? account.totalMargin : account.todayProfit;

  const usageRatio = monthlyLimit > 0 ? monthlyLimitUsed / monthlyLimit : 0;
  const usagePercentage = Math.min(100, Math.round(usageRatio * 100));
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
            backgroundColor: account.isActive ? theme.card : (isDarkMode ? '#242728' : '#F5F6F8'),
            borderColor: isCritical ? (isDarkMode ? 'rgba(255, 218, 214, 0.3)' : '#FFDAD6') : theme.border,
            opacity: account.isActive ? 1 : 0.55,
          },
        ]}
      >
        {/* Left Status 4px Indicator */}
        <View style={[styles.leftIndicator, { backgroundColor: indicatorColor }]} />

        <View style={styles.contentContainer}>
          {/* Top Row: Monospace Phone Number & Status / Profit Badge */}
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

            {account.isActive && totalMargin > 0 ? (
              <View
                style={[
                  styles.profitBadge,
                  {
                    backgroundColor: isDarkMode ? 'rgba(137, 250, 155, 0.15)' : 'rgba(0, 110, 44, 0.1)',
                  },
                ]}
              >
                <Ionicons name="trending-up" size={13} color={theme.success} style={styles.profitIcon} />
                <Text style={[styles.profitText, { color: theme.success }]}>
                  +{formatCurrency(totalMargin)}
                </Text>
              </View>
            ) : (
              <View
                style={[
                  styles.statusPill,
                  {
                    backgroundColor: account.isActive
                      ? (isDarkMode ? 'rgba(26, 115, 232, 0.15)' : '#E8F0FE')
                      : (isDarkMode ? 'rgba(255, 255, 255, 0.08)' : '#E5E7EB'),
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
            )}
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

          {/* 2-Column Info Grid (Today Send & Remaining Limit) */}
          <View
            style={[
              styles.infoGrid,
              {
                backgroundColor: isCritical
                  ? (isDarkMode ? 'rgba(255, 218, 214, 0.08)' : '#FFF5F5')
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
                    ? (isDarkMode ? 'rgba(255, 218, 214, 0.2)' : '#FFDAD6')
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
});