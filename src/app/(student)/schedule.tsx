import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Linking,
} from 'react-native';

import { CampusTheme } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { DataService } from '@/services/data-service';
import { SEED_360_LOCATIONS } from '@/services/seed-data';
import { TimetableSlot, Campus360Location } from '@/types';
import { Spatial360Viewer } from '@/components/spatial-360-viewer';

export default function ScheduleScreen() {
  const { college, profile } = useAuth();

  const [viewMode, setViewMode] = useState<'today' | 'week'>('today');
  const [selectedDay, setSelectedDay] = useState<number>(1); // Monday
  const [schedule, setSchedule] = useState<TimetableSlot[]>([]);
  const [active360Modal, setActive360Modal] = useState<Campus360Location | null>(null);

  const days = [
    { num: 1, label: 'Mon', full: 'Monday' },
    { num: 2, label: 'Tue', full: 'Tuesday' },
    { num: 3, label: 'Wed', full: 'Wednesday' },
    { num: 4, label: 'Thu', full: 'Thursday' },
    { num: 5, label: 'Fri', full: 'Friday' },
  ];

  const loadSchedule = async () => {
    if (!college || !profile) return;
    try {
      const dayParam = viewMode === 'today' ? 1 : selectedDay;
      const slots = await DataService.getTimetable(
        college.id,
        profile.department || 'Information Technology',
        profile.year || '3rd Year',
        profile.division || 'Div A',
        dayParam
      );
      setSchedule(slots);
    } catch (e) {
      console.error('Error loading schedule:', e);
    }
  };

  useEffect(() => {
    loadSchedule();
  }, [college, profile, viewMode, selectedDay]);

  const open360 = (spotId?: string) => {
    const defaultSpot: Campus360Location = {
      id: 'loc_360_jspm_main',
      collegeId: college?.id || 'col_jspm_tathawade',
      name: 'Explore JSPM in 360°',
      description: 'Immersive 360° Clear Pano spatial tour of JSPM Tathawade Campus',
      category: 'Campus Tour',
      thumbnail: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=600&q=80',
      embedUrl: 'https://tours.clearpano.com/I4EFHxcx',
      externalUrl: 'https://tours.clearpano.com/I4EFHxcx',
      active: true,
      displayOrder: 0,
    };
    const target =
      SEED_360_LOCATIONS.find((l) => l.id === spotId) ||
      SEED_360_LOCATIONS[0] ||
      defaultSpot;

    setActive360Modal(target);
  };

  return (
    <View style={styles.safeContainer}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        {/* HEADER */}
        <Text style={styles.brandSubtitle}>CAMPUS CONNECT TIMETABLE</Text>
        <Text style={styles.screenHeading}>Class schedule</Text>
        <Text style={styles.screenSub}>
          {profile?.department} · {profile?.year} · {profile?.division}
        </Text>

        {/* VIEW SWITCHER: TODAY vs WEEK */}
        <View style={styles.toggleContainer}>
          <Pressable
            style={[styles.toggleBtn, viewMode === 'today' && styles.activeToggleBtn]}
            onPress={() => setViewMode('today')}
          >
            <Text
              style={[
                styles.toggleText,
                viewMode === 'today' && styles.activeToggleText,
              ]}
            >
              Today (Monday)
            </Text>
          </Pressable>

          <Pressable
            style={[styles.toggleBtn, viewMode === 'week' && styles.activeToggleBtn]}
            onPress={() => setViewMode('week')}
          >
            <Text
              style={[
                styles.toggleText,
                viewMode === 'week' && styles.activeToggleText,
              ]}
            >
              Full Week
            </Text>
          </Pressable>
        </View>

        {/* DAY PILLS (When Week view is chosen) */}
        {viewMode === 'week' && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.daysRow}
            style={styles.daysScrollView}
          >
            {days.map((day) => {
              const isDaySelected = selectedDay === day.num;
              return (
                <Pressable
                  key={day.num}
                  style={[styles.dayPill, isDaySelected && styles.activeDayPill]}
                  onPress={() => setSelectedDay(day.num)}
                >
                  <Text
                    style={[
                      styles.dayPillLabel,
                      isDaySelected && styles.activeDayPillLabel,
                    ]}
                  >
                    {day.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {/* TIMETABLE SLOTS */}
        <View style={styles.slotsList}>
          {schedule.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="sunny-outline" size={40} color={CampusTheme.colors.primary} />
              <Text style={styles.emptyTitle}>No classes scheduled</Text>
              <Text style={styles.emptySub}>Enjoy your open schedule or study time.</Text>
            </View>
          ) : (
            schedule.map((slot, index) => (
              <View key={slot.id} style={styles.slotCard}>
                <View style={styles.timeTag}>
                  <Ionicons name="time-outline" size={14} color={CampusTheme.colors.primary} />
                  <Text style={styles.timeText}>
                    {slot.startTime} – {slot.endTime}
                  </Text>
                  {index === 0 && viewMode === 'today' && (
                    <View style={styles.nowBadge}>
                      <Text style={styles.nowBadgeText}>NEXT UP</Text>
                    </View>
                  )}
                </View>

                <Text style={styles.slotSubject}>{slot.subject}</Text>

                <View style={styles.slotMetaRow}>
                  <View style={styles.metaItem}>
                    <Ionicons name="location" size={14} color={CampusTheme.colors.primary} />
                    <Text style={styles.metaText}>Room {slot.room}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="person" size={14} color={CampusTheme.colors.primary} />
                    <Text style={styles.metaText}>{slot.facultyName}</Text>
                  </View>
                </View>

                <View style={styles.slotActionRow}>
                  <Pressable
                    style={styles.navBtn}
                    onPress={() => open360(slot.location360Id)}
                  >
                    <Ionicons name="navigate" size={15} color={CampusTheme.colors.background} />
                    <Text style={styles.navBtnText}>Navigate</Text>
                  </Pressable>

                  {slot.location360Id && (
                    <Pressable
                      style={styles.view360Btn}
                      onPress={() => open360(slot.location360Id)}
                    >
                      <Ionicons name="scan" size={15} color={CampusTheme.colors.primary} />
                      <Text style={styles.view360BtnText}>View 360°</Text>
                    </Pressable>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* 360 MODAL */}
      <Spatial360Viewer
        visible={!!active360Modal}
        location={active360Modal}
        allLocations={SEED_360_LOCATIONS}
        onClose={() => setActive360Modal(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: CampusTheme.colors.background,
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
  brandSubtitle: {
    fontSize: 12,
    fontWeight: '800',
    color: CampusTheme.colors.primary,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  screenHeading: {
    fontSize: 34,
    fontWeight: '800',
    color: CampusTheme.colors.text,
    letterSpacing: -0.5,
  },
  screenSub: {
    fontSize: 14,
    color: CampusTheme.colors.textMuted,
    marginTop: 4,
    marginBottom: 20,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#15251E',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.15)',
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeToggleBtn: {
    backgroundColor: CampusTheme.colors.primary,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: CampusTheme.colors.textMuted,
  },
  activeToggleText: {
    color: CampusTheme.colors.background,
    fontWeight: '800',
  },
  daysScrollView: {
    marginBottom: 20,
  },
  daysRow: {
    gap: 8,
    paddingRight: 10,
  },
  dayPill: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 9999,
    backgroundColor: '#162820',
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.1)',
  },
  activeDayPill: {
    backgroundColor: CampusTheme.colors.primary,
    borderColor: CampusTheme.colors.primary,
  },
  dayPillLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: CampusTheme.colors.textMuted,
  },
  activeDayPillLabel: {
    color: CampusTheme.colors.background,
    fontWeight: '800',
  },
  slotsList: {
    gap: 16,
  },
  slotCard: {
    backgroundColor: '#15251E',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.15)',
    ...CampusTheme.shadows.card,
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  timeText: {
    fontSize: 12,
    color: CampusTheme.colors.primary,
    fontWeight: '800',
  },
  nowBadge: {
    backgroundColor: CampusTheme.colors.primaryDim,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  nowBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: CampusTheme.colors.primary,
  },
  slotSubject: {
    fontSize: 18,
    fontWeight: '800',
    color: CampusTheme.colors.text,
    marginBottom: 8,
  },
  slotMetaRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: CampusTheme.colors.textMuted,
    fontWeight: '500',
  },
  slotActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  navBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: CampusTheme.colors.primary,
    borderRadius: 12,
    paddingVertical: 10,
  },
  navBtnText: {
    color: CampusTheme.colors.background,
    fontSize: 13,
    fontWeight: '800',
  },
  view360Btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1C3328',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.2)',
  },
  view360BtnText: {
    color: CampusTheme.colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  emptyCard: {
    backgroundColor: '#15251E',
    borderRadius: 22,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.12)',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: CampusTheme.colors.text,
    marginTop: 12,
  },
  emptySub: {
    fontSize: 13,
    color: CampusTheme.colors.textMuted,
    marginTop: 4,
  },
  modal360Container: {
    flex: 1,
    backgroundColor: CampusTheme.colors.background,
  },
  modal360Header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 30,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  modal360Title: {
    fontSize: 18,
    fontWeight: '800',
    color: CampusTheme.colors.text,
  },
  modal360Floor: {
    fontSize: 12,
    color: CampusTheme.colors.textMuted,
    marginTop: 2,
  },
  modal360CloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1A2A22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modal360Viewport: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  modal360Prompt: {
    fontSize: 16,
    fontWeight: '800',
    color: CampusTheme.colors.primary,
    marginTop: 16,
    letterSpacing: 1,
  },
  modal360Desc: {
    fontSize: 13,
    color: CampusTheme.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 24,
  },
  launchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: CampusTheme.colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  launchBtnText: {
    color: CampusTheme.colors.background,
    fontSize: 14,
    fontWeight: '800',
  },
});
