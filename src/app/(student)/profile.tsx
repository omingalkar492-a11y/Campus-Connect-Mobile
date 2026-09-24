import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  Platform,
} from 'react-native';

import { CampusTheme } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useAppTheme } from '@/context/theme-context';
import { DEMO_PROFILES, SEED_COLLEGES } from '@/services/seed-data';

export default function ProfileScreen() {
  const router = useRouter();
  const { profile, college, logout } = useAuth();
  const { isDark, toggleTheme, colors } = useAppTheme();

  const handleSignOut = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <View style={[styles.safeContainer, { backgroundColor: '#0A0010' }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        {/* TOP PROFILE CARD */}
        <View style={[styles.profileCard, { backgroundColor: 'rgba(196,170,255,0.07)', borderColor: 'rgba(196,170,255,0.2)' }]}>
          <View style={[styles.avatarCircle, { backgroundColor: '#9B5CFF' }]}>
            <Text style={[styles.avatarInitial, { color: isDark ? '#FFFFFF' : '#FFFFFF' }]}>
              {profile?.name?.charAt(0).toUpperCase() || 'A'}
            </Text>
          </View>

          <Text style={[styles.studentName, { color: '#FFFFFF' }]}>
            {profile?.name || 'Aarav Kulkarni'}
          </Text>
          <Text style={[styles.studentEmail, { color: 'rgba(255,255,255,0.45)' }]}>
            {profile?.email || 'student@jspm.edu'}
          </Text>

          <View style={[styles.roleBadge, { backgroundColor: 'rgba(196,170,255,0.12)' }]}>
            <Text style={[styles.roleBadgeText, { color: '#C4AAFF' }]}>
              {profile?.role === 'student' ? 'Student' : profile?.role?.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* SETTINGS SECTIONS */}
        <View style={styles.settingsGroup}>
          {/* Campus */}
          <View style={[styles.settingItem, { backgroundColor: 'transparent', borderColor: 'rgba(196,170,255,0.1)' }]}>
            <View style={[styles.settingIconBox, { backgroundColor: 'rgba(196,170,255,0.1)' }]}>
              <Ionicons name="business" size={20} color="#C4AAFF" />
            </View>
            <View style={styles.settingContent}>
              <Text style={[styles.settingTitle, { color: '#FFFFFF' }]}>Campus</Text>
              <Text style={[styles.settingValue, { color: 'rgba(255,255,255,0.45)' }]}>
                {college?.shortName || 'JSPM Tathawade'} • {college?.city || 'Pune'}
              </Text>
            </View>
          </View>

          {/* Access / Academics */}
          <View style={[styles.settingItem, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={[styles.settingIconBox, { backgroundColor: colors.primaryDim }]}>
              <Ionicons name="school" size={20} color={colors.primary} />
            </View>
            <View style={styles.settingContent}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>Access</Text>
              <Text style={[styles.settingValue, { color: colors.textMuted }]}>
                {profile?.department || 'Information Technology'} · {profile?.division || 'Div A'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </View>

          {/* Appearance / Light Mode Toggle */}
          <View style={[styles.settingItem, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={[styles.settingIconBox, { backgroundColor: colors.primaryDim }]}>
              <Ionicons
                name={isDark ? 'moon' : 'sunny'}
                size={20}
                color={colors.primary}
              />
            </View>
            <View style={styles.settingContent}>
              <Text style={[styles.settingTitle, { color: colors.text }]}>Appearance</Text>
              <Text style={[styles.settingValue, { color: colors.textMuted }]}>
                {isDark ? 'Dark mode (active)' : 'Light mode (active)'}
              </Text>
            </View>
            <Switch
              value={!isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: '#2C4236', true: colors.primary }}
              thumbColor={isDark ? '#FFFFFF' : '#FFFFFF'}
            />
          </View>

        </View>

        {/* SIGN OUT BUTTON (Matches ui_ref7.png) */}
        <Pressable style={styles.signOutBtn} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color={CampusTheme.colors.danger} />
          <Text style={styles.signOutText}>Sign out of Campus Connect</Text>
        </Pressable>

        {/* FOOTER */}
        <Text style={styles.footerText}>
          Campus Connect • multi-college ready
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#0A0010',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 54,
    paddingBottom: 40,
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  profileCard: {
    backgroundColor: 'rgba(196,170,255,0.07)',
    borderRadius: 24,
    paddingVertical: 26,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(196,170,255,0.2)',
    marginBottom: 26,
    ...CampusTheme.shadows.card,
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#C4AAFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatarInitial: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  studentName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  studentEmail: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 14,
  },
  roleBadge: {
    backgroundColor: 'rgba(196,170,255,0.08)',
    borderRadius: 9999,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(196,170,255,0.25)',
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#C4AAFF',
  },
  settingsGroup: {
    backgroundColor: 'rgba(196,170,255,0.06)',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(196,170,255,0.12)',
    marginBottom: 28,
    ...CampusTheme.shadows.card,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  settingIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(196,170,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  settingValue: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 2,
    fontWeight: '500',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 18,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(248, 113, 113, 0.35)',
    backgroundColor: 'rgba(248, 113, 113, 0.06)',
    marginBottom: 20,
  },
  signOutText: {
    color: CampusTheme.colors.danger,
    fontSize: 15,
    fontWeight: '800',
  },
  footerText: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 480,
    borderWidth: 1,
    borderColor: 'rgba(196,170,255,0.15)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modalHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    lineHeight: 18,
    marginBottom: 18,
  },
  roleList: {
    gap: 10,
  },
  roleChoice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(196,170,255,0.08)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(196,170,255,0.12)',
  },
  roleChoiceText: {
    flex: 1,
  },
  roleChoiceName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  roleChoiceSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 2,
  },
});
