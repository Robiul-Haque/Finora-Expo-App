import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useToastStore, ToastType } from '../store/useToastStore';
import { useTheme } from '../context/ThemeContext';

export const UserFriendlyToast: React.FC = () => {
  const insets = useSafeAreaInsets();
  const { theme, isDarkMode } = useTheme();
  const currentToast = useToastStore((state) => state.currentToast);
  const hideToast = useToastStore((state) => state.hideToast);

  const translateY = useRef(new Animated.Value(-60)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (currentToast) {
      // Animate In
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 18,
          stiffness: 140,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto-hide
      timerRef.current = setTimeout(() => {
        dismiss();
      }, currentToast.duration || 3500);
    } else {
      translateY.setValue(-60);
      opacity.setValue(0);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentToast?.id]);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -60,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      hideToast();
    });
  };

  if (!currentToast) return null;

  const getTypeStyle = (type: ToastType) => {
    switch (type) {
      case 'warning':
        return {
          icon: 'warning-outline' as const,
          iconColor: '#D97706',
          borderColor: isDarkMode ? '#78350F' : '#FDE68A',
          bgColor: isDarkMode ? '#291805' : '#FFFBEB',
          textColor: isDarkMode ? '#FDE68A' : '#92400E',
        };
      case 'error':
        return {
          icon: 'alert-circle-outline' as const,
          iconColor: '#DC2626',
          borderColor: isDarkMode ? '#7F1D1D' : '#FECACA',
          bgColor: isDarkMode ? '#270808' : '#FEF2F2',
          textColor: isDarkMode ? '#FECACA' : '#991B1B',
        };
      case 'success':
        return {
          icon: 'checkmark-circle-outline' as const,
          iconColor: '#16A34A',
          borderColor: isDarkMode ? '#14532D' : '#BBF7D0',
          bgColor: isDarkMode ? '#052312' : '#F0FDF4',
          textColor: isDarkMode ? '#BBF7D0' : '#166534',
        };
      default:
        return {
          icon: 'information-circle-outline' as const,
          iconColor: theme.primary,
          borderColor: theme.border,
          bgColor: theme.cardSecondary,
          textColor: theme.text,
        };
    }
  };

  const styleConfig = getTypeStyle(currentToast.type);
  const topOffset = Math.max(insets.top + 8, Platform.OS === 'ios' ? 44 : 24);

  return (
    <Animated.View
      style={[
        styles.toastWrapper,
        {
          top: topOffset,
          opacity,
          transform: [{ translateY }],
        },
      ]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.toastBox,
          {
            backgroundColor: styleConfig.bgColor,
            borderColor: styleConfig.borderColor,
          },
        ]}
      >
        <Ionicons name={styleConfig.icon} size={20} color={styleConfig.iconColor} style={styles.toastIcon} />
        <Text style={[styles.toastText, { color: styleConfig.textColor }]} numberOfLines={3}>
          {currentToast.message}
        </Text>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={dismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={16} color={styleConfig.textColor} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toastWrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 99999,
    alignItems: 'center',
  },
  toastBox: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 560,
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 6,
    elevation: 8,
    gap: 10,
  },
  toastIcon: {
    flexShrink: 0,
  },
  toastText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  closeBtn: {
    padding: 2,
    flexShrink: 0,
  },
});
