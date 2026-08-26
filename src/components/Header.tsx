import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showSearch?: boolean;
  searchQuery?: string;
  onSearchChange?: (text: string) => void;
  searchPlaceholder?: string;
  onMenuPress?: () => void;
  onFilterPress?: () => void;
  rightActions?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title = 'Finora',
  subtitle = 'Smart Business Ledger',
  showSearch = false,
  searchQuery = '',
  onSearchChange,
  searchPlaceholder = 'Search phone number...',
  onMenuPress,
  onFilterPress,
  rightActions,
}) => {
  const { theme, isDarkMode, toggleTheme } = useTheme();

  return (
    <View style={[styles.headerContainer, { backgroundColor: theme.background }]}>
      {/* Top Bar */}
      <View style={styles.topRow}>
        <View style={styles.leftGroup}>
          {onMenuPress && (
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={onMenuPress}
            >
              <Ionicons name="menu-outline" size={20} color={theme.text} />
            </TouchableOpacity>
          )}
          <View>
            <Text style={[styles.brandTitle, { color: theme.text }]}>{title}</Text>
            {subtitle && (
              <Text style={[styles.brandSubtitle, { color: theme.textSecondary }]}>
                {subtitle}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.rightGroup}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={toggleTheme}
          >
            <Ionicons
              name={isDarkMode ? 'sunny-outline' : 'moon-outline'}
              size={18}
              color={isDarkMode ? '#F59E0B' : theme.text}
            />
          </TouchableOpacity>

          {onFilterPress && (
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={onFilterPress}
            >
              <Ionicons name="options-outline" size={18} color={theme.primary} />
            </TouchableOpacity>
          )}

          {rightActions}
        </View>
      </View>

      {/* Optional Search Bar */}
      {showSearch && (
        <View
          style={[
            styles.searchContainer,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
          <Ionicons name="search-outline" size={18} color={theme.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder={searchPlaceholder}
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={onSearchChange}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => onSearchChange && onSearchChange('')}>
              <Ionicons name="close-circle" size={18} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  brandSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    marginTop: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
});
