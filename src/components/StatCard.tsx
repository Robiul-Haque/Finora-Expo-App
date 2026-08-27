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
  const cardBg = isPrimary ? (isDarkMode ? '#9D174D' : '#E2136E') : theme.card;
  const textColor = isPrimary ? '#FFFFFF' : theme.text;
  const subTextColor = isPrimary ? '#FCE7F3' : theme.textSecondary;

  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.75 : 1}
      onPress={onPress}
      disabled={!onPress}
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
                  backgroundColor: isPrimary ? 'rgba(255,255,255,0.22)' : theme.cardSecondary,
                },
              ]}
            >
              <Ionicons
                name={iconName}
                size={15}
                color={isPrimary ? '#FFFFFF' : theme.primary}
              />
            </View>
          )}
          <Text style={[styles.title, { color: subTextColor }]} numberOfLines={1}>
            {title}
          </Text>
        </View>
        {badgeText && (
          <View
            style={[
              styles.badge,
              {
                backgroundColor: isPrimary
                  ? 'rgba(255,255,255,0.22)'
                  : isPositive
                  ? theme.successLight
                  : theme.dangerLight,
              },
            ]}
          >
            <Ionicons
              name={isPositive ? 'arrow-up' : 'arrow-down'}
              size={11}
              color={isPrimary ? '#FFFFFF' : isPositive ? theme.success : theme.danger}
            />
            <Text
              style={[
                styles.badgeText,
                {
                  color: isPrimary ? '#FFFFFF' : isPositive ? theme.success : theme.danger,
                },
              ]}
              numberOfLines={1}
            >
              {badgeText}
            </Text>
          </View>
        )}
      </View>

      <Text
        style={[styles.value, { color: textColor }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>

      {subtitle && (
        <Text style={[styles.subtitle, { color: subTextColor }]} numberOfLines={1}>
          {subtitle}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  iconBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    flex: 1,
  },
  value: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginVertical: 2,
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    letterSpacing: 0.1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
