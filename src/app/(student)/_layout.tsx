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
            backgroundColor: '#0D0018',
            borderTopColor: 'rgba(196,170,255,0.15)',
          },
        ],
        tabBarShowLabel: true,
        tabBarActiveTintColor: '#C4AAFF',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.3)',
        tabBarLabelStyle: styles.tabLabel,
        sceneStyle: { backgroundColor: '#0A0010' },
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
                focused && { backgroundColor: 'rgba(196,170,255,0.2)' },
              ]}
            >
              <Ionicons
                name={focused ? 'home' : 'home-outline'}
                size={20}
                color={focused ? '#C4AAFF' : 'rgba(255,255,255,0.3)'}
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
                focused && { backgroundColor: 'rgba(196,170,255,0.2)' },
              ]}
            >
              <Ionicons
                name={focused ? 'compass' : 'compass-outline'}
                size={22}
                color={focused ? '#C4AAFF' : 'rgba(255,255,255,0.3)'}
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
                focused && { backgroundColor: 'rgba(196,170,255,0.2)' },
              ]}
            >
              <Ionicons
                name={focused ? 'restaurant' : 'restaurant-outline'}
                size={20}
                color={focused ? '#C4AAFF' : 'rgba(255,255,255,0.3)'}
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
                focused && { backgroundColor: 'rgba(196,170,255,0.2)' },
              ]}
            >
              <Ionicons
                name={focused ? 'calendar' : 'calendar-outline'}
                size={20}
                color={focused ? '#C4AAFF' : 'rgba(255,255,255,0.3)'}
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
                focused && { backgroundColor: 'rgba(196,170,255,0.2)' },
              ]}
            >
              <Ionicons
                name={focused ? 'person-circle' : 'person-circle-outline'}
                size={22}
                color={focused ? '#C4AAFF' : 'rgba(255,255,255,0.3)'}
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
    backgroundColor: '#0D0018',
    borderTopWidth: 1,
    borderTopColor: 'rgba(196,170,255,0.15)',
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
