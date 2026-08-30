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
  primary: '#E2136E', // Iconic bKash Pink
  primaryDark: '#B80854',
  primaryLight: '#FDF2F8', // Soft blush pink background
  accent: '#F43F5E',
  background: '#FAF9FB', // Clean soft background
  card: '#FFFFFF',
  cardSecondary: '#F5F3F7',
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  border: '#EBE7EF',
  divider: '#F5F3F7',
  success: '#059669', // Emerald profit green
  successLight: '#ECFDF5',
  danger: '#E11D48', // Cash out / send expense rose
  dangerLight: '#FFF1F2',
  warning: '#D97706',
  warningLight: '#FFFBEB',
  inputBg: '#FAF9FB',
  tabBarBg: '#FFFFFF',
  tabBarActive: '#E2136E',
  tabBarInactive: '#94A3B8',
  progressBarBg: '#EBE7EF',
  statusBar: 'dark',
};

export const darkTheme: ThemeColors = {
  primary: '#E2136E', // Vibrant bKash Pink
  primaryDark: '#BE123C',
  primaryLight: '#2A1320', // Dark rose tint
  accent: '#F472B6',
  background: '#0D0A14', // Deep obsidian dark slate
  card: '#181324',
  cardSecondary: '#221C33',
  text: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  border: '#2E2642',
  divider: '#221C33',
  success: '#10B981', // Neon emerald for profits
  successLight: 'rgba(16, 185, 129, 0.16)',
  danger: '#FB7185',
  dangerLight: 'rgba(251, 113, 133, 0.16)',
  warning: '#FBBF24',
  warningLight: 'rgba(251, 191, 36, 0.16)',
  inputBg: '#130E1F',
  tabBarBg: '#151020',
  tabBarActive: '#E2136E',
  tabBarInactive: '#64748B',
  progressBarBg: '#2E2642',
  statusBar: 'light',
};