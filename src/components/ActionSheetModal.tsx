import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export interface ActionSheetOption {
  id: string;
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconBgColor?: string;
  isDestructive?: boolean;
  badge?: {
    text: string;
    color: string;
    bg: string;
  };
  onPress: () => void;
}

interface ActionSheetModalProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  actions: ActionSheetOption[];
  onClose: () => void;
  cancelText?: string;
}

const ActionSheetModalComponent: React.FC<ActionSheetModalProps> = ({
  visible,
  title,
  subtitle,
  actions,
  onClose,
  cancelText = 'Cancel',
}) => {
  const { theme, isDarkMode } = useTheme();

  const isClosing = useRef(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(140)).current;

  useEffect(() => {
    if (visible) {
      isClosing.current = false;
      fadeAnim.setValue(0);
      slideAnim.setValue(140);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 20,
          mass: 0.8,
          stiffness: 240,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    if (isClosing.current) return;
    isClosing.current = true;
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 130,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 140,
        duration: 130,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const handleActionPress = (actionOnPress: () => void) => {
    handleClose();
    setTimeout(() => {
      actionOnPress();
    }, 130);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleClose}
        />
        <Animated.View
          style={[
            styles.sheetCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Top Handle */}
          <View style={styles.sheetHandle} />

          {/* Header */}
          <View style={[styles.sheetHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.sheetTitle, { color: theme.text }]}>{title}</Text>
            {!!subtitle && (
              <Text style={[styles.sheetSubtitle, { color: theme.textSecondary }]}>
                {subtitle}
              </Text>
            )}
          </View>

          {/* Actions List */}
          {actions.map((action, index) => {
            const isLast = index === actions.length - 1;
            const itemIconColor = action.iconColor || (action.isDestructive ? theme.danger : theme.primary);
            const itemIconBg =
              action.iconBgColor ||
              (action.isDestructive
                ? isDarkMode
                  ? 'rgba(255, 82, 82, 0.18)'
                  : '#FEE2E2'
                : isDarkMode
                ? 'rgba(26, 115, 232, 0.18)'
                : '#E8F0FE');

            return (
              <TouchableOpacity
                key={action.id}
                style={[
                  styles.optionItem,
                  { borderBottomColor: theme.border },
                  isLast && styles.optionItemLast,
                ]}
                onPress={() => handleActionPress(action.onPress)}
                activeOpacity={0.7}
              >
                <View style={[styles.optionIconContainer, { backgroundColor: itemIconBg }]}>
                  <Ionicons name={action.icon} size={22} color={itemIconColor} />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text
                    style={[
                      styles.optionTitle,
                      { color: action.isDestructive ? theme.danger : theme.text },
                    ]}
                  >
                    {action.title}
                  </Text>
                  {!!action.subtitle && (
                    <Text style={[styles.optionDescription, { color: theme.textMuted }]}>
                      {action.subtitle}
                    </Text>
                  )}
                </View>

                {action.badge && (
                  <View style={[styles.badge, { backgroundColor: action.badge.bg }]}>
                    <Text style={[styles.badgeText, { color: action.badge.color }]}>
                      {action.badge.text}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}

          {/* Cancel Button */}
          <TouchableOpacity
            style={[
              styles.cancelBtn,
              { backgroundColor: theme.cardSecondary, borderColor: theme.border },
            ]}
            onPress={handleClose}
            activeOpacity={0.8}
          >
            <Text style={[styles.cancelBtnText, { color: theme.text }]}>{cancelText}</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

export const ActionSheetModal = React.memo(ActionSheetModalComponent);

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 16,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128, 128, 128, 0.35)',
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeader: {
    paddingBottom: 14,
    borderBottomWidth: 1,
    marginBottom: 6,
    alignItems: 'center',
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  sheetSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 12,
  },
  optionItemLast: {
    borderBottomWidth: 0,
  },
  optionIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTextContainer: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  optionDescription: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cancelBtn: {
    marginTop: 14,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
