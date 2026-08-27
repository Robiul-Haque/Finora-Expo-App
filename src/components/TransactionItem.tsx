import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Transaction } from '../types/ledger';
import { useTheme } from '../context/ThemeContext';

interface TransactionItemProps {
  transaction: Transaction;
  onPress?: () => void;
  onDelete?: () => void;
}

export const TransactionItem: React.FC<TransactionItemProps> = ({
  transaction,
  onPress,
  onDelete,
}) => {
  const { theme } = useTheme();

  const isSend = transaction.type === 'send_money' || transaction.type === 'cash_out' || transaction.type === 'b2b';
  const isReceive = transaction.type === 'receive_money' || transaction.type === 'cash_in';

  const formatCurrency = (val: number) => {
    return '৳' + val.toLocaleString('en-US');
  };

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getBadgeConfig = () => {
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
  };

  const badge = getBadgeConfig();

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={[
        styles.container,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
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
              <Text style={[styles.typeBadgeText, { color: badge.color }]}>{badge.label}</Text>
            </View>
            <Text style={[styles.timeText, { color: theme.textMuted }]}>
              {formatDate(transaction.date)}
            </Text>
          </View>

          <Text style={[styles.targetNumber, { color: theme.text }]} numberOfLines={1}>
            {isSend && transaction.recipientNumber
              ? `To: ${transaction.recipientNumber}`
              : isReceive && transaction.senderNumber
              ? `From: ${transaction.senderNumber}`
              : transaction.note || transaction.accountName}
          </Text>

          <Text style={[styles.accountMeta, { color: theme.textSecondary }]}>
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
        >
          {isSend ? '-' : '+'}{formatCurrency(transaction.amount)}
        </Text>

        <View style={styles.subAmounts}>
          {transaction.profit > 0 && (
            <View style={[styles.profitPill, { backgroundColor: theme.successLight }]}>
              <Text style={[styles.profitText, { color: theme.success }]}>
                +{formatCurrency(transaction.profit)} Com.
              </Text>
            </View>
          )}
          {transaction.cost > 0 && (
            <Text style={[styles.costText, { color: theme.textMuted }]}>
              Fee {formatCurrency(transaction.cost)}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

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
    alignItems: 'center',
    gap: 11,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  details: {
    flex: 1,
    marginRight: 6,
  },
  topMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
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
  },
  accountMeta: {
    fontSize: 11,
    marginTop: 1,
  },
  rightSection: {
    alignItems: 'flex-end',
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
});
