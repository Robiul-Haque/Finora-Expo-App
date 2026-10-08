import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, Animated, StatusBar, Easing } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const { theme } = useTheme();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const exitFadeAnim = useRef(new Animated.Value(1)).current;
  const logoScaleAnim = useRef(new Animated.Value(0.86)).current;

  // Single continuous native loop driver (never stalls or desynchronizes on Android/iOS)
  const dotPhase = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // 1. Entrance animation (fade + smooth logo pop-in)
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(logoScaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 55,
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Continuous 60fps native driver loop for dots
    const waveAnimation = Animated.loop(
      Animated.timing(dotPhase, {
        toValue: 1,
        duration: 850,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    waveAnimation.start();

    // 3. Smooth exit after 1150ms duration (increased by another 200ms as requested)
    const timer = setTimeout(() => {
      Animated.timing(exitFadeAnim, {
        toValue: 0,
        duration: 220,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        onFinish();
      });
    }, 1150);

    return () => {
      clearTimeout(timer);
      waveAnimation.stop();
    };
  }, [fadeAnim, exitFadeAnim, logoScaleAnim, dotPhase, onFinish]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
          opacity: exitFadeAnim,
        },
      ]}
    >
      <StatusBar
        barStyle={theme.statusBar === 'dark' ? 'dark-content' : 'light-content'}
        backgroundColor={theme.background}
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
        <Animated.View
          style={[
            styles.logoBadge,
            {
              transform: [{ scale: logoScaleAnim }],
            },
          ]}
        >
          <Image
            source={require('../../assets/icon.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>

        <Text style={[styles.title, { color: theme.primary }]}>Finora</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Smart Business Ledger
        </Text>
      </Animated.View>

      {/* Bottom Sync Indicator with Smooth Pulsing Dots */}
      <View style={styles.bottomBar}>
        <View style={styles.dotsRow}>
          <Animated.View
            style={[
              styles.dot,
              {
                backgroundColor: theme.primary,
                opacity: dotPhase.interpolate({
                  inputRange: [0, 0.25, 0.5, 1],
                  outputRange: [0.3, 1, 0.3, 0.3],
                }),
                transform: [
                  {
                    scale: dotPhase.interpolate({
                      inputRange: [0, 0.25, 0.5, 1],
                      outputRange: [0.85, 1.25, 0.85, 0.85],
                    }),
                  },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.dot,
              {
                backgroundColor: theme.primary,
                opacity: dotPhase.interpolate({
                  inputRange: [0, 0.25, 0.5, 0.75, 1],
                  outputRange: [0.3, 0.3, 1, 0.3, 0.3],
                }),
                transform: [
                  {
                    scale: dotPhase.interpolate({
                      inputRange: [0, 0.25, 0.5, 0.75, 1],
                      outputRange: [0.85, 0.85, 1.25, 0.85, 0.85],
                    }),
                  },
                ],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.dot,
              {
                backgroundColor: theme.primary,
                opacity: dotPhase.interpolate({
                  inputRange: [0, 0.5, 0.75, 1],
                  outputRange: [0.3, 0.3, 1, 0.3],
                }),
                transform: [
                  {
                    scale: dotPhase.interpolate({
                      inputRange: [0, 0.5, 0.75, 1],
                      outputRange: [0.85, 0.85, 1.25, 0.85],
                    }),
                  },
                ],
              },
            ]}
          />
        </View>
        <Text style={[styles.syncText, { color: theme.textMuted }]}>
          SYNCING DATA
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
    elevation: 99999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBadge: {
    width: 104,
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  logoImage: {
    width: 96,
    height: 96,
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
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
    gap: 5,
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