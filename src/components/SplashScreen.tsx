import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

interface SplashScreenProps {
  onFinish?: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const { theme, isDarkMode } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const bottomFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fast & smooth spring in (500ms)
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 50,
        useNativeDriver: true,
      }),
      Animated.timing(bottomFade, {
        toValue: 1,
        duration: 500,
        delay: 150,
        useNativeDriver: true,
      }),
    ]).start();

    // Fast exit after 750ms for instant app experience
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        if (onFinish) onFinish();
      });
    }, 750);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#0B0F19' : '#FFFFFF' }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? '#0B0F19' : '#FFFFFF'}
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
        {/* Brand Icon Badge */}
        <View style={[styles.logoBadge, { backgroundColor: isDarkMode ? '#2A1320' : '#FDF2F8' }]}>
          <Ionicons
            name="wallet"
            size={52}
            color={theme.primary}
          />
        </View>

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
        <Ionicons name="flash" size={16} color={theme.primary} />
        <Text style={[styles.syncText, { color: isDarkMode ? '#64748B' : '#94A3B8' }]}>
          FINANCIAL OS
        </Text>
      </Animated.View>
    </View>
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
  logoBadge: {
    width: 90,
    height: 90,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  syncText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
});
