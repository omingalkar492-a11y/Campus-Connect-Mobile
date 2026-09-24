/**
 * Glass + Purple UI Design Tokens
 * Shared across Login and all inner screens.
 */
import { Platform } from 'react-native';

export const Glass = {
  // Backgrounds
  bg: '#0A0010',
  bgLayer: 'rgba(255,255,255,0.07)',
  bgCard: 'rgba(255,255,255,0.06)',
  bgCardHover: 'rgba(255,255,255,0.10)',
  bgInput: 'rgba(255,255,255,0.06)',

  // Borders
  border: 'rgba(255,255,255,0.13)',
  borderFocus: 'rgba(196,170,255,0.75)',
  borderActive: 'rgba(196,170,255,0.45)',

  // Purples & Accents
  purple: '#C4AAFF',
  purpleDim: 'rgba(196,170,255,0.15)',
  purpleBright: '#9B5CFF',
  purplePink: '#FF4BA6',
  purpleGrad: ['#9B5CFF', '#FF4BA6'] as [string, string],

  // Text
  text: '#FFFFFF',
  textSub: 'rgba(255,255,255,0.55)',
  textMuted: 'rgba(255,255,255,0.35)',
  textPurple: '#C4AAFF',
  textTeal: '#64DCC8',

  // Status
  success: '#4BFF8E',
  successDim: 'rgba(75,255,142,0.12)',
  warning: '#FFB84B',
  warningDim: 'rgba(255,184,75,0.12)',
  danger: '#FF6B6B',
  dangerDim: 'rgba(255,107,107,0.12)',
  info: '#4BB8FF',
  infoDim: 'rgba(75,184,255,0.12)',

  // Shadows
  cardShadow: Platform.select({
    web: { boxShadow: '0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)' },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 24,
      elevation: 12,
    },
  }),
  glowShadow: Platform.select({
    web: { boxShadow: '0 0 24px rgba(196,170,255,0.35)' },
    default: {
      shadowColor: '#C4AAFF',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.4,
      shadowRadius: 16,
    },
  }),
  btnShadow: Platform.select({
    web: { boxShadow: '0 8px 32px rgba(155,92,255,0.45)' },
    default: {
      shadowColor: '#9B5CFF',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.5,
      shadowRadius: 20,
      elevation: 10,
    },
  }),
};
