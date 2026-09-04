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
  const logoScaleAnim = useRef(new Animated.Value(0.86)).current;

  // 3 Animated values for the loading dots wave
  const dot1Anim = useRef(new Animated.Value(0.3)).current;
  const dot2Anim = useRef(new Animated.Value(0.3)).current;
  const dot3Anim = useRef(new Animated.Value(0.3)).current;

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

    // 2. Continuous smooth, gentle wave animation for loading dots
    const createDotAnimation = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 380,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.35,
            duration: 380,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.delay(Math.max(0, 560 - delay)),
        ])
      );
    };

    const anim1 = createDotAnimation(dot1Anim, 0);
    const anim2 = createDotAnimation(dot2Anim, 180);
    const anim3 = createDotAnimation(dot3Anim, 360);

    anim1.start();
    anim2.start();
    anim3.start();

    // 3. Smooth exit after 2000ms duration (extended by 250ms)
    const timer = setTimeout(() => {
      Animated.timing(exitFadeAnim, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }).start(() => {
        onFinish();
      });
    }, 2000);

    return () => {
      clearTimeout(timer);
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [fadeAnim, exitFadeAnim, logoScaleAnim, dot1Anim, dot2Anim, dot3Anim, onFinish]);

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
                opacity: dot1Anim,
                transform: [
                  {
                    scale: dot1Anim.interpolate({
                      inputRange: [0.3, 1],
                      outputRange: [0.8, 1.25],
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
                opacity: dot2Anim,
                transform: [
                  {
                    scale: dot2Anim.interpolate({
                      inputRange: [0.3, 1],
                      outputRange: [0.8, 1.25],
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
                opacity: dot3Anim,
                transform: [
                  {
                    scale: dot3Anim.interpolate({
                      inputRange: [0.3, 1],
                      outputRange: [0.8, 1.25],
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