import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export type TxSelectableType = 'send' | 'receive' | 'cash_out' | 'adjustment';

interface TransactionTypeSelectorProps {
  selectedType: TxSelectableType;
  onSelectType: (type: TxSelectableType) => void;
  label?: string;
}

const TransactionTypeSelectorComponent: React.FC<TransactionTypeSelectorProps> = ({
  selectedType,
  onSelectType,
  label = 'TYPE',
}) => {
  const { theme, isDarkMode } = useTheme();

  return (
    <View style={styles.container}>
      {!!label && <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>}
      <View style={styles.grid}>
        {/* 1. Send Money */}
        <TouchableOpacity
          style={[
            styles.card,
            {
              backgroundColor:
                selectedType === 'send'
                  ? isDarkMode
                    ? 'rgba(26, 115, 232, 0.15)'
                    : '#F0F6FF'
                  : theme.inputBg,
              borderColor: selectedType === 'send' ? theme.primary : theme.border,
            },
          ]}
          onPress={() => onSelectType('send')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="arrow-up-circle-outline"
            size={18}
            color={selectedType === 'send' ? theme.primary : theme.textSecondary}
          />
          <Text
            style={[
              styles.cardText,
              { color: selectedType === 'send' ? theme.primary : theme.text },
              selectedType === 'send' && styles.cardTextSelected,
            ]}
          >
            Send Money
          </Text>
        </TouchableOpacity>

        {/* 2. Receive Money */}
        <TouchableOpacity
          style={[
            styles.card,
            {
              backgroundColor:
                selectedType === 'receive'
                  ? isDarkMode
                    ? 'rgba(0, 200, 83, 0.15)'
                    : '#DCFCE7'
                  : theme.inputBg,
              borderColor: selectedType === 'receive' ? theme.success : theme.border,
            },
          ]}
          onPress={() => onSelectType('receive')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="arrow-down-circle-outline"
            size={18}
            color={selectedType === 'receive' ? theme.success : theme.textSecondary}
          />
          <Text
            style={[
              styles.cardText,
              { color: selectedType === 'receive' ? theme.success : theme.text },
              selectedType === 'receive' && styles.cardTextSelected,
            ]}
          >
            Receive Money
          </Text>
        </TouchableOpacity>

        {/* 3. Cash Out */}
        <TouchableOpacity
          style={[
            styles.card,
            {
              backgroundColor:
                selectedType === 'cash_out'
                  ? isDarkMode
                    ? 'rgba(26, 115, 232, 0.15)'
                    : '#F0F6FF'
                  : theme.inputBg,
              borderColor: selectedType === 'cash_out' ? theme.primary : theme.border,
            },
          ]}
          onPress={() => onSelectType('cash_out')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="wallet-outline"
            size={18}
            color={selectedType === 'cash_out' ? theme.primary : theme.textSecondary}
          />
          <Text
            style={[
              styles.cardText,
              { color: selectedType === 'cash_out' ? theme.primary : theme.text },
              selectedType === 'cash_out' && styles.cardTextSelected,
            ]}
          >
            Cash Out
          </Text>
        </TouchableOpacity>

        {/* 4. Adjustment */}
        <TouchableOpacity
          style={[
            styles.card,
            {
              backgroundColor:
                selectedType === 'adjustment'
                  ? isDarkMode
                    ? 'rgba(255, 152, 0, 0.15)'
                    : '#FFF3E0'
                  : theme.inputBg,
              borderColor: selectedType === 'adjustment' ? theme.warning : theme.border,
            },
          ]}
          onPress={() => onSelectType('adjustment')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="swap-horizontal-outline"
            size={18}
            color={selectedType === 'adjustment' ? theme.warning : theme.textSecondary}
          />
          <Text
            style={[
              styles.cardText,
              { color: selectedType === 'adjustment' ? theme.warning : theme.text },
              selectedType === 'adjustment' && styles.cardTextSelected,
            ]}
          >
            Adjustment
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const TransactionTypeSelector = React.memo(TransactionTypeSelectorComponent);

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  card: {
    width: '48.5%',
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  cardText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  cardTextSelected: {
    fontWeight: '700',
  },
});
