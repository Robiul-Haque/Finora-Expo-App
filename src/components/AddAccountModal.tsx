import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLedger } from '../context/LedgerContext';
import { useTheme } from '../context/ThemeContext';
import { validateAccount, normalizePhoneNumber } from '../utils/validation';

interface AddAccountModalProps {
  visible: boolean;
  onClose: () => void;
}

const AddAccountModalComponent: React.FC<AddAccountModalProps> = ({ visible, onClose }) => {
  const { theme } = useTheme();
  const { accounts, addAccount } = useLedger();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [dailyLimit, setDailyLimit] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [accountLabel, setAccountLabel] = useState('');
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollViewRef = React.useRef<ScrollView>(null);

  const phoneRef = useRef<TextInput>(null);
  const dailyLimitRef = useRef<TextInput>(null);
  const openingBalanceRef = useRef<TextInput>(null);
  const accountLabelRef = useRef<TextInput>(null);

  const slideAnim = useRef(new Animated.Value(400)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(400);
      fadeAnim.setValue(0);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 400,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setPhoneNumber('');
      setDailyLimit('');
      setOpeningBalance('');
      setAccountLabel('');
      setTouched({});
      onClose();
    });
  };

  // Real-time validation computation
  const validation = useMemo(() => {
    return validateAccount(accountLabel || phoneNumber, phoneNumber, openingBalance, dailyLimit, accounts);
  }, [accountLabel, phoneNumber, openingBalance, dailyLimit, accounts]);

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSave = async () => {
    setTouched({
      phoneNumber: true,
      dailyLimit: true,
      openingBalance: true,
    });

    if (!phoneNumber.trim()) {
      return;
    }

    const numBalance = parseFloat(openingBalance.trim().replace(/[^0-9.]/g, '')) || 0;
    const numLimit = parseFloat(dailyLimit.trim().replace(/[^0-9.]/g, '')) || 300000;
    const cleanNumber = normalizePhoneNumber(phoneNumber.trim());

    setIsSubmitting(true);
    try {
      await addAccount({
        name: (accountLabel.trim() || cleanNumber),
        type: 'agent',
        accountNumber: cleanNumber,
        balance: numBalance,
        monthlyLimit: numLimit,
        monthlyLimitUsed: 0,
        remainingLimit: numLimit,
        dailyLimit: numLimit,
        isActive: true,
      });

      // Reset
      setPhoneNumber('');
      setDailyLimit('');
      setOpeningBalance('');
      setAccountLabel('');
      setTouched({});
      onClose();
    } catch {
      // Inline state fallback
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="none" transparent statusBarTranslucent onRequestClose={handleClose}>
      <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ width: '100%', justifyContent: 'flex-end', flex: 1 }}
        >
          <Animated.View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border, transform: [{ translateY: slideAnim }] }]}>
            {/* Top Navigation Header */}
            <View style={[styles.modalHeader, { borderBottomColor: theme.divider }]}>
              <TouchableOpacity
                onPress={handleClose}
                style={styles.backBtn}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="arrow-back" size={20} color={theme.text} />
              </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Add bKash Number</Text>
            <View style={styles.placeholderBack} />
          </View>

          <ScrollView
            ref={scrollViewRef}
            style={styles.formScroll}
            contentContainerStyle={styles.formScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            bounces={false}
          >
            {/* Field 1: Phone Number */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Phone Number</Text>
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => phoneRef.current?.focus()}
                style={[
                  styles.inputBox,
                  {
                    backgroundColor: theme.inputBg,
                    borderColor: touched.phoneNumber && !phoneNumber.trim() ? theme.danger : theme.border,
                  },
                ]}
              >
                <Ionicons name="phone-portrait-outline" size={18} color={theme.textMuted} style={styles.inputIcon} />
                <TextInput
                  ref={phoneRef}
                  style={[styles.inputField, { color: theme.text }]}
                  placeholder="e.g. 01716 553 880"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="phone-pad"
                  maxLength={16}
                  value={phoneNumber}
                  onChangeText={(val) => {
                    setPhoneNumber(val);
                    if (!touched.phoneNumber) setTouched((prev) => ({ ...prev, phoneNumber: true }));
                  }}
                  onBlur={() => handleBlur('phoneNumber')}
                />
              </TouchableOpacity>
              {touched.phoneNumber && !phoneNumber.trim() && (
                <Text style={[styles.inlineWarning, { color: theme.danger }]}>
                  Please enter a valid bKash number
                </Text>
              )}
            </View>

            {/* Field 2: Daily Send Limit */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Daily Send Limit</Text>
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => dailyLimitRef.current?.focus()}
                style={[styles.inputBox, { backgroundColor: theme.inputBg, borderColor: theme.border }]}
              >
                <Text style={[styles.currencyPrefix, { color: theme.textSecondary }]}>৳</Text>
                <TextInput
                  ref={dailyLimitRef}
                  style={[styles.inputFieldRight, { color: theme.text }]}
                  placeholder="300,000"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="numeric"
                  value={dailyLimit}
                  onChangeText={setDailyLimit}
                  onBlur={() => handleBlur('dailyLimit')}
                />
              </TouchableOpacity>
            </View>

            {/* Field 3: Opening Balance */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Opening Balance</Text>
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => openingBalanceRef.current?.focus()}
                style={[styles.inputBox, { backgroundColor: theme.inputBg, borderColor: theme.border }]}
              >
                <Text style={[styles.currencyPrefix, { color: theme.textSecondary }]}>৳</Text>
                <TextInput
                  ref={openingBalanceRef}
                  style={[styles.inputFieldRight, { color: theme.text }]}
                  placeholder="25,000"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="numeric"
                  value={openingBalance}
                  onChangeText={setOpeningBalance}
                  onBlur={() => handleBlur('openingBalance')}
                />
              </TouchableOpacity>
            </View>

            {/* Field 4: Account Label (Optional) */}
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Account Label (Optional)</Text>
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => accountLabelRef.current?.focus()}
                style={[styles.inputBox, { backgroundColor: theme.inputBg, borderColor: theme.border }]}
              >
                <Ionicons name="bookmark-outline" size={18} color={theme.textMuted} style={styles.inputIcon} />
                <TextInput
                  ref={accountLabelRef}
                  style={[styles.inputField, { color: theme.text }]}
                  placeholder="e.g. Personal, Shop 1"
                  placeholderTextColor={theme.textMuted}
                  value={accountLabel}
                  onChangeText={setAccountLabel}
                />
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Bottom Stacked Actions */}
          <View style={[styles.footerActions, { backgroundColor: theme.card }]}>
            <TouchableOpacity
              style={[
                styles.saveBtn,
                {
                  backgroundColor: theme.primary,
                  opacity: isSubmitting ? 0.7 : 1,
                },
              ]}
              onPress={handleSave}
              disabled={isSubmitting}
              activeOpacity={0.92}
            >
              <Text style={styles.saveBtnText}>
                {isSubmitting ? 'Saving...' : 'Save Number'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: theme.primary }]}
              onPress={onClose}
              disabled={isSubmitting}
              activeOpacity={0.75}
            >
              <Text style={[styles.cancelBtnText, { color: theme.primary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
};

export const AddAccountModal = React.memo(AddAccountModalComponent);

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    maxHeight: '90%',
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderBack: {
    width: 32,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  formScroll: {
    paddingHorizontal: 16,
  },
  formScrollContent: {
    paddingTop: 16,
    paddingBottom: 16,
    gap: 16,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: '500',
  },
  inputBox: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  currencyPrefix: {
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  inputField: {
    flex: 1,
    height: '100%',
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  inputFieldRight: {
    flex: 1,
    height: '100%',
    fontSize: 14.5,
    fontWeight: '600',
    textAlign: 'right',
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  footerActions: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 28,
    gap: 10,
  },
  saveBtn: {
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '700',
  },
  cancelBtn: {
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  cancelBtnText: {
    fontSize: 14.5,
    fontWeight: '700',
  },
  inlineWarning: {
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 4,
    paddingLeft: 2,
  },
});