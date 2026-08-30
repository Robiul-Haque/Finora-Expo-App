import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TransactionType } from '../types/ledger';
import { useLedger } from '../context/LedgerContext';
import { useTheme } from '../context/ThemeContext';
import { validateTransaction, normalizePhoneNumber } from '../utils/validation';

interface AddTransactionModalProps {
  visible: boolean;
  onClose: () => void;
  preselectedAccountId?: string;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({ visible, onClose, preselectedAccountId }) => {
  const { theme } = useTheme();
  const { accounts, addTransaction } = useLedger();

  const [accountId, setAccountId] = useState(preselectedAccountId || (accounts.length > 0 ? accounts[0].id : ''));
  const [type, setType] = useState<TransactionType>('cash_out');
  const [amount, setAmount] = useState('');
  const [targetNumber, setTargetNumber] = useState('');
  const [cost, setCost] = useState('');
  const [profit, setProfit] = useState('');
  const [note, setNote] = useState('');
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollViewRef = React.useRef<ScrollView>(null);

  // Sync if preselectedAccountId changes
  React.useEffect(() => {
    if (preselectedAccountId) {
      setAccountId(preselectedAccountId);
    } else if (accounts.length > 0 && !accountId) {
      setAccountId(accounts[0].id);
    }
  }, [preselectedAccountId, accounts]);

  const selectedAccount = accounts.find((a) => a.id === accountId) || accounts[0];

  // Real-time validation computation
  const validation = useMemo(() => {
    return validateTransaction(selectedAccount, type, amount, targetNumber, cost, profit);
  }, [selectedAccount, type, amount, targetNumber, cost, profit]);

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSave = async () => {
    // Mark all as touched to display inline errors on invalid fields
    setTouched({
      amount: true,
      targetNumber: true,
      cost: true,
      profit: true,
    });

    if (!validation.isValid) {
      // Auto-scroll to top so user sees the inline red fields immediately
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      return;
    }

    const numAmount = parseFloat(amount.trim().replace(/[^0-9.]/g, '')) || 0;
    const numCost = parseFloat(cost.trim().replace(/[^0-9.]/g, '')) || 0;
    const numProfit = parseFloat(profit.trim().replace(/[^0-9.]/g, '')) || 0;
    const cleanTargetNumber = normalizePhoneNumber(targetNumber.trim());

    setIsSubmitting(true);
    try {
      await addTransaction({
        accountId: selectedAccount.id,
        accountNumber: selectedAccount.accountNumber,
        accountName: selectedAccount.name,
        type,
        amount: numAmount,
        recipientNumber: (type === 'send_money' || type === 'cash_out' || type === 'b2b') ? cleanTargetNumber : undefined,
        senderNumber: (type === 'receive_money' || type === 'cash_in') ? cleanTargetNumber : undefined,
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
      setTouched({});
      onClose();
    } catch {
      Alert.alert('Error', 'Could not save transaction. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSend = type === 'send_money' || type === 'cash_out' || type === 'b2b';

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
              <TouchableOpacity onPress={onClose} style={styles.backBtn} activeOpacity={0.7}>
                <Ionicons name="arrow-back" size={22} color={theme.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Add bKash Entry</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView ref={scrollViewRef} style={styles.formScroll} showsVerticalScrollIndicator={false}>
            {/* Account Selector */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                  SOURCE BKASH NUMBER
                </Text>
                <View style={styles.requiredBadge}>
                  <Text style={styles.requiredText}>* Required</Text>
                </View>
              </View>

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
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={acc.type === 'merchant' ? 'qr-code-outline' : 'phone-portrait-outline'}
                        size={16}
                        color={isSelected ? theme.primary : theme.textSecondary}
                      />
                      <View style={{ flexShrink: 1 }}>
                        <Text
                          style={[
                            styles.accountPillName,
                            { color: isSelected ? theme.primary : theme.text },
                          ]}
                          numberOfLines={1}
                        >
                          {acc.name}
                        </Text>
                        <Text style={[styles.accountPillNumber, { color: theme.textSecondary }]} numberOfLines={1}>
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
              <View style={styles.labelRow}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                  BKASH TRANSACTION TYPE
                </Text>
                <View style={styles.requiredBadge}>
                  <Text style={styles.requiredText}>* Required</Text>
                </View>
              </View>

              <View style={[styles.typeSegment, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}>
                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    (type === 'cash_out' || type === 'send_money') && { backgroundColor: theme.danger, borderRadius: 10 },
                  ]}
                  onPress={() => setType('cash_out')}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.typeOptionText,
                      { color: (type === 'cash_out' || type === 'send_money') ? '#FFFFFF' : theme.textSecondary },
                    ]}
                  >
                    Cash Out
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    (type === 'receive_money' || type === 'cash_in') && { backgroundColor: theme.success, borderRadius: 10 },
                  ]}
                  onPress={() => setType('receive_money')}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.typeOptionText,
                      { color: (type === 'receive_money' || type === 'cash_in') ? '#FFFFFF' : theme.textSecondary },
                    ]}
                  >
                    Cash In
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    type === 'b2b' && { backgroundColor: theme.primary, borderRadius: 10 },
                  ]}
                  onPress={() => setType('b2b')}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.typeOptionText,
                      { color: type === 'b2b' ? '#FFFFFF' : theme.textSecondary },
                    ]}
                  >
                    B2B Float
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    type === 'adjustment' && { backgroundColor: '#64748B', borderRadius: 10 },
                  ]}
                  onPress={() => setType('adjustment')}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.typeOptionText,
                      { color: type === 'adjustment' ? '#FFFFFF' : theme.textSecondary },
                    ]}
                  >
                    Adjust
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Amount Input (Allows 0 and above) */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <View style={styles.labelWithBadge}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>AMOUNT (৳)</Text>
                  <View style={styles.requiredBadge}>
                    <Text style={styles.requiredText}>* Required</Text>
                  </View>
                </View>
                {selectedAccount && isSend && (
                  <Text style={[styles.balanceHint, { color: theme.textSecondary }]}>
                    Avail: ৳{selectedAccount.balance.toLocaleString()}
                  </Text>
                )}
              </View>

              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: theme.inputBg,
                    borderColor:
                      touched.amount && validation.errors.amount
                        ? theme.danger
                        : theme.border,
                  },
                ]}
              >
                <Text style={[styles.currencyPrefix, { color: theme.primary }]}>৳</Text>
                <TextInput
                  style={[styles.inputField, { color: theme.text, fontSize: 20, fontWeight: '700' }]}
                  placeholder="0.00"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={(val) => {
                    setAmount(val);
                    if (!touched.amount) setTouched((prev) => ({ ...prev, amount: true }));
                  }}
                  onBlur={() => handleBlur('amount')}
                />
              </View>

              {/* Error Message */}
              {touched.amount && validation.errors.amount && (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle" size={14} color={theme.danger} />
                  <Text style={[styles.errorText, { color: theme.danger }]}>
                    {validation.errors.amount}
                  </Text>
                </View>
              )}

              {/* Warning Message */}
              {!validation.errors.amount && validation.warnings?.amount && (
                <View style={styles.warningRow}>
                  <Ionicons name="warning" size={14} color={theme.warning} />
                  <Text style={[styles.warningText, { color: theme.warning }]}>
                    {validation.warnings.amount}
                  </Text>
                </View>
              )}
            </View>

            {/* Recipient / Sender Number */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                  {isSend ? 'RECIPIENT BKASH NUMBER' : 'SENDER BKASH NUMBER'}
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
                      touched.targetNumber && validation.errors.targetNumber
                        ? theme.danger
                        : theme.border,
                  },
                ]}
              >
                <Ionicons name="call-outline" size={18} color={theme.textMuted} />
                <TextInput
                  style={[styles.inputField, { color: theme.text }]}
                  placeholder={isSend ? 'e.g. 01712345678' : 'e.g. 01888111222'}
                  placeholderTextColor={theme.textMuted}
                  keyboardType="phone-pad"
                  maxLength={14}
                  value={targetNumber}
                  onChangeText={(val) => {
                    setTargetNumber(val);
                    if (!touched.targetNumber) setTouched((prev) => ({ ...prev, targetNumber: true }));
                  }}
                  onBlur={() => handleBlur('targetNumber')}
                />
              </View>

              {touched.targetNumber && validation.errors.targetNumber && (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle" size={14} color={theme.danger} />
                  <Text style={[styles.errorText, { color: theme.danger }]}>
                    {validation.errors.targetNumber}
                  </Text>
                </View>
              )}
            </View>

            {/* 2-Column Grid: Send Cost & Profit */}
            <View style={styles.rowGrid}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <View style={styles.labelRow}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                    {isSend ? 'FEE' : 'COST'} (৳)
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
                        touched.cost && validation.errors.cost
                          ? theme.danger
                          : theme.border,
                    },
                  ]}
                >
                  <Text style={[styles.currencyPrefixSmall, { color: theme.danger }]}>৳</Text>
                  <TextInput
                    style={[styles.inputField, { color: theme.text }]}
                    placeholder="0"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                    value={cost}
                    onChangeText={(val) => {
                      setCost(val);
                      if (!touched.cost) setTouched((prev) => ({ ...prev, cost: true }));
                    }}
                    onBlur={() => handleBlur('cost')}
                  />
                </View>
                {touched.cost && validation.errors.cost && (
                  <View style={styles.errorRow}>
                    <Ionicons name="alert-circle" size={12} color={theme.danger} />
                    <Text style={[styles.errorText, { color: theme.danger }]}>
                      {validation.errors.cost}
                    </Text>
                  </View>
                )}
              </View>

              <View style={[styles.inputGroup, { flex: 1 }]}>
                <View style={styles.labelRow}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>COMMISSION (৳)</Text>
                  <View style={styles.optionalBadge}>
                    <Text style={[styles.optionalText, { color: theme.textMuted }]}>Optional</Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.inputWrapper,
                    {
                      backgroundColor: theme.inputBg,
                      borderColor:
                        touched.profit && validation.errors.profit
                          ? theme.danger
                          : theme.border,
                    },
                  ]}
                >
                  <Text style={[styles.currencyPrefixSmall, { color: theme.success }]}>৳</Text>
                  <TextInput
                    style={[styles.inputField, { color: theme.text }]}
                    placeholder="0"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                    value={profit}
                    onChangeText={(val) => {
                      setProfit(val);
                      if (!touched.profit) setTouched((prev) => ({ ...prev, profit: true }));
                    }}
                    onBlur={() => handleBlur('profit')}
                  />
                </View>
                {touched.profit && validation.errors.profit && (
                  <View style={styles.errorRow}>
                    <Ionicons name="alert-circle" size={12} color={theme.danger} />
                    <Text style={[styles.errorText, { color: theme.danger }]}>
                      {validation.errors.profit}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Note Optional */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>
                  NOTE (DETAILS)
                </Text>
                <View style={styles.optionalBadge}>
                  <Text style={[styles.optionalText, { color: theme.textMuted }]}>Optional</Text>
                </View>
              </View>
              <View style={[styles.inputWrapper, { backgroundColor: theme.inputBg, borderColor: theme.border }]}>
                <Ionicons name="document-text-outline" size={18} color={theme.textMuted} />
                <TextInput
                  style={[styles.inputField, { color: theme.text }]}
                  placeholder="e.g. Retail purchase settlement"
                  placeholderTextColor={theme.textMuted}
                  maxLength={100}
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
                {isSubmitting ? 'Recording...' : 'Record bKash Entry'}
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
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  labelWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  balanceHint: {
    fontSize: 11,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
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
    fontWeight: '900',
  },
  currencyPrefixSmall: {
    fontSize: 15,
    fontWeight: '800',
  },
  inputField: {
    flex: 1,
    padding: 0,
    fontSize: 14,
  },
  rowGrid: {
    flexDirection: 'row',
    gap: 12,
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
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    paddingHorizontal: 2,
  },
  warningText: {
    fontSize: 11.5,
    fontWeight: '600',
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