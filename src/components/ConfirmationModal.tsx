import React, { useRef, useEffect } from 'react';
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

  const isClosing = useRef(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;

  useEffect(() => {
    if (visible) {
      isClosing.current = false;
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.92);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 170,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: 18,
          mass: 0.8,
          stiffness: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleCancel = () => {
    if (isClosing.current) return;
    isClosing.current = true;
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 120,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.94,
        duration: 120,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      onCancel();
    });
  };

  const effectiveType = isDestructive ? 'danger' : type;

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
    <Modal transparent visible={visible} animationType="none" onRequestClose={handleCancel} statusBarTranslucent>
      <TouchableWithoutFeedback onPress={handleCancel}>
        <Animated.View
          style={[
            styles.overlay,
            {
              opacity: fadeAnim,
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
                  onPress={handleCancel}
                  activeOpacity={0.7}
                  disabled={isLoading}
                >
                  <Text style={[styles.cancelButtonText, { color: theme.text }]}>{cancelText}</Text>
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
