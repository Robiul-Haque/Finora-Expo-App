export interface ThemeColors {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  accent: string;
  background: string;
  card: string;
  cardSecondary: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  divider: string;
  success: string;
  successLight: string;
  danger: string;
  dangerLight: string;
  warning: string;
  warningLight: string;
  inputBg: string;
  tabBarBg: string;
  tabBarActive: string;
  tabBarInactive: string;
  progressBarBg: string;
  statusBar: 'light' | 'dark';
}

export const lightTheme: ThemeColors = {
  primary: '#1D4ED8', // Deep Vibrant Blue
  primaryDark: '#1E40AF',
  primaryLight: '#EFF6FF',
  accent: '#2563EB',
  background: '#F1F5F9', // Crisp slate background
  card: '#FFFFFF',
  cardSecondary: '#F8FAFC',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  divider: '#F1F5F9',
  success: '#10B981', // Emerald Profit Green
  successLight: '#ECFDF5',
  danger: '#EF4444', // Red Expense
  dangerLight: '#FEF2F2',
  warning: '#F59E0B',
  warningLight: '#FFFBEB',
  inputBg: '#F8FAFC',
  tabBarBg: '#FFFFFF',
  tabBarActive: '#1D4ED8',
  tabBarInactive: '#94A3B8',
  progressBarBg: '#E2E8F0',
  statusBar: 'dark',
};

export const darkTheme: ThemeColors = {
  primary: '#3B82F6', // Electric Indigo Blue
  primaryDark: '#1D4ED8',
  primaryLight: '#1E293B',
  accent: '#60A5FA',
  background: '#0B0F19', // Deep dark navy/slate
  card: '#161F30',
  cardSecondary: '#1E293B',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  border: '#2A364F',
  divider: '#1E293B',
  success: '#34D399',
  successLight: '#064E3B',
  danger: '#F87171',
  dangerLight: '#7F1D1D',
  warning: '#FBBF24',
  warningLight: '#78350F',
  inputBg: '#111827',
  tabBarBg: '#131A2A',
  tabBarActive: '#60A5FA',
  tabBarInactive: '#64748B',
  progressBarBg: '#2A364F',
  statusBar: 'light',
};
