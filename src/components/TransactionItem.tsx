import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Transaction } from '../types/ledger';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency, formatDateTime } from '../utils';

interface TransactionItemProps {
  transaction: Transaction;
  onPress?: () => void;
}

const TransactionItemComponent: React.FC<TransactionItemProps> = ({ transaction, onPress }) => {
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

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      disabled={!onPress}
    >
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
            <View style={styles.typeFlowCol}>
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
            </View>

            {/* Right Group: Amount, Timestamp & Delete Action */}
            <View style={styles.rightGroup}>
              <View style={styles.amountCol}>
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
              </View>

              {onPress && (
                <TouchableOpacity
                  style={[
                    styles.deleteBtn,
                    {
                      backgroundColor: isDarkMode ? 'rgba(255, 82, 82, 0.12)' : 'rgba(186, 26, 26, 0.07)',
                    },
                  ]}
                  onPress={onPress}
                  activeOpacity={0.7}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Ionicons name="trash-outline" size={15} color={theme.danger} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Bottom Strip: Cost & Profit Breakdown */}
          {(cost > 0 || profit > 0 || (transaction.runningBalance !== undefined && transaction.runningBalance !== null)) && (
            <View style={[styles.bottomStrip, { borderTopColor: theme.divider }]}>
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
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export const TransactionItem = React.memo(TransactionItemComponent);

const styles = StyleSheet.create({
  container: {
    borderRadius: 10,
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
  innerContent: {
    paddingVertical: 12,
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
    gap: 3,
  },
  typeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  typeLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    letterSpacing: 0.5,
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
    fontFamily: 'monospace',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  flowArrow: {
    marginHorizontal: 4,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  amountCol: {
    alignItems: 'flex-end',
    gap: 1.5,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  dateText: {
    fontSize: 10.5,
    fontWeight: '500',
  },
  bottomStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 7,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 2,
  },
  breakdownGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  metaText: {
    fontSize: 11,
  },
  metaBold: {
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  profitGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2.5,
  },
  metaProfit: {
    fontSize: 11,
    fontWeight: '600',
  },
  metaProfitBold: {
    fontWeight: '800',
    fontFamily: 'monospace',
  },
  runningBalanceText: {
    fontSize: 10.5,
    fontWeight: '500',
    fontFamily: 'monospace',
  },
});