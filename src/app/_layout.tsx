import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';

import { AuthProvider } from '@/context/auth-context';
import { AppThemeProvider, useAppTheme } from '@/context/theme-context';

function NavigationStack() {
  const { isDark, colors } = useAppTheme();

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(student)" />
        <Stack.Screen name="admin" />
        <Stack.Screen name="food-court" />
        <Stack.Screen name="staff" />
        <Stack.Screen name="super-admin" />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <AuthProvider>
        <NavigationStack />
      </AuthProvider>
    </AppThemeProvider>
  );
}

