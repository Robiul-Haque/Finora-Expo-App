import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Account } from '../types/ledger';
import { useTheme } from '../context/ThemeContext';
import { LimitProgressBar } from './LimitProgressBar';

interface AccountCardProps {
  account: Account;
  onPress: () => void;
  onAddTransactionPress?: () => void;
}

const formatCurrency = (val: number) => '৳' + val.toLocaleString('en-US');

const AccountCardComponent: React.FC<AccountCardProps> = ({
  account,
  onPress,
  onAddTransactionPress,
}) => {
  const { theme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const remainingLimit = Math.max(0, account.dailyLimit - account.todaySend);

  const formattedBalance = React.useMemo(() => '৳' + account.balance.toLocaleString('en-US'), [account.balance]);
  const formattedTodayProfit = React.useMemo(() => '৳' + (account.todayProfit || 0).toLocaleString('en-US'), [account.todayProfit]);
  const formattedTodaySend = React.useMemo(() => '৳' + account.todaySend.toLocaleString('en-US'), [account.todaySend]);
  const formattedTodayReceive = React.useMemo(() => '৳' + account.todayReceive.toLocaleString('en-US'), [account.todayReceive]);

  const provider = React.useMemo(() => {
    switch (account.type) {
      case 'agent':
        return { name: 'phone-portrait-outline', color: '#E2136E', label: 'bKash Agent' };
      case 'merchant':
        return { name: 'qr-code-outline', color: '#BE123C', label: 'Merchant QR' };
      case 'personal':
        return { name: 'person-circle-outline', color: '#9D174D', label: 'Personal bKash' };
      case 'corporate':
        return { name: 'business-outline', color: '#831843', label: 'Corporate B2B' };
      case 'bkash':
      default:
        return { name: 'phone-portrait-outline', color: '#E2136E', label: 'bKash Line' };
    }
  }, [account.type]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      friction: 5,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 80,
      useNativeDriver: true,
    }).start();
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Top Header */}
        <View style={styles.header}>
          <View style={styles.accountInfo}>
            <View style={[styles.avatar, { backgroundColor: provider.color + '18' }]}>
              <Ionicons
                name={provider.name as any}
                size={20}
                color={provider.color}
              />
            </View>
            <View style={{ flex: 1, marginRight: 8 }}>
              <View style={styles.nameRow}>
                <Text style={[styles.accountName, { color: theme.text }]} numberOfLines={1}>
                  {account.name}
                </Text>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: account.isActive ? theme.success : theme.textMuted },
                  ]}
                />
              </View>
              <Text style={[styles.accountNumber, { color: theme.textSecondary }]} numberOfLines={1}>
                {account.accountNumber}
              </Text>
            </View>
          </View>

          <View style={styles.providerBadgeContainer}>
            <View style={[styles.providerBadge, { backgroundColor: provider.color + '18' }]}>
              <Text style={[styles.providerText, { color: provider.color }]}>
                {provider.label}
              </Text>
            </View>
          </View>
        </View>

        {/* Main Balance Display */}
        <View style={styles.balanceContainer}>
          <Text style={[styles.balanceLabel, { color: theme.textSecondary }]}>
            CURRENT FLOAT BALANCE
          </Text>
          <View style={styles.balanceRow}>
            <Text
              style={[styles.balanceAmount, { color: theme.text }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.65}
            >
              {formatCurrency(account.balance)}
            </Text>
            {account.todayProfit > 0 && (
              <View style={[styles.profitBadge, { backgroundColor: theme.successLight }]}>
                <Text style={[styles.profitText, { color: theme.success }]}>
                  +{formatCurrency(account.todayProfit)} Commission
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Limit Usage Bar */}
        <LimitProgressBar
          usedAmount={account.todaySend}
          totalLimit={account.dailyLimit}
          label="TODAY'S SEND LIMIT USAGE"
        />

        {/* Limit Breakdown Stats */}
        <View style={[styles.statsRow, { backgroundColor: theme.cardSecondary }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Today's Send</Text>
            <Text style={[styles.statValue, { color: theme.text }]}>
              {formatCurrency(account.todaySend)}
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Remaining Limit</Text>
            <Text style={[styles.statValue, { color: theme.primary }]}>
              {formatCurrency(remainingLimit)}
            </Text>
          </View>
        </View>

        {/* Quick Action Footer */}
        <View style={styles.footerRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: theme.border }]}
            onPress={onPress}
            activeOpacity={0.7}
          >
            <Ionicons name="stats-chart-outline" size={14} color={theme.textSecondary} />
            <Text style={[styles.actionBtnText, { color: theme.textSecondary }]}>Details</Text>
          </TouchableOpacity>

          {onAddTransactionPress && (
            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: theme.primary }]}
              onPress={onAddTransactionPress}
              activeOpacity={0.75}
            >
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.primaryActionBtnText}>Log bKash Entry</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

export const AccountCard = React.memo(AccountCardComponent);

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  accountName: {
    fontSize: 15,
    fontWeight: '700',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  accountNumber: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 1,
  },
  providerBadgeContainer: {
    marginLeft: 8,
  },
  providerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  providerText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  balanceContainer: {
    marginVertical: 4,
  },
  balanceLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  balanceAmount: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  profitBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  profitText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: '100%',
    marginHorizontal: 8,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.15)',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
});
