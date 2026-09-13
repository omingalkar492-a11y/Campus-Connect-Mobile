import { Redirect } from 'expo-router';
import React from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';

import { CampusTheme } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';

export default function Index() {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: CampusTheme.colors.background,
          justifyContent: 'center',
          alignItems: 'center',
          ...(Platform.OS === 'web' ? { minHeight: '100vh' as any } : {}),
        }}
      >
        <ActivityIndicator size="large" color={CampusTheme.colors.primary} />
      </View>
    );
  }

  if (!profile) {
    return <Redirect href={'/login' as any} />;
  }

  switch (profile.role) {
    case 'student':
      return <Redirect href={'/(student)' as any} />;
    case 'college_admin':
      return <Redirect href={'/admin' as any} />;
    case 'food_court_staff':
      return <Redirect href={'/food-court' as any} />;
    case 'teacher_staff':
      return <Redirect href={'/staff' as any} />;
    case 'super_admin':
      return <Redirect href={'/super-admin' as any} />;
    default:
      return <Redirect href={'/login' as any} />;
  }
}