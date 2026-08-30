import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useLedger } from '../context/LedgerContext';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showSearch?: boolean;
  searchQuery?: string;
  onSearchChange?: (text: string) => void;
  searchPlaceholder?: string;
  onMenuPress?: () => void;
  onFilterPress?: () => void;
  onReload?: () => void;
  rightActions?: React.ReactNode;
}

const HeaderComponent: React.FC<HeaderProps> = ({ title = 'Finora bKash', subtitle = 'bKash Business Ledger', showSearch = false, searchQuery = '', onSearchChange, searchPlaceholder = 'Search bKash number, note...', onMenuPress, onFilterPress, onReload, rightActions }) => {
  const { theme, isDarkMode, toggleTheme } = useTheme();
  const { refetch, isFetching } = useLedger();

  // Animation values for Theme Toggle
  const themeScaleAnim = useRef(new Animated.Value(1)).current;
  const themeRotateAnim = useRef(new Animated.Value(0)).current;
  const themeGlowAnim = useRef(new Animated.Value(0)).current;

  // Animation values for Reload / Sync
  const spinValue = useRef(new Animated.Value(0)).current;

  // Spin animation when background fetching is active
  useEffect(() => {
    if (isFetching) {
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 900,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      Animated.timing(spinValue, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isFetching]);

  // Ref to prevent jitter if rapidly tapped
  const isTogglingRef = useRef(false);

  // Instant, buttery smooth 360° spring flip animation on theme touch
  const handleToggleTheme = () => {
    if (isTogglingRef.current) return;
    isTogglingRef.current = true;
    setTimeout(() => {
      isTogglingRef.current = false;
    }, 300);

    // Stop any active animation immediately
    themeRotateAnim.stopAnimation();
    themeScaleAnim.stopAnimation();
    themeGlowAnim.stopAnimation();

    // 1. Reset rotate & glow
    themeRotateAnim.setValue(0);
    themeGlowAnim.setValue(1);

    // 2. Play snappy bounce, 360 spin & glow fade in parallel instantly on touch
    Animated.parallel([
      // 360 degree rotation with back bounce
      Animated.timing(themeRotateAnim, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.back(1.4)),
        useNativeDriver: true,
      }),
      // Spring scale bounce
      Animated.sequence([
        Animated.timing(themeScaleAnim, {
          toValue: 0.75,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.spring(themeScaleAnim, {
          toValue: 1.2,
          friction: 3.5,
          tension: 140,
          useNativeDriver: true,
        }),
        Animated.spring(themeScaleAnim, {
          toValue: 1,
          friction: 4,
          tension: 90,
          useNativeDriver: true,
        }),
      ]),
      // Glow pulse fade-out
      Animated.timing(themeGlowAnim, {
        toValue: 0,
        duration: 350,
        delay: 50,
        useNativeDriver: true,
      }),
    ]).start();

    // Trigger theme change immediately on touch
    toggleTheme();
  };

  const handleReload = async () => {
    Animated.sequence([
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      spinValue.setValue(0);
    });

    if (onReload) {
      onReload();
    } else if (refetch) {
      await refetch();
    }
  };

  const reloadSpin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const themeSpin = themeRotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={[styles.headerContainer, { backgroundColor: theme.background }]}>
      {/* Top Bar */}
      <View style={styles.topRow}>
        <View style={styles.leftGroup}>
          {onMenuPress ? (
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={onMenuPress}
              activeOpacity={0.7}
            >
              <Ionicons name="menu-outline" size={20} color={theme.text} />
            </TouchableOpacity>
          ) : (
            <View style={[styles.brandIconBadge, { backgroundColor: theme.primaryLight }]}>
              <Ionicons name="wallet" size={17} color={theme.primary} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.brandTitle, { color: theme.text }]} numberOfLines={1}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={[styles.brandSubtitle, { color: theme.textSecondary }]} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.rightGroup}>
          {/* Top Reload / Sync Button */}
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={handleReload}
            activeOpacity={0.7}
            disabled={isFetching}
          >
            <Animated.View style={{ transform: [{ rotate: reloadSpin }] }}>
              <Ionicons
                name="reload-outline"
                size={17}
                color={isFetching ? theme.primary : theme.textSecondary}
              />
            </Animated.View>
          </TouchableOpacity>

          {/* Theme Toggle with Instant Touch (onPressIn) 360° Spring Flip & Scale Animation */}
          <TouchableOpacity
            onPressIn={handleToggleTheme}
            activeOpacity={0.8}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            accessibilityLabel="Toggle Theme"
            accessibilityRole="button"
          >
            <Animated.View
              style={[
                styles.iconButton,
                {
                  backgroundColor: theme.card,
                  borderColor: isDarkMode ? '#F59E0B66' : theme.border,
                  transform: [
                    { scale: themeScaleAnim },
                    { rotate: themeSpin },
                  ],
                },
              ]}
            >
              <Ionicons
                name={isDarkMode ? 'sunny' : 'moon'}
                size={18}
                color={isDarkMode ? '#F59E0B' : theme.text}
              />
            </Animated.View>
          </TouchableOpacity>

          {/* Filter Option Button */}
          {onFilterPress && (
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={onFilterPress}
              activeOpacity={0.7}
            >
              <Ionicons name="options-outline" size={17} color={theme.primary} />
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
          <Ionicons name="search-outline" size={17} color={theme.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder={searchPlaceholder}
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={onSearchChange}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => onSearchChange && onSearchChange('')} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={18} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

export const Header = React.memo(HeaderComponent);

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 6,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  leftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    marginRight: 8,
  },
  brandIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginTop: 1,
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 11,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 8,
    marginTop: 2,
    marginBottom: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
});