import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
} from 'react-native';

import { Spatial360Viewer } from '@/components/spatial-360-viewer';
import { CampusTheme } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { DataService } from '@/services/data-service';
import {
  Room,
  Faculty,
  Campus360Location,
  FoodItem,
  Notice,
  Order,
  UserProfile,
  StaffPermission,
  UserRole,
} from '@/types';

export default function CollegeAdminScreen() {
  const router = useRouter();
  const { college, profile, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<
    'overview' | '360' | 'canteen' | 'staff' | 'rooms' | 'faculty' | 'notices'
  >('overview');

  const [rooms, setRooms] = useState<Room[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [locations360, setLocations360] = useState<Campus360Location[]>([]);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [staffMembers, setStaffMembers] = useState<UserProfile[]>([]);

  // 360 In-App Live Preview
  const [preview360Location, setPreview360Location] = useState<Campus360Location | null>(null);

  // Add 360 Modal
  const [showAdd360Modal, setShowAdd360Modal] = useState(false);
  const [newSpotName, setNewSpotName] = useState('');
  const [newSpotCategory, setNewSpotCategory] = useState('Campus Tour');
  const [newSpotFloor, setNewSpotFloor] = useState('Main Campus Quad');
  const [newSpotDesc, setNewSpotDesc] = useState('');
  const [newSpotUrl, setNewSpotUrl] = useState('');

  // Add Staff Modal
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<UserRole>('teacher_staff');
  const [newStaffDesignation, setNewStaffDesignation] = useState('');
  const [newStaffPermissions, setNewStaffPermissions] = useState<StaffPermission[]>([]);

  const loadAdminData = async () => {
    if (!college) return;
    try {
      const [r, f, locs, fi, n, o, staff] = await Promise.all([
        DataService.getRooms(college.id),
        DataService.getFaculty(college.id),
        DataService.get360Locations(college.id),
        DataService.getFoodItems(college.id, undefined, true),
        DataService.getNotices(college.id),
        DataService.getOrders(college.id),
        DataService.getStaffMembers(college.id),
      ]);
      setRooms(r);
      setFaculty(f);
      setLocations360(locs);
      setFoodItems(fi);
      setNotices(n);
      setOrders(o);
      setStaffMembers(staff);
    } catch (e) {
      console.error('Error loading admin data:', e);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [college]);

  const handleAdd360Spot = async () => {
    if (!newSpotName.trim() || !college) return;
    const finalUrl = (newSpotUrl.trim() || 'https://tours.clearpano.com/I4EFHxcx').trim();
    const newSpot: Campus360Location = {
      id: `loc_360_${Date.now()}`,
      collegeId: college.id,
      name: newSpotName.trim(),
      category: newSpotCategory,
      floor: newSpotFloor,
      description:
        newSpotDesc.trim() || 'Interactive 360° virtual campus tour created by administrator.',
      thumbnail:
        'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=600&q=80',
      embedUrl: finalUrl,
      externalUrl: finalUrl,
      active: true,
      displayOrder: locations360.length + 1,
    };
    await DataService.add360Location(newSpot, 'college_admin');
    setShowAdd360Modal(false);
    setNewSpotName('');
    setNewSpotDesc('');
    setNewSpotUrl('');
    await loadAdminData();
  };

  const handleDelete360Spot = async (id: string) => {
    await DataService.delete360Location(id, 'college_admin');
    await loadAdminData();
  };

  const handleToggleStaffPermission = async (uid: string, perm: StaffPermission) => {
    const member = staffMembers.find((s) => s.uid === uid);
    if (!member) return;
    const current = member.permissions || [];
    const updated = current.includes(perm)
      ? current.filter((p) => p !== perm)
      : [...current, perm];
    await DataService.updateStaffPermissions(uid, updated);
    await loadAdminData();
  };

  const handleAddStaff = async () => {
    if (!newStaffName.trim() || !newStaffEmail.trim() || !college) {
      alert('Please enter name and email');
      return;
    }
    const newMember: UserProfile = {
      uid: `staff_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      role: newStaffRole,
      collegeId: college.id,
      name: newStaffName.trim(),
      email: newStaffEmail.trim().toLowerCase(),
      designation: newStaffDesignation.trim() || 'Staff Administrator',
      status: 'active',
      createdAt: new Date().toISOString(),
      permissions: newStaffPermissions,
    };
    await DataService.addStaffMember(newMember, 'college_admin');
    setShowAddStaffModal(false);
    setNewStaffName('');
    setNewStaffEmail('');
    setNewStaffDesignation('');
    setNewStaffPermissions([]);
    await loadAdminData();
  };

  const handleToggleCanteenStock = async (itemId: string) => {
    await DataService.toggleFoodItemAvailability(itemId);
    await loadAdminData();
  };

  const navTabs = [
    { key: 'overview', label: 'Overview', icon: 'grid' },
    { key: '360', label: '360° Spaces', icon: 'image' },
    { key: 'canteen', label: 'Canteen', icon: 'fast-food' },
    { key: 'staff', label: 'Staff & Roles', icon: 'shield-checkmark' },
    { key: 'rooms', label: 'Rooms', icon: 'business' },
    { key: 'faculty', label: 'Faculty', icon: 'people' },
    { key: 'notices', label: 'Notices', icon: 'notifications' },
  ];

  return (
    <View style={styles.safeContainer}>
      {/* ADMIN HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.badge}>
            <Ionicons name="shield-checkmark" size={18} color={CampusTheme.colors.background} />
          </View>
          <View>
            <Text style={styles.headerTitle}>COLLEGE ADMINISTRATION</Text>
            <Text style={styles.headerSub}>
              {college?.name} • {profile?.name || 'Dr. Sharma'}
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

      {/* HORIZONTAL ADMIN TABS */}
      <View style={styles.tabsBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {navTabs.map((t) => {
            const isActive = activeTab === t.key;
            return (
              <Pressable
                key={t.key}
                style={[styles.tabItem, isActive && styles.activeTabItem]}
                onPress={() => setActiveTab(t.key as any)}
              >
                <Ionicons
                  name={t.icon as any}
                  size={15}
                  color={isActive ? CampusTheme.colors.background : CampusTheme.colors.textMuted}
                />
                <Text style={[styles.tabLabel, isActive && styles.activeTabLabel]}>
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* BODY CONTENT */}
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {activeTab === 'overview' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Institutional Metrics</Text>
            <Text style={styles.sectionSub}>
              Real-time multi-tenant data for {college?.name}.
            </Text>

            <View style={styles.metricsGrid}>
              <View style={styles.metricCard}>
                <Ionicons name="business" size={24} color={CampusTheme.colors.primary} />
                <Text style={styles.metricNumber}>{rooms.length}</Text>
                <Text style={styles.metricLabel}>Rooms & Labs</Text>
              </View>

              <View style={styles.metricCard}>
                <Ionicons name="image" size={24} color={CampusTheme.colors.primary} />
                <Text style={styles.metricNumber}>{locations360.length}</Text>
                <Text style={styles.metricLabel}>360° Clear Pona Spots</Text>
              </View>

              <View style={styles.metricCard}>
                <Ionicons name="people" size={24} color="#60A5FA" />
                <Text style={styles.metricNumber}>{faculty.length}</Text>
                <Text style={styles.metricLabel}>Faculty & Staff</Text>
              </View>

              <View style={styles.metricCard}>
                <Ionicons name="fast-food" size={24} color="#F472B6" />
                <Text style={styles.metricNumber}>{orders.length}</Text>
                <Text style={styles.metricLabel}>Canteen Orders</Text>
              </View>
            </View>

            {/* Quick Actions */}
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Administrative Actions</Text>
            <View style={styles.actionsRow}>
              <Pressable
                style={styles.actionCard}
                onPress={() => setShowAdd360Modal(true)}
              >
                <Ionicons name="add-circle" size={20} color={CampusTheme.colors.primary} />
                <Text style={styles.actionCardText}>Add 360° Spot</Text>
              </Pressable>

              <Pressable
                style={styles.actionCard}
                onPress={() => setActiveTab('notices')}
              >
                <Ionicons name="megaphone" size={20} color={CampusTheme.colors.primary} />
                <Text style={styles.actionCardText}>Publish Notice</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* 360 SPACES TAB */}
        {activeTab === '360' && (
          <View style={styles.section}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.sectionTitle}>360° Campus Virtual Experiences</Text>
                <Text style={styles.sectionSub}>
                  Paste any 360° tour link (Clear Pano, Matterport, etc.). All tours open directly inside this page without leaving to 3rd-party sites.
                </Text>
              </View>
              <Pressable
                style={styles.addSpotBtn}
                onPress={() => setShowAdd360Modal(true)}
              >
                <Ionicons name="cloud-upload" size={16} color={CampusTheme.colors.background} />
                <Text style={styles.addSpotBtnText}>Upload 360° Link</Text>
              </Pressable>
            </View>

            <View style={styles.listContainer}>
              {locations360.map((loc) => (
                <View key={loc.id} style={styles.itemCard360}>
                  <View style={styles.itemTopRow360}>
                    <View style={styles.itemIconBox}>
                      <Ionicons name="scan-circle" size={24} color={CampusTheme.colors.primary} />
                    </View>
                    <View style={styles.itemMain}>
                      <Text style={styles.itemName}>{loc.name}</Text>
                      <Text style={styles.itemMeta}>
                        {loc.category} • {loc.floor}
                      </Text>
                      <Text style={styles.itemDesc}>{loc.description}</Text>
                      <View style={styles.urlChip}>
                        <Ionicons name="link" size={12} color={CampusTheme.colors.primary} />
                        <Text style={styles.urlChipText} numberOfLines={1}>
                          {loc.embedUrl || loc.externalUrl}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.cardActionRow360}>
                    <Pressable
                      style={styles.previewInPageBtn}
                      onPress={() => setPreview360Location(loc)}
                    >
                      <Ionicons name="eye" size={15} color="#0D1411" />
                      <Text style={styles.previewInPageBtnText}>Preview in Page</Text>
                    </Pressable>

                    <Pressable
                      style={styles.deleteSpotBtn}
                      onPress={() => handleDelete360Spot(loc.id)}
                    >
                      <Ionicons name="trash-outline" size={16} color={CampusTheme.colors.danger} />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* CANTEEN TAB */}
        {activeTab === 'canteen' && (
          <View style={styles.section}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.sectionTitle}>Canteen Menu & Live Inventory</Text>
                <Text style={styles.sectionSub}>Live food items, price control, and availability</Text>
              </View>
              <Pressable
                style={styles.launchCounterBtn}
                onPress={() => router.push('/food-court')}
              >
                <Ionicons name="fast-food" size={16} color="#0D1411" />
                <Text style={styles.launchCounterBtnText}>Launch POS Counter</Text>
              </Pressable>
            </View>

            <View style={styles.listContainer}>
              {foodItems.map((food) => (
                <View key={food.id} style={styles.itemCard}>
                  <View style={styles.itemIconBox}>
                    <Ionicons name="fast-food" size={22} color={CampusTheme.colors.primary} />
                  </View>
                  <View style={styles.itemMain}>
                    <Text style={styles.itemName}>{food.name}</Text>
                    <Text style={styles.itemMeta}>
                      {food.category} • Prep: {food.prepTimeMinutes}m • ₹{food.price}
                    </Text>
                    <Text style={styles.itemDesc}>{food.description}</Text>
                  </View>
                  <Pressable
                    style={[
                      styles.stockPillBtn,
                      food.available ? styles.stockPillIn : styles.stockPillOut,
                    ]}
                    onPress={() => handleToggleCanteenStock(food.id)}
                  >
                    <Text
                      style={[
                        styles.stockPillText,
                        food.available ? styles.stockPillTextIn : styles.stockPillTextOut,
                      ]}
                    >
                      {food.available ? 'In Stock' : 'Sold Out'}
                    </Text>
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* STAFF & ROLE DELEGATION TAB */}
        {activeTab === 'staff' && (
          <View style={styles.section}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.sectionTitle}>Staff & Power Delegation</Text>
                <Text style={styles.sectionSub}>
                  Assign field-specific powers to staff: Canteen manager, 360° tour curator, notices publisher, or room scheduler.
                </Text>
              </View>
              <Pressable
                style={styles.addSpotBtn}
                onPress={() => setShowAddStaffModal(true)}
              >
                <Ionicons name="person-add" size={16} color={CampusTheme.colors.background} />
                <Text style={styles.addSpotBtnText}>+ Add Staff</Text>
              </Pressable>
            </View>

            <View style={styles.listContainer}>
              {staffMembers.map((staff) => {
                const perms = staff.permissions || [];
                return (
                  <View key={staff.uid} style={styles.staffCard}>
                    <View style={styles.staffHeaderRow}>
                      <View style={styles.staffAvatar}>
                        <Ionicons name="person" size={20} color={CampusTheme.colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.staffName}>{staff.name}</Text>
                        <Text style={styles.staffMeta}>
                          {staff.email} • {staff.designation || 'Staff'}
                        </Text>
                      </View>
                      <View style={styles.roleTag}>
                        <Text style={styles.roleTagText}>{staff.role.replace('_', ' ')}</Text>
                      </View>
                    </View>

                    {/* DELEGATED POWERS TOGGLE ROW */}
                    <Text style={styles.delegatedPowersHeading}>Field Administrator Powers:</Text>
                    <View style={styles.powersGrid}>
                      {/* CANTEEN MANAGER */}
                      <Pressable
                        style={[
                          styles.powerToggleBtn,
                          perms.includes('canteen_manager') && styles.powerToggleBtnActive,
                        ]}
                        onPress={() => handleToggleStaffPermission(staff.uid, 'canteen_manager')}
                      >
                        <Ionicons
                          name="fast-food"
                          size={14}
                          color={perms.includes('canteen_manager') ? '#0D1411' : CampusTheme.colors.textMuted}
                        />
                        <Text
                          style={[
                            styles.powerToggleText,
                            perms.includes('canteen_manager') && styles.powerToggleTextActive,
                          ]}
                        >
                          Canteen Manager
                        </Text>
                      </Pressable>

                      {/* 360 TOUR CURATOR */}
                      <Pressable
                        style={[
                          styles.powerToggleBtn,
                          perms.includes('tour_360_curator') && styles.powerToggleBtnActive,
                        ]}
                        onPress={() => handleToggleStaffPermission(staff.uid, 'tour_360_curator')}
                      >
                        <Ionicons
                          name="scan"
                          size={14}
                          color={perms.includes('tour_360_curator') ? '#0D1411' : CampusTheme.colors.textMuted}
                        />
                        <Text
                          style={[
                            styles.powerToggleText,
                            perms.includes('tour_360_curator') && styles.powerToggleTextActive,
                          ]}
                        >
                          360° Tour Curator
                        </Text>
                      </Pressable>

                      {/* NOTICES PUBLISHER */}
                      <Pressable
                        style={[
                          styles.powerToggleBtn,
                          perms.includes('notices_publisher') && styles.powerToggleBtnActive,
                        ]}
                        onPress={() => handleToggleStaffPermission(staff.uid, 'notices_publisher')}
                      >
                        <Ionicons
                          name="megaphone"
                          size={14}
                          color={perms.includes('notices_publisher') ? '#0D1411' : CampusTheme.colors.textMuted}
                        />
                        <Text
                          style={[
                            styles.powerToggleText,
                            perms.includes('notices_publisher') && styles.powerToggleTextActive,
                          ]}
                        >
                          Notices Publisher
                        </Text>
                      </Pressable>

                      {/* ROOMS MANAGER */}
                      <Pressable
                        style={[
                          styles.powerToggleBtn,
                          perms.includes('rooms_manager') && styles.powerToggleBtnActive,
                        ]}
                        onPress={() => handleToggleStaffPermission(staff.uid, 'rooms_manager')}
                      >
                        <Ionicons
                          name="business"
                          size={14}
                          color={perms.includes('rooms_manager') ? '#0D1411' : CampusTheme.colors.textMuted}
                        />
                        <Text
                          style={[
                            styles.powerToggleText,
                            perms.includes('rooms_manager') && styles.powerToggleTextActive,
                          ]}
                        >
                          Rooms Allocator
                        </Text>
                      </Pressable>
                    </View>

                    {/* QUICK LAUNCH SHORTCUT */}
                    <View style={styles.staffActionRow}>
                      {staff.role === 'food_court_staff' || perms.includes('canteen_manager') ? (
                        <Pressable
                          style={styles.shortcutBtn}
                          onPress={() => router.push('/food-court')}
                        >
                          <Ionicons name="open-outline" size={13} color={CampusTheme.colors.primary} />
                          <Text style={styles.shortcutBtnText}>Open Food Court Screen</Text>
                        </Pressable>
                      ) : null}

                      {staff.role === 'teacher_staff' ? (
                        <Pressable
                          style={styles.shortcutBtn}
                          onPress={() => router.push('/staff')}
                        >
                          <Ionicons name="open-outline" size={13} color={CampusTheme.colors.primary} />
                          <Text style={styles.shortcutBtnText}>Open Faculty Screen</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* ROOMS TAB */}
        {activeTab === 'rooms' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Campus Rooms & Facilities</Text>
            <Text style={styles.sectionSub}>Buildings, Smart Classrooms & Labs</Text>

            <View style={styles.listContainer}>
              {rooms.map((room) => (
                <View key={room.id} style={styles.itemCard}>
                  <View style={styles.itemIconBox}>
                    <Ionicons name="location" size={22} color={CampusTheme.colors.primary} />
                  </View>
                  <View style={styles.itemMain}>
                    <Text style={styles.itemName}>{room.name}</Text>
                    <Text style={styles.itemMeta}>
                      {room.department} • {room.buildingName} • {room.floor}
                    </Text>
                    <Text style={styles.itemDesc}>{room.description}</Text>
                  </View>
                  <View style={styles.roomBadge}>
                    <Text style={styles.roomBadgeText}>{room.type}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* FACULTY TAB */}
        {activeTab === 'faculty' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Academic Faculty & Staff</Text>
            <Text style={styles.sectionSub}>Instructors and Class Teachers</Text>

            <View style={styles.listContainer}>
              {faculty.map((fac) => (
                <View key={fac.id} style={styles.itemCard}>
                  <View style={styles.itemIconBox}>
                    <Ionicons name="person" size={22} color={CampusTheme.colors.primary} />
                  </View>
                  <View style={styles.itemMain}>
                    <Text style={styles.itemName}>{fac.name}</Text>
                    <Text style={styles.itemMeta}>
                      {fac.designation} • {fac.department}
                    </Text>
                    <Text style={styles.itemDesc}>
                      Subjects: {fac.subjects.join(', ')} • Office: {fac.officeRoom}
                    </Text>
                  </View>
                  {fac.isClassTeacher && (
                    <View style={styles.classTeacherBadge}>
                      <Text style={styles.classTeacherBadgeText}>Class Teacher</Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* NOTICES TAB */}
        {activeTab === 'notices' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Institutional Announcements</Text>
            <Text style={styles.sectionSub}>Broadcasted to student home feed</Text>

            <View style={styles.listContainer}>
              {notices.map((n) => (
                <View key={n.id} style={styles.itemCard}>
                  <View style={styles.itemIconBox}>
                    <Ionicons name="megaphone" size={22} color={CampusTheme.colors.primary} />
                  </View>
                  <View style={styles.itemMain}>
                    <Text style={styles.itemName}>{n.title}</Text>
                    <Text style={styles.itemMeta}>
                      {n.category} • {n.timeAgo}
                    </Text>
                    <Text style={styles.itemDesc}>{n.summary}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* ADD 360 MODAL */}
      {showAdd360Modal && (
        <Modal
          visible={showAdd360Modal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowAdd360Modal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalTop}>
                <Text style={styles.modalHeading}>Upload 360° Tour Link</Text>
                <Pressable onPress={() => setShowAdd360Modal(false)}>
                  <Ionicons name="close-circle" size={24} color={CampusTheme.colors.textMuted} />
                </Pressable>
              </View>

              <Text style={styles.modalNote}>
                Paste any virtual tour URL (Clear Pano, Matterport, YouTube 360, or web panorama).
                The tour opens directly inside this application without navigating to a 3rd party site.
              </Text>

              <Text style={styles.inputLabel}>Spot Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Main Campus Quad or Smart Seminar Hall"
                placeholderTextColor={CampusTheme.colors.textDim}
                value={newSpotName}
                onChangeText={setNewSpotName}
              />

              <Text style={styles.inputLabel}>Category</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Campus Tour, Classrooms, Labs, Library"
                placeholderTextColor={CampusTheme.colors.textDim}
                value={newSpotCategory}
                onChangeText={setNewSpotCategory}
              />

              <Text style={styles.inputLabel}>Floor / Location</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Main Ground or 2nd Floor, IT Building"
                placeholderTextColor={CampusTheme.colors.textDim}
                value={newSpotFloor}
                onChangeText={setNewSpotFloor}
              />

              <Text style={styles.inputLabel}>360 Panorama / Embed URL *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="https://tours.clearpano.com/..."
                placeholderTextColor={CampusTheme.colors.textDim}
                value={newSpotUrl}
                onChangeText={setNewSpotUrl}
              />

              <Pressable
                style={styles.quickPresetUrlBtn}
                onPress={() => setNewSpotUrl('https://tours.clearpano.com/I4EFHxcx')}
              >
                <Ionicons name="flash" size={13} color={CampusTheme.colors.primary} />
                <Text style={styles.quickPresetUrlText}>Paste JSPM Clear Pano Sample URL</Text>
              </Pressable>

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Brief description for visitors and students..."
                placeholderTextColor={CampusTheme.colors.textDim}
                value={newSpotDesc}
                onChangeText={setNewSpotDesc}
              />

              <Pressable style={styles.saveSpotBtn} onPress={handleAdd360Spot}>
                <Ionicons name="cloud-upload" size={18} color="#0D1411" />
                <Text style={styles.saveSpotBtnText}>Save & Enable In-App 360°</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}

      {/* ADD STAFF MODAL */}
      {showAddStaffModal && (
        <Modal
          visible={showAddStaffModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowAddStaffModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalTop}>
                <Text style={styles.modalHeading}>Add Staff / Field Admin</Text>
                <Pressable onPress={() => setShowAddStaffModal(false)}>
                  <Ionicons name="close-circle" size={24} color={CampusTheme.colors.textMuted} />
                </Pressable>
              </View>

              <Text style={styles.inputLabel}>Full Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Ramesh Kulkarni"
                placeholderTextColor={CampusTheme.colors.textDim}
                value={newStaffName}
                onChangeText={setNewStaffName}
              />

              <Text style={styles.inputLabel}>Email Address *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. ramesh@jspm.edu"
                placeholderTextColor={CampusTheme.colors.textDim}
                autoCapitalize="none"
                keyboardType="email-address"
                value={newStaffEmail}
                onChangeText={setNewStaffEmail}
              />

              <Text style={styles.inputLabel}>Role Type</Text>
              <View style={{ flexDirection: 'row', gap: 10, marginVertical: 6 }}>
                <Pressable
                  style={[
                    styles.roleChoiceBtn,
                    newStaffRole === 'food_court_staff' && styles.roleChoiceBtnActive,
                  ]}
                  onPress={() => setNewStaffRole('food_court_staff')}
                >
                  <Text
                    style={[
                      styles.roleChoiceText,
                      newStaffRole === 'food_court_staff' && styles.roleChoiceTextActive,
                    ]}
                  >
                    Food Court Staff
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.roleChoiceBtn,
                    newStaffRole === 'teacher_staff' && styles.roleChoiceBtnActive,
                  ]}
                  onPress={() => setNewStaffRole('teacher_staff')}
                >
                  <Text
                    style={[
                      styles.roleChoiceText,
                      newStaffRole === 'teacher_staff' && styles.roleChoiceTextActive,
                    ]}
                  >
                    Faculty / Academic
                  </Text>
                </Pressable>
              </View>

              <Text style={styles.inputLabel}>Designation</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Canteen Manager or Assistant Professor"
                placeholderTextColor={CampusTheme.colors.textDim}
                value={newStaffDesignation}
                onChangeText={setNewStaffDesignation}
              />

              <Pressable style={styles.saveSpotBtn} onPress={handleAddStaff}>
                <Ionicons name="checkmark-circle" size={18} color="#0D1411" />
                <Text style={styles.saveSpotBtnText}>Create Staff Account</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}

      {/* IN-APP 360 PANORAMA VIEWER - OPENS DIRECTLY ON PAGE */}
      <Spatial360Viewer
        visible={!!preview360Location}
        location={preview360Location}
        allLocations={locations360}
        onClose={() => setPreview360Location(null)}
      />
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
    backgroundColor: CampusTheme.colors.warning,
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
  tabsBar: {
    backgroundColor: '#0F1A14',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  tabsScroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#162820',
  },
  activeTabItem: {
    backgroundColor: CampusTheme.colors.primary,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: CampusTheme.colors.textMuted,
  },
  activeTabLabel: {
    color: CampusTheme.colors.background,
    fontWeight: '800',
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
  section: {},
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
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: '#15251E',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.12)',
    ...CampusTheme.shadows.card,
  },
  metricNumber: {
    fontSize: 26,
    fontWeight: '900',
    color: CampusTheme.colors.text,
    marginTop: 8,
  },
  metricLabel: {
    fontSize: 12,
    color: CampusTheme.colors.textMuted,
    marginTop: 2,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#15251E',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.15)',
  },
  actionCardText: {
    fontSize: 13,
    fontWeight: '700',
    color: CampusTheme.colors.text,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addSpotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: CampusTheme.colors.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addSpotBtnText: {
    color: CampusTheme.colors.background,
    fontSize: 12,
    fontWeight: '800',
  },
  listContainer: {
    gap: 12,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#15251E',
    borderRadius: 18,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.12)',
  },
  itemIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#1B3328',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemMain: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '800',
    color: CampusTheme.colors.text,
  },
  itemMeta: {
    fontSize: 12,
    color: CampusTheme.colors.primary,
    marginTop: 2,
    fontWeight: '600',
  },
  itemDesc: {
    fontSize: 12,
    color: CampusTheme.colors.textMuted,
    marginTop: 4,
  },
  activeTag: {
    backgroundColor: CampusTheme.colors.primaryDim,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  activeTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: CampusTheme.colors.primary,
  },
  roomBadge: {
    backgroundColor: '#1C3528',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  roomBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#A3D9BE',
  },
  classTeacherBadge: {
    backgroundColor: '#1E3528',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: CampusTheme.colors.primary,
  },
  classTeacherBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: CampusTheme.colors.primary,
  },
  availableTag: {
    backgroundColor: CampusTheme.colors.primaryDim,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  availableTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: CampusTheme.colors.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#14231B',
    borderRadius: 22,
    padding: 22,
    width: '100%',
    maxWidth: 460,
    borderWidth: 1,
    borderColor: CampusTheme.colors.cardBorder,
  },
  modalTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: CampusTheme.colors.text,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: CampusTheme.colors.textMuted,
    marginTop: 10,
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#0E1712',
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: CampusTheme.colors.text,
    fontSize: 14,
  },
  saveSpotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: CampusTheme.colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    marginTop: 20,
  },
  saveSpotBtnText: {
    color: '#0D1411',
    fontSize: 14,
    fontWeight: '800',
  },
  modalNote: {
    fontSize: 12,
    color: CampusTheme.colors.textMuted,
    lineHeight: 17,
    marginBottom: 8,
  },
  quickPresetUrlBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1C2F25',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.25)',
  },
  quickPresetUrlText: {
    fontSize: 11,
    fontWeight: '700',
    color: CampusTheme.colors.primary,
  },

  // 360 CARDS STYLES
  itemCard360: {
    backgroundColor: '#121F18',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.15)',
  },
  itemTopRow360: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  urlChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0A120E',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  urlChipText: {
    fontSize: 11,
    color: CampusTheme.colors.textMuted,
    flex: 1,
  },
  cardActionRow360: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  previewInPageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: CampusTheme.colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },
  previewInPageBtnText: {
    color: '#0D1411',
    fontWeight: '800',
    fontSize: 12,
  },
  deleteSpotBtn: {
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    padding: 8,
    borderRadius: 8,
  },

  // CANTEEN TAB IN ADMIN
  launchCounterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: CampusTheme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  launchCounterBtnText: {
    color: '#0D1411',
    fontWeight: '800',
    fontSize: 12,
  },
  stockPillBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  stockPillIn: {
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
  },
  stockPillOut: {
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.3)',
  },
  stockPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  stockPillTextIn: {
    color: '#34D399',
  },
  stockPillTextOut: {
    color: '#F87171',
  },

  // STAFF DELEGATION CARDS
  staffCard: {
    backgroundColor: '#121F18',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.15)',
  },
  staffHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  staffAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1C2F25',
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffName: {
    fontSize: 15,
    fontWeight: '800',
    color: CampusTheme.colors.text,
  },
  staffMeta: {
    fontSize: 11,
    color: CampusTheme.colors.textMuted,
    marginTop: 2,
  },
  roleTag: {
    backgroundColor: '#1E3328',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: CampusTheme.colors.primary,
    textTransform: 'capitalize',
  },
  delegatedPowersHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: CampusTheme.colors.textDim,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  powersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  powerToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#0D1511',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  powerToggleBtnActive: {
    backgroundColor: CampusTheme.colors.primary,
    borderColor: CampusTheme.colors.primary,
  },
  powerToggleText: {
    fontSize: 11,
    fontWeight: '600',
    color: CampusTheme.colors.textMuted,
  },
  powerToggleTextActive: {
    color: '#0D1411',
    fontWeight: '800',
  },
  staffActionRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  shortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1A2C23',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.2)',
  },
  shortcutBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: CampusTheme.colors.primary,
  },
  roleChoiceBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#0E1712',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
  },
  roleChoiceBtnActive: {
    backgroundColor: CampusTheme.colors.primary,
    borderColor: CampusTheme.colors.primary,
  },
  roleChoiceText: {
    fontSize: 12,
    fontWeight: '600',
    color: CampusTheme.colors.textMuted,
  },
  roleChoiceTextActive: {
    color: '#0D1411',
    fontWeight: '800',
  },
});
