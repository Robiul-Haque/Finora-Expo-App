import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Transaction } from '../types/ledger';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency, formatDateTime } from '../utils';

interface TransactionItemProps {
  transaction: Transaction;
  onPress?: () => void;
  onOptionsPress?: (tx: Transaction) => void;
}

const TransactionItemComponent: React.FC<TransactionItemProps> = ({ transaction, onPress, onOptionsPress }) => {
  const { theme, isDarkMode } = useTheme();

  const isSend =
    transaction.type === 'sm' ||
    transaction.type === 'co' ||
    transaction.type === 'send' ||
    transaction.type === 'send_money' ||
    transaction.type === 'cash_out' ||
    transaction.type === 'b2b';

  const isReceive =
    transaction.type === 'recev' ||
    transaction.type === 'receive_money' ||
    transaction.type === 'cash_in';

  const typeConfig = React.useMemo(() => {
    if (isReceive) {
      return {
        label: 'RECEIVE MONEY',
        indicatorColor: theme.success,
        iconName: 'arrow-down' as const,
        flowIcon: 'arrow-back' as const,
      };
    }
    if (isSend) {
      return {
        label: transaction.type === 'co' || transaction.type === 'cash_out' ? 'CASH OUT' : 'SEND MONEY',
        indicatorColor: theme.primary,
        iconName: 'arrow-up' as const,
        flowIcon: 'arrow-forward' as const,
      };
    }
    return {
      label: 'ADJUSTMENT',
      indicatorColor: theme.textMuted,
      iconName: 'swap-horizontal' as const,
      flowIcon: 'arrow-forward' as const,
    };
  }, [transaction.type, isReceive, isSend, theme]);

  const sourceNumber = transaction.accountNumber || transaction.accountName;
  const targetNumber =
    transaction.recipientNumber ||
    transaction.senderNumber ||
    transaction.counterparty ||
    transaction.note ||
    '—';

  const cost = transaction.cost || 0;
  const profit = transaction.profit !== undefined ? transaction.profit : (transaction.margin || 0);

  const handleItemPress = () => {
    if (onPress) {
      onPress();
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
        },
      ]}
    >
      {/* Left 4px Status Indicator Bar */}
      <View style={[styles.leftIndicator, { backgroundColor: typeConfig.indicatorColor }]} />

      <View style={styles.innerContent}>
        {/* Top Row: Type & Flow vs Amount & Date */}
        <View style={styles.topRow}>
          {/* Left Column: Type + Number Flow */}
          <TouchableOpacity
            style={styles.typeFlowCol}
            activeOpacity={onPress ? 0.7 : 1}
            onPress={handleItemPress}
            disabled={!onPress}
          >
            <View style={styles.typeLabelRow}>
              <Ionicons name={typeConfig.iconName} size={14} color={typeConfig.indicatorColor} />
              <Text style={[styles.typeLabel, { color: theme.textSecondary }]}>
                {typeConfig.label}
              </Text>
              {transaction.syncStatus === 'pending' && (
                <View style={[styles.offlinePill, { backgroundColor: isDarkMode ? '#4A3B18' : '#FEF3C7' }]}>
                  <Text style={[styles.offlineText, { color: isDarkMode ? '#FBBF24' : '#92400E' }]}>
                    Offline
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.flowRow}>
              <Text style={[styles.monoNumber, { color: theme.text }]} numberOfLines={1}>
                {sourceNumber}
              </Text>
              {targetNumber && targetNumber !== '—' && (
                <>
                  <Ionicons name={typeConfig.flowIcon} size={11} color={theme.textMuted} style={styles.flowArrow} />
                  <Text style={[styles.monoNumber, { color: theme.text }]} numberOfLines={1}>
                    {targetNumber}
                  </Text>
                </>
              )}
            </View>

            {Boolean(transaction.note && transaction.note.trim()) && (
              <View style={styles.noteContainer}>
                <Ionicons name="chatbox-ellipses-outline" size={11} color={theme.textMuted} />
                <Text style={[styles.noteText, { color: theme.textSecondary }]} numberOfLines={1}>
                  {transaction.note?.trim()}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Right Group: Amount, Timestamp & Options Action */}
          <View style={styles.rightGroup}>
            <TouchableOpacity
              style={styles.amountCol}
              activeOpacity={onPress ? 0.7 : 1}
              onPress={handleItemPress}
              disabled={!onPress}
            >
              <Text
                style={[
                  styles.amountText,
                  { color: isReceive ? theme.success : theme.text },
                ]}
                numberOfLines={1}
              >
                {isReceive ? '+' : isSend ? '-' : ''}{formatCurrency(transaction.amount)}
              </Text>
              <Text style={[styles.dateText, { color: theme.textMuted }]} numberOfLines={1}>
                {formatDateTime(transaction.date)}
              </Text>
            </TouchableOpacity>

            {onOptionsPress && (
              <TouchableOpacity
                style={[
                  styles.optionsBtn,
                  {
                    backgroundColor: theme.cardSecondary,
                  },
                ]}
                onPress={() => {
                  onOptionsPress(transaction);
                }}
                activeOpacity={0.6}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                accessibilityLabel="Transaction options"
              >
                <Ionicons name="ellipsis-vertical" size={15} color={theme.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Bottom Strip: Cost & Profit Breakdown */}
        {(cost > 0 || profit > 0 || (transaction.runningBalance !== undefined && transaction.runningBalance !== null)) && (
          <TouchableOpacity
            style={[styles.bottomStrip, { borderTopColor: theme.divider }]}
            activeOpacity={onPress ? 0.7 : 1}
            onPress={handleItemPress}
            disabled={!onPress}
          >
            <View style={styles.breakdownGroup}>
              {cost > 0 && (
                <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                  Cost <Text style={[styles.metaBold, { color: theme.text }]}>{formatCurrency(cost)}</Text>
                </Text>
              )}
              {profit > 0 && (
                <View style={styles.profitGroup}>
                  <Ionicons name="trending-up" size={12} color={theme.success} />
                  <Text style={[styles.metaProfit, { color: theme.success }]}>
                    Profit <Text style={styles.metaProfitBold}>+{formatCurrency(profit)}</Text>
                  </Text>
                </View>
              )}
            </View>

            {transaction.runningBalance !== undefined && (
              <Text style={[styles.runningBalanceText, { color: theme.textMuted }]}>
                b/l: {formatCurrency(transaction.runningBalance)}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export const TransactionItem = React.memo(TransactionItemComponent);

const styles = StyleSheet.create({
  container: {
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
    width: 4.5,
    zIndex: 2,
  },
  innerContent: {
    paddingVertical: 13,
    paddingHorizontal: 14,
    paddingLeft: 16,
    gap: 8,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  typeFlowCol: {
    flex: 1,
    marginRight: 10,
    gap: 3.5,
  },
  typeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4.5,
  },
  typeLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  offlinePill: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 4,
  },
  offlineText: {
    fontSize: 8.5,
    fontWeight: '700',
  },
  flowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 2,
  },
  monoNumber: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    fontSize: 13.5,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  flowArrow: {
    marginHorizontal: 5,
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 4,
    paddingVertical: 1,
  },
  noteText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  amountCol: {
    alignItems: 'flex-end',
    gap: 2,
  },
  optionsBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  dateText: {
    fontSize: 11,
    fontWeight: '500',
  },
  bottomStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 3,
  },
  breakdownGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaText: {
    fontSize: 11.5,
  },
  metaBold: {
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  profitGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaProfit: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  metaProfitBold: {
    fontWeight: '800',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  runningBalanceText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});