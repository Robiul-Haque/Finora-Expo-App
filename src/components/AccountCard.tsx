import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Account } from '../types/ledger';
import { useTheme } from '../context/ThemeContext';
import { useLedger } from '../context/LedgerContext';
import { LimitProgressBar } from './LimitProgressBar';
import { formatCurrency } from '../utils';

interface AccountCardProps {
  account: Account;
  onPress: () => void;
  onAddTransactionPress?: () => void;
}

const AccountCardComponent: React.FC<AccountCardProps> = ({ account, onPress, onAddTransactionPress }) => {
  const { theme } = useTheme();
  const { updateAccount } = useLedger();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const getProviderConfig = (type: Account['type']) => {
    switch (type) {
      case 'agent':
        return {
          name: 'business-outline',
          label: 'Agent SIM',
          color: '#E2136E',
        };
      case 'merchant':
        return {
          name: 'storefront-outline',
          label: 'Merchant QR',
          color: '#BE123C',
        };
      case 'personal':
      default:
        return {
          name: 'person-outline',
          label: 'Personal bKash',
          color: '#0284C7',
        };
    }
  };

  const provider = getProviderConfig(account.type);
  const remainingLimit = Math.max(0, account.dailyLimit - account.todaySend);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      friction: 4,
      tension: 80,
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

  const handleToggleStatus = (e: any) => {
    e?.stopPropagation?.();
    updateAccount(account.id, { isActive: !account.isActive });
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
            opacity: account.isActive ? 1 : 0.65,
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
            <View style={styles.accountTextContainer}>
              <View style={styles.nameRow}>
                <Text
                  style={[styles.accountName, { color: theme.text }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {account.name}
                </Text>
                <TouchableOpacity
                  onPress={handleToggleStatus}
                  style={[
                    styles.activeBadge,
                    {
                      backgroundColor: account.isActive
                        ? theme.successLight
                        : theme.cardSecondary,
                    },
                  ]}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text
                    style={[
                      styles.activeBadgeText,
                      { color: account.isActive ? theme.success : theme.textMuted },
                    ]}
                    numberOfLines={1}
                  >
                    {account.isActive ? 'Active' : 'Inactive'}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text
                style={[styles.accountNumber, { color: theme.textSecondary }]}
                numberOfLines={1}
              >
                {account.accountNumber}
              </Text>
            </View>
          </View>

          <View style={styles.providerBadgeContainer}>
            <View style={[styles.providerBadge, { backgroundColor: provider.color + '18' }]}>
              <Text style={[styles.providerText, { color: provider.color }]} numberOfLines={1}>
                {provider.label}
              </Text>
            </View>
          </View>
        </View>

        {/* Main Balance Display */}
        <View style={styles.balanceContainer}>
          <Text style={[styles.balanceLabel, { color: theme.textSecondary }]} numberOfLines={2}>
            CURRENT FLOAT BALANCE
          </Text>
          <View style={styles.balanceRow}>
            <Text
              style={[styles.balanceAmount, { color: theme.text }]}
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.6}
            >
              {formatCurrency(account.balance)}
            </Text>
            {account.todayProfit > 0 && (
              <View style={[styles.profitBadge, { backgroundColor: theme.successLight }]}>
                <Text style={[styles.profitText, { color: theme.success }]} numberOfLines={2}>
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
            <Text style={[styles.statLabel, { color: theme.textSecondary }]} numberOfLines={2}>
              Today's Send
            </Text>
            <Text
              style={[styles.statValue, { color: theme.text }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {formatCurrency(account.todaySend)}
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]} numberOfLines={2}>
              Remaining Limit
            </Text>
            <Text
              style={[styles.statValue, { color: theme.primary }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
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
            <Text style={[styles.actionBtnText, { color: theme.textSecondary }]} numberOfLines={1}>
              Details
            </Text>
          </TouchableOpacity>

          {onAddTransactionPress && (
            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: theme.primary }]}
              onPress={onAddTransactionPress}
              activeOpacity={0.75}
            >
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.primaryActionBtnText} numberOfLines={1}>
                Log bKash Entry
              </Text>
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
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    flex: 1,
    marginRight: 6,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  accountTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  accountName: {
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 1,
    lineHeight: 20,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    flexShrink: 0,
  },
  accountNumber: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
    lineHeight: 18,
  },
  activeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
    flexShrink: 0,
  },
  activeBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  providerBadgeContainer: {
    marginLeft: 8,
    flexShrink: 0,
  },
  providerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
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
    lineHeight: 16,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  balanceAmount: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    flexShrink: 1,
  },
  profitBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexShrink: 1,
  },
  profitText: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  statItem: {
    flex: 1,
    minWidth: 0,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 15,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    marginHorizontal: 8,
    alignSelf: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    flexWrap: 'wrap',
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