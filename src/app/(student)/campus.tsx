import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Linking,
} from 'react-native';

import { CampusTheme } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { DataService } from '@/services/data-service';
import { SEED_360_LOCATIONS, SEED_ROOMS, SEED_FACULTY } from '@/services/seed-data';
import { Room, Faculty, Campus360Location } from '@/types';
import { Spatial360Viewer } from '@/components/spatial-360-viewer';

export default function CampusScreen() {
  const { college } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [rooms, setRooms] = useState<Room[]>(SEED_ROOMS);
  const [faculty, setFaculty] = useState<Faculty[]>(SEED_FACULTY);
  const [locations360, setLocations360] = useState<Campus360Location[]>(SEED_360_LOCATIONS);
  const [selected360Spot, setSelected360Spot] = useState<Campus360Location | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  const filters = ['All', 'Rooms', 'Labs', 'Faculty', 'Departments'];

  const loadData = async () => {
    if (!college) return;
    try {
      const r = await DataService.getRooms(college.id, searchQuery, activeFilter);
      setRooms(r.length > 0 ? r : SEED_ROOMS);

      const f = await DataService.getFaculty(college.id, searchQuery);
      setFaculty(f.length > 0 ? f : SEED_FACULTY);

      const locs = await DataService.get360Locations(college.id);
      setLocations360(locs.length > 0 ? locs : SEED_360_LOCATIONS);
    } catch (e) {
      console.error('Error loading campus places:', e);
    }
  };

  useEffect(() => {
    loadData();
  }, [college, searchQuery, activeFilter]);

  const handleOpen360 = (spotId?: string) => {
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
      locations360.find((l) => l.id === spotId) ||
      SEED_360_LOCATIONS.find((l) => l.id === spotId) ||
      locations360[0] ||
      SEED_360_LOCATIONS[0] ||
      defaultSpot;

    setSelected360Spot(target);
  };

  return (
    <View style={styles.safeContainer}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* HEADER */}
        <Text style={styles.brandSubtitle}>CAMPUS CONNECT</Text>
        <Text style={styles.mainTitle}>Find your place</Text>
        <Text style={styles.taglineDesc}>
          Search rooms, people, and campus corners.
        </Text>

        {/* SEARCH BAR */}
        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color={CampusTheme.colors.textMuted}
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder='Try "IT-204" or "library"'
            placeholderTextColor={CampusTheme.colors.textDim}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <Pressable onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
              <Ionicons name="close-circle" size={18} color={CampusTheme.colors.textMuted} />
            </Pressable>
          ) : (
            <Pressable style={styles.filterBtn}>
              <Ionicons name="options-outline" size={18} color={CampusTheme.colors.primary} />
            </Pressable>
          )}
        </View>

        {/* FILTER PILLS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
          style={styles.filterScrollView}
        >
          {filters.map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <Pressable
                key={filter}
                style={[styles.filterPill, isActive && styles.activeFilterPill]}
                onPress={() => setActiveFilter(filter)}
              >
                <Text
                  style={[styles.filterPillText, isActive && styles.activeFilterPillText]}
                >
                  {filter}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* HERO 360 CARD (Matches ui_ref2.png) */}
        <Pressable
          style={({ pressed }) => [
            styles.hero360Card,
            pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
          ]}
          onPress={() => handleOpen360('loc_360_jspm_main')}
          accessibilityRole="button"
          accessibilityLabel="Explore JSPM in 360 degrees"
        >
          <View style={styles.hero360LeftIcon}>
            <Ionicons name="image" size={26} color="#1A3326" />
          </View>

          <View style={styles.hero360Content}>
            <Text style={styles.hero360Title}>
              Explore JSPM in 360°
            </Text>
            <Text style={styles.hero360Subtitle}>
              Look around before you even reach the room.
            </Text>
          </View>

          <View style={styles.hero360ArrowCircle}>
            <Ionicons
              name="arrow-up-outline"
              size={18}
              color={CampusTheme.colors.primary}
              style={{ transform: [{ rotate: '45deg' }] }}
            />
          </View>
        </Pressable>

        {/* POPULAR PLACES SECTION */}
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionHeading}>Popular places</Text>
          <Text style={styles.placesCount}>{rooms.length} venues</Text>
        </View>

        {/* PLACES LIST */}
        <View style={styles.placesList}>
          {rooms.map((room) => (
            <Pressable
              key={room.id}
              style={styles.roomCard}
              onPress={() => setSelectedRoom(room)}
            >
              <View style={styles.roomIconWrapper}>
                <Ionicons name="location" size={22} color={CampusTheme.colors.primary} />
              </View>

              <View style={styles.roomMainInfo}>
                <View style={styles.roomHeaderRow}>
                  <Text style={styles.roomNumberTitle}>{room.name}</Text>
                  <View style={styles.roomTypeTag}>
                    <Text style={styles.roomTypeTagText}>{room.type}</Text>
                  </View>
                </View>

                <Text style={styles.roomBreadcrumb}>
                  {room.department} · {room.buildingName} · {room.floor}
                </Text>

                <Text style={styles.roomDescription} numberOfLines={2}>
                  {room.description}
                </Text>

                {room.location360Id && (
                  <Pressable
                    style={styles.room360InlineBtn}
                    onPress={() => handleOpen360(room.location360Id)}
                  >
                    <Ionicons name="scan" size={14} color={CampusTheme.colors.primary} />
                    <Text style={styles.room360InlineText}>Open in 360°</Text>
                  </Pressable>
                )}
              </View>
            </Pressable>
          ))}
        </View>

        {/* FACULTY DIRECTORY (shown if Faculty filter is active or searched) */}
        {(activeFilter === 'Faculty' || activeFilter === 'All') && faculty.length > 0 && (
          <View style={styles.facultySection}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionHeading}>Faculty directory</Text>
              <Text style={styles.placesCount}>{faculty.length} professors</Text>
            </View>

            <View style={styles.facultyList}>
              {faculty.map((fac) => (
                <View key={fac.id} style={styles.facultyCard}>
                  <View style={styles.facultyAvatarBox}>
                    <Ionicons name="person" size={22} color={CampusTheme.colors.primary} />
                  </View>
                  <View style={styles.facultyInfo}>
                    <Text style={styles.facultyName}>{fac.name}</Text>
                    <Text style={styles.facultyRole}>
                      {fac.designation} · {fac.department}
                    </Text>
                    <Text style={styles.facultySubjects}>
                      Teaches: {fac.subjects.join(', ')}
                    </Text>
                    <Text style={styles.facultyOffice}>Office: {fac.officeRoom}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* 360 MODAL (Spatial Panorama Viewer) */}
      <Spatial360Viewer
        visible={!!selected360Spot}
        location={selected360Spot}
        allLocations={locations360}
        onClose={() => setSelected360Spot(null)}
      />

      {/* ROOM DETAIL MODAL */}
      {selectedRoom && (
        <Modal
          visible={!!selectedRoom}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedRoom(null)}
        >
          <View style={styles.roomModalOverlay}>
            <View style={styles.roomModalCard}>
              <View style={styles.roomModalTop}>
                <View style={styles.roomTypeTag}>
                  <Text style={styles.roomTypeTagText}>{selectedRoom.type}</Text>
                </View>
                <Pressable onPress={() => setSelectedRoom(null)}>
                  <Ionicons name="close-circle" size={24} color={CampusTheme.colors.textMuted} />
                </Pressable>
              </View>

              <Text style={styles.roomModalTitle}>{selectedRoom.name}</Text>
              <Text style={styles.roomModalBreadcrumb}>
                {selectedRoom.department} · {selectedRoom.buildingName} · {selectedRoom.floor}
              </Text>

              {selectedRoom.departmentTeacher ? (
                <View style={{ marginVertical: 6, padding: 8, backgroundColor: '#13261C', borderRadius: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#C4AAFF' }}>
                    In-Charge: {selectedRoom.departmentTeacher}
                  </Text>
                  {selectedRoom.teacherPhone ? (
                    <Text style={{ fontSize: 11, color: '#C4AAFF', marginTop: 2 }}>
                      Mobile: {selectedRoom.teacherPhone}
                    </Text>
                  ) : null}
                  {selectedRoom.teacherEmail ? (
                    <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>
                      Email: {selectedRoom.teacherEmail}
                    </Text>
                  ) : null}
                </View>
              ) : null}

              <Text style={styles.roomModalDesc}>{selectedRoom.description}</Text>

              {selectedRoom.capacity && (
                <Text style={styles.roomModalCapacity}>
                  Seating Capacity: {selectedRoom.capacity} students
                </Text>
              )}

              <View style={styles.roomModalActions}>
                {selectedRoom.location360Id && (
                  <Pressable
                    style={styles.roomModal360Btn}
                    onPress={() => {
                      const spotId = selectedRoom.location360Id;
                      setSelectedRoom(null);
                      handleOpen360(spotId);
                    }}
                  >
                    <Ionicons name="scan" size={16} color={CampusTheme.colors.background} />
                    <Text style={styles.roomModal360BtnText}>Open in 360°</Text>
                  </Pressable>
                )}

                <Pressable
                  style={styles.roomModalDismiss}
                  onPress={() => setSelectedRoom(null)}
                >
                  <Text style={styles.roomModalDismissText}>Close</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}
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
  brandSubtitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#C4AAFF',
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  mainTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  taglineDesc: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 4,
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(196,170,255,0.06)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(196,170,255,0.15)',
    paddingHorizontal: 16,
    height: 54,
    marginBottom: 16,
    ...CampusTheme.shadows.card,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
  },
  clearSearchBtn: {
    padding: 4,
  },
  filterBtn: {
    padding: 4,
  },
  filterScrollView: {
    marginBottom: 22,
  },
  filterScroll: {
    gap: 8,
    paddingRight: 10,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 9999,
    backgroundColor: 'rgba(196,170,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(196,170,255,0.1)',
  },
  activeFilterPill: {
    backgroundColor: '#9B5CFF',
    bordercolor: '#C4AAFF',
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.45)',
  },
  activeFilterPillText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  hero360Card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#C4AAFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 28,
    gap: 14,
    cursor: 'pointer' as any,
    ...CampusTheme.shadows.glow,
  },
  hero360LeftIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#68C390',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero360Content: {
    flex: 1,
  },
  hero360Title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  hero360Subtitle: {
    fontSize: 12,
    color: '#1E3A2B',
    fontWeight: '600',
    lineHeight: 16,
  },
  hero360ArrowCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundcolor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionHeading: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  placesCount: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '600',
  },
  placesList: {
    gap: 14,
    marginBottom: 26,
  },
  roomCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(196,170,255,0.06)',
    borderRadius: 22,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(196,170,255,0.15)',
    ...CampusTheme.shadows.card,
  },
  roomIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(196,170,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  roomMainInfo: {
    flex: 1,
  },
  roomHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  roomNumberTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  roomTypeTag: {
    backgroundColor: '#1C3528',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(196,170,255,0.15)',
  },
  roomTypeTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C4AAFF',
  },
  roomBreadcrumb: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 8,
    fontWeight: '500',
  },
  roomDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    lineHeight: 18,
  },
  room360InlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(196,170,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    cursor: 'pointer' as any,
  },
  room360InlineText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C4AAFF',
  },
  facultySection: {
    marginTop: 10,
  },
  facultyList: {
    gap: 12,
  },
  facultyCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(196,170,255,0.06)',
    borderRadius: 18,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(196,170,255,0.12)',
  },
  facultyAvatarBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(196,170,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  facultyInfo: {
    flex: 1,
  },
  facultyName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  facultyRole: {
    fontSize: 12,
    color: '#C4AAFF',
    marginTop: 2,
    fontWeight: '600',
  },
  facultySubjects: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 4,
  },
  facultyOffice: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    marginTop: 2,
  },
  modal360Container: {
    flex: 1,
    backgroundColor: '#0A0010',
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
    color: '#FFFFFF',
  },
  modal360Floor: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
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
    backgroundColor: '#0D0018',
  },
  modal360Center: {
    alignItems: 'center',
    padding: 30,
    maxWidth: 420,
  },
  modal360Prompt: {
    fontSize: 16,
    fontWeight: '800',
    color: '#C4AAFF',
    marginTop: 16,
    letterSpacing: 1,
  },
  modal360Desc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 24,
  },
  externalLaunchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#9B5CFF',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  externalLaunchBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  roomModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  roomModalCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 22,
    padding: 24,
    width: '100%',
    maxWidth: 440,
    borderWidth: 1,
    borderColor: 'rgba(196,170,255,0.15)',
  },
  roomModalTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  roomModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  roomModalBreadcrumb: {
    fontSize: 13,
    color: '#C4AAFF',
    marginBottom: 12,
    fontWeight: '600',
  },
  roomModalDesc: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.45)',
    lineHeight: 20,
    marginBottom: 14,
  },
  roomModalCapacity: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.3)',
    marginBottom: 20,
  },
  roomModalActions: {
    gap: 10,
  },
  roomModal360Btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#9B5CFF',
    borderRadius: 12,
    paddingVertical: 12,
  },
  roomModal360BtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  roomModalDismiss: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  roomModalDismissText: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 14,
    fontWeight: '600',
  },
});
