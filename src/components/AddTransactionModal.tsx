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
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TransactionType } from '../types/ledger';
import { useLedger } from '../context/LedgerContext';
import { useTheme } from '../context/ThemeContext';
import { validateTransaction } from '../utils/validation';
import { formatCurrency } from '../utils';

interface AddTransactionModalProps {
  visible: boolean;
  onClose: () => void;
  preselectedAccountId?: string;
}

const AddTransactionModalComponent: React.FC<AddTransactionModalProps> = ({
  visible,
  onClose,
  preselectedAccountId,
}) => {
  const { theme, isDarkMode } = useTheme();
  const { accounts, addTransaction } = useLedger();

  const [accountId, setAccountId] = useState(preselectedAccountId || (accounts.length > 0 ? accounts[0].id : ''));
  const [txType, setTxType] = useState<'send' | 'receive' | 'adjustment'>('send');
  const [amount, setAmount] = useState('');
  const [recipientNumber, setRecipientNumber] = useState('');
  const [cost, setCost] = useState('0');
  const [profit, setProfit] = useState('0');
  const [note, setNote] = useState('');
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

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
      onClose();
    });
  };

  const activeAccounts = useMemo(() => accounts.filter((a) => a.isActive), [accounts]);

  React.useEffect(() => {
    if (preselectedAccountId) {
      const targetAcc = accounts.find((a) => a.id === preselectedAccountId);
      if (targetAcc && targetAcc.isActive) {
        setAccountId(preselectedAccountId);
      } else if (activeAccounts.length > 0) {
        setAccountId(activeAccounts[0].id);
      }
    } else if (activeAccounts.length > 0 && (!accountId || !activeAccounts.some((a) => a.id === accountId))) {
      setAccountId(activeAccounts[0].id);
    }
  }, [preselectedAccountId, accounts, activeAccounts]);

  const selectedAccount = activeAccounts.find((a) => a.id === accountId) || activeAccounts[0];

  // Auto-calculate suggested cost & profit based on business rules for send money
  const handleAmountChange = (val: string) => {
    setAmount(val);
    const num = parseFloat(val.replace(/[^0-9.]/g, '')) || 0;
    if (txType === 'send') {
      // Standard MFS send cost model (~15tk per 1000 or custom)
      if (num > 0) {
        const estimatedCost = Math.round(num * 0.015); // e.g. 150 on 10,000
        const estimatedProfit = Math.round(num * 0.005); // e.g. 50 on 10,000
        setCost(String(estimatedCost));
        setProfit(String(estimatedProfit));
      } else {
        setCost('0');
        setProfit('0');
      }
    } else if (txType === 'receive') {
      if (num > 0) {
        const estimatedProfit = Math.round(num * 0.02); // 2% commission on cash in/receive
        setCost('0');
        setProfit(String(estimatedProfit));
      } else {
        setCost('0');
        setProfit('0');
      }
    }
  };

  const mappedTransactionType: TransactionType = useMemo(() => {
    if (txType === 'send') return 'sm';
    if (txType === 'receive') return 'recev';
    return 'adjustment';
  }, [txType]);

  const numAmount = parseFloat(amount.trim().replace(/[^0-9.]/g, '')) || 0;
  const numCost = parseFloat(cost.trim().replace(/[^0-9.]/g, '')) || 0;
  const numProfit = parseFloat(profit.trim().replace(/[^0-9.]/g, '')) || 0;

  const validation = useMemo(() => {
    return validateTransaction(selectedAccount, mappedTransactionType, amount, recipientNumber, cost, profit);
  }, [selectedAccount, mappedTransactionType, amount, recipientNumber, cost, profit]);

  const previewNewBalance = useMemo(() => {
    if (!selectedAccount) return 0;
    const current = selectedAccount.balance || 0;
    if (txType === 'receive') {
      return current + numAmount;
    } else if (txType === 'send') {
      return current - (numAmount + numCost);
    } else {
      return numAmount > 0 ? numAmount : current;
    }
  }, [selectedAccount, txType, numAmount, numCost]);

  const handleSave = async () => {
    setTouched({ amount: true, recipientNumber: true });

    if (!selectedAccount || numAmount <= 0 || (txType === 'send' && !recipientNumber.trim())) {
      return;
    }

    setIsSubmitting(true);
    try {
      await addTransaction({
        accountId: selectedAccount.id,
        accountNumber: selectedAccount.accountNumber,
        accountName: selectedAccount.name,
        type: mappedTransactionType,
        amount: numAmount,
        cost: numCost,
        profit: numProfit,
        margin: numProfit,
        counterparty: recipientNumber.trim() || selectedAccount.accountNumber,
        recipientNumber: txType === 'send' ? recipientNumber.trim() : undefined,
        senderNumber: txType === 'receive' ? recipientNumber.trim() : undefined,
        runningBalance: previewNewBalance,
        note: note.trim() || undefined,
      });

      // Clear & close
      setAmount('');
      setRecipientNumber('');
      setCost('0');
      setProfit('0');
      setNote('');
      setTouched({});
      onClose();
    } catch {
      Alert.alert('Error', 'Could not save transaction. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentDateDisplay = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }, []);

  return (
    <Modal visible={visible} animationType="none" transparent onRequestClose={handleClose}>
      <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%', justifyContent: 'flex-end', flex: 1 }}>
          <Animated.View style={[styles.modalSheet, { backgroundColor: theme.card, borderColor: theme.border, transform: [{ translateY: slideAnim }] }]}>
            {/* Top Header */}
            <View style={[styles.header, { borderBottomColor: theme.divider }]}>
              <TouchableOpacity onPress={handleClose} style={styles.backButton} activeOpacity={0.7}>
                <Ionicons name="arrow-back" size={22} color={theme.text} />
              </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Add Transaction</Text>
            <View style={styles.placeholderIcon} />
          </View>

          <ScrollView style={styles.formContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled" bounces={false}>
            {/* Account Selector (bKash Number) */}
            <View style={styles.inputGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>ACCOUNT / PHONE NUMBER</Text>
              <TouchableOpacity
                style={[
                  styles.selectorBox,
                  {
                    backgroundColor: theme.inputBg,
                    borderBottomColor: showAccountDropdown ? theme.primary : theme.border,
                  },
                ]}
                onPress={() => setShowAccountDropdown(!showAccountDropdown)}
                activeOpacity={0.8}
              >
                <Text style={[styles.selectorNumberText, { color: theme.text }]}>
                  {selectedAccount?.accountNumber || 'Select Account'}
                </Text>
                <Ionicons
                  name={showAccountDropdown ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={theme.textSecondary}
                />
              </TouchableOpacity>

              {/* Account Dropdown Options */}
              {showAccountDropdown && (
                <View style={[styles.dropdownContainer, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}>
                  {activeAccounts.length === 0 ? (
                    <View style={{ padding: 14, alignItems: 'center' }}>
                      <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
                        No active SIM accounts available. Please activate an account first.
                      </Text>
                    </View>
                  ) : (
                    activeAccounts.map((acc) => (
                      <TouchableOpacity
                        key={acc.id}
                        style={[
                          styles.dropdownItem,
                          acc.id === selectedAccount?.id && { backgroundColor: isDarkMode ? '#1E293B' : '#E8F0FE' },
                        ]}
                        onPress={() => {
                          setAccountId(acc.id);
                          setShowAccountDropdown(false);
                        }}
                      >
                        <View>
                          <Text style={[styles.dropdownNumber, { color: theme.text }]}>{acc.accountNumber}</Text>
                          <Text style={[styles.dropdownName, { color: theme.textSecondary }]}>{acc.name}</Text>
                        </View>
                        <Text style={[styles.dropdownBalance, { color: theme.primary }]}>
                          {formatCurrency(acc.balance)}
                        </Text>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              )}
            </View>

            {/* Segmented Type Bar: Send Money | Receive Money | Adjustment */}
            <View style={styles.inputGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>TYPE</Text>
              <View style={[styles.segmentedContainer, { backgroundColor: theme.cardSecondary }]}>
                <TouchableOpacity
                  style={[
                    styles.segmentButton,
                    txType === 'send' && [styles.activeSegment, { backgroundColor: theme.card }],
                  ]}
                  onPress={() => {
                    setTxType('send');
                    handleAmountChange(amount);
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      { color: txType === 'send' ? theme.primary : theme.textSecondary },
                      txType === 'send' && styles.activeSegmentText,
                    ]}
                  >
                    Send Money
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.segmentButton,
                    txType === 'receive' && [styles.activeSegment, { backgroundColor: theme.card }],
                  ]}
                  onPress={() => {
                    setTxType('receive');
                    handleAmountChange(amount);
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      { color: txType === 'receive' ? theme.success : theme.textSecondary },
                      txType === 'receive' && styles.activeSegmentText,
                    ]}
                  >
                    Receive Money
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.segmentButton,
                    txType === 'adjustment' && [styles.activeSegment, { backgroundColor: theme.card }],
                  ]}
                  onPress={() => {
                    setTxType('adjustment');
                    setCost('0');
                    setProfit('0');
                  }}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      { color: txType === 'adjustment' ? theme.text : theme.textSecondary },
                      txType === 'adjustment' && styles.activeSegmentText,
                    ]}
                  >
                    Adjustment
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Amount Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>AMOUNT</Text>
              <View
                style={[
                  styles.inputBox,
                  {
                    backgroundColor: theme.inputBg,
                    borderBottomColor: touched.amount && validation.errors.amount ? theme.danger : theme.border,
                  },
                ]}
              >
                <Text style={[styles.currencyPrefix, { color: theme.textSecondary }]}>৳</Text>
                <TextInput
                  style={[styles.numericInput, { color: theme.text }]}
                  placeholder="0"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={handleAmountChange}
                  onBlur={() => setTouched((prev) => ({ ...prev, amount: true }))}
                />
              </View>
              {touched.amount && validation.errors.amount && (
                <Text style={[styles.errorMsg, { color: theme.danger }]}>{validation.errors.amount}</Text>
              )}
            </View>

            {/* Recipient / Counterparty Number (for Send or Receive) */}
            {txType !== 'adjustment' && (
              <View style={styles.inputGroup}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                  {txType === 'send' ? 'RECIPIENT NUMBER' : 'SENDER / CUSTOMER NUMBER'}
                </Text>
                <View
                  style={[
                    styles.inputBox,
                    {
                      backgroundColor: theme.inputBg,
                      borderBottomColor: touched.recipientNumber && validation.errors.targetNumber ? theme.danger : theme.border,
                    },
                  ]}
                >
                  <TextInput
                    style={[styles.monoInput, { color: theme.text }]}
                    placeholder="01712 345 678"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="phone-pad"
                    value={recipientNumber}
                    onChangeText={setRecipientNumber}
                    onBlur={() => setTouched((prev) => ({ ...prev, recipientNumber: true }))}
                  />
                </View>
                {touched.recipientNumber && validation.errors.targetNumber && (
                  <Text style={[styles.errorMsg, { color: theme.danger }]}>{validation.errors.targetNumber}</Text>
                )}
              </View>
            )}

            {/* 2-Column: Send Cost & Profit */}
            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, styles.halfCol]}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>SEND COST</Text>
                <View style={[styles.inputBox, { backgroundColor: theme.inputBg, borderBottomColor: theme.border }]}>
                  <Text style={[styles.currencyPrefix, { color: theme.textSecondary }]}>৳</Text>
                  <TextInput
                    style={[styles.numericInput, { color: theme.text }]}
                    placeholder="0"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                    value={cost}
                    onChangeText={setCost}
                  />
                </View>
              </View>

              <View style={[styles.inputGroup, styles.halfCol]}>
                <Text style={[styles.fieldLabel, { color: theme.success }]}>PROFIT (MARGIN)</Text>
                <View
                  style={[
                    styles.inputBox,
                    {
                      backgroundColor: theme.inputBg,
                      borderBottomColor: theme.success,
                    },
                  ]}
                >
                  <Text style={[styles.currencyPrefix, { color: theme.success }]}>৳</Text>
                  <TextInput
                    style={[styles.numericInput, { color: theme.success, fontWeight: '700' }]}
                    placeholder="0"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                    value={profit}
                    onChangeText={setProfit}
                  />
                </View>
              </View>
            </View>

            {/* Date Display */}
            <View style={styles.inputGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>DATE</Text>
              <View style={[styles.inputBox, { backgroundColor: theme.inputBg, borderBottomColor: theme.border }]}>
                <Ionicons name="calendar-outline" size={18} color={theme.textSecondary} style={{ marginRight: 10 }} />
                <Text style={[styles.readOnlyText, { color: theme.text }]}>{currentDateDisplay}</Text>
              </View>
            </View>

            {/* Note */}
            <View style={styles.inputGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>NOTE</Text>
              <View style={[styles.textAreaBox, { backgroundColor: theme.inputBg, borderBottomColor: theme.border }]}>
                <TextInput
                  style={[styles.textAreaInput, { color: theme.text }]}
                  placeholder="Add details / customer reference..."
                  placeholderTextColor={theme.textMuted}
                  multiline
                  numberOfLines={3}
                  value={note}
                  onChangeText={setNote}
                />
              </View>
            </View>

            {/* Balance Impact Preview */}
            <View style={[styles.previewBox, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}>
              <Text style={[styles.previewLabel, { color: theme.textSecondary }]}>PROJECTED CLOSING BALANCE</Text>
              <Text style={[styles.previewValue, { color: theme.primary }]}>
                {formatCurrency(previewNewBalance)}
              </Text>
            </View>

            <View style={{ height: 30 }} />
          </ScrollView>

          {/* Sticky Bottom Actions */}
          <View style={[styles.stickyFooter, { backgroundColor: theme.card, borderTopColor: theme.divider }]}>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: theme.primary }]}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={[styles.cancelBtnText, { color: theme.primary }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: theme.primary }]}
              onPress={handleSave}
              disabled={isSubmitting}
              activeOpacity={0.92}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveBtnText}>Save Transaction</Text>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
};

export const AddTransactionModal = React.memo(AddTransactionModalComponent);

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '92%',
    minHeight: '80%',
    borderWidth: 1,
    width: '100%',
    maxWidth: 540,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  placeholderIcon: {
    width: 36,
  },
  formContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  inputGroup: {
    marginBottom: 14,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  selectorBox: {
    height: 52,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  selectorNumberText: {
    fontFamily: 'monospace',
    fontSize: 15,
    fontWeight: '700',
  },
  dropdownContainer: {
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  dropdownNumber: {
    fontFamily: 'monospace',
    fontSize: 14,
    fontWeight: '700',
  },
  dropdownName: {
    fontSize: 11,
    marginTop: 1,
  },
  dropdownBalance: {
    fontSize: 14,
    fontWeight: '700',
  },
  segmentedContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 3,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeSegment: {},
  segmentText: {
    fontSize: 12,
    fontWeight: '600',
  },
  activeSegmentText: {
    fontWeight: '700',
  },
  inputBox: {
    height: 52,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  currencyPrefix: {
    fontSize: 18,
    fontWeight: '700',
    marginRight: 6,
  },
  numericInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    padding: 0,
  },
  monoInput: {
    flex: 1,
    fontFamily: 'monospace',
    fontSize: 15,
    fontWeight: '600',
    padding: 0,
  },
  readOnlyText: {
    fontSize: 14,
    fontWeight: '600',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  halfCol: {
    flex: 1,
  },
  textAreaBox: {
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomWidth: 2,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 70,
  },
  textAreaInput: {
    fontSize: 14,
    padding: 0,
    textAlignVertical: 'top',
  },
  errorMsg: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  previewBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 4,
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  previewValue: {
    fontSize: 16,
    fontWeight: '800',
  },
  stickyFooter: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  saveBtn: {
    flex: 2,
    height: 48,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});