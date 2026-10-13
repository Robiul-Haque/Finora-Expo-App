import { Account, TransactionType } from '../types/ledger';
import { isSameDay, isSameMonth } from './formatters';

/**
 * Normalizes a Bangladeshi mobile number or string
 */
export const normalizePhoneNumber = (phone: string): string => {
  let cleaned = phone.replace(/[\s\-\(\)]/g, '');
  if (cleaned.startsWith('+880')) {
    cleaned = '0' + cleaned.slice(4);
  } else if (cleaned.startsWith('880')) {
    cleaned = '0' + cleaned.slice(3);
  }
  return cleaned;
};

/**
 * Validates a Bangladeshi mobile number (013, 014, 015, 016, 017, 018, 019 - 11 digits).
 */
export const isValidBkashNumber = (phone: string): boolean => {
  const normalized = normalizePhoneNumber(phone);
  const bdRegex = /^01[3-9]\d{8}$/;
  return bdRegex.test(normalized);
};

/**
 * Format phone number with readable spacing
 */
export const formatDisplayPhoneNumber = (phone: string): string => {
  const normalized = normalizePhoneNumber(phone);
  if (normalized.length === 11) return `${normalized.slice(0, 5)} ${normalized.slice(5)}`;
  return phone;
};

export interface TransactionValidationResult {
  isValid: boolean;
  errors: {
    accountId?: string;
    amount?: string;
    targetNumber?: string;
    cost?: string;
    margin?: string;
    profit?: string;
  };
  warnings?: {
    amount?: string;
  };
}

