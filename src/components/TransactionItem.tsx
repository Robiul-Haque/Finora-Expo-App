import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Transaction } from '../types/ledger';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency, formatTime } from '../utils';

interface TransactionItemProps {
  transaction: Transaction;
  onPress?: () => void;
}

const TransactionItemComponent: React.FC<TransactionItemProps> = ({ transaction, onPress }) => {
  const { theme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const isSend = transaction.type === 'send_money' || transaction.type === 'cash_out' || transaction.type === 'b2b';
  const isReceive = transaction.type === 'receive_money' || transaction.type === 'cash_in';

  const badge = React.useMemo(() => {
    switch (transaction.type) {
      case 'cash_out':
        return {
          label: 'CASH OUT',
          color: theme.danger,
          bg: theme.dangerLight,
          icon: 'arrow-up-circle-outline' as const,
        };
      case 'receive_money':
      case 'cash_in':
        return {
          label: 'CASH IN',
          color: theme.success,
          bg: theme.successLight,
          icon: 'arrow-down-circle-outline' as const,
        };
      case 'send_money':
        return {
          label: 'SEND MONEY',
          color: theme.danger,
          bg: theme.dangerLight,
          icon: 'arrow-up-circle-outline' as const,
        };
      case 'b2b':
        return {
          label: 'B2B FLOAT',
          color: theme.primary,
          bg: theme.primaryLight,
          icon: 'swap-horizontal-outline' as const,
        };
      case 'adjustment':
      default:
        return {
          label: 'ADJUSTMENT',
          color: theme.textSecondary,
          bg: theme.cardSecondary,
          icon: 'swap-horizontal-outline' as const,
        };
    }
  }, [transaction.type, theme]);

  const formattedAmount = React.useMemo(() => formatCurrency(transaction.amount), [transaction.amount]);
  const formattedDate = React.useMemo(() => formatTime(transaction.date), [transaction.date]);
  const formattedProfit = React.useMemo(() => transaction.profit > 0 ? formatCurrency(transaction.profit) : '', [transaction.profit]);
  const formattedCost = React.useMemo(() => transaction.cost > 0 ? formatCurrency(transaction.cost) : '', [transaction.cost]);

  const handlePressIn = () => {
    if (!onPress) return;
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      friction: 5,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (!onPress) return;
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
      disabled={!onPress}
    >
      <Animated.View
        style={[
          styles.container,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <View style={styles.leftSection}>
          <View style={[styles.iconContainer, { backgroundColor: badge.bg }]}>
            <Ionicons name={badge.icon} size={22} color={badge.color} />
          </View>

          <View style={styles.details}>
            <View style={styles.topMeta}>
              <View style={[styles.typeBadge, { backgroundColor: badge.bg }]}>
                <Text style={[styles.typeBadgeText, { color: badge.color }]} numberOfLines={1}>{badge.label}</Text>
              </View>
              <Text style={[styles.timeText, { color: theme.textMuted }]} numberOfLines={1}>
                {formattedDate}
              </Text>
              {transaction.syncStatus === 'pending' && (
                <View style={[styles.syncBadge, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="cloud-upload-outline" size={10} color="#D97706" />
                  <Text style={[styles.syncBadgeText, { color: '#92400E' }]} numberOfLines={1}>Offline</Text>
                </View>
              )}
              {transaction.syncStatus === 'failed' && (
                <View style={[styles.syncBadge, { backgroundColor: '#FEE2E2' }]}>
                  <Ionicons name="alert-circle-outline" size={10} color="#DC2626" />
                  <Text style={[styles.syncBadgeText, { color: '#991B1B' }]} numberOfLines={1}>Failed</Text>
                </View>
              )}
            </View>

            <Text
              style={[styles.targetNumber, { color: theme.text }]}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              {isSend && transaction.recipientNumber
                ? `To: ${transaction.recipientNumber}`
                : isReceive && transaction.senderNumber
                  ? `From: ${transaction.senderNumber}`
                  : transaction.note || transaction.accountName}
            </Text>

            <Text
              style={[styles.accountMeta, { color: theme.textSecondary }]}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
              Via: {transaction.accountName} ({transaction.accountNumber})
            </Text>
          </View>
        </View>

        <View style={styles.rightSection}>
          <Text
            style={[
              styles.amountText,
              { color: isSend ? theme.text : theme.success },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {isSend ? '-' : '+'}{formattedAmount}
          </Text>

          <View style={styles.subAmounts}>
            {transaction.profit > 0 && (
              <View style={[styles.profitPill, { backgroundColor: theme.successLight }]}>
                <Text style={[styles.profitText, { color: theme.success }]} numberOfLines={1}>
                  +{formattedProfit} Profit
                </Text>
              </View>
            )}
            {transaction.cost > 0 && (
              <Text style={[styles.costText, { color: theme.textMuted }]} numberOfLines={1}>
                Fee: {formattedCost}
              </Text>
            )}
          </View>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

export const TransactionItem = React.memo(TransactionItemComponent);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 13,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    flex: 1,
    minWidth: 0,
    marginRight: 6,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  details: {
    flex: 1,
    minWidth: 0,
  },
  topMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 3,
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  timeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  targetNumber: {
    fontSize: 13.5,
    fontWeight: '700',
    marginTop: 1,
    lineHeight: 18,
  },
  accountMeta: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },
  rightSection: {
    alignItems: 'flex-end',
    flexShrink: 0,
    marginLeft: 6,
  },
  amountText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subAmounts: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 2,
    marginTop: 3,
  },
  profitPill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
  },
  costText: {
    fontSize: 10,
    fontWeight: '500',
  },
  profitText: {
    fontSize: 10,
    fontWeight: '800',
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 5,
  },
  syncBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
});