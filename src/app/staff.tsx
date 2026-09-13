import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, Platform } from 'react-native';

import { CampusTheme } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { DataService } from '@/services/data-service';
import { TimetableSlot, Notice } from '@/types';

export default function TeacherStaffScreen() {
  const router = useRouter();
  const { college, profile, logout } = useAuth();

  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);

  useEffect(() => {
    const loadStaffData = async () => {
      if (!college) return;
      try {
        const slots = await DataService.getTimetable(
          college.id,
          profile?.department || 'Information Technology',
          '3rd Year',
          'Div A'
        );
        // Filter slots where faculty matches this instructor
        const mySlots = slots.filter(
          (s) =>
            s.facultyName.includes('Sneha') ||
            s.facultyName === profile?.name ||
            s.facultyId === 'fac_sneha'
        );
        setTimetable(mySlots.length > 0 ? mySlots : slots);

        const nots = await DataService.getNotices(college.id);
        setNotices(nots);
      } catch (e) {
        console.error(e);
      }
    };
    loadStaffData();
  }, [college, profile]);

  return (
    <View style={styles.safeContainer}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.badge}>
            <Ionicons name="school" size={18} color={CampusTheme.colors.background} />
          </View>
          <View>
            <Text style={styles.headerTitle}>FACULTY PORTAL</Text>
            <Text style={styles.headerSub}>
              {profile?.name || 'Prof. Sneha Deshmukh'} • {profile?.department}
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <Pressable style={styles.portalBtn} onPress={() => router.replace('/login')}>
            <Ionicons name="swap-horizontal" size={15} color={CampusTheme.colors.primary} />
            <Text style={styles.portalBtnText}>Switch</Text>
          </Pressable>
          <Pressable style={styles.logoutBtn} onPress={logout}>
            <Ionicons name="log-out-outline" size={18} color={CampusTheme.colors.danger} />
          </Pressable>
        </View>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Class Teacher Announcement Box */}
        {profile?.isClassTeacher && (
          <View style={styles.classTeacherCard}>
            <Ionicons name="ribbon" size={24} color={CampusTheme.colors.primary} />
            <View style={styles.classTeacherInfo}>
              <Text style={styles.classTeacherTitle}>Class Teacher Assignment</Text>
              <Text style={styles.classTeacherSub}>
                3rd Year · Division A ({profile?.department})
              </Text>
            </View>
          </View>
        )}

        {/* Delegated Field Admin Powers Banner */}
        {profile?.permissions && profile.permissions.length > 0 && (
          <View style={styles.delegatedPowersCard}>
            <View style={styles.delegatedTopRow}>
              <View style={styles.delegatedBadge}>
                <Ionicons name="shield-checkmark" size={18} color="#0D1411" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.delegatedTitle}>Delegated Administrative Powers</Text>
                <Text style={styles.delegatedSub}>
                  You have special field-level privileges granted by College Dean:
                </Text>
              </View>
            </View>

            <View style={styles.delegatedButtonsRow}>
              {profile.permissions.includes('canteen_manager') && (
                <Pressable
                  style={styles.delegatedActionBtn}
                  onPress={() => router.push('/food-court')}
                >
                  <Ionicons name="fast-food" size={14} color="#0D1411" />
                  <Text style={styles.delegatedActionBtnText}>Manage Canteen & Menu</Text>
                </Pressable>
              )}

              {profile.permissions.includes('tour_360_curator') && (
                <Pressable
                  style={styles.delegatedActionBtn}
                  onPress={() => router.push('/admin')}
                >
                  <Ionicons name="scan" size={14} color="#0D1411" />
                  <Text style={styles.delegatedActionBtnText}>Upload & Curate 360° Tours</Text>
                </Pressable>
              )}

              {profile.permissions.includes('notices_publisher') && (
                <Pressable
                  style={styles.delegatedActionBtn}
                  onPress={() => router.push('/admin')}
                >
                  <Ionicons name="megaphone" size={14} color="#0D1411" />
                  <Text style={styles.delegatedActionBtnText}>Publish Institutional Notice</Text>
                </Pressable>
              )}
            </View>
          </View>
        )}

        {/* MY TIMETABLE */}
        <Text style={styles.sectionTitle}>My Teaching Timetable</Text>
        <Text style={styles.sectionSub}>Scheduled classes and practical lab sessions</Text>

        <View style={styles.slotsList}>
          {timetable.map((slot) => (
            <View key={slot.id} style={styles.slotCard}>
              <View style={styles.slotTop}>
                <View style={styles.timeBadge}>
                  <Ionicons name="time" size={12} color={CampusTheme.colors.primary} />
                  <Text style={styles.timeBadgeText}>
                    {slot.startTime} – {slot.endTime}
                  </Text>
                </View>
                <Text style={styles.dayText}>{slot.dayName}</Text>
              </View>

              <Text style={styles.subjectText}>{slot.subject}</Text>

              <View style={styles.slotBottom}>
                <View style={styles.metaRow}>
                  <Ionicons name="location" size={14} color={CampusTheme.colors.primary} />
                  <Text style={styles.metaText}>Room {slot.room}</Text>
                </View>

                <View style={styles.metaRow}>
                  <Ionicons name="people" size={14} color={CampusTheme.colors.primary} />
                  <Text style={styles.metaText}>
                    {slot.year} · {slot.division}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* FACULTY NOTICES */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Departmental Notices</Text>
        <View style={styles.noticesList}>
          {notices.map((n) => (
            <View key={n.id} style={styles.noticeCard}>
              <Text style={styles.noticeTitle}>{n.title}</Text>
              <Text style={styles.noticeMeta}>
                {n.category} • {n.timeAgo}
              </Text>
              <Text style={styles.noticeSummary}>{n.summary}</Text>
            </View>
          ))}
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
    backgroundColor: '#60A5FA',
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
  classTeacherCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#162820',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: CampusTheme.colors.primary,
    marginBottom: 20,
  },
  classTeacherInfo: {
    flex: 1,
  },
  classTeacherTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: CampusTheme.colors.text,
  },
  classTeacherSub: {
    fontSize: 12,
    color: CampusTheme.colors.primary,
    marginTop: 2,
    fontWeight: '600',
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
  slotsList: {
    gap: 12,
  },
  slotCard: {
    backgroundColor: '#15251E',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.15)',
    ...CampusTheme.shadows.card,
  },
  slotTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1C3528',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  timeBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: CampusTheme.colors.primary,
  },
  dayText: {
    fontSize: 12,
    color: CampusTheme.colors.textMuted,
    fontWeight: '600',
  },
  subjectText: {
    fontSize: 17,
    fontWeight: '800',
    color: CampusTheme.colors.text,
    marginBottom: 10,
  },
  slotBottom: {
    flexDirection: 'row',
    gap: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: CampusTheme.colors.textMuted,
    fontWeight: '500',
  },
  noticesList: {
    gap: 10,
  },
  noticeCard: {
    backgroundColor: '#15251E',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.1)',
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: CampusTheme.colors.text,
    marginBottom: 2,
  },
  noticeMeta: {
    fontSize: 11,
    color: CampusTheme.colors.primary,
    marginBottom: 6,
  },
  noticeSummary: {
    fontSize: 12,
    color: CampusTheme.colors.textMuted,
    lineHeight: 16,
  },

  // DELEGATED POWERS BANNER
  delegatedPowersCard: {
    backgroundColor: '#12231A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.25)',
  },
  delegatedTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  delegatedBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: CampusTheme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  delegatedTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: CampusTheme.colors.text,
  },
  delegatedSub: {
    fontSize: 11,
    color: CampusTheme.colors.textMuted,
    marginTop: 2,
  },
  delegatedButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  delegatedActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: CampusTheme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  delegatedActionBtnText: {
    color: '#0D1411',
    fontSize: 12,
    fontWeight: '800',
  },
});
