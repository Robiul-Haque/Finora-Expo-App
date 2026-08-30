import { Account, TransactionType } from '../types/ledger';

/**
 * Normalizes a Bangladeshi mobile number (removes +88, 88, spaces, dashes).
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
 * Format phone number with readable spacing (e.g., 01712 345678)
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
    profit?: string;
  };
  warnings?: {
    amount?: string;
  };
}

export const validateTransaction = (account: Account | undefined, type: TransactionType, amountStr: string, targetNumber: string, costStr: string, profitStr: string): TransactionValidationResult => {
  const errors: TransactionValidationResult['errors'] = {};
  const warnings: TransactionValidationResult['warnings'] = {};

  // 1. Account validation (Required)
  if (!account) {
    errors.accountId = 'Please select a valid bKash number';
  } else if (!account.isActive) {
    errors.accountId = 'Selected bKash account is currently inactive';
  }

  // 2. Amount validation (Required: Must be greater than 0)
  const cleanedAmount = amountStr.trim().replace(/[^0-9.]/g, '');
  const numAmount = parseFloat(cleanedAmount);

  if (cleanedAmount === '' || isNaN(numAmount)) {
    errors.amount = 'Amount is required';
  } else if (numAmount <= 0) {
    errors.amount = 'Amount must be greater than ৳0';
  } else if (account) {
    const isOutflow = type === 'send_money' || type === 'cash_out' || type === 'b2b';

    // Balance check for outflows
    if (isOutflow && numAmount > account.balance) {
      errors.amount = `Insufficient float balance! Available: ৳${account.balance.toLocaleString('en-US')}`;
    }

    // Limit check for outflows
    if (isOutflow && numAmount > 0) {
      const remainingLimit = Math.max(0, account.dailyLimit - account.todaySend);
      if (numAmount > remainingLimit) warnings.amount = `Amount exceeds remaining daily limit (৳${remainingLimit.toLocaleString('en-US')})`;
    }

  }

  // 3. Sender / Recipient bKash Number validation (Required)
  const needsTargetNumber = type !== 'adjustment';
  const trimmedTarget = targetNumber.trim();
  if (needsTargetNumber) {
    if (!trimmedTarget) {
      errors.targetNumber = type === 'receive_money' || type === 'cash_in' ? 'Sender bKash number is required' : 'Recipient bKash number is required';
    } else {
      const normalized = normalizePhoneNumber(trimmedTarget);
      if (!isValidBkashNumber(normalized)) errors.targetNumber = 'Please enter a valid 11-digit bKash number (e.g. 017XXXXXXXX)';
    }
  }

  // 4. Cost / Fee validation (Required: Must enter 0 or more)
  const trimmedCost = costStr.trim();
  if (trimmedCost === '') {
    errors.cost = 'Cost / Fee is required (enter ৳0 or fee amount)';
  } else {
    const numCost = parseFloat(trimmedCost.replace(/[^0-9.]/g, ''));
    if (isNaN(numCost) || numCost < 0) {
      errors.cost = 'Cost cannot be negative';
    } else if (!isNaN(numAmount) && numAmount > 0 && numCost > numAmount) {
      errors.cost = 'Cost cannot exceed the transaction amount';
    }
  }

  // 5. Profit / Commission validation (Optional, >= 0)
  if (profitStr.trim()) {
    const numProfit = parseFloat(profitStr.replace(/[^0-9.]/g, ''));
    if (isNaN(numProfit) || numProfit < 0) errors.profit = 'Commission cannot be negative';
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
    dailyLimit?: string;
  };
}

export const validateAccount = (name: string, accountNumber: string, initialBalanceStr: string, dailyLimitStr: string, existingAccounts: Account[], currentAccountId?: string): AccountValidationResult => {
  const errors: AccountValidationResult['errors'] = {};

  // 1. Name validation (Required)
  const trimmedName = name.trim();
  if (!trimmedName) {
    errors.name = 'Account / Number name is required';
  } else if (trimmedName.length < 2) {
    errors.name = 'Name must be at least 2 characters long';
  } else if (trimmedName.length > 40) {
    errors.name = 'Name must not exceed 40 characters';
  }

  // 2. Account number validation (Required)
  const trimmedNumber = accountNumber.trim();
  const normalized = normalizePhoneNumber(trimmedNumber);

  if (!trimmedNumber) {
    errors.accountNumber = 'bKash phone/account number is required';
  } else if (!isValidBkashNumber(normalized)) {
    errors.accountNumber = 'Must be a valid 11-digit bKash number (e.g. 017XXXXXXXX)';
  } else {
    // Unique check
    const isDuplicate = existingAccounts.some((acc) => acc.id !== currentAccountId && normalizePhoneNumber(acc.accountNumber) === normalized);
    if (isDuplicate) errors.accountNumber = 'An account with this bKash number already exists';
  }

  // 3. Initial balance validation (Optional, >= 0)
  if (initialBalanceStr.trim()) {
    const numBalance = parseFloat(initialBalanceStr.replace(/[^0-9.]/g, ''));
    if (isNaN(numBalance) || numBalance < 0) errors.initialBalance = 'Initial balance must be ৳0 or more';
  }

  // 4. Daily limit validation (Required, >= 0)
  if (dailyLimitStr.trim()) {
    const numLimit = parseFloat(dailyLimitStr.replace(/[^0-9.]/g, ''));
    if (isNaN(numLimit) || numLimit < 0) {
      errors.dailyLimit = 'Daily limit must be ৳0 or more';
    } else if (numLimit > 10000000) {
      errors.dailyLimit = 'Daily limit exceeds maximum limit (৳10,000,000)';
    }
  } else {
    errors.dailyLimit = 'Daily send limit is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};