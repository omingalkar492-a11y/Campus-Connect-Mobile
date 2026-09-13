import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';

import {
  CampusTheme,
  DarkThemeColors,
  LightThemeColors,
} from '@/constants/theme';

export type ThemeMode = 'dark' | 'light';

interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
  colors: typeof DarkThemeColors;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const STORAGE_KEY = 'cc_theme_mode';

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  isDark: true,
  colors: DarkThemeColors,
  toggleTheme: () => {},
  setTheme: () => {},
});

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('dark');

  // Load saved theme on mount
  useEffect(() => {
    (async () => {
      try {
        let saved: string | null = null;
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
          saved = window.localStorage.getItem(STORAGE_KEY);
        } else {
          saved = await AsyncStorage.getItem(STORAGE_KEY);
        }

        if (saved === 'light' || saved === 'dark') {
          applyTheme(saved as ThemeMode);
        }
      } catch (e) {
        console.warn('Error loading theme:', e);
      }
    })();
  }, []);

  const applyTheme = (mode: ThemeMode) => {
    setThemeState(mode);

    // Update CampusTheme colors object in place for backward compatibility
    const targetColors = mode === 'light' ? LightThemeColors : DarkThemeColors;
    Object.assign(CampusTheme.colors, targetColors);

    // Apply HTML classes on web
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const root = document.documentElement;
      const body = document.body;
      if (mode === 'light') {
        root.classList.add('light-theme');
        root.classList.remove('dark-theme');
        body.classList.add('light-theme');
        body.classList.remove('dark-theme');
        root.setAttribute('data-theme', 'light');
      } else {
        root.classList.add('dark-theme');
        root.classList.remove('light-theme');
        body.classList.add('dark-theme');
        body.classList.remove('light-theme');
        root.setAttribute('data-theme', 'dark');
      }
    }
  };

  const setTheme = async (mode: ThemeMode) => {
    applyTheme(mode);
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_KEY, mode);
      }
      await AsyncStorage.setItem(STORAGE_KEY, mode);
    } catch {}
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  const isDark = theme === 'dark';
  const colors = isDark ? DarkThemeColors : LightThemeColors;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark,
        colors,
        toggleTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useAppTheme = () => useContext(ThemeContext);
