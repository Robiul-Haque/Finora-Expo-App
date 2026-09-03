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
import { TransactionType } from '../types/ledger';
import { useLedger } from '../context/LedgerContext';
import { useTheme } from '../context/ThemeContext';
import { validateTransaction } from '../utils/validation';
import { formatCurrency } from '../utils';
import { TransactionTypeSelector, TxSelectableType } from './TransactionTypeSelector';
import { CustomCalendarModal } from './CustomCalendarModal';

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
  const [txType, setTxType] = useState<'send' | 'receive' | 'cash_out' | 'adjustment'>('send');
  const [amount, setAmount] = useState('');
  const [recipientNumber, setRecipientNumber] = useState('');
  const [cost, setCost] = useState('0');
  const [profit, setProfit] = useState('0');
  const [note, setNote] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [pickerViewMonth, setPickerViewMonth] = useState<Date>(new Date());
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [touched, setTouched] = useState<{ [key: string]: boolean }>({});

  const amountInputRef = useRef<TextInput>(null);
  const recipientInputRef = useRef<TextInput>(null);
  const costInputRef = useRef<TextInput>(null);
  const profitInputRef = useRef<TextInput>(null);
  const noteInputRef = useRef<TextInput>(null);

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

  useEffect(() => {
    if (visible) {
      isClosing.current = false;
      fadeAnim.setValue(0);
      slideAnim.setValue(140);
      setShowAccountDropdown(false);
      dropdownAnim.setValue(0);
      setAmount('');
      setCost('0');
      setProfit('0');
      setRecipientNumber('');
      setNote('');
      setTouched({});
      setSelectedDate(new Date());
      setPickerViewMonth(new Date());

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

  // Pure fee calculator based on business rules for send money / cash out / receive
  const calculateDefaultFees = (val: string, targetType: 'send' | 'receive' | 'cash_out' | 'adjustment') => {
    const num = parseFloat(val.replace(/[^0-9.]/g, '')) || 0;
    if (num <= 0 || targetType === 'adjustment') {
      return { cost: '0', profit: '0' };
    }
    if (targetType === 'send' || targetType === 'cash_out') {
      const estimatedCost = Math.round(num * 0.015);
      const estimatedProfit = Math.round(num * 0.005);
      return { cost: String(estimatedCost), profit: String(estimatedProfit) };
    }
    if (targetType === 'receive') {
      const estimatedProfit = Math.round(num * 0.02);
      return { cost: '0', profit: String(estimatedProfit) };
    }
    return { cost: '0', profit: '0' };
  };

  const handleAmountChange = (val: string) => {
    setAmount(val);
    const { cost: newCost, profit: newProfit } = calculateDefaultFees(val, txType);
    setCost(newCost);
    setProfit(newProfit);
  };

  const mappedTransactionType: TransactionType = useMemo(() => {
    if (txType === 'send') return 'sm';
    if (txType === 'receive') return 'recev';
    if (txType === 'cash_out') return 'co';
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
    } else if (txType === 'send' || txType === 'cash_out') {
      return current - (numAmount + numCost);
    } else {
      return current + numAmount;
    }
  }, [selectedAccount, txType, numAmount, numCost]);

  const handleSave = async () => {
    setTouched({ amount: true, recipientNumber: true });

    if (!selectedAccount || numAmount <= 0 || !validation.isValid) {
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
        counterparty: recipientNumber.trim() || (txType === 'cash_out' ? 'Cash Out' : selectedAccount.accountNumber),
        recipientNumber: txType === 'send' || txType === 'cash_out' ? recipientNumber.trim() : undefined,
        senderNumber: txType === 'receive' ? recipientNumber.trim() : undefined,
        runningBalance: previewNewBalance,
        note: note.trim() || undefined,
        date: selectedDate.toISOString(),
      });

      // Clear & close
      setAmount('');
      setRecipientNumber('');
      setCost('0');
      setProfit('0');
      setNote('');
      setSelectedDate(new Date());
      setTouched({});
      handleClose();
    } catch {
      Alert.alert('Error', 'Could not save transaction. Please try again.');
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

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const days: Array<{ day: number; isCurrentMonth: boolean; date: Date }> = [];

    // Leading days from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      days.push({
        day: d,
        isCurrentMonth: false,
        date: new Date(year, month - 1, d),
      });
    }

    // Current month days
    for (let i = 1; i <= totalDaysInMonth; i++) {
      days.push({
        day: i,
        isCurrentMonth: true,
        date: new Date(year, month, i),
      });
    }

    // Trailing days to fill 35 or 42 grid slots
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

  return (
    <Modal visible={visible} animationType="none" transparent statusBarTranslucent onRequestClose={handleClose}>
      <Animated.View style={[styles.modalOverlay, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleClose}
        />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%', justifyContent: 'flex-end', flex: 1 }} pointerEvents="box-none">
          <Animated.View style={[styles.modalSheet, { backgroundColor: theme.card, borderColor: theme.border, transform: [{ translateY: slideAnim }] }]}>
            {/* Top Header */}
            <View style={[styles.header, { borderBottomColor: theme.divider }]}>
              <TouchableOpacity
                onPress={handleClose}
                style={styles.backButton}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="arrow-back" size={22} color={theme.text} />
              </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.text }]}>Add Transaction</Text>
            <View style={styles.placeholderIcon} />
          </View>

          <ScrollView
            style={styles.formContainer}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            bounces={false}
          >
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
                onPress={toggleAccountDropdown}
                activeOpacity={0.8}
              >
                <Text style={[styles.selectorNumberText, { color: theme.text }]}>
                  {selectedAccount?.accountNumber || 'Select Account'}
                </Text>
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
                    size={20}
                    color={theme.textSecondary}
                  />
                </Animated.View>
              </TouchableOpacity>

              {/* Account Dropdown Options */}
              {showAccountDropdown && (
                <Animated.View
                  style={[
                    styles.dropdownContainer,
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
                    showsVerticalScrollIndicator={activeAccounts.length > 6}
                    style={styles.dropdownScrollView}
                    keyboardShouldPersistTaps="handled"
                  >
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
                            closeAccountDropdown();
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
                  </ScrollView>
                </Animated.View>
              )}
            </View>

            {/* Transaction Type Selector */}
            <View style={styles.inputGroup}>
              <TransactionTypeSelector
                selectedType={txType}
                onSelectType={(newType) => {
                  setTxType(newType);
                  const { cost: newCost, profit: newProfit } = calculateDefaultFees(amount, newType);
                  setCost(newCost);
                  setProfit(newProfit);
                }}
              />
            </View>

            {/* Amount Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>AMOUNT</Text>
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => amountInputRef.current?.focus()}
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
                  ref={amountInputRef}
                  style={[styles.numericInput, { color: theme.text }]}
                  placeholder="Enter amount"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={handleAmountChange}
                  onBlur={() => setTouched((prev) => ({ ...prev, amount: true }))}
                />
              </TouchableOpacity>
              {touched.amount && validation.errors.amount && (
                <Text style={[styles.errorMsg, { color: theme.danger }]}>{validation.errors.amount}</Text>
              )}
            </View>

            {/* Recipient / Counterparty Number (for Send, Receive or Cash Out) */}
            {txType !== 'adjustment' && (
              <View style={styles.inputGroup}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>
                  {txType === 'send'
                    ? 'RECIPIENT NUMBER'
                    : txType === 'cash_out'
                    ? 'AGENT / CASH OUT NUMBER'
                    : 'SENDER / CUSTOMER NUMBER'}
                </Text>
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={() => recipientInputRef.current?.focus()}
                  style={[
                    styles.inputBox,
                    {
                      backgroundColor: theme.inputBg,
                      borderBottomColor: touched.recipientNumber && validation.errors.targetNumber ? theme.danger : theme.border,
                    },
                  ]}
                >
                  <TextInput
                    ref={recipientInputRef}
                    style={[styles.monoInput, { color: theme.text }]}
                    placeholder="01712 345 678"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="phone-pad"
                    value={recipientNumber}
                    onChangeText={setRecipientNumber}
                    onBlur={() => setTouched((prev) => ({ ...prev, recipientNumber: true }))}
                  />
                </TouchableOpacity>
                {touched.recipientNumber && validation.errors.targetNumber && (
                  <Text style={[styles.errorMsg, { color: theme.danger }]}>{validation.errors.targetNumber}</Text>
                )}
              </View>
            )}

            {/* 2-Column: Send Cost & Profit */}
            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, styles.halfCol]}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>SEND COST</Text>
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={() => costInputRef.current?.focus()}
                  style={[styles.inputBox, { backgroundColor: theme.inputBg, borderBottomColor: theme.border }]}
                >
                  <Text style={[styles.currencyPrefix, { color: theme.textSecondary }]}>৳</Text>
                  <TextInput
                    ref={costInputRef}
                    style={[styles.numericInput, { color: theme.text }]}
                    placeholder="0"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                    value={cost}
                    onChangeText={setCost}
                  />
                </TouchableOpacity>
              </View>

              <View style={[styles.inputGroup, styles.halfCol]}>
                <Text style={[styles.fieldLabel, { color: theme.success }]}>PROFIT (MARGIN)</Text>
                <TouchableOpacity
                  activeOpacity={1}
                  onPress={() => profitInputRef.current?.focus()}
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
                    ref={profitInputRef}
                    style={[styles.numericInput, { color: theme.success, fontWeight: '700' }]}
                    placeholder="0"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="numeric"
                    value={profit}
                    onChangeText={setProfit}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Date Selector with Quick Chips & Manual Picker */}
            <View style={styles.inputGroup}>
              <View style={styles.dateHeaderRow}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary, marginBottom: 0 }]}>
                  TRANSACTION DATE
                </Text>
                {/* Quick Date Chips */}
                <View style={styles.quickChipsRow}>
                  <TouchableOpacity
                    style={[
                      styles.quickChip,
                      { backgroundColor: theme.cardSecondary, borderColor: theme.border },
                      isToday(selectedDate) && { backgroundColor: theme.primaryLight, borderColor: theme.primary },
                    ]}
                    onPress={() => {
                      const now = new Date();
                      setSelectedDate(now);
                      setPickerViewMonth(now);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.quickChipText,
                        { color: theme.textSecondary },
                        isToday(selectedDate) && { color: theme.primary, fontWeight: '700' },
                      ]}
                    >
                      Today
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.quickChip,
                      { backgroundColor: theme.cardSecondary, borderColor: theme.border },
                      isYesterday(selectedDate) && { backgroundColor: theme.primaryLight, borderColor: theme.primary },
                    ]}
                    onPress={() => {
                      const yest = new Date(Date.now() - 86400000);
                      setSelectedDate(yest);
                      setPickerViewMonth(yest);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.quickChipText,
                        { color: theme.textSecondary },
                        isYesterday(selectedDate) && { color: theme.primary, fontWeight: '700' },
                      ]}
                    >
                      Yesterday
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Clickable Date Box */}
              <TouchableOpacity
                style={[
                  styles.inputBox,
                  styles.dateInputBox,
                  { backgroundColor: theme.inputBg, borderBottomColor: theme.border },
                ]}
                onPress={() => {
                  setPickerViewMonth(new Date(selectedDate));
                  setShowDatePickerModal(true);
                }}
                activeOpacity={0.8}
              >
                <View style={styles.dateLeftContent}>
                  <Ionicons name="calendar-outline" size={19} color={theme.primary} style={{ marginRight: 10 }} />
                  <Text style={[styles.selectedDateText, { color: theme.text }]}>
                    {selectedDateDisplay}
                  </Text>
                </View>
                <View style={[styles.changeDateBadge, { backgroundColor: theme.cardSecondary, borderColor: theme.border }]}>
                  <Text style={[styles.changeDateText, { color: theme.primary }]}>Change</Text>
                  <Ionicons name="chevron-forward" size={14} color={theme.primary} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Note */}
            <View style={styles.inputGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>NOTE</Text>
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => noteInputRef.current?.focus()}
                style={[styles.textAreaBox, { backgroundColor: theme.inputBg, borderBottomColor: theme.border }]}
              >
                <TextInput
                  ref={noteInputRef}
                  style={[styles.textAreaInput, { color: theme.text }]}
                  placeholder="Add details / customer reference..."
                  placeholderTextColor={theme.textMuted}
                  multiline
                  numberOfLines={3}
                  value={note}
                  onChangeText={setNote}
                />
              </TouchableOpacity>
            </View>

            {/* Dynamic Balance Impact Preview */}
            <View
              style={[
                styles.previewBox,
                {
                  backgroundColor: theme.cardSecondary,
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={styles.previewLeftContent}>
                <View style={styles.previewLabelRow}>
                  <Ionicons
                    name={
                      txType === 'send'
                        ? 'arrow-down-circle-outline'
                        : txType === 'receive'
                        ? 'arrow-up-circle-outline'
                        : 'swap-horizontal-outline'
                    }
                    size={16}
                    color={
                      txType === 'send'
                        ? theme.danger
                        : txType === 'receive'
                        ? theme.success
                        : theme.primary
                    }
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.previewLabel, { color: theme.textSecondary }]}>
                    {txType === 'send'
                      ? 'NEW BALANCE AFTER SEND'
                      : txType === 'receive'
                      ? 'NEW BALANCE AFTER RECEIVE'
                      : 'NEW BALANCE AFTER ADJUSTMENT'}
                  </Text>
                </View>

                {numAmount > 0 && selectedAccount && (
                  <Text style={[styles.previewSubtext, { color: theme.textMuted }]}>
                    {txType === 'send'
                      ? `Current ${formatCurrency(selectedAccount.balance)}  -  ${formatCurrency(numAmount + numCost)}`
                      : txType === 'receive'
                      ? `Current ${formatCurrency(selectedAccount.balance)}  +  ${formatCurrency(numAmount)}`
                      : `Current ${formatCurrency(selectedAccount.balance)}  +  ${formatCurrency(numAmount)}`}
                  </Text>
                )}
              </View>

              <Text
                style={[
                  styles.previewValue,
                  {
                    color:
                      txType === 'receive'
                        ? theme.success
                        : theme.primary,
                  },
                ]}
              >
                {formatCurrency(previewNewBalance)}
              </Text>
            </View>

            <View style={{ height: 30 }} />
          </ScrollView>

          {/* Sticky Bottom Actions */}
          <View style={[styles.stickyFooter, { backgroundColor: theme.card, borderTopColor: theme.divider }]}>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: theme.primary }]}
              onPress={handleClose}
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

      {/* Interactive Calendar Date Picker Modal */}
      <CustomCalendarModal
        visible={showDatePickerModal}
        selectedDate={selectedDate}
        onSelectDate={(newDate) => {
          setSelectedDate(newDate);
          setPickerViewMonth(newDate);
        }}
        onClose={() => setShowDatePickerModal(false)}
      />
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
  dateHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  quickChipsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  quickChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
  },
  quickChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  dateInputBox: {
    justifyContent: 'space-between',
  },
  dateLeftContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedDateText: {
    fontSize: 14,
    fontWeight: '700',
  },
  changeDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    gap: 2,
  },
  changeDateText: {
    fontSize: 11,
    fontWeight: '700',
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
  dropdownScrollView: {
    maxHeight: 324,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    minHeight: 54,
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
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeCard: {
    width: '48.5%',
    height: 44,
    borderRadius: 8,
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
    height: '100%',
    fontSize: 18,
    fontWeight: '700',
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  monoInput: {
    flex: 1,
    height: '100%',
    fontFamily: 'monospace',
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: 0,
    textAlignVertical: 'center',
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
    flex: 1,
    fontSize: 14,
    padding: 0,
    textAlignVertical: 'top',
    minHeight: 50,
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
  previewLeftContent: {
    flex: 1,
    marginRight: 10,
  },
  previewLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  previewSubtext: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 3,
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