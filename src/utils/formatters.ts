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
 * Formats an ISO date string into time format (e.g. 02:30 PM)
 */
export const formatTime = (dateStr: string): string => {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

/**
 * Formats an ISO date string into short readable date (e.g. Oct 12, 2026)
 */
export const formatDate = (dateStr: string): string => {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
};

/**
 * Formats an ISO date string into formatted date + time (e.g. 23 Aug, 10:32 AM)
 */
export const formatDateTime = (dateStr: string): string => {
  try {
    const d = new Date(dateStr);
    const datePart = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const timePart = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `${datePart}, ${timePart}`;
  } catch {
    return '';
  }
};
