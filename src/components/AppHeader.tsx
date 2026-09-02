import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  showBrandLogo?: boolean;
  rightContent?: React.ReactNode;
  showThemeToggle?: boolean;
  style?: StyleProp<ViewStyle>;
}

const AppHeaderComponent: React.FC<AppHeaderProps> = ({
  title = 'Finora',
  subtitle,
  showBrandLogo = true,
  rightContent,
  showThemeToggle = true,
  style,
}) => {
  const { theme, isDarkMode, toggleTheme } = useTheme();

  return (
    <View
      style={[
        styles.header,
        { backgroundColor: theme.card, borderBottomColor: theme.divider },
        style,
      ]}
    >
      {/* Brand Left Section */}
      <View style={styles.headerLeft}>
        {showBrandLogo && (
          <Image
            source={require('../../assets/icon.png')}
            style={styles.logoBadgeImage}
            resizeMode="contain"
          />
        )}
        <View style={styles.headerTitleGroup}>
          <Text style={[styles.brandTitle, { color: theme.primary }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.brandSubtitle, { color: theme.textSecondary }]}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Header Right Action Section */}
      <View style={styles.headerRight}>
        {rightContent}

        {showThemeToggle && (
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: theme.cardSecondary }]}
            onPress={toggleTheme}
            activeOpacity={0.7}
            accessibilityLabel="Toggle Dark Mode"
          >
            <Ionicons
              name={isDarkMode ? 'sunny-outline' : 'moon-outline'}
              size={18}
              color={theme.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

export const AppHeader = React.memo(AppHeaderComponent);

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoBadgeImage: {
    width: 26,
    height: 26,
  },
  headerTitleGroup: {
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  brandSubtitle: {
    fontSize: 11,
    fontWeight: '500',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
