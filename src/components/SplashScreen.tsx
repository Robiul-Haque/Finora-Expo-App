import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, StatusBar, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface SplashScreenProps {
  onFinish?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const { theme, isDarkMode } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const logoScale = useRef(new Animated.Value(0.9)).current;
  const bottomFade = useRef(new Animated.Value(0)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 65,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(bottomFade, {
        toValue: 1,
        duration: 400,
        delay: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Guaranteed exit animation after 900ms
    const exitTimer = setTimeout(() => {
      Animated.timing(containerOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start();
    }, 900);

    // Guaranteed onFinish trigger after 1150ms
    const finishTimer = setTimeout(() => {
      if (onFinish) {
        onFinish();
      }
    }, 1150);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: isDarkMode ? '#0B0A12' : '#FFFFFF',
          opacity: containerOpacity,
        },
      ]}
    >
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? '#0B0A12' : '#FFFFFF'}
        animated={true}
      />
      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Finora App Icon with Glow Badge */}
        <Animated.View
          style={[
            styles.iconWrapper,
            {
              transform: [{ scale: logoScale }],
              shadowColor: theme.primary,
              backgroundColor: theme.primary,
            },
          ]}
        >
          <Image
            source={require('../../assets/icon.png')}
            style={styles.logoImage}
            resizeMode="contain"
            fadeDuration={0}
          />
        </Animated.View>

        {/* Brand Titles */}
        <Text style={[styles.title, { color: isDarkMode ? '#FFFFFF' : '#0F172A' }]}>
          Finora <Text style={{ color: theme.primary }}>bKash</Text>
        </Text>
        <Text style={[styles.subtitle, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
          Smart bKash Business Ledger
        </Text>
      </Animated.View>

      {/* Bottom Syncing Indicator */}
      <Animated.View style={[styles.bottomContainer, { opacity: bottomFade }]}>
        <Ionicons name="sparkles" size={15} color={theme.primary} />
        <Text style={[styles.syncText, { color: isDarkMode ? '#64748B' : '#94A3B8' }]}>
          FINANCIAL INTELLIGENCE OS
        </Text>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  iconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 24,
    marginBottom: 20,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 10,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackIcon: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12.5,
    fontWeight: '600',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginTop: 5,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  syncText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
});

