import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Animated, StatusBar, Easing } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const { theme, isDarkMode } = useTheme();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const exitFadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. Instant 120ms fade entrance
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 120,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();

    // 2. Fast smooth exit after 350ms (Zero startup lag)
    const timer = setTimeout(() => {
      Animated.timing(exitFadeAnim, {
        toValue: 0,
        duration: 160,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        onFinish();
      });
    }, 350);

    return () => {
      clearTimeout(timer);
    };
  }, [fadeAnim, exitFadeAnim, onFinish]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: isDarkMode ? '#191C1D' : '#F8F9FA',
          opacity: exitFadeAnim,
        },
      ]}
    >
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? '#191C1D' : '#F8F9FA'}
      />

      {/* Center Brand Identity */}
      <Animated.View
        style={[
          styles.centerContent,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <View style={styles.logoBadge}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        <Text style={[styles.title, { color: theme.primary }]}>Finora</Text>
        <Text style={[styles.subtitle, { color: isDarkMode ? '#94A3B8' : '#5F6368' }]}>
          Smart Business Ledger
        </Text>
      </Animated.View>

      {/* Bottom Sync Indicator */}
      <View style={styles.bottomBar}>
        <View style={styles.dotsRow}>
          <View style={[styles.dot, { backgroundColor: theme.primary }]} />
          <View style={[styles.dot, { backgroundColor: theme.primary, opacity: 0.6 }]} />
          <View style={[styles.dot, { backgroundColor: theme.primary, opacity: 0.3 }]} />
        </View>
        <Text style={[styles.syncText, { color: isDarkMode ? '#94A3B8' : '#80868B' }]}>
          SYNCING DATA
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadge: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  logoImage: {
    width: 88,
    height: 88,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  syncText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
});
