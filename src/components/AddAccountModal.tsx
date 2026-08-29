import React, { useState, useMemo } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AccountType } from '../types/ledger';
import { useLedger } from '../context/LedgerContext';
import { useTheme } from '../context/ThemeContext';
import { validateAccount, normalizePhoneNumber } from '../utils/validation';

interface AddAccountModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AddAccountModal: React.FC<AddAccountModalProps> = ({ visible, onClose }) => {
  const { theme } = useTheme();
  const { accounts, addAccount } = useLedger();

  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('agent');
  const [accountNumber, setAccountNumber] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [dailyLimit, setDailyLimit] = useState('300000');
  const [isActive, setIsActive] = useState(true);
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollViewRef = React.useRef<ScrollView>(null);

  const accountTypes: { type: AccountType; label: string; icon: string; color: string }[] = [
    { type: 'agent', label: 'Agent SIM', icon: 'phone-portrait-outline', color: '#E2136E' },
    { type: 'merchant', label: 'Merchant QR', icon: 'qr-code-outline', color: '#BE123C' },
    { type: 'personal', label: 'Personal', icon: 'person-circle-outline', color: '#9D174D' },
    { type: 'corporate', label: 'Corporate B2B', icon: 'business-outline', color: '#831843' },
  ];

  // Real-time validation computation
  const validation = useMemo(() => {
    return validateAccount(name, accountNumber, initialBalance, dailyLimit, accounts);
  }, [name, accountNumber, initialBalance, dailyLimit, accounts]);

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSave = async () => {
    // Mark all touched to display inline red borders & error messages
    setTouched({
      name: true,
      accountNumber: true,
      initialBalance: true,
      dailyLimit: true,
    });

    if (!validation.isValid) {
      // Auto-scroll to top so user sees the inline red fields immediately
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    const numBalance = parseFloat(initialBalance.trim().replace(/[^0-9.]/g, '')) || 0;
    const numLimit = parseFloat(dailyLimit.trim().replace(/[^0-9.]/g, '')) || 300000;
    const cleanNumber = normalizePhoneNumber(accountNumber.trim());

    setIsSubmitting(true);
    try {
      await addAccount({
        name: name.trim(),
        type: accountType,
        accountNumber: cleanNumber,
        balance: numBalance,
        dailyLimit: numLimit,
        isActive,
      });

      // Reset
      setName('');
      setAccountNumber('');
      setInitialBalance('');
      setDailyLimit('300000');
      setTouched({});
      onClose();
    } catch (e) {
      console.error('Error adding account:', e);
      Alert.alert('Error', 'Failed to add bKash account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Add bKash Line</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView ref={scrollViewRef} style={styles.formScroll} showsVerticalScrollIndicator={false}>
            {/* Account Type Selector */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>BKASH LINE TYPE</Text>
                <View style={styles.requiredBadge}>
                  <Text style={styles.requiredText}>* Required</Text>
                </View>
              </View>
              <View style={styles.providerGrid}>
                {accountTypes.map((item) => {
                  const isSelected = accountType === item.type;
                  return (
                    <TouchableOpacity
                      key={item.type}
                      style={[
                        styles.providerCard,
                        {
                          backgroundColor: isSelected ? item.color + '18' : theme.cardSecondary,
                          borderColor: isSelected ? item.color : theme.border,
                        },
                      ]}
                      onPress={() => setAccountType(item.type)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={item.icon as any}
                        size={20}
                        color={isSelected ? item.color : theme.textSecondary}
                      />
                      <Text
                        style={[
                          styles.providerLabel,
                          { color: isSelected ? item.color : theme.text },
                        ]}
                        numberOfLines={1}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Name Input with Validation */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>LINE LABEL / NAME</Text>
                <View style={styles.requiredBadge}>
                  <Text style={styles.requiredText}>* Required</Text>
                </View>
              </View>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: theme.inputBg,
                    borderColor:
                      touched.name && validation.errors.name
                        ? theme.danger
                        : theme.border,
                  },
                ]}
              >
                <Ionicons name="bookmark-outline" size={18} color={theme.textMuted} />
                <TextInput
                  style={[styles.inputField, { color: theme.text }]}
                  placeholder="e.g. Counter 1 - Agent SIM"
                  placeholderTextColor={theme.textMuted}
                  maxLength={40}
                  value={name}
                  onChangeText={(val) => {
                    setName(val);
                    if (!touched.name) setTouched((prev) => ({ ...prev, name: true }));
                  }}
                  onBlur={() => handleBlur('name')}
                />
              </View>
              {touched.name && validation.errors.name && (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle" size={14} color={theme.danger} />
                  <Text style={[styles.errorText, { color: theme.danger }]}>
                    {validation.errors.name}
                  </Text>
                </View>
              )}
            </View>

            {/* Account / Phone Number with Validation */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                  PHONE / ACCOUNT NUMBER
                </Text>
                <View style={styles.requiredBadge}>
                  <Text style={styles.requiredText}>* Required</Text>
                </View>
              </View>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: theme.inputBg,
                    borderColor:
                      touched.accountNumber && validation.errors.accountNumber
                        ? theme.danger
                        : theme.border,
                  },
                ]}
              >
                <Ionicons name="call-outline" size={18} color={theme.textMuted} />
                <TextInput
                  style={[styles.inputField, { color: theme.text }]}
                  placeholder="e.g. 01716553880"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="phone-pad"
                  maxLength={14}
                  value={accountNumber}
                  onChangeText={(val) => {
                    setAccountNumber(val);
                    if (!touched.accountNumber) setTouched((prev) => ({ ...prev, accountNumber: true }));
                  }}
                  onBlur={() => handleBlur('accountNumber')}
                />
              </View>
              {touched.accountNumber && validation.errors.accountNumber && (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle" size={14} color={theme.danger} />
                  <Text style={[styles.errorText, { color: theme.danger }]}>
                    {validation.errors.accountNumber}
                  </Text>
                </View>
              )}
            </View>

            {/* Initial Balance with Validation (Optional, allows 0) */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                  INITIAL BALANCE (৳)
                </Text>
                <View style={styles.optionalBadge}>
                  <Text style={[styles.optionalText, { color: theme.textMuted }]}>Optional (Can be ৳0)</Text>
                </View>
              </View>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: theme.inputBg,
                    borderColor:
                      touched.initialBalance && validation.errors.initialBalance
                        ? theme.danger
                        : theme.border,
                  },
                ]}
              >
                <Text style={[styles.currencyPrefix, { color: theme.primary }]}>৳</Text>
                <TextInput
                  style={[styles.inputField, { color: theme.text, fontSize: 18, fontWeight: '700' }]}
                  placeholder="0.00"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="numeric"
                  value={initialBalance}
                  onChangeText={(val) => {
                    setInitialBalance(val);
                    if (!touched.initialBalance) setTouched((prev) => ({ ...prev, initialBalance: true }));
                  }}
                  onBlur={() => handleBlur('initialBalance')}
                />
              </View>
              {touched.initialBalance && validation.errors.initialBalance && (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle" size={14} color={theme.danger} />
                  <Text style={[styles.errorText, { color: theme.danger }]}>
                    {validation.errors.initialBalance}
                  </Text>
                </View>
              )}
            </View>

            {/* Daily Send Limit with Validation */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                  DAILY SEND LIMIT (৳)
                </Text>
                <View style={styles.requiredBadge}>
                  <Text style={styles.requiredText}>* Required</Text>
                </View>
              </View>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: theme.inputBg,
                    borderColor:
                      touched.dailyLimit && validation.errors.dailyLimit
                        ? theme.danger
                        : theme.border,
                  },
                ]}
              >
                <Text style={[styles.currencyPrefix, { color: theme.warning }]}>৳</Text>
                <TextInput
                  style={[styles.inputField, { color: theme.text, fontSize: 18, fontWeight: '700' }]}
                  placeholder="300000"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="numeric"
                  value={dailyLimit}
                  onChangeText={(val) => {
                    setDailyLimit(val);
                    if (!touched.dailyLimit) setTouched((prev) => ({ ...prev, dailyLimit: true }));
                  }}
                  onBlur={() => handleBlur('dailyLimit')}
                />
              </View>
              {touched.dailyLimit && validation.errors.dailyLimit && (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle" size={14} color={theme.danger} />
                  <Text style={[styles.errorText, { color: theme.danger }]}>
                    {validation.errors.dailyLimit}
                  </Text>
                </View>
              )}
            </View>

            {/* Active Toggle */}
            <View style={styles.toggleRow}>
              <View>
                <Text style={[styles.toggleTitle, { color: theme.text }]}>Line Status</Text>
                <Text style={[styles.toggleSubtitle, { color: theme.textSecondary }]}>
                  Enable to allow sending and logging on this SIM
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.toggleBadge,
                  { backgroundColor: isActive ? theme.successLight : theme.cardSecondary },
                ]}
                onPress={() => setIsActive(!isActive)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.toggleDot,
                    { backgroundColor: isActive ? theme.success : theme.textMuted },
                  ]}
                />
                <Text
                  style={[
                    styles.toggleBadgeText,
                    { color: isActive ? theme.success : theme.textSecondary },
                  ]}
                >
                  {isActive ? 'ACTIVE' : 'DISABLED'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: theme.border }]}
              onPress={onClose}
              disabled={isSubmitting}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>

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
              activeOpacity={0.8}
            >
              <Text style={styles.saveBtnText}>
                {isSubmitting ? 'Saving...' : 'Save bKash Line'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    maxHeight: '90%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  formScroll: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  requiredBadge: {
    backgroundColor: 'rgba(225, 29, 72, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  requiredText: {
    color: '#E11D48',
    fontSize: 10,
    fontWeight: '800',
  },
  optionalBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  optionalText: {
    fontSize: 10,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  providerGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  providerCard: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  providerLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  currencyPrefix: {
    fontSize: 18,
    fontWeight: '800',
  },
  inputField: {
    flex: 1,
    padding: 0,
    fontSize: 14,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 2,
  },
  errorText: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 10,
  },
  toggleTitle: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  toggleSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  toggleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  toggleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  toggleBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  saveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
});
