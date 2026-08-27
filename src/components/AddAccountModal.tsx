import React, { useState } from 'react';
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

interface AddAccountModalProps {
  visible: boolean;
  onClose: () => void;
}

export const AddAccountModal: React.FC<AddAccountModalProps> = ({ visible, onClose }) => {
  const { theme } = useTheme();
  const { addAccount } = useLedger();

  const [name, setName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('agent');
  const [accountNumber, setAccountNumber] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [dailyLimit, setDailyLimit] = useState('300000');
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const accountTypes: { type: AccountType; label: string; icon: string; color: string }[] = [
    { type: 'agent', label: 'Agent SIM', icon: 'phone-portrait-outline', color: '#E2136E' },
    { type: 'merchant', label: 'Merchant QR', icon: 'qr-code-outline', color: '#BE123C' },
    { type: 'personal', label: 'Personal', icon: 'person-circle-outline', color: '#9D174D' },
    { type: 'corporate', label: 'Corporate B2B', icon: 'business-outline', color: '#831843' },
  ];

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter an account name.');
      return;
    }
    if (!accountNumber.trim()) {
      Alert.alert('Validation Error', 'Please enter a bKash phone or SIM number.');
      return;
    }

    const numBalance = parseFloat(initialBalance.replace(/[^0-9.]/g, '')) || 0;
    const numLimit = parseFloat(dailyLimit.replace(/[^0-9.]/g, '')) || 300000;

    setIsSubmitting(true);
    try {
      await addAccount({
        name: name.trim(),
        type: accountType,
        accountNumber: accountNumber.trim(),
        balance: numBalance,
        dailyLimit: numLimit,
        isActive,
      });

      // Reset
      setName('');
      setAccountNumber('');
      setInitialBalance('');
      setDailyLimit('300000');
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
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
            {/* Account Type Selector */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>BKASH LINE TYPE</Text>
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

            {/* Name Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>LINE LABEL / NAME</Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                <Ionicons name="bookmark-outline" size={18} color={theme.textMuted} />
                <TextInput
                  style={[styles.inputField, { color: theme.text }]}
                  placeholder="e.g. Counter 1 - Agent SIM"
                  placeholderTextColor={theme.textMuted}
                  value={name}
                  onChangeText={setName}
                />
              </View>
            </View>

            {/* Account / Phone Number */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                PHONE / ACCOUNT NUMBER
              </Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                <Ionicons name="call-outline" size={18} color={theme.textMuted} />
                <TextInput
                  style={[styles.inputField, { color: theme.text }]}
                  placeholder="e.g. 01716 553 880"
                  placeholderTextColor={theme.textMuted}
                  value={accountNumber}
                  onChangeText={setAccountNumber}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            {/* Initial Balance */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                INITIAL BALANCE (৳)
              </Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                <Text style={[styles.currencyPrefix, { color: theme.primary }]}>৳</Text>
                <TextInput
                  style={[styles.inputField, { color: theme.text, fontSize: 18, fontWeight: '700' }]}
                  placeholder="0.00"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="numeric"
                  value={initialBalance}
                  onChangeText={setInitialBalance}
                />
              </View>
            </View>

            {/* Daily Send Limit */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                DAILY SEND LIMIT (৳)
              </Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                <Text style={[styles.currencyPrefix, { color: theme.warning }]}>৳</Text>
                <TextInput
                  style={[styles.inputField, { color: theme.text, fontSize: 18, fontWeight: '700' }]}
                  placeholder="300000"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="numeric"
                  value={dailyLimit}
                  onChangeText={setDailyLimit}
                />
              </View>
            </View>

            {/* Active Toggle */}
            <TouchableOpacity
              style={[styles.activeToggleRow, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}
              onPress={() => setIsActive(!isActive)}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={[styles.activeToggleTitle, { color: theme.text }]}>Active Status</Text>
                <Text style={[styles.activeToggleSubtitle, { color: theme.textSecondary }]}>
                  {isActive ? 'Line is active and included in float & limit totals' : 'Line is currently disabled'}
                </Text>
              </View>
              <Ionicons
                name={isActive ? 'checkbox' : 'square-outline'}
                size={24}
                color={isActive ? theme.primary : theme.textMuted}
              />
            </TouchableOpacity>
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
              style={[styles.saveBtn, { backgroundColor: theme.primary }]}
              onPress={handleSave}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              <Text style={styles.saveBtnText}>
                {isSubmitting ? 'Adding...' : 'Add bKash Line'}
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
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  providerGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  providerCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
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
    fontSize: 14,
    paddingVertical: 0,
  },
  activeToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  activeToggleTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  activeToggleSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
