import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';

import { CampusTheme } from '@/constants/theme';
import { useAppTheme } from '@/context/theme-context';

export default function StudentTabLayout() {
  const { colors, isDark } = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: colors.tabBarBg,
            borderTopColor: colors.tabBarBorder,
          },
        ],
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <View
              style={[
                styles.iconWrapper,
                focused && { backgroundColor: colors.primary },
              ]}
            >
              <Ionicons
                name={focused ? 'home' : 'home-outline'}
                size={20}
                color={focused ? (isDark ? '#0B110E' : '#FFFFFF') : colors.textMuted}
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="campus"
        options={{
          title: 'Campus',
          tabBarIcon: ({ focused }) => (
            <View
              style={[
                styles.iconWrapper,
                focused && { backgroundColor: colors.primary },
              ]}
            >
              <Ionicons
                name={focused ? 'compass' : 'compass-outline'}
                size={22}
                color={focused ? (isDark ? '#0B110E' : '#FFFFFF') : colors.textMuted}
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="canteen"
        options={{
          title: 'Canteen',
          tabBarIcon: ({ focused }) => (
            <View
              style={[
                styles.iconWrapper,
                focused && { backgroundColor: colors.primary },
              ]}
            >
              <Ionicons
                name={focused ? 'restaurant' : 'restaurant-outline'}
                size={20}
                color={focused ? (isDark ? '#0B110E' : '#FFFFFF') : colors.textMuted}
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="schedule"
        options={{
          title: 'Schedule',
          tabBarIcon: ({ focused }) => (
            <View
              style={[
                styles.iconWrapper,
                focused && { backgroundColor: colors.primary },
              ]}
            >
              <Ionicons
                name={focused ? 'calendar' : 'calendar-outline'}
                size={20}
                color={focused ? (isDark ? '#0B110E' : '#FFFFFF') : colors.textMuted}
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <View
              style={[
                styles.iconWrapper,
                focused && { backgroundColor: colors.primary },
              ]}
            >
              <Ionicons
                name={focused ? 'person-circle' : 'person-circle-outline'}
                size={22}
                color={focused ? (isDark ? '#0B110E' : '#FFFFFF') : colors.textMuted}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#0E1713',
    borderTopWidth: 1,
    borderTopColor: 'rgba(142, 228, 175, 0.12)',
    height: Platform.OS === 'ios' ? 88 : 72,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  iconWrapper: {
    width: 44,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIconWrapper: {
    backgroundColor: CampusTheme.colors.primary,
  },
});
