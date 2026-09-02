import React, { useState, useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'primary';
  isDestructive?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const ConfirmationModalComponent: React.FC<ConfirmationModalProps> = ({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger',
  isDestructive,
  icon,
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  const { theme, isDarkMode } = useTheme();
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const [shouldRender, setShouldRender] = useState(visible);

  const effectiveType = isDestructive ? 'danger' : type;

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 140,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 120,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.85,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          setShouldRender(false);
        }
      });
    }
  }, [visible]);

  if (!shouldRender) return null;

  const getThemeColors = () => {
    switch (effectiveType) {
      case 'danger':
        return {
          icon: icon || 'trash-outline',
          iconColor: '#EF4444',
          iconBg: isDarkMode ? 'rgba(239, 68, 68, 0.2)' : '#FEE2E2',
          btnBg: '#EF4444',
          btnText: '#FFFFFF',
        };
      case 'warning':
        return {
          icon: icon || 'alert-circle-outline',
          iconColor: '#F59E0B',
          iconBg: isDarkMode ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7',
          btnBg: '#F59E0B',
          btnText: '#FFFFFF',
        };
      case 'primary':
      case 'info':
      default:
        return {
          icon: icon || 'information-circle-outline',
          iconColor: theme.primary,
          iconBg: isDarkMode ? 'rgba(26, 115, 232, 0.2)' : theme.primaryLight,
          btnBg: theme.primary,
          btnText: '#FFFFFF',
        };
    }
  };

  const colors = getThemeColors();

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onCancel} statusBarTranslucent>
      <TouchableWithoutFeedback onPress={onCancel}>
        <Animated.View
          style={[
            styles.overlay,
            {
              opacity: opacityAnim,
              backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.7)' : 'rgba(15, 23, 42, 0.5)',
            },
          ]}
        >
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.modalCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  opacity: opacityAnim,
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              {/* Icon Badge */}
              <View style={[styles.iconCircle, { backgroundColor: colors.iconBg }]}>
                <Ionicons name={colors.icon as any} size={28} color={colors.iconColor} />
              </View>

              {/* Title & Message */}
              <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>
                {title}
              </Text>
              <Text style={[styles.message, { color: theme.textSecondary }]}>{message}</Text>

              {/* Action Buttons */}
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.cancelButton,
                    {
                      backgroundColor: theme.cardSecondary,
                      borderColor: theme.border,
                    },
                  ]}
                  onPress={onCancel}
                  activeOpacity={0.75}
                  disabled={isLoading}
                >
                  <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>{cancelText}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.confirmButton,
                    {
                      backgroundColor: colors.btnBg,
                      opacity: isLoading ? 0.7 : 1,
                    },
                  ]}
                  onPress={onConfirm}
                  activeOpacity={0.8}
                  disabled={isLoading}
                >
                  <Text style={[styles.confirmButtonText, { color: colors.btnText }]}>
                    {isLoading ? 'Processing...' : confirmText}
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export const ConfirmationModal = React.memo(ConfirmationModalComponent);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 22,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.2,
  },
  message: {
    fontSize: 13.5,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 22,
    paddingHorizontal: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  confirmButton: {},
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
