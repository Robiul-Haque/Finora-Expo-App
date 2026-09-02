/**
 * Shared formatting utilities for Finora Expo App
 */

/**
 * Formats numeric value into standard Bangladeshi Taka currency format (e.g. ৳ 50,000)
 */
export const formatCurrency = (val: number | string | undefined | null): string => {
  const num = typeof val === 'number' ? val : Number(val || 0);
  if (isNaN(num)) return '৳ 0';
  return '৳ ' + num.toLocaleString('en-US');
};

/**
 * Safely parses any date input (ISO strings, Excel serial numbers, malformed dates like '2026-08-1.0T...')
 * Always returns a valid Date object.
 */
export const parseDate = (dateVal: string | number | Date | undefined | null): Date => {
  if (!dateVal) return new Date();
  if (dateVal instanceof Date) return isNaN(dateVal.getTime()) ? new Date() : dateVal;

  if (typeof dateVal === 'number') {
    // If it looks like an Excel serial date (e.g. 46000)
    if (dateVal > 30000 && dateVal < 60000) {
      const utcDays = dateVal - 25569;
      return new Date(utcDays * 86400 * 1000);
    }
    // Unix timestamp in ms or seconds
    const fromNum = new Date(dateVal < 10000000000 ? dateVal * 1000 : dateVal);
    return isNaN(fromNum.getTime()) ? new Date() : fromNum;
  }

  let str = String(dateVal).trim();
  if (!str) return new Date();

  // Try standard parse first
  let d = new Date(str);
  if (!isNaN(d.getTime())) {
    return d;
  }

  // Handle malformed strings like "2026-08-1.0T10:00:00.000Z" or "2026-08-46030.0T10:00:00.000Z"
  const match = str.match(/^(\d{4})-(\d{1,2})-(\d+(\.\d+)?)T?(.*)$/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const rawDay = parseFloat(match[3]);

    // If rawDay is an Excel serial number like 46030
    if (rawDay > 30000 && rawDay < 60000) {
      const utcDays = rawDay - 25569;
      const excelDate = new Date(utcDays * 86400 * 1000);
      if (!isNaN(excelDate.getTime())) return excelDate;
    }

    const day = Math.max(1, Math.min(31, Math.floor(rawDay) || 1));
    const timePart = match[5] || '10:00:00';
    const cleanTime = timePart.replace(/Z$/, '').split(':');
    const hours = parseInt(cleanTime[0], 10) || 10;
    const minutes = parseInt(cleanTime[1], 10) || 0;

    d = new Date(year, month, day, hours, minutes);
    if (!isNaN(d.getTime())) return d;
  }

  // Pure numeric string
  const num = parseFloat(str);
  if (!isNaN(num) && isFinite(num)) {
    if (num > 30000 && num < 60000) {
      const fromExcel = new Date((num - 25569) * 86400 * 1000);
      if (!isNaN(fromExcel.getTime())) return fromExcel;
    }
    const fromNum = new Date(num < 10000000000 ? num * 1000 : num);
    if (!isNaN(fromNum.getTime())) return fromNum;
  }

  return new Date();
};

/**
 * Formats an ISO date string into time format (e.g. 02:30 PM)
 */
export const formatTime = (dateVal: string | number | Date | undefined | null): string => {
  try {
    const d = parseDate(dateVal);
    const str = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return str.includes('Invalid') ? '12:00 PM' : str;
  } catch {
    return '12:00 PM';
  }
};

/**
 * Formats an ISO date string into short readable date (e.g. Oct 12, 2026)
 */
export const formatDate = (dateVal: string | number | Date | undefined | null): string => {
  try {
    const d = parseDate(dateVal);
    const str = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return str.includes('Invalid') ? 'Today' : str;
  } catch {
    return 'Today';
  }
};

/**
 * Formats an ISO date string into formatted date + time (e.g. 23 Aug, 10:32 AM)
 */
export const formatDateTime = (dateVal: string | number | Date | undefined | null): string => {
  try {
    const d = parseDate(dateVal);
    const datePart = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const timePart = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (datePart.includes('Invalid') || timePart.includes('Invalid')) {
      return 'Today';
    }
    return `${datePart}, ${timePart}`;
  } catch {
    return 'Today';
  }
};
