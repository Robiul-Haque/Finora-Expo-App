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
  Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Transaction, TransactionType } from '../types/ledger';
import { useLedger } from '../context/LedgerContext';
import { useTheme } from '../context/ThemeContext';
import { formatCurrency } from '../utils';
import { TransactionTypeSelector, TxSelectableType } from './TransactionTypeSelector';
import { CustomCalendarModal } from './CustomCalendarModal';

interface EditTransactionModalProps {
  visible: boolean;
  transaction: Transaction | null;
  onClose: () => void;
}

const EditTransactionModalComponent: React.FC<EditTransactionModalProps> = ({
  visible,
  transaction,
  onClose,
}) => {
  const { theme, isDarkMode } = useTheme();
  const { accounts, updateTransaction } = useLedger();

  const [accountId, setAccountId] = useState('');
  const [txType, setTxType] = useState<'send' | 'receive' | 'cash_out' | 'adjustment'>('send');
  const [amount, setAmount] = useState('');
  const [counterpartyNumber, setCounterpartyNumber] = useState('');
  const [cost, setCost] = useState('0');
  const [profit, setProfit] = useState('0');
  const [note, setNote] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [pickerViewMonth, setPickerViewMonth] = useState<Date>(new Date());
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const amountRef = useRef<TextInput>(null);
  const counterpartyRef = useRef<TextInput>(null);
  const costRef = useRef<TextInput>(null);
  const profitRef = useRef<TextInput>(null);
  const noteRef = useRef<TextInput>(null);

  const isClosing = useRef(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(140)).current;
  const dropdownAnim = useRef(new Animated.Value(0)).current;

  const toggleAccountDropdown = () => {
    if (!showAccountDropdown) {
      setShowAccountDropdown(true);
      Animated.timing(dropdownAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(dropdownAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }).start(() => {
        setShowAccountDropdown(false);
      });
    }
  };

  const closeAccountDropdown = () => {
    if (showAccountDropdown) {
      Animated.timing(dropdownAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }).start(() => {
        setShowAccountDropdown(false);
      });
    }
  };

  // Sync state with selected transaction
  useEffect(() => {
    if (visible && transaction) {
      isClosing.current = false;
      fadeAnim.setValue(0);
      slideAnim.setValue(140);
      setShowAccountDropdown(false);
      dropdownAnim.setValue(0);

      setAccountId(transaction.accountId || (accounts[0]?.id || ''));

      // Determine type
      if (transaction.type === 'recev' || transaction.type === 'receive_money' || transaction.type === 'cash_in') {
        setTxType('receive');
      } else if (transaction.type === 'co' || transaction.type === 'cash_out') {
        setTxType('cash_out');
      } else if (transaction.type === 'adjustment') {
        setTxType('adjustment');
      } else {
        setTxType('send');
      }

      setAmount(String(transaction.amount || ''));
      setCounterpartyNumber(transaction.recipientNumber || transaction.senderNumber || transaction.counterparty || '');
      setCost(String(transaction.cost || '0'));
      setProfit(String(transaction.profit !== undefined ? transaction.profit : (transaction.margin || '0')));
      setNote(transaction.note || '');

      const parsedDate = transaction.date ? new Date(transaction.date) : new Date();
      setSelectedDate(isNaN(parsedDate.getTime()) ? new Date() : parsedDate);
      setPickerViewMonth(isNaN(parsedDate.getTime()) ? new Date() : parsedDate);

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
  }, [visible, transaction]);

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

  const selectedAccount = useMemo(() => {
    return accounts.find((a) => a.id === accountId) || accounts[0];
  }, [accounts, accountId]);

  const handleSubmit = async () => {
    if (!transaction) return;
    const parsedAmount = parseFloat(amount.replace(/,/g, ''));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0.');
      return;
    }

    const parsedCost = parseFloat(cost) || 0;
    const parsedProfit = parseFloat(profit) || 0;

    if ((txType === 'send' || txType === 'cash_out') && !counterpartyNumber.trim()) {
      Alert.alert('Recipient Required', 'Please enter a recipient or counterparty number.');
      return;
    }

    // Balance check for outflow edits
    if (selectedAccount && (txType === 'send' || txType === 'cash_out')) {
      const isOldOutflow =
        transaction.type === 'sm' ||
        transaction.type === 'co' ||
        transaction.type === 'send' ||
        transaction.type === 'send_money' ||
        transaction.type === 'cash_out' ||
        transaction.type === 'b2b';

      const restoredBalance =
        transaction.accountId === selectedAccount.id && isOldOutflow
          ? selectedAccount.balance + transaction.amount + (transaction.cost || 0)
          : selectedAccount.balance;

      const totalNeeded = parsedAmount + parsedCost;
      if (totalNeeded > restoredBalance) {
        Alert.alert(
          'Insufficient Balance',
          `The selected account has ৳${restoredBalance.toLocaleString('en-US')} available, but ৳${totalNeeded.toLocaleString('en-US')} is needed.`
        );
        return;
      }
    }

    // Convert UI type to ledger format
    let finalType: TransactionType = 'send_money';
    if (txType === 'send') finalType = 'sm';
    else if (txType === 'receive') finalType = 'recev';
    else if (txType === 'cash_out') finalType = 'co';
    else if (txType === 'adjustment') finalType = 'adjustment';

    setIsSubmitting(true);
    try {
      await updateTransaction(transaction.id, {
        accountId: selectedAccount?.id || transaction.accountId,
        accountNumber: selectedAccount?.accountNumber || transaction.accountNumber,
        type: finalType,
        amount: parsedAmount,
        cost: parsedCost,
        profit: parsedProfit,
        margin: parsedProfit,
        recipientNumber: txType === 'send' || txType === 'cash_out' ? counterpartyNumber : undefined,
        senderNumber: txType === 'receive' ? counterpartyNumber : undefined,
        counterparty: counterpartyNumber || undefined,
        note: note.trim() || undefined,
        date: selectedDate.toISOString(),
      });
      handleClose();
    } catch {
      Alert.alert('Error', 'Failed to update transaction. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isToday = (d: Date) => {
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  };

  const isYesterday = (d: Date) => {
    const yest = new Date(Date.now() - 86400000);
    return (
      d.getDate() === yest.getDate() &&
      d.getMonth() === yest.getMonth() &&
      d.getFullYear() === yest.getFullYear()
    );
  };

  const selectedDateDisplay = useMemo(() => {
    const dStr = selectedDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    if (isToday(selectedDate)) return `${dStr} (Today)`;
    if (isYesterday(selectedDate)) return `${dStr} (Yesterday)`;
    return dStr;
  }, [selectedDate]);

  // Calendar generation helpers
  const calendarDays = useMemo(() => {
    const year = pickerViewMonth.getFullYear();
    const month = pickerViewMonth.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days: Array<{ day: number; isCurrentMonth: boolean; date: Date }> = [];

    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      days.push({
        day: d,
        isCurrentMonth: false,
        date: new Date(year, month - 1, d),
      });
    }

    for (let i = 1; i <= totalDaysInMonth; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        date: new Date(year, month, i),
      });
    }

    const totalSlots = days.length > 35 ? 42 : 35;
    const remaining = totalSlots - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        date: new Date(year, month + 1, i),
      });
    }

    return days;
  }, [pickerViewMonth]);

  const changeMonth = (delta: number) => {
    setPickerViewMonth(new Date(pickerViewMonth.getFullYear(), pickerViewMonth.getMonth() + delta, 1));
  };

  if (!transaction) return null;

  return (
    <Modal visible={visible} animationType="none" transparent statusBarTranslucent onRequestClose={handleClose}>
      <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleClose}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ width: '100%', justifyContent: 'flex-end', flex: 1 }}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[
              styles.modalSheet,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            {/* Top Header */}
            <View style={[styles.header, { borderBottomColor: theme.divider }]}>
              <TouchableOpacity onPress={handleClose} style={styles.backButton} activeOpacity={0.7}>
                <Ionicons name="arrow-back" size={22} color={theme.text} />
              </TouchableOpacity>
              <Text style={[styles.headerTitle, { color: theme.text }]}>Edit Transaction</Text>
              <View style={styles.placeholderIcon} />
            </View>

            <ScrollView
              style={styles.formContainer}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              bounces={false}
            >
              {/* Account Selector */}
              <View style={styles.inputGroup}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>ACCOUNT / PHONE NUMBER</Text>
                <TouchableOpacity
                  style={[
                    styles.selectorBox,
                    {
                      backgroundColor: theme.inputBg,
                      borderColor: showAccountDropdown ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={toggleAccountDropdown}
                  activeOpacity={0.8}
                >
                  <View style={styles.accountSelectedRow}>
                    <Text style={[styles.accountMonoNumber, { color: theme.text }]}>
                      {selectedAccount ? selectedAccount.accountNumber : 'Select Account'}
                    </Text>
                    {selectedAccount && (
                      <Text style={[styles.accountNameTag, { color: theme.textMuted }]}>
                        ({selectedAccount.name || 'SIM'})
                      </Text>
                    )}
                  </View>
                  <Animated.View
                    style={{
                      transform: [
                        {
                          rotate: dropdownAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['0deg', '180deg'],
                          }),
                        },
                      ],
                    }}
                  >
                    <Ionicons
                      name="chevron-down"
                      size={18}
                      color={theme.textSecondary}
                    />
                  </Animated.View>
                </TouchableOpacity>

                {showAccountDropdown && (
                  <Animated.View
                    style={[
                      styles.accountDropdownMenu,
                      {
                        backgroundColor: theme.cardSecondary,
                        borderColor: theme.border,
                        opacity: dropdownAnim,
                        transform: [
                          {
                            translateY: dropdownAnim.interpolate({
                              inputRange: [0, 1],
                              outputRange: [-6, 0],
                            }),
                          },
                        ],
                      },
                    ]}
                  >
                    <ScrollView
                      nestedScrollEnabled
                      showsVerticalScrollIndicator={accounts.length > 6}
                      style={{ maxHeight: 324 }}
                      keyboardShouldPersistTaps="handled"
                    >
                      {accounts.map((acc) => {
                        const isSelected = acc.id === selectedAccount?.id;
                        return (
                          <TouchableOpacity
                            key={acc.id}
                            style={[
                              styles.accountDropdownItem,
                              isSelected && { backgroundColor: theme.primaryLight },
                            ]}
                            onPress={() => {
                              setAccountId(acc.id);
                              closeAccountDropdown();
                            }}
                          >
                            <View>
                              <Text
                                style={[
                                  styles.dropdownItemPhone,
                                  { color: isSelected ? theme.primary : theme.text },
                                ]}
                              >
                                {acc.accountNumber}
                              </Text>
                              <Text style={[styles.dropdownItemName, { color: theme.textMuted }]}>
                                {acc.name} • Bal: {formatCurrency(acc.balance)}
                              </Text>
                            </View>
                            {isSelected && (
                              <Ionicons name="checkmark" size={16} color={theme.primary} />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </Animated.View>
                )}
              </View>

              {/* Transaction Type Selector */}
              <View style={styles.inputGroup}>
                <TransactionTypeSelector
                  selectedType={txType}
                  onSelectType={(newType) => setTxType(newType)}
                  label="TRANSACTION TYPE"
                />
              </View>

              {/* Amount Input */}
              <View style={styles.inputGroup}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>AMOUNT (৳)</Text>
                <TextInput
                  ref={amountRef}
                  style={[
                    styles.textInput,
                    { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text },
                  ]}
                  placeholder="Enter amount"
                  placeholderTextColor={theme.textMuted}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                />
              </View>

              {/* Counterparty Number */}
              <View style={styles.inputGroup}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                  {txType === 'send' || txType === 'cash_out' ? 'RECIPIENT NUMBER' : 'SENDER / CUSTOMER NUMBER'}
                </Text>
                <TextInput
                  ref={counterpartyRef}
                  style={[
                    styles.textInput,
                    { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text },
                  ]}
                  placeholder="017XXXXXXXX"
                  placeholderTextColor={theme.textMuted}
                  value={counterpartyNumber}
                  onChangeText={setCounterpartyNumber}
                  keyboardType="phone-pad"
                />
              </View>

              {/* Cost & Profit Row */}
              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>COST (৳)</Text>
                  <TextInput
                    ref={costRef}
                    style={[
                      styles.textInput,
                      { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text },
                    ]}
                    placeholder="0"
                    placeholderTextColor={theme.textMuted}
                    value={cost}
                    onChangeText={setCost}
                    keyboardType="numeric"
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>PROFIT / MARGIN (৳)</Text>
                  <TextInput
                    ref={profitRef}
                    style={[
                      styles.textInput,
                      { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text },
                    ]}
                    placeholder="0"
                    placeholderTextColor={theme.textMuted}
                    value={profit}
                    onChangeText={setProfit}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              {/* Transaction Date Selector */}
              <View style={styles.inputGroup}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>TRANSACTION DATE</Text>
                <TouchableOpacity
                  style={[
                    styles.dateSelectButton,
                    { backgroundColor: theme.inputBg, borderColor: theme.border },
                  ]}
                  onPress={() => setShowDatePickerModal(true)}
                  activeOpacity={0.8}
                >
                  <View style={styles.dateSelectLeft}>
                    <Ionicons name="calendar-outline" size={18} color={theme.primary} />
                    <Text style={[styles.dateSelectText, { color: theme.text }]}>
                      {selectedDateDisplay}
                    </Text>
                  </View>
                  <Text style={[styles.dateSelectChangeText, { color: theme.primary }]}>
                    Change Date ▾
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Note / Remarks */}
              <View style={styles.inputGroup}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>NOTE / REMARKS (OPTIONAL)</Text>
                <TextInput
                  ref={noteRef}
                  style={[
                    styles.textInput,
                    { backgroundColor: theme.inputBg, borderColor: theme.border, color: theme.text },
                  ]}
                  placeholder="Optional reference or description"
                  placeholderTextColor={theme.textMuted}
                  value={note}
                  onChangeText={setNote}
                />
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  { backgroundColor: theme.primary },
                  isSubmitting && { opacity: 0.7 },
                ]}
                onPress={handleSubmit}
                disabled={isSubmitting}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.submitBtnText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>

            {/* Custom Date Picker Modal */}
            <CustomCalendarModal
              visible={showDatePickerModal}
              selectedDate={selectedDate}
              onSelectDate={(newDate) => setSelectedDate(newDate)}
              onClose={() => setShowDatePickerModal(false)}
            />
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
};

export const EditTransactionModal = React.memo(EditTransactionModalComponent);

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    maxHeight: '92%',
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
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
    fontSize: 17,
    fontWeight: '700',
  },
  placeholderIcon: {
    width: 36,
  },
  formContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  selectorBox: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  accountSelectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  accountMonoNumber: {
    fontFamily: 'monospace',
    fontSize: 14,
    fontWeight: '700',
  },
  accountNameTag: {
    fontSize: 12,
  },
  accountDropdownMenu: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    marginTop: 6,
  },
  accountDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    minHeight: 54,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  dropdownItemPhone: {
    fontFamily: 'monospace',
    fontSize: 13.5,
    fontWeight: '700',
  },
  dropdownItemName: {
    fontSize: 11,
    marginTop: 1,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeCard: {
    width: '48.5%',
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  typeCardText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  typeCardTextSelected: {
    fontWeight: '700',
  },
  textInput: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
    textAlignVertical: 'center',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  dateSelectButton: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  dateSelectLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateSelectText: {
    fontSize: 13.5,
    fontWeight: '600',
  },
  dateSelectChangeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  submitBtn: {
    height: 50,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 32,
    elevation: 3,
    shadowColor: '#1A73E8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
