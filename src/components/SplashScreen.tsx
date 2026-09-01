import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Animated, StatusBar, Easing } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const { theme, isDarkMode } = useTheme();

  // Opacity & Scale animations for smooth entrance & exit
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const exitFadeAnim = useRef(new Animated.Value(1)).current;

  // Dot pulse animations
  const dot1Anim = useRef(new Animated.Value(0.3)).current;
  const dot2Anim = useRef(new Animated.Value(0.3)).current;
  const dot3Anim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    // 1. Snappy entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 70,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Fast continuous Dot pulse animation
    const createDotLoop = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.3,
            duration: 250,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const loop1 = createDotLoop(dot1Anim, 0);
    const loop2 = createDotLoop(dot2Anim, 120);
    const loop3 = createDotLoop(dot3Anim, 240);

    loop1.start();
    loop2.start();
    loop3.start();

    // 3. Fast smooth exit after 750ms
    const timer = setTimeout(() => {
      Animated.timing(exitFadeAnim, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        onFinish();
      });
    }, 750);

    return () => {
      clearTimeout(timer);
      loop1.stop();
      loop2.stop();
      loop3.stop();
    };
  }, [fadeAnim, scaleAnim, exitFadeAnim, dot1Anim, dot2Anim, dot3Anim, onFinish]);

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
            transform: [{ scale: scaleAnim }],
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
          <Animated.View
            style={[
              styles.dot,
              { backgroundColor: theme.primary, opacity: dot1Anim },
            ]}
          />
          <Animated.View
            style={[
              styles.dot,
              { backgroundColor: theme.primary, opacity: dot2Anim },
            ]}
          />
          <Animated.View
            style={[
              styles.dot,
              { backgroundColor: theme.primary, opacity: dot3Anim },
            ]}
          />
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
