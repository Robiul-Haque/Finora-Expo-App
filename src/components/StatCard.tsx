import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  badgeText?: string;
  isPositive?: boolean;
  iconName?: keyof typeof Ionicons.glyphMap;
  variant?: 'primary' | 'card' | 'success' | 'danger';
  onPress?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  badgeText,
  isPositive = true,
  iconName,
  variant = 'card',
  onPress,
}) => {
  const { theme, isDarkMode } = useTheme();

  const isPrimary = variant === 'primary';
  const cardBg = isPrimary ? (isDarkMode ? '#1E3A8A' : '#1D4ED8') : theme.card;
  const textColor = isPrimary ? '#FFFFFF' : theme.text;
  const subTextColor = isPrimary ? '#BFDBFE' : theme.textSecondary;

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.8 : 1}
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: cardBg,
          borderColor: isPrimary ? 'transparent' : theme.border,
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.titleContainer}>
          {iconName && (
            <View
              style={[
                styles.iconBadge,
                {
                  backgroundColor: isPrimary ? 'rgba(255,255,255,0.2)' : theme.cardSecondary,
                },
              ]}
            >
              <Ionicons
                name={iconName}
                size={16}
                color={isPrimary ? '#FFFFFF' : theme.primary}
              />
            </View>
          )}
          <Text style={[styles.title, { color: subTextColor }]}>{title}</Text>
        </View>
        {badgeText && (
          <View
            style={[
              styles.badge,
              {
                backgroundColor: isPrimary
                  ? 'rgba(255,255,255,0.25)'
                  : isPositive
                  ? theme.successLight
                  : theme.dangerLight,
              },
            ]}
          >
            <Ionicons
              name={isPositive ? 'arrow-up' : 'arrow-down'}
              size={12}
              color={isPrimary ? '#FFFFFF' : isPositive ? theme.success : theme.danger}
            />
            <Text
              style={[
                styles.badgeText,
                {
                  color: isPrimary ? '#FFFFFF' : isPositive ? theme.success : theme.danger,
                },
              ]}
            >
              {badgeText}
            </Text>
          </View>
        )}
      </View>

      <Text style={[styles.value, { color: textColor }]}>{value}</Text>

      {subtitle && (
        <Text style={[styles.subtitle, { color: subTextColor }]}>{subtitle}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginVertical: 2,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
