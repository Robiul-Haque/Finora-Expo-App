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
  primary: '#2563EB', // Modern Indigo Blue
  primaryDark: '#1D4ED8',
  primaryLight: '#EFF6FF',
  accent: '#3B82F6',
  background: '#F8FAFC', // Soft slate background
  card: '#FFFFFF',
  cardSecondary: '#F1F5F9',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  divider: '#F1F5F9',
  success: '#059669', // Soft rich emerald for crisp clear text
  successLight: '#ECFDF5', // Gentle pastel mint background
  danger: '#E11D48', // Soft rose-coral red for comfortable contrast
  dangerLight: '#FFF1F2', // Gentle pastel rose background
  warning: '#D97706', // Soft amber for high legibility
  warningLight: '#FFFBEB',
  inputBg: '#F8FAFC',
  tabBarBg: '#FFFFFF',
  tabBarActive: '#2563EB',
  tabBarInactive: '#94A3B8',
  progressBarBg: '#E2E8F0',
  statusBar: 'dark',
};

export const darkTheme: ThemeColors = {
  primary: '#3B82F6', // Electric Blue
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
  success: '#34D399', // Soft bright mint for high dark-mode contrast
  successLight: 'rgba(16, 185, 129, 0.15)',
  danger: '#FB7185', // Soft coral rose for clear dark-mode readability
  dangerLight: 'rgba(225, 29, 72, 0.15)',
  warning: '#FBBF24', // Soft warm amber
  warningLight: 'rgba(217, 119, 6, 0.15)',
  inputBg: '#111827',
  tabBarBg: '#131A2A',
  tabBarActive: '#60A5FA',
  tabBarInactive: '#64748B',
  progressBarBg: '#2A364F',
  statusBar: 'light',
};
