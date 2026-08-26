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
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { TransactionType } from '../types/ledger';
import { useLedger } from '../context/LedgerContext';
import { useTheme } from '../context/ThemeContext';

interface AddTransactionModalProps {
  visible: boolean;
  onClose: () => void;
  preselectedAccountId?: string;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  visible,
  onClose,
  preselectedAccountId,
}) => {
  const { theme } = useTheme();
  const { accounts, addTransaction } = useLedger();

  const [accountId, setAccountId] = useState(
    preselectedAccountId || (accounts.length > 0 ? accounts[0].id : '')
  );
  const [type, setType] = useState<TransactionType>('send_money');
  const [amount, setAmount] = useState('');
  const [targetNumber, setTargetNumber] = useState('');
  const [cost, setCost] = useState('');
  const [profit, setProfit] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync if preselectedAccountId changes
  React.useEffect(() => {
    if (preselectedAccountId) {
      setAccountId(preselectedAccountId);
    } else if (accounts.length > 0 && !accountId) {
      setAccountId(accounts[0].id);
    }
  }, [preselectedAccountId, accounts]);

  const selectedAccount = accounts.find((a) => a.id === accountId) || accounts[0];

  const handleSave = async () => {
    const numAmount = parseFloat(amount.replace(/[^0-9.]/g, ''));
    if (isNaN(numAmount) || numAmount <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid transaction amount.');
      return;
    }

    if (!selectedAccount) {
      Alert.alert('Validation Error', 'Please select an account.');
      return;
    }

    const numCost = parseFloat(cost.replace(/[^0-9.]/g, '')) || 0;
    const numProfit = parseFloat(profit.replace(/[^0-9.]/g, '')) || 0;

    setIsSubmitting(true);
    try {
      await addTransaction({
        accountId: selectedAccount.id,
        accountNumber: selectedAccount.accountNumber,
        accountName: selectedAccount.name,
        type,
        amount: numAmount,
        recipientNumber: type === 'send_money' || type === 'cash_out' ? targetNumber.trim() : undefined,
        senderNumber: type === 'receive_money' ? targetNumber.trim() : undefined,
        cost: numCost,
        profit: numProfit,
        note: note.trim() || undefined,
      });

      // Reset form
      setAmount('');
      setTargetNumber('');
      setCost('');
      setProfit('');
      setNote('');
      onClose();
    } catch (e) {
      console.error('Error saving transaction:', e);
      Alert.alert('Error', 'Could not save transaction. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSend = type === 'send_money' || type === 'cash_out';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}
      >
        <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <TouchableOpacity onPress={onClose} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={22} color={theme.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Add Transaction</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
            {/* Account Selector */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                SOURCE ACCOUNT
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountSelectorRow}>
                {accounts.map((acc) => {
                  const isSelected = acc.id === accountId;
                  return (
                    <TouchableOpacity
                      key={acc.id}
                      style={[
                        styles.accountPill,
                        {
                          backgroundColor: isSelected ? theme.primaryLight : theme.cardSecondary,
                          borderColor: isSelected ? theme.primary : theme.border,
                        },
                      ]}
                      onPress={() => setAccountId(acc.id)}
                    >
                      <MaterialCommunityIcons
                        name={acc.type === 'bkash' ? 'cellphone-wireless' : 'wallet'}
                        size={16}
                        color={isSelected ? theme.primary : theme.textSecondary}
                      />
                      <View>
                        <Text
                          style={[
                            styles.accountPillName,
                            { color: isSelected ? theme.primary : theme.text },
                          ]}
                        >
                          {acc.name}
                        </Text>
                        <Text style={[styles.accountPillNumber, { color: theme.textSecondary }]}>
                          {acc.accountNumber} (৳{acc.balance.toLocaleString()})
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Transaction Type Segmented Toggle */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                TRANSACTION TYPE
              </Text>
              <View style={[styles.typeSegment, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}>
                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    type === 'send_money' && { backgroundColor: theme.danger, borderRadius: 10 },
                  ]}
                  onPress={() => setType('send_money')}
                >
                  <Text
                    style={[
                      styles.typeOptionText,
                      { color: type === 'send_money' ? '#FFFFFF' : theme.textSecondary },
                    ]}
                  >
                    Send Money
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    type === 'receive_money' && { backgroundColor: theme.success, borderRadius: 10 },
                  ]}
                  onPress={() => setType('receive_money')}
                >
                  <Text
                    style={[
                      styles.typeOptionText,
                      { color: type === 'receive_money' ? '#FFFFFF' : theme.textSecondary },
                    ]}
                  >
                    Receive Money
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    type === 'adjustment' && { backgroundColor: theme.primary, borderRadius: 10 },
                  ]}
                  onPress={() => setType('adjustment')}
                >
                  <Text
                    style={[
                      styles.typeOptionText,
                      { color: type === 'adjustment' ? '#FFFFFF' : theme.textSecondary },
                    ]}
                  >
                    Adjustment
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Amount Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>AMOUNT (৳)</Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                <Text style={[styles.currencyPrefix, { color: theme.primary }]}>৳</Text>
                <TextInput
                  style={[styles.inputField, { color: theme.text, fontSize: 20, fontWeight: '700' }]}
                  placeholder="0.00"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                />
              </View>
            </View>

            {/* Recipient / Sender Number */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                {isSend ? 'RECIPIENT NUMBER / NAME' : 'SENDER NUMBER / NAME'}
              </Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                <Ionicons name="call-outline" size={18} color={theme.textMuted} />
                <TextInput
                  style={[styles.inputField, { color: theme.text }]}
                  placeholder={isSend ? 'e.g. 01712 345 678 or Supplier' : 'e.g. 01888 111 222 or Customer'}
                  placeholderTextColor={theme.textMuted}
                  value={targetNumber}
                  onChangeText={setTargetNumber}
                />
              </View>
            </View>

            {/* 2-Column Grid: Send Cost & Profit */}
            <View style={styles.rowGrid}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                  {isSend ? 'SEND FEE / COST' : 'COST'} (৳)
                </Text>
                <View style={[styles.inputWrapper, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                  <Text style={[styles.currencyPrefixSmall, { color: theme.danger }]}>৳</Text>
                  <TextInput
                    style={[styles.inputField, { color: theme.text }]}
                    placeholder="0"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                    value={cost}
                    onChangeText={setCost}
                  />
                </View>
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>PROFIT (৳)</Text>
                <View style={[styles.inputWrapper, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                  <Text style={[styles.currencyPrefixSmall, { color: theme.success }]}>৳</Text>
                  <TextInput
                    style={[styles.inputField, { color: theme.text }]}
                    placeholder="0"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                    value={profit}
                    onChangeText={setProfit}
                  />
                </View>
              </View>
            </View>

            {/* Note Optional */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                NOTE (OPTIONAL)
              </Text>
              <View style={[styles.inputWrapper, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                <Ionicons name="document-text-outline" size={18} color={theme.textMuted} />
                <TextInput
                  style={[styles.inputField, { color: theme.text }]}
                  placeholder="e.g. Retail purchase settlement"
                  placeholderTextColor={theme.textMuted}
                  value={note}
                  onChangeText={setNote}
                />
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={[styles.footer, { borderTopColor: theme.border }]}>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: theme.border }]}
              onPress={onClose}
              disabled={isSubmitting}
            >
              <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: theme.primary }]}
              onPress={handleSave}
              disabled={isSubmitting}
            >
              <Text style={styles.saveBtnText}>
                {isSubmitting ? 'Saving...' : 'Save Transaction'}
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    padding: 2,
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
  accountSelectorRow: {
    flexDirection: 'row',
  },
  accountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginRight: 10,
  },
  accountPillName: {
    fontSize: 13,
    fontWeight: '700',
  },
  accountPillNumber: {
    fontSize: 11,
  },
  typeSegment: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeOptionText: {
    fontSize: 12,
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
    fontSize: 20,
    fontWeight: '800',
  },
  currencyPrefixSmall: {
    fontSize: 15,
    fontWeight: '700',
  },
  inputField: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 0,
  },
  rowGrid: {
    flexDirection: 'row',
    gap: 12,
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
