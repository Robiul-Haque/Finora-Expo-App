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
  primary: '#1A73E8', // Stitch Precision Blue (#1a73e8 / #005bbf)
  primaryDark: '#005BBF',
  primaryLight: '#E8F0FE', // Light blue tint
  accent: '#005BC0',
  background: '#F8F9FA', // Stitch warm clean surface background
  card: '#FFFFFF', // Clean white card surface
  cardSecondary: '#F3F4F5', // surface-container-low
  text: '#191C1D', // on-surface deep charcoal
  textSecondary: '#414754', // on-surface-variant
  textMuted: '#727785', // outline
  border: '#E8EAED', // outline-variant
  divider: '#EDEEEF', // surface-container
  success: '#006E2C', // Stitch Emerald Green (#006e2c / #34a853)
  successLight: '#E6F4EA',
  danger: '#BA1A1A', // Stitch Error Red
  dangerLight: '#FFDAD6',
  warning: '#E37400',
  warningLight: '#FEF7E0',
  inputBg: '#F1F3F4',
  tabBarBg: '#FFFFFF',
  tabBarActive: '#1A73E8',
  tabBarInactive: '#727785',
  progressBarBg: '#E1E3E4',
  statusBar: 'dark',
};

export const darkTheme: ThemeColors = {
  primary: '#1A73E8', // Vibrant Blue like light mode
  primaryDark: '#005BBF',
  primaryLight: 'rgba(26, 115, 232, 0.2)',
  accent: '#005BC0',
  background: '#191C1D', // on-surface as dark base
  card: '#26292B', // inverse-surface refined
  cardSecondary: '#1E2122',
  text: '#F0F1F2', // inverse-on-surface
  textSecondary: '#C1C6D6',
  textMuted: '#8A909E',
  border: '#3E4347',
  divider: '#2C3032',
  success: '#00C853', // vibrant emerald
  successLight: 'rgba(0, 200, 83, 0.2)',
  danger: '#FF5252',
  dangerLight: 'rgba(255, 82, 82, 0.2)',
  warning: '#FFB300',
  warningLight: 'rgba(255, 179, 0, 0.2)',
  inputBg: '#2A2E30',
  tabBarBg: '#1E2122',
  tabBarActive: '#1A73E8',
  tabBarInactive: '#8A909E',
  progressBarBg: '#3E4347',
  statusBar: 'light',
};

/**
 * Standard Design System Scale Tokens
 */
export const typography = {
  xs: 10,
  sm: 11,
  md: 13,
  base: 14,
  lg: 16,
  xl: 18,
  xxl: 22,
  display: 28,
} as const;

export const radii = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;