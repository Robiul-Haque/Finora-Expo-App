import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNetworkStatus } from '../services/network';
import { useTheme } from '../context/ThemeContext';

export const OfflineBanner: React.FC = () => {
  const { isOffline, pendingSyncCount } = useNetworkStatus();
  const { isDarkMode } = useTheme();

  // 'hidden' | 'offline' | 'reconnected'
  const [displayState, setDisplayState] = useState<'hidden' | 'offline' | 'reconnected'>('hidden');
  const wasOffline = useRef(false);

  // Animation values
  const translateY = useRef(new Animated.Value(-30)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOffline) {
      wasOffline.current = true;
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      setDisplayState('offline');

      // Animate In
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (wasOffline.current) {
      // Transition from offline to online: show "Back Online" briefly, then remove
      setDisplayState('reconnected');

      hideTimeoutRef.current = setTimeout(() => {
        // Animate Out
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -30,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setDisplayState('hidden');
          wasOffline.current = false;
        });
      }, 1800);
    }

    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, [isOffline, translateY, opacity]);

  if (displayState === 'hidden') {
    return null;
  }

  const isReconnected = displayState === 'reconnected';

  // Dynamic colors for small subtle pill
  const bgColor = isReconnected
    ? isDarkMode
      ? 'rgba(16, 185, 129, 0.2)'
      : '#DCFCE7'
    : isDarkMode
    ? 'rgba(245, 158, 11, 0.22)'
    : '#FEF3C7';

  const borderColor = isReconnected
    ? isDarkMode
      ? '#059669'
      : '#86EFAC'
    : isDarkMode
    ? '#D97706'
    : '#FDE68A';

  const textColor = isReconnected
    ? isDarkMode
      ? '#34D399'
      : '#15803D'
    : isDarkMode
    ? '#FCD34D'
    : '#92400E';

  const iconName = isReconnected ? 'checkmark-circle' : 'cloud-offline';

  const textLabel = isReconnected
    ? 'Back Online'
    : pendingSyncCount > 0
    ? `Offline • ${pendingSyncCount} queued`
    : 'Offline Mode';

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrapper,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <View style={[styles.pill, { backgroundColor: bgColor, borderColor }]}>
        <Ionicons name={iconName} size={11.5} color={textColor} style={styles.icon} />
        <Text style={[styles.text, { color: textColor }]}>{textLabel}</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    zIndex: 999,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 3,
    paddingHorizontal: 9,
    borderRadius: 12,
    borderWidth: 0.8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

export default OfflineBanner;
