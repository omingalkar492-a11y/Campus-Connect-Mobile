import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Linking,
} from 'react-native';

import { CampusTheme } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useAppTheme } from '@/context/theme-context';
import { DataService } from '@/services/data-service';
import { SEED_360_LOCATIONS } from '@/services/seed-data';
import { Notice, Order, TimetableSlot, Campus360Location } from '@/types';
import { Spatial360Viewer } from '@/components/spatial-360-viewer';

export default function StudentHomeScreen() {
  const router = useRouter();
  const { profile, college, switchDemoRole } = useAuth();
  const { colors, isDark } = useAppTheme();

  const [orders, setOrders] = useState<Order[]>([]);
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const [active360Modal, setActive360Modal] = useState<Campus360Location | null>(null);

  const loadDashboardData = async () => {
    if (!college) return;
    try {
      const ords = await DataService.getOrders(college.id, profile?.uid);
      setOrders(ords);

      const tt = await DataService.getTimetable(
        college.id,
        profile?.department || 'Information Technology',
        profile?.year || '3rd Year',
        profile?.division || 'Div A',
        1 // Monday
      );
      setTimetable(tt);

      const nots = await DataService.getNotices(college.id);
      setNotices(nots);
    } catch (e) {
      console.error('Error loading dashboard data:', e);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [college, profile]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  // Next class from timetable
  const nextClass = timetable[0] || {
    subject: 'Database Management Systems',
    room: 'IT-204',
    facultyName: 'Prof. Sneha Deshmukh',
    startTime: '09:00 AM',
    endTime: '10:00 AM',
  };

  // Active order to track (latest order that is not completed)
  const activeOrder =
    orders.find((o) => o.orderStatus !== 'completed' && o.orderStatus !== 'cancelled') ||
    orders[0];

  const getStepState = (currentStatus: string, stepName: string) => {
    const sequence = ['placed', 'accepted', 'preparing', 'ready', 'completed'];
    const currentIndex = sequence.indexOf(currentStatus);
    const stepIndex = sequence.indexOf(stepName);
    return currentIndex >= stepIndex;
  };

  const open360Spot = (spotId?: string) => {
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
    <View style={[styles.safeContainer, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* TOP HEADER */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.collegeTag, { color: colors.primary }]}>
              {college?.shortName ? college.shortName.toUpperCase() : 'JSPM TATHAWADE'} • PUNE
            </Text>
            <Text style={[styles.greetingTitle, { color: colors.text }]}>
              Hey, {profile?.name?.split(' ')[0] || 'Aarav'}
            </Text>
            <Text style={[styles.dateSubtitle, { color: colors.textMuted }]}>Monday, 21 September · make it count</Text>
          </View>

          <Pressable
            style={[styles.avatarCircle, { borderColor: colors.primary }]}
            onPress={() => router.push('/(student)/profile' as any)}
          >
            <Text style={[styles.avatarInitial, { color: colors.primary }]}>
              {profile?.name?.charAt(0).toUpperCase() || 'A'}
            </Text>
          </Pressable>
        </View>

        {/* ACADEMIC IDENTITY CARD */}
        <View style={[styles.academicCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.academicCollegeName, { color: colors.text }]}>
            {college?.name || "JSPM's Tathawade Technical Campus"}
          </Text>
          <Text style={[styles.academicMeta, { color: colors.primary }]}>
            {profile?.department || 'Information Technology'} · {profile?.year || '3rd Year'} ·{' '}
            {profile?.division || 'Div A'}
          </Text>
        </View>

        {/* 4 QUICK ACTION TALL PILLS */}
        <View style={styles.quickActionsRow}>
          {/* Explore */}
          <Pressable
            style={[styles.actionPill, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={() => router.push('/(student)/campus' as any)}
          >
            <Ionicons name="compass" size={24} color={colors.primary} />
            <Text style={[styles.actionPillBold, { color: colors.text }]}>Explore</Text>
            <Text style={[styles.actionPillMuted, { color: colors.textMuted }]}>Campus</Text>
          </Pressable>

          {/* 360° */}
          <Pressable
            style={[styles.actionPill, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={() => open360Spot('loc_360_it204')}
          >
            <Ionicons name="image" size={22} color={colors.primary} />
            <Text style={[styles.actionPillBold, { color: colors.text }]}>360°</Text>
            <Text style={[styles.actionPillMuted, { color: colors.textMuted }]}>Campus</Text>
          </Pressable>

          {/* Order */}
          <Pressable
            style={[styles.actionPill, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={() => router.push('/(student)/canteen' as any)}
          >
            <Ionicons name="restaurant" size={22} color={colors.primary} />
            <Text style={[styles.actionPillBold, { color: colors.text }]}>Order</Text>
            <Text style={[styles.actionPillMuted, { color: colors.textMuted }]}>Canteen</Text>
          </Pressable>

          {/* My Schedule */}
          <Pressable
            style={[styles.actionPill, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
            onPress={() => router.push('/(student)/schedule' as any)}
          >
            <Ionicons name="calendar" size={22} color={colors.primary} />
            <Text style={[styles.actionPillBold, { color: colors.text }]}>My</Text>
            <Text style={[styles.actionPillMuted, { color: colors.textMuted }]}>Schedule</Text>
          </Pressable>
        </View>

        {/* NEXT UP SECTION */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Next up</Text>
          <Pressable onPress={() => router.push('/(student)/schedule' as any)}>
            <Text style={styles.sectionLink}>View week</Text>
          </Pressable>
        </View>

        <View style={styles.nextUpCard}>
          <View style={styles.nextUpTopRow}>
            <View style={styles.timePill}>
              <Text style={styles.timePillText}>NOW • IN 42 MIN</Text>
            </View>
            <Ionicons name="ellipsis-horizontal" size={20} color={CampusTheme.colors.textMuted} />
          </View>

          <Text style={styles.classSubject}>{nextClass.subject}</Text>

          <View style={styles.classDetailsRow}>
            <View style={styles.detailItem}>
              <Ionicons name="location-outline" size={15} color={CampusTheme.colors.primary} />
              <Text style={styles.detailText}>Room {nextClass.room}</Text>
            </View>
            <View style={styles.detailItem}>
              <Ionicons name="person-outline" size={15} color={CampusTheme.colors.primary} />
              <Text style={styles.detailText}>{nextClass.facultyName}</Text>
            </View>
          </View>

          <View style={styles.nextUpActionsRow}>
            <Pressable
              style={styles.primaryActionBtn}
              onPress={() => open360Spot('loc_360_it204')}
            >
              <Ionicons name="navigate" size={16} color={CampusTheme.colors.background} />
              <Text style={styles.primaryActionBtnText}>Navigate to Room</Text>
            </Pressable>

            <Pressable
              style={styles.secondaryActionBtn}
              onPress={() => open360Spot('loc_360_it204')}
            >
              <Ionicons name="scan-outline" size={16} color={CampusTheme.colors.primary} />
              <Text style={styles.secondaryActionBtnText}>360°</Text>
            </Pressable>
          </View>
        </View>

        {/* ACTIVE ORDER TRACKER CARD (if exists) */}
        {activeOrder && (
          <View style={styles.orderTrackerCard}>
            <View style={styles.orderHeaderRow}>
              <Text style={styles.orderNumberText}>{activeOrder.orderNumber}</Text>
              <View
                style={[
                  styles.orderStatusBadge,
                  activeOrder.orderStatus === 'ready' && styles.orderReadyBadge,
                ]}
              >
                <Text
                  style={[
                    styles.orderStatusBadgeText,
                    activeOrder.orderStatus === 'ready' && styles.orderReadyBadgeText,
                  ]}
                >
                  {activeOrder.orderStatus === 'ready' ? 'READY FOR PICKUP' : activeOrder.orderStatus.toUpperCase()}
                </Text>
              </View>
            </View>

            <Text style={styles.orderItemsSummary}>
              {activeOrder.items.map((i) => `${i.quantity} × ${i.name}`).join(', ')}
            </Text>

            {/* Stepped Progress */}
            <View style={styles.stepperContainer}>
              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.stepCircle,
                    getStepState(activeOrder.orderStatus, 'placed') && styles.stepCircleActive,
                  ]}
                >
                  {getStepState(activeOrder.orderStatus, 'placed') ? (
                    <Ionicons name="checkmark" size={12} color={CampusTheme.colors.background} />
                  ) : (
                    <View style={styles.stepDot} />
                  )}
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    getStepState(activeOrder.orderStatus, 'placed') && styles.stepLabelActive,
                  ]}
                >
                  Placed
                </Text>
              </View>

              <View
                style={[
                  styles.stepLine,
                  getStepState(activeOrder.orderStatus, 'accepted') && styles.stepLineActive,
                ]}
              />

              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.stepCircle,
                    getStepState(activeOrder.orderStatus, 'accepted') && styles.stepCircleActive,
                  ]}
                >
                  <View
                    style={[
                      styles.stepDot,
                      getStepState(activeOrder.orderStatus, 'accepted') && styles.stepDotActive,
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    getStepState(activeOrder.orderStatus, 'accepted') && styles.stepLabelActive,
                  ]}
                >
                  Accepted
                </Text>
              </View>

              <View
                style={[
                  styles.stepLine,
                  getStepState(activeOrder.orderStatus, 'preparing') && styles.stepLineActive,
                ]}
              />

              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.stepCircle,
                    getStepState(activeOrder.orderStatus, 'preparing') && styles.stepCircleActive,
                  ]}
                >
                  <View
                    style={[
                      styles.stepDot,
                      getStepState(activeOrder.orderStatus, 'preparing') && styles.stepDotActive,
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    getStepState(activeOrder.orderStatus, 'preparing') && styles.stepLabelActive,
                  ]}
                >
                  Making
                </Text>
              </View>

              <View
                style={[
                  styles.stepLine,
                  getStepState(activeOrder.orderStatus, 'ready') && styles.stepLineActive,
                ]}
              />

              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.stepCircle,
                    getStepState(activeOrder.orderStatus, 'ready') && styles.stepCircleActive,
                  ]}
                >
                  <View
                    style={[
                      styles.stepDot,
                      getStepState(activeOrder.orderStatus, 'ready') && styles.stepDotActive,
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.stepLabel,
                    getStepState(activeOrder.orderStatus, 'ready') && styles.stepLabelActive,
                  ]}
                >
                  Ready
                </Text>
              </View>
            </View>

            {/* Subtext and Pickup OTP */}
            <View style={styles.orderFooterRow}>
              <Text style={styles.orderFooterSubtext}>
                {activeOrder.paymentMethod === 'CASH'
                  ? 'Cash At Pickup · Cash Pending'
                  : 'UPI Online Payment · Verified'}
              </Text>

              {activeOrder.pickupOtp && (
                <View style={styles.otpBox}>
                  <Text style={styles.otpLabel}>PICKUP OTP</Text>
                  <Text style={styles.otpCode}>{activeOrder.pickupOtp}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* CAMPUS UPDATES */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Campus updates</Text>
          <Pressable onPress={() => {}}>
            <Text style={styles.sectionLink}>See all</Text>
          </Pressable>
        </View>

        <View style={styles.noticesList}>
          {notices.map((notice) => (
            <Pressable
              key={notice.id}
              style={styles.noticeCard}
              onPress={() => setSelectedNotice(notice)}
            >
              <View style={styles.noticeIconBox}>
                <Ionicons
                  name={notice.category === 'Event' ? 'calendar' : 'notifications'}
                  size={20}
                  color={CampusTheme.colors.primary}
                />
              </View>

              <View style={styles.noticeContent}>
                <Text style={styles.noticeTitle}>{notice.title}</Text>
                <Text style={styles.noticeMeta}>
                  {notice.category} • {notice.timeAgo}
                </Text>
              </View>

              <Ionicons name="chevron-forward" size={18} color={CampusTheme.colors.textMuted} />
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {/* NOTICE DETAIL MODAL */}
      {selectedNotice && (
        <Modal
          visible={!!selectedNotice}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedNotice(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <View style={styles.modalBadge}>
                  <Text style={styles.modalBadgeText}>{selectedNotice.category}</Text>
                </View>
                <Pressable onPress={() => setSelectedNotice(null)}>
                  <Ionicons name="close-circle" size={26} color={CampusTheme.colors.textMuted} />
                </Pressable>
              </View>

              <Text style={styles.modalTitle}>{selectedNotice.title}</Text>
              <Text style={styles.modalDate}>
                {selectedNotice.date} • {selectedNotice.venue || 'Campus Wide'}
              </Text>
              <Text style={styles.modalBody}>{selectedNotice.content}</Text>

              <Pressable
                style={styles.modalDismissBtn}
                onPress={() => setSelectedNotice(null)}
              >
                <Text style={styles.modalDismissBtnText}>Close Update</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}

      {/* 360 EXPERIENCE MODAL */}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerLeft: {
    flex: 1,
  },
  collegeTag: {
    fontSize: 12,
    fontWeight: '800',
    color: '#C4AAFF',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  greetingTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  dateSubtitle: {
    fontSize: 14,
    color: CampusTheme.colors.textMuted,
    marginTop: 4,
    fontWeight: '500',
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(196,170,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(196,170,255,0.5)',
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '800',
    color: '#C4AAFF',
  },
  academicCard: {
    backgroundColor: 'rgba(196,170,255,0.06)',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(196,170,255,0.18)',
    marginBottom: 22,
  },
  academicCollegeName: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  academicMeta: {
    fontSize: 13,
    color: '#C4AAFF',
    fontWeight: '600',
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 28,
  },
  actionPill: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 22,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(196,170,255,0.15)',
  },
  actionPillBold: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 8,
  },
  actionPillMuted: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '500',
    marginTop: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sectionLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#C4AAFF',
  },
  nextUpCard: {
    backgroundColor: 'rgba(196,170,255,0.07)',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(196,170,255,0.2)',
    marginBottom: 24,
  },
  nextUpTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  timePill: {
    backgroundColor: 'rgba(196,170,255,0.15)',
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(196,170,255,0.35)',
  },
  timePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#C4AAFF',
    letterSpacing: 0.5,
  },
  classSubject: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  classDetailsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 18,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
    color: CampusTheme.colors.textMuted,
    fontWeight: '600',
  },
  nextUpActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#9B5CFF',
    borderRadius: 14,
    paddingVertical: 12,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  secondaryActionBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(196,170,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(196,170,255,0.3)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  secondaryActionBtnText: {
    color: '#C4AAFF',
    fontSize: 13,
    fontWeight: '800',
  },
  orderTrackerCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(196,170,255,0.15)',
    marginBottom: 26,
  },
  orderHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  orderNumberText: {
    fontSize: 18,
    fontWeight: '800',
    color: CampusTheme.colors.text,
  },
  orderStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: CampusTheme.colors.pillInactiveBg,
  },
  orderReadyBadge: {
    backgroundColor: CampusTheme.colors.primaryDim,
  },
  orderStatusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: CampusTheme.colors.textMuted,
  },
  orderReadyBadgeText: {
    color: CampusTheme.colors.primary,
  },
  orderItemsSummary: {
    fontSize: 14,
    color: CampusTheme.colors.textMuted,
    marginBottom: 16,
    fontWeight: '500',
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
    paddingHorizontal: 6,
  },
  stepItem: {
    alignItems: 'center',
    gap: 6,
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#1A2F25',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.2)',
  },
  stepCircleActive: {
    backgroundColor: CampusTheme.colors.primary,
    borderColor: CampusTheme.colors.primary,
  },
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: CampusTheme.colors.textDim,
  },
  stepDotActive: {
    backgroundColor: CampusTheme.colors.background,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#1E3228',
    marginHorizontal: 4,
    marginBottom: 18,
  },
  stepLineActive: {
    backgroundColor: CampusTheme.colors.primary,
  },
  stepLabel: {
    fontSize: 11,
    color: CampusTheme.colors.textDim,
    fontWeight: '600',
  },
  stepLabelActive: {
    color: CampusTheme.colors.primary,
    fontWeight: '700',
  },
  orderFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 12,
  },
  orderFooterSubtext: {
    fontSize: 12,
    color: CampusTheme.colors.textMuted,
    fontWeight: '500',
  },
  otpBox: {
    backgroundColor: '#1B3528',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: CampusTheme.colors.primary,
  },
  otpLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: CampusTheme.colors.primary,
    letterSpacing: 0.5,
  },
  otpCode: {
    fontSize: 16,
    fontWeight: '800',
    color: CampusTheme.colors.text,
    letterSpacing: 2,
  },
  noticesList: {
    gap: 12,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(196,170,255,0.12)',
  },
  noticeIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(196,170,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeContent: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: CampusTheme.colors.text,
    marginBottom: 4,
  },
  noticeMeta: {
    fontSize: 12,
    color: CampusTheme.colors.textMuted,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: 'rgba(20,10,40,0.97)',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 440,
    borderWidth: 1,
    borderColor: 'rgba(196,170,255,0.25)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalBadge: {
    backgroundColor: 'rgba(196,170,255,0.15)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  modalBadgeText: {
    color: '#C4AAFF',
    fontSize: 11,
    fontWeight: '700',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: CampusTheme.colors.text,
    marginBottom: 8,
  },
  modalDate: {
    fontSize: 12,
    color: CampusTheme.colors.textMuted,
    marginBottom: 16,
  },
  modalBody: {
    fontSize: 14,
    color: CampusTheme.colors.textMuted,
    lineHeight: 22,
    marginBottom: 20,
  },
  modalDismissBtn: {
    backgroundColor: '#9B5CFF',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalDismissBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  panoramaContainer: {
    flex: 1,
    backgroundColor: '#0A0010',
  },
  panoramaHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 30,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  panoramaTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: CampusTheme.colors.text,
  },
  panoramaSub: {
    fontSize: 12,
    color: CampusTheme.colors.textMuted,
    marginTop: 2,
  },
  panoramaCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#192821',
    alignItems: 'center',
    justifyContent: 'center',
  },
  panoramaViewport: {
    flex: 1,
    backgroundColor: '#0F1A14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  panoramaGridOverlay: {
    alignItems: 'center',
    padding: 30,
    maxWidth: 400,
  },
  panoramaHintText: {
    color: CampusTheme.colors.primary,
    fontSize: 15,
    fontWeight: '800',
    marginTop: 16,
    letterSpacing: 1,
  },
  panoramaDesc: {
    color: CampusTheme.colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 24,
  },
  panoramaActionRow: {
    width: '100%',
  },
  openExternalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#9B5CFF',
    borderRadius: 14,
    paddingVertical: 14,
  },
  openExternalBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
