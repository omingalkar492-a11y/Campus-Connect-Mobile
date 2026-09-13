import '@/global.css';

import { Platform } from 'react-native';

export const DarkThemeColors = {
  // Base surfaces
  background: '#0B110E',
  backgroundDarker: '#070A09',
  card: '#14231B',
  cardElevated: '#182C23',
  cardBorder: 'rgba(142, 228, 175, 0.12)',
  cardBorderHover: 'rgba(142, 228, 175, 0.28)',

  // Accents & Brand
  primary: '#8EE4AF', // Muted Mint Green
  primaryHover: '#79D2A6',
  primaryDim: 'rgba(142, 228, 175, 0.15)',
  primaryBorder: 'rgba(142, 228, 175, 0.3)',

  // Secondary & Pills
  pillInactiveBg: '#1B2C23',
  pillInactiveText: '#DCE6E1',
  pillActiveBg: '#8EE4AF',
  pillActiveText: '#0B110E',

  // Text hierarchy
  text: '#F3F4F6',
  textMuted: '#8DA297',
  textDim: '#5B7266',
  textMint: '#8EE4AF',

  // Status colors
  success: '#34D399',
  successBg: 'rgba(52, 211, 153, 0.15)',
  warning: '#FBBF24',
  warningBg: 'rgba(251, 191, 36, 0.15)',
  danger: '#F87171',
  dangerBg: 'rgba(248, 113, 113, 0.15)',
  info: '#60A5FA',

  // Stepper dots & chrome
  stepActive: '#8EE4AF',
  stepInactive: '#2C4236',
  tabBarBg: '#0E1713',
  tabBarBorder: 'rgba(142, 228, 175, 0.12)',
  inputBg: '#0E1712',
  inputBorder: 'rgba(142, 228, 175, 0.25)',
};

export const LightThemeColors = {
  // Base surfaces (Soft campus mint/linen)
  background: '#F6F9F7',
  backgroundDarker: '#EDF4EF',
  card: '#FFFFFF',
  cardElevated: '#FFFFFF',
  cardBorder: 'rgba(21, 128, 61, 0.12)',
  cardBorderHover: 'rgba(21, 128, 61, 0.25)',

  // Accents & Brand (Deep crisp emerald green)
  primary: '#15803D',
  primaryHover: '#166534',
  primaryDim: 'rgba(21, 128, 61, 0.12)',
  primaryBorder: 'rgba(21, 128, 61, 0.3)',

  // Secondary & Pills
  pillInactiveBg: '#E8F3ED',
  pillInactiveText: '#1E3A2B',
  pillActiveBg: '#15803D',
  pillActiveText: '#FFFFFF',

  // Text hierarchy
  text: '#0F1E17',
  textMuted: '#4B6356',
  textDim: '#71887C',
  textMint: '#15803D',

  // Status colors
  success: '#10B981',
  successBg: 'rgba(16, 185, 129, 0.12)',
  warning: '#D97706',
  warningBg: 'rgba(217, 119, 6, 0.12)',
  danger: '#EF4444',
  dangerBg: 'rgba(239, 68, 68, 0.12)',
  info: '#2563EB',

  // Stepper dots & chrome
  stepActive: '#15803D',
  stepInactive: '#D1E5DA',
  tabBarBg: '#FFFFFF',
  tabBarBorder: 'rgba(21, 128, 61, 0.12)',
  inputBg: '#FFFFFF',
  inputBorder: 'rgba(21, 128, 61, 0.25)',
};

export const CampusTheme = {
  colors: { ...DarkThemeColors },
  radii: {
    xs: 6,
    sm: 10,
    md: 16,
    lg: 22,
    xl: 28,
    pill: 9999,
  },
  shadows: {
    card: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 6,
    },
    glow: {
      shadowColor: '#8EE4AF',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
      elevation: 8,
    },
  },
};

export const Colors = {
  light: {
    text: LightThemeColors.text,
    background: LightThemeColors.background,
    backgroundElement: LightThemeColors.card,
    backgroundSelected: LightThemeColors.pillInactiveBg,
    textSecondary: LightThemeColors.textMuted,
  },
  dark: {
    text: DarkThemeColors.text,
    background: DarkThemeColors.background,
    backgroundElement: DarkThemeColors.card,
    backgroundSelected: DarkThemeColors.cardElevated,
    textSecondary: DarkThemeColors.textMuted,
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
    serif: 'var(--font-serif, Georgia, serif)',
    rounded: 'var(--font-rounded, sans-serif)',
    mono: 'var(--font-mono, monospace)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
