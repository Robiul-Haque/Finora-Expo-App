import { Account, TransactionType } from '../types/ledger';

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
  marginStr: string
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

    // Limit check for Send Money (Sm)
    if ((type === 'sm' || type === 'send_money') && numAmount > 0) {
      const remainingLimit =
        account.remainingLimit !== undefined
          ? account.remainingLimit
          : Math.max(0, (account.monthlyLimit || 300000) - (account.monthlyLimitUsed || account.todaySend || 0));
      if (numAmount > remainingLimit) {
        warnings.amount = `Amount exceeds remaining monthly limit (৳${remainingLimit.toLocaleString('en-US')})`;
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
  monthlyLimitStr: string,
  existingAccounts: Account[],
  currentAccountId?: string
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
    const isDuplicate = existingAccounts.some(
      (acc) => acc.id !== currentAccountId && acc.accountNumber === trimmedNumber
    );
    if (isDuplicate) {
      errors.accountNumber = 'An account with this number already exists';
    }
  }

  // 3. Initial balance validation
  if (initialBalanceStr.trim()) {
    const numBalance = parseFloat(initialBalanceStr.replace(/[^0-9.]/g, ''));
    if (isNaN(numBalance) || numBalance < 0) errors.initialBalance = 'Initial balance must be ৳0 or more';
  }

  // 4. Monthly limit validation
  if (monthlyLimitStr.trim()) {
    const numLimit = parseFloat(monthlyLimitStr.replace(/[^0-9.]/g, ''));
    if (isNaN(numLimit) || numLimit <= 0) {
      errors.monthlyLimit = 'Monthly limit must be greater than ৳0';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};