import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CampusTheme } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { DataService } from '@/services/data-service';
import { College } from '@/types';

export default function SuperAdminScreen() {
  const router = useRouter();
  const { profile, logout } = useAuth();

  const [colleges, setColleges] = useState<College[]>([]);

  useEffect(() => {
    const loadColleges = async () => {
      const cols = await DataService.getColleges();
      setColleges(cols);
    };
    loadColleges();
  }, []);

  return (
    <View style={styles.safeContainer}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.badge}>
            <Ionicons name="planet" size={18} color={CampusTheme.colors.background} />
          </View>
          <View>
            <Text style={styles.headerTitle}>SUPER ADMIN PLATFORM</Text>
            <Text style={styles.headerSub}>Campus Connect Core Multi-Tenant Platform</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <Pressable style={styles.portalBtn} onPress={() => router.replace('/login')}>
            <Ionicons name="swap-horizontal" size={15} color={CampusTheme.colors.primary} />
            <Text style={styles.portalBtnText}>Portals</Text>
          </Pressable>
          <Pressable style={styles.logoutBtn} onPress={logout}>
            <Ionicons name="log-out-outline" size={18} color={CampusTheme.colors.danger} />
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.sectionTitle}>Network of Campuses</Text>
        <Text style={styles.sectionSub}>Active institutional tenants operating on Campus Connect</Text>

        <View style={styles.collegesList}>
          {colleges.map((col) => (
            <View key={col.id} style={styles.collegeCard}>
              <View style={styles.collegeTop}>
                <View style={styles.collegeLogo}>
                  <Text style={styles.collegeCode}>{col.code}</Text>
                </View>
                <View style={styles.collegeInfo}>
                  <Text style={styles.collegeName}>{col.name}</Text>
                  <Text style={styles.collegeLocation}>
                    {col.city}, {col.state}
                  </Text>
                </View>
                <View style={styles.activePill}>
                  <Text style={styles.activePillText}>{col.active ? 'ACTIVE' : 'INACTIVE'}</Text>
                </View>
              </View>

              <Text style={styles.collegeTagline}>{col.tagline}</Text>

              <View style={styles.collegeBottomRow}>
                <Text style={styles.tenantIdText}>Tenant ID: {col.id}</Text>
                <Pressable style={styles.manageBtn}>
                  <Text style={styles.manageBtnText}>Manage Tenant</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>

        {/* Platform Governance */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>System Status & Governance</Text>
        <View style={styles.statusGrid}>
          <View style={styles.statusCard}>
            <Ionicons name="shield-checkmark" size={24} color={CampusTheme.colors.primary} />
            <Text style={styles.statusTitle}>Tenant Isolation</Text>
            <Text style={styles.statusSub}>Enforced via Firestore Rules</Text>
          </View>

          <View style={styles.statusCard}>
            <Ionicons name="key" size={24} color="#FBBF24" />
            <Text style={styles.statusTitle}>OTP Verification</Text>
            <Text style={styles.statusSub}>Zero-knowledge counter validation</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: CampusTheme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#0E1713',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(142, 228, 175, 0.12)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#A78BFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: CampusTheme.colors.text,
    letterSpacing: 0.5,
  },
  headerSub: {
    fontSize: 11,
    color: CampusTheme.colors.textMuted,
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  portalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#162820',
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.2)',
  },
  portalBtnText: {
    color: CampusTheme.colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  logoutBtn: {
    padding: 6,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 18,
    paddingBottom: 40,
    maxWidth: 680,
    alignSelf: 'center',
    width: '100%',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: CampusTheme.colors.text,
  },
  sectionSub: {
    fontSize: 13,
    color: CampusTheme.colors.textMuted,
    marginTop: 2,
    marginBottom: 16,
  },
  collegesList: {
    gap: 14,
  },
  collegeCard: {
    backgroundColor: '#15251E',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.15)',
    ...CampusTheme.shadows.card,
  },
  collegeTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  collegeLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1A3327',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: CampusTheme.colors.primary,
  },
  collegeCode: {
    fontSize: 12,
    fontWeight: '900',
    color: CampusTheme.colors.primary,
  },
  collegeInfo: {
    flex: 1,
  },
  collegeName: {
    fontSize: 16,
    fontWeight: '800',
    color: CampusTheme.colors.text,
  },
  collegeLocation: {
    fontSize: 12,
    color: CampusTheme.colors.textMuted,
    marginTop: 2,
  },
  activePill: {
    backgroundColor: CampusTheme.colors.primaryDim,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activePillText: {
    fontSize: 10,
    fontWeight: '800',
    color: CampusTheme.colors.primary,
  },
  collegeTagline: {
    fontSize: 12,
    color: CampusTheme.colors.textMuted,
    fontStyle: 'italic',
    marginBottom: 14,
  },
  collegeBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 10,
  },
  tenantIdText: {
    fontSize: 11,
    color: CampusTheme.colors.textDim,
  },
  manageBtn: {
    backgroundColor: '#1C3328',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.2)',
  },
  manageBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: CampusTheme.colors.primary,
  },
  statusGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statusCard: {
    flex: 1,
    backgroundColor: '#15251E',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.12)',
    alignItems: 'center',
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: CampusTheme.colors.text,
    marginTop: 8,
    textAlign: 'center',
  },
  statusSub: {
    fontSize: 11,
    color: CampusTheme.colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
});
