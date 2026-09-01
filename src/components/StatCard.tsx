import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
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

const StatCardComponent: React.FC<StatCardProps> = ({ title, value, subtitle, badgeText, isPositive = true, iconName, variant = 'card', onPress }) => {
  const { theme, isDarkMode } = useTheme();

  const isPrimary = variant === 'primary';
  const cardBg = isPrimary ? (isDarkMode ? '#004493' : '#1A73E8') : theme.card;
  const textColor = isPrimary ? '#FFFFFF' : theme.text;
  const subTextColor = isPrimary ? '#D8E2FF' : theme.textSecondary;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={!onPress}
    >
      <View
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
                    backgroundColor: isPrimary ? 'rgba(255,255,255,0.22)' : theme.primaryLight,
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
            <Text
              style={[styles.title, { color: subTextColor }]}
              numberOfLines={2}
              ellipsizeMode="tail"
            >
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
                ellipsizeMode="tail"
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
          minimumFontScale={0.6}
        >
          {value}
        </Text>

        {subtitle ? (
          <Text style={[styles.subtitle, { color: subTextColor }]} numberOfLines={2} ellipsizeMode="tail">
            {subtitle}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
};

export const StatCard = React.memo(StatCardComponent);

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 6,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  iconBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    flex: 1,
    flexShrink: 1,
    lineHeight: 16,
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
    lineHeight: 15,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    flexShrink: 0,
    maxWidth: '48%',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
    flexShrink: 1,
  },
});