export const validateTransaction = (
  account: Account | undefined,
  type: TransactionType,
  amountStr: string,
  targetNumber: string,
  costStr: string,
  marginStr: string,
  txDate?: Date | string
): TransactionValidationResult => {
  const errors: TransactionValidationResult['errors'] = {};
  const warnings: TransactionValidationResult['warnings'] = {};

  // 1. Account validation
  if (!account) {
    errors.accountId = 'Please select a valid SIM account';
  } else if (!account.isActive) {
    errors.accountId = 'Selected SIM account is currently inactive';
  }

  // 2. Amount validation
  const cleanedAmount = amountStr.trim().replace(/[^0-9.]/g, '');
  const numAmount = parseFloat(cleanedAmount);
  const cleanedCost = costStr ? costStr.trim().replace(/[^0-9.]/g, '') : '0';
  const numCost = parseFloat(cleanedCost) || 0;

  if (cleanedAmount === '' || isNaN(numAmount)) {
    errors.amount = 'Amount is required';
  } else if (numAmount <= 0) {
    errors.amount = 'Amount must be greater than ৳0';
  } else if (account) {
    const isOutflow =
      type === 'sm' ||
      type === 'co' ||
      type === 'send' ||
      type === 'send_money' ||
      type === 'cash_out' ||
      type === 'b2b';

    // Balance check for outflows (amount + fee)
    const totalOutflow = numAmount + numCost;
    if (isOutflow && totalOutflow > account.balance) {
      errors.amount =
        numCost > 0
          ? `Insufficient balance with fee! Needed: ৳${totalOutflow.toLocaleString('en-US')}, Available: ৳${account.balance.toLocaleString('en-US')}`
          : `Insufficient balance! Available: ৳${account.balance.toLocaleString('en-US')}`;
    }

    // Limit check for Send Money (Sm / send / send_money)
    if ((type === 'sm' || type === 'send_money' || type === 'send') && numAmount > 0) {
      const isTodayTx = txDate ? isSameDay(txDate) : true;
      const isThisMonthTx = txDate ? isSameMonth(txDate) : true;

      const dailyLimit = account.dailyLimit !== undefined ? account.dailyLimit : 50000;
      if (isTodayTx) {
        const todaySend = account.todaySend || 0;
        const remainingDailyLimit = Math.max(0, dailyLimit - todaySend);
        if (numAmount > remainingDailyLimit) {
          errors.amount = `Amount exceeds remaining daily limit (৳${remainingDailyLimit.toLocaleString('en-US')}). Daily limit is max ৳${dailyLimit.toLocaleString('en-US')}`;
        }
      } else if (numAmount > dailyLimit) {
        errors.amount = `Amount exceeds maximum daily send limit of ৳${dailyLimit.toLocaleString('en-US')}`;
      }

      const monthlyLimit = account.monthlyLimit || 300000;
      if (isThisMonthTx) {
        const monthlyUsed = account.monthlyLimitUsed !== undefined ? account.monthlyLimitUsed : (account.todaySend || 0);
        const remainingMonthlyLimit =
          account.remainingLimit !== undefined
            ? account.remainingLimit
            : Math.max(0, monthlyLimit - monthlyUsed);

        if (numAmount > remainingMonthlyLimit) {
          errors.amount = `Amount exceeds remaining monthly limit (৳${remainingMonthlyLimit.toLocaleString('en-US')}). Monthly limit is max ৳${monthlyLimit.toLocaleString('en-US')}`;
        }
      } else if (numAmount > monthlyLimit) {
        errors.amount = `Amount exceeds maximum monthly send limit of ৳${monthlyLimit.toLocaleString('en-US')}`;
      }
    }
  }

  // 3. Counterparty validation (Phone, Sakil, Shop bill, Note)
  const trimmedTarget = targetNumber.trim();
  if (type !== 'adjustment' && type !== 'co') {
    if (!trimmedTarget) {
      errors.targetNumber =
        type === 'recev' || type === 'receive_money' || type === 'cash_in'
          ? 'Sender Number / Name is required'
          : 'Recipient Number / Counterparty is required';
    }
  }

  // 4. Margin validation (>= 0)
  if (marginStr.trim()) {
    const numMargin = parseFloat(marginStr.replace(/[^0-9.]/g, ''));
    if (isNaN(numMargin) || numMargin < 0) {
      errors.margin = 'Margin cannot be negative';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
    warnings,
  };
};

export interface AccountValidationResult {
  isValid: boolean;
  errors: {
    name?: string;
    accountNumber?: string;
    initialBalance?: string;
    monthlyLimit?: string;
    dailyLimit?: string;
  };
}

export const validateAccount = (
  name: string,
  accountNumber: string,
  initialBalanceStr: string,
  dailyLimitStr: string,
  existingAccounts: Account[],
  currentAccountId?: string,
  monthlyLimitStr?: string
): AccountValidationResult => {
  const errors: AccountValidationResult['errors'] = {};

  // 1. Name validation
  const trimmedName = name.trim();
  if (!trimmedName) {
    errors.name = 'Account / SIM name is required';
  } else if (trimmedName.length < 2) {
    errors.name = 'Name must be at least 2 characters long';
  }

  // 2. Account number / shortcode validation
  const trimmedNumber = accountNumber.trim();
  if (!trimmedNumber) {
    errors.accountNumber = 'SIM phone number or shortcode is required';
  } else {
    const normalizedInput = normalizePhoneNumber(trimmedNumber);
    const isDuplicate = existingAccounts.some((acc) => {
      if (acc.id === currentAccountId) return false;
      const normalizedExisting = normalizePhoneNumber(acc.accountNumber);
      return (
        (normalizedInput.length >= 8 && normalizedExisting === normalizedInput) ||
        acc.accountNumber.trim().toLowerCase() === trimmedNumber.toLowerCase()
      );
    });
    if (isDuplicate) {
      errors.accountNumber = 'This phone number already exists in your accounts';
    }
  }

  // 3. Initial balance validation
  if (initialBalanceStr.trim()) {
    const numBalance = parseFloat(initialBalanceStr.replace(/[^0-9.]/g, ''));
    if (isNaN(numBalance) || numBalance < 0) errors.initialBalance = 'Initial balance must be ৳0 or more';
  }

  // 4. Daily limit validation (bKash standard: max ৳50,000)
  if (dailyLimitStr && dailyLimitStr.trim()) {
    const numDailyLimit = parseFloat(dailyLimitStr.replace(/[^0-9.]/g, ''));
    if (isNaN(numDailyLimit) || numDailyLimit <= 0) {
      errors.dailyLimit = 'Daily limit must be greater than ৳0';
    } else if (numDailyLimit > 50000) {
      errors.dailyLimit = 'Daily limit cannot exceed ৳50,000 for bKash';
    }
  }

  // 5. Monthly limit validation (bKash standard: max ৳300,000)
  if (monthlyLimitStr && monthlyLimitStr.trim()) {
    const numLimit = parseFloat(monthlyLimitStr.replace(/[^0-9.]/g, ''));
    if (isNaN(numLimit) || numLimit <= 0) {
      errors.monthlyLimit = 'Monthly limit must be greater than ৳0';
    } else if (numLimit > 300000) {
      errors.monthlyLimit = 'Monthly limit cannot exceed ৳300,000 for bKash';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};