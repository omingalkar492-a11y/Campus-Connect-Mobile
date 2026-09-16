import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import {
  Alert,
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
  Notice,
  UserProfile,
  StaffPermission,
  UserRole,
  Department,
  RoomType,
} from '@/types';

export default function CollegeAdminScreen() {
  const router = useRouter();
  const { college, profile, logout } = useAuth();

  const [activeTab, setActiveTab] = useState<
    'overview' | '360' | 'canteen' | 'rooms' | 'faculty' | 'notices' | 'staff'
  >('overview');

  // Core College State
  const [rooms, setRooms] = useState<Room[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [locations360, setLocations360] = useState<Campus360Location[]>([]);
  const [canteenOwners, setCanteenOwners] = useState<UserProfile[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [staffMembers, setStaffMembers] = useState<UserProfile[]>([]);

  // Password Visibility Toggle for Canteen Owners
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});

  // Department filter in Rooms tab
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState('All');

  // 360 In-App Live Preview
  const [preview360Location, setPreview360Location] = useState<Campus360Location | null>(null);

  // 1. Room Details Modal (Clicking any room card)
  const [selectedRoomDetails, setSelectedRoomDetails] = useState<Room | null>(null);

  // 2. Add / Edit Room Modal
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [roomName, setRoomName] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [roomDept, setRoomDept] = useState('Information Technology');
  const [roomType, setRoomType] = useState<RoomType>('Classroom');
  const [roomBuilding, setRoomBuilding] = useState('Main Building');
  const [roomFloor, setRoomFloor] = useState('1st Floor');
  const [roomTeacher, setRoomTeacher] = useState('');
  const [roomTeacherPhone, setRoomTeacherPhone] = useState('');
  const [roomTeacherEmail, setRoomTeacherEmail] = useState('');
  const [roomCapacity, setRoomCapacity] = useState('60');
  const [roomDesc, setRoomDesc] = useState('');

  // 3. Manage Departments Modal
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');

  // 4. Add / Edit Canteen Owner Modal
  const [showCanteenOwnerModal, setShowCanteenOwnerModal] = useState(false);
  const [editingOwner, setEditingOwner] = useState<UserProfile | null>(null);
  const [ownerName, setOwnerName] = useState('');
  const [ownerUsername, setOwnerUsername] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');

  // 5. Add / Edit Faculty Modal
  const [showFacultyModal, setShowFacultyModal] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null);
  const [facName, setFacName] = useState('');
  const [facPhone, setFacPhone] = useState('');
  const [facEmail, setFacEmail] = useState('');
  const [facDept, setFacDept] = useState('Information Technology');
  const [facDesignation, setFacDesignation] = useState('Assistant Professor');
  const [facOfficeRoom, setFacOfficeRoom] = useState('IT-201');
  const [facSubjects, setFacSubjects] = useState('');
  const [facIsClassTeacher, setFacIsClassTeacher] = useState(false);
  const [facDivision, setFacDivision] = useState('Div A');

  // 6. Add / Edit Notice Modal
  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeCategory, setNoticeCategory] = useState<'Event' | 'Campus' | 'Opportunity' | 'Urgent'>('Event');
  const [noticeSummary, setNoticeSummary] = useState('');
  const [noticeContent, setNoticeContent] = useState('');
  const [noticeVenue, setNoticeVenue] = useState('');

  // 7. Add 360 Modal
  const [showAdd360Modal, setShowAdd360Modal] = useState(false);
  const [newSpotName, setNewSpotName] = useState('');
  const [newSpotCategory, setNewSpotCategory] = useState('Campus Tour');
  const [newSpotFloor, setNewSpotFloor] = useState('Main Campus Quad');
  const [newSpotDesc, setNewSpotDesc] = useState('');
  const [newSpotUrl, setNewSpotUrl] = useState('');

  // 8. Add Staff Modal
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<UserRole>('teacher_staff');
  const [newStaffDesignation, setNewStaffDesignation] = useState('');
  const [newStaffPermissions, setNewStaffPermissions] = useState<StaffPermission[]>([]);

  // Cross-Platform Confirmation Dialog Helper
  const confirmAction = (message: string, onConfirm: () => void) => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(message)) {
        onConfirm();
      }
    } else {
      Alert.alert('Confirm Action', message, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', style: 'destructive', onPress: onConfirm },
      ]);
    }
  };

  const verifyAdminRole = (): boolean => {
    if (profile?.role !== 'college_admin') {
      const msg = 'Security Notice: Only the designated College Admin has operational management authority.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Access Denied', msg);
      return false;
    }
    return true;
  };

  const loadAdminData = async () => {
    if (!college) return;
    try {
      const [r, f, locs, n, owners, depts, staff] = await Promise.all([
        DataService.getRooms(college.id),
        DataService.getFaculty(college.id),
        DataService.get360Locations(college.id),
        DataService.getNotices(college.id),
        DataService.getCanteenOwners(college.id),
        DataService.getDepartments(college.id),
        DataService.getStaffMembers(college.id),
      ]);
      setRooms(r);
      setFaculty(f);
      setLocations360(locs);
      setNotices(n);
      setCanteenOwners(owners);
      setDepartments(depts);
      setStaffMembers(staff);
    } catch (e) {
      console.error('Error loading admin data:', e);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [college]);

  // ==========================================
  // ROOMS & DEPARTMENTS CRUD
  // ==========================================
  const handleOpenAddRoom = () => {
    if (!verifyAdminRole()) return;
    setEditingRoom(null);
    setRoomName('');
    setRoomNumber('');
    setRoomDept(departments.length > 0 ? departments[0].name : 'Information Technology');
    setRoomType('Classroom');
    setRoomBuilding('Main Building');
    setRoomFloor('1st Floor');
    setRoomTeacher('');
    setRoomTeacherPhone('');
    setRoomTeacherEmail('');
    setRoomCapacity('60');
    setRoomDesc('');
    setShowRoomModal(true);
  };

  const handleOpenEditRoom = (room: Room) => {
    if (!verifyAdminRole()) return;
    setEditingRoom(room);
    setRoomName(room.name);
    setRoomNumber(room.roomNumber);
    setRoomDept(room.department);
    setRoomType(room.type);
    setRoomBuilding(room.buildingName);
    setRoomFloor(room.floor);
    setRoomTeacher(room.departmentTeacher || '');
    setRoomTeacherPhone(room.teacherPhone || '');
    setRoomTeacherEmail(room.teacherEmail || '');
    setRoomCapacity(room.capacity ? String(room.capacity) : '60');
    setRoomDesc(room.description || '');
    setShowRoomModal(true);
  };

  const handleSaveRoom = async () => {
    if (!verifyAdminRole()) return;
    if (!roomName.trim() || !roomNumber.trim() || !college) {
      alert('Please provide room name and room number.');
      return;
    }

    try {
      if (editingRoom) {
        await DataService.updateRoom(
          editingRoom.id,
          {
            name: roomName.trim(),
            roomNumber: roomNumber.trim(),
            department: roomDept.trim(),
            type: roomType,
            buildingName: roomBuilding.trim(),
            floor: roomFloor.trim(),
            departmentTeacher: roomTeacher.trim(),
            teacherPhone: roomTeacherPhone.trim(),
            teacherEmail: roomTeacherEmail.trim(),
            capacity: parseInt(roomCapacity, 10) || 60,
            description: roomDesc.trim(),
          },
          'college_admin'
        );
      } else {
        const newRoomObj: Room = {
          id: `room_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          collegeId: college.id,
          buildingId: 'bld_main',
          buildingName: roomBuilding.trim() || 'Main Building',
          floor: roomFloor.trim() || '1st Floor',
          roomNumber: roomNumber.trim(),
          name: roomName.trim(),
          type: roomType,
          department: roomDept.trim() || 'General',
          capacity: parseInt(roomCapacity, 10) || 60,
          description: roomDesc.trim() || 'Campus facility maintained by college administration.',
          departmentTeacher: roomTeacher.trim(),
          teacherPhone: roomTeacherPhone.trim(),
          teacherEmail: roomTeacherEmail.trim(),
        };
        await DataService.addRoom(newRoomObj, 'college_admin');
      }
      setShowRoomModal(false);
      await loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Error saving room');
    }
  };

  const handleDeleteRoom = (roomId: string) => {
    if (!verifyAdminRole()) return;
    confirmAction('Are you sure you want to permanently delete this room from the campus catalog?', async () => {
      try {
        await DataService.deleteRoom(roomId, 'college_admin');
        if (selectedRoomDetails?.id === roomId) {
          setSelectedRoomDetails(null);
        }
        await loadAdminData();
      } catch (err: any) {
        alert(err.message || 'Error deleting room');
      }
    });
  };

  const handleAddDepartment = async () => {
    if (!verifyAdminRole()) return;
    if (!newDeptName.trim() || !college) return;
    try {
      await DataService.addDepartment(college.id, newDeptName.trim(), 'college_admin');
      setNewDeptName('');
      await loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Error adding department');
    }
  };

  const handleDeleteDepartment = (deptId: string, name: string) => {
    if (!verifyAdminRole()) return;
    confirmAction(`Are you sure you want to delete department "${name}"?`, async () => {
      try {
        await DataService.deleteDepartment(deptId, 'college_admin');
        await loadAdminData();
      } catch (err: any) {
        alert(err.message || 'Error deleting department');
      }
    });
  };

  // ==========================================
  // CANTEEN OWNERS CRUD
  // ==========================================
  const handleOpenAddCanteenOwner = () => {
    if (!verifyAdminRole()) return;
    setEditingOwner(null);
    setOwnerName('');
    setOwnerUsername('');
    setOwnerPassword('');
    setOwnerPhone('');
    setShowCanteenOwnerModal(true);
  };

  const handleOpenEditCanteenOwner = (owner: UserProfile) => {
    if (!verifyAdminRole()) return;
    setEditingOwner(owner);
    setOwnerName(owner.name);
    setOwnerUsername(owner.username || '');
    setOwnerPassword(owner.passwordHash || '');
    setOwnerPhone(owner.phone || '');
    setShowCanteenOwnerModal(true);
  };

  const handleSaveCanteenOwner = async () => {
    if (!verifyAdminRole()) return;
    if (!ownerName.trim() || !ownerUsername.trim() || !ownerPassword.trim() || !ownerPhone.trim() || !college) {
      alert('Please fill out all fields: Name, Login ID/Username, Password, and Mobile Number.');
      return;
    }

    if (ownerPassword.trim().length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }

    try {
      if (editingOwner) {
        await DataService.updateCanteenOwner(
          editingOwner.uid,
          {
            name: ownerName.trim(),
            username: ownerUsername.trim().toLowerCase(),
            passwordHash: ownerPassword.trim(),
            phone: ownerPhone.trim(),
          },
          'college_admin'
        );
      } else {
        await DataService.addCanteenOwner(
          {
            name: ownerName.trim(),
            username: ownerUsername.trim().toLowerCase(),
            password: ownerPassword.trim(),
            phone: ownerPhone.trim(),
            collegeId: college.id,
            assignedFoodCourtId: 'fc_jspm_main',
          },
          'college_admin'
        );
      }
      setShowCanteenOwnerModal(false);
      await loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Error saving canteen owner');
    }
  };

  const handleDeleteCanteenOwner = (uid: string) => {
    if (!verifyAdminRole()) return;
    confirmAction('Are you sure you want to delete this Food Court Owner ID and revoke their access?', async () => {
      try {
        await DataService.deleteCanteenOwner(uid, 'college_admin');
        await loadAdminData();
      } catch (err: any) {
        alert(err.message || 'Error deleting canteen owner');
      }
    });
  };

  // ==========================================
  // FACULTY CRUD
  // ==========================================
  const handleOpenAddFaculty = () => {
    if (!verifyAdminRole()) return;
    setEditingFaculty(null);
    setFacName('');
    setFacPhone('');
    setFacEmail('');
    setFacDept(departments.length > 0 ? departments[0].name : 'Information Technology');
    setFacDesignation('Assistant Professor');
    setFacOfficeRoom('IT-201');
    setFacSubjects('');
    setFacIsClassTeacher(false);
    setFacDivision('Div A');
    setShowFacultyModal(true);
  };

  const handleOpenEditFaculty = (fac: Faculty) => {
    if (!verifyAdminRole()) return;
    setEditingFaculty(fac);
    setFacName(fac.name);
    setFacPhone(fac.phone || '');
    setFacEmail(fac.email);
    setFacDept(fac.department);
    setFacDesignation(fac.designation);
    setFacOfficeRoom(fac.officeRoom);
    setFacSubjects(fac.subjects ? fac.subjects.join(', ') : '');
    setFacIsClassTeacher(!!fac.isClassTeacher);
    setFacDivision(fac.assignedDivision || 'Div A');
    setShowFacultyModal(true);
  };

  const handleSaveFaculty = async () => {
    if (!verifyAdminRole()) return;
    if (!facName.trim() || !facEmail.trim() || !facPhone.trim() || !college) {
      alert('Please provide Name, Mobile Number, and Email for the faculty member.');
      return;
    }

    const subList = facSubjects
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    try {
      if (editingFaculty) {
        await DataService.updateFaculty(
          editingFaculty.id,
          {
            name: facName.trim(),
            phone: facPhone.trim(),
            email: facEmail.trim().toLowerCase(),
            department: facDept.trim(),
            designation: facDesignation.trim(),
            officeRoom: facOfficeRoom.trim(),
            subjects: subList.length > 0 ? subList : ['Academic Instruction'],
            isClassTeacher: facIsClassTeacher,
            assignedDivision: facIsClassTeacher ? facDivision.trim() : undefined,
          },
          'college_admin'
        );
      } else {
        const newFac: Faculty = {
          id: `fac_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          collegeId: college.id,
          name: facName.trim(),
          phone: facPhone.trim(),
          email: facEmail.trim().toLowerCase(),
          department: facDept.trim() || 'Information Technology',
          designation: facDesignation.trim() || 'Assistant Professor',
          officeRoom: facOfficeRoom.trim() || 'IT-201',
          subjects: subList.length > 0 ? subList : ['General Curriculum'],
          isClassTeacher: facIsClassTeacher,
          assignedDivision: facIsClassTeacher ? facDivision.trim() : undefined,
        };
        await DataService.addFaculty(newFac, 'college_admin');
      }
      setShowFacultyModal(false);
      await loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Error saving faculty member');
    }
  };

  const handleDeleteFaculty = (facId: string) => {
    if (!verifyAdminRole()) return;
    confirmAction('Are you sure you want to delete this faculty member from the directory?', async () => {
      try {
        await DataService.deleteFaculty(facId, 'college_admin');
        await loadAdminData();
      } catch (err: any) {
        alert(err.message || 'Error deleting faculty member');
      }
    });
  };

  // ==========================================
  // NOTICES CRUD
  // ==========================================
  const handleOpenAddNotice = () => {
    if (!verifyAdminRole()) return;
    setEditingNotice(null);
    setNoticeTitle('');
    setNoticeCategory('Event');
    setNoticeSummary('');
    setNoticeContent('');
    setNoticeVenue('');
    setShowNoticeModal(true);
  };

  const handleOpenEditNotice = (n: Notice) => {
    if (!verifyAdminRole()) return;
    setEditingNotice(n);
    setNoticeTitle(n.title);
    setNoticeCategory(n.category);
    setNoticeSummary(n.summary);
    setNoticeContent(n.content);
    setNoticeVenue(n.venue || '');
    setShowNoticeModal(true);
  };

  const handleSaveNotice = async () => {
    if (!verifyAdminRole()) return;
    if (!noticeTitle.trim() || !noticeSummary.trim() || !college) {
      alert('Please provide Notice Title and Summary.');
      return;
    }

    try {
      if (editingNotice) {
        await DataService.updateNotice(
          editingNotice.id,
          {
            title: noticeTitle.trim(),
            category: noticeCategory,
            summary: noticeSummary.trim(),
            content: noticeContent.trim() || noticeSummary.trim(),
            venue: noticeVenue.trim(),
          },
          'college_admin'
        );
      } else {
        const newNotice: Notice = {
          id: `not_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          collegeId: college.id,
          title: noticeTitle.trim(),
          category: noticeCategory,
          timeAgo: 'Just now',
          date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
          summary: noticeSummary.trim(),
          content: noticeContent.trim() || noticeSummary.trim(),
          venue: noticeVenue.trim() || 'Campus Wide',
        };
        await DataService.addNotice(newNotice, 'college_admin');
      }
      setShowNoticeModal(false);
      await loadAdminData();
    } catch (err: any) {
      alert(err.message || 'Error publishing notice');
    }
  };

  const handleDeleteNotice = (noticeId: string) => {
    if (!verifyAdminRole()) return;
    confirmAction('Are you sure you want to permanently delete this notice announcement?', async () => {
      try {
        await DataService.deleteNotice(noticeId, 'college_admin');
        await loadAdminData();
      } catch (err: any) {
        alert(err.message || 'Error deleting notice');
      }
    });
  };

  // ==========================================
  // 360 & STAFF DELEGATION
  // ==========================================
  const handleAdd360Spot = async () => {
    if (!verifyAdminRole()) return;
    if (!newSpotName.trim() || !college) return;
    const finalUrl = (newSpotUrl.trim() || 'https://tours.clearpano.com/I4EFHxcx').trim();
    const newSpot: Campus360Location = {
      id: `loc_360_${Date.now()}`,
      collegeId: college.id,
      name: newSpotName.trim(),
      category: newSpotCategory,
      floor: newSpotFloor,
      description: newSpotDesc.trim() || 'Interactive 360° virtual campus tour created by administrator.',
      thumbnail: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=600&q=80',
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

  const handleDelete360Spot = (id: string) => {
    if (!verifyAdminRole()) return;
    confirmAction('Are you sure you want to delete this 360° virtual tour spot?', async () => {
      await DataService.delete360Location(id, 'college_admin');
      await loadAdminData();
    });
  };

  const handleToggleStaffPermission = async (uid: string, perm: StaffPermission) => {
    if (!verifyAdminRole()) return;
    const member = staffMembers.find((s) => s.uid === uid);
    if (!member) return;
    const current = member.permissions || [];
    const updated = current.includes(perm) ? current.filter((p) => p !== perm) : [...current, perm];
    await DataService.updateStaffPermissions(uid, updated);
    await loadAdminData();
  };

  const handleAddStaff = async () => {
    if (!verifyAdminRole()) return;
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

  const navTabs = [
    { key: 'overview', label: 'Overview', icon: 'grid' },
    { key: 'rooms', label: 'Rooms & Labs', icon: 'business' },
    { key: 'canteen', label: 'Food Court Owners', icon: 'fast-food' },
    { key: 'faculty', label: 'Faculty', icon: 'people' },
    { key: 'notices', label: 'Notices', icon: 'notifications' },
    { key: '360', label: '360° Spaces', icon: 'image' },
    { key: 'staff', label: 'Staff & Roles', icon: 'shield-checkmark' },
  ];

  const filteredRooms = selectedDepartmentFilter === 'All'
    ? rooms
    : rooms.filter((r) => r.department.toLowerCase() === selectedDepartmentFilter.toLowerCase());

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
              {college?.name} • {profile?.name || 'Dean & Administrator'}
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
        {/* ========================================== */}
        {/* OVERVIEW TAB                               */}
        {/* ========================================== */}
        {activeTab === 'overview' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Institutional Metrics</Text>
            <Text style={styles.sectionSub}>
              Operational metrics for {college?.name}. Tap any card to navigate directly.
            </Text>

            <View style={styles.metricsGrid}>
              {/* Card 1: Rooms & Labs */}
              <Pressable
                style={styles.metricCardInteractive}
                onPress={() => setActiveTab('rooms')}
              >
                <View style={styles.metricHeaderRow}>
                  <Ionicons name="business" size={24} color={CampusTheme.colors.primary} />
                  <Ionicons name="chevron-forward" size={16} color={CampusTheme.colors.textMuted} />
                </View>
                <Text style={styles.metricNumber}>{rooms.length}</Text>
                <Text style={styles.metricLabel}>Rooms & Labs</Text>
                <Text style={styles.metricHint}>Tap to view details</Text>
              </Pressable>

              {/* Card 2: 360° Spots */}
              <Pressable
                style={styles.metricCardInteractive}
                onPress={() => setActiveTab('360')}
              >
                <View style={styles.metricHeaderRow}>
                  <Ionicons name="image" size={24} color={CampusTheme.colors.primary} />
                  <Ionicons name="chevron-forward" size={16} color={CampusTheme.colors.textMuted} />
                </View>
                <Text style={styles.metricNumber}>{locations360.length}</Text>
                <Text style={styles.metricLabel}>360° Clear Pano Spots</Text>
                <Text style={styles.metricHint}>Tap to preview tours</Text>
              </Pressable>

              {/* Card 3: Faculty & Staff */}
              <Pressable
                style={styles.metricCardInteractive}
                onPress={() => setActiveTab('faculty')}
              >
                <View style={styles.metricHeaderRow}>
                  <Ionicons name="people" size={24} color="#60A5FA" />
                  <Ionicons name="chevron-forward" size={16} color={CampusTheme.colors.textMuted} />
                </View>
                <Text style={styles.metricNumber}>{faculty.length}</Text>
                <Text style={styles.metricLabel}>Faculty & Staff</Text>
                <Text style={styles.metricHint}>Tap to manage faculty</Text>
              </Pressable>

              {/* Card 4: Food Court Owners */}
              <Pressable
                style={styles.metricCardInteractive}
                onPress={() => setActiveTab('canteen')}
              >
                <View style={styles.metricHeaderRow}>
                  <Ionicons name="fast-food" size={24} color="#F472B6" />
                  <Ionicons name="chevron-forward" size={16} color={CampusTheme.colors.textMuted} />
                </View>
                <Text style={styles.metricNumber}>{canteenOwners.length}</Text>
                <Text style={styles.metricLabel}>Food Court Owners</Text>
                <Text style={styles.metricHint}>Tap to manage IDs</Text>
              </Pressable>
            </View>

            {/* Quick Actions */}
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Administrative Actions</Text>
            <View style={styles.actionsRow}>
              <Pressable
                style={styles.actionCard}
                onPress={handleOpenAddRoom}
              >
                <Ionicons name="business" size={20} color={CampusTheme.colors.primary} />
                <Text style={styles.actionCardText}>+ Add Room</Text>
              </Pressable>

              <Pressable
                style={styles.actionCard}
                onPress={handleOpenAddCanteenOwner}
              >
                <Ionicons name="fast-food" size={20} color="#F472B6" />
                <Text style={styles.actionCardText}>+ Add Canteen Owner</Text>
              </Pressable>

              <Pressable
                style={styles.actionCard}
                onPress={handleOpenAddFaculty}
              >
                <Ionicons name="person-add" size={20} color="#60A5FA" />
                <Text style={styles.actionCardText}>+ Add Faculty</Text>
              </Pressable>

              <Pressable
                style={styles.actionCard}
                onPress={handleOpenAddNotice}
              >
                <Ionicons name="megaphone" size={20} color={CampusTheme.colors.warning} />
                <Text style={styles.actionCardText}>Publish Notice</Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ========================================== */}
        {/* ROOMS & LABS TAB                           */}
        {/* ========================================== */}
        {activeTab === 'rooms' && (
          <View style={styles.section}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.sectionTitle}>Campus Rooms & Facilities</Text>
                <Text style={styles.sectionSub}>
                  Manage departments, rooms, and assigned faculty in-charge. Tap card for full details.
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Pressable
                  style={styles.secondaryBtn}
                  onPress={() => setShowDeptModal(true)}
                >
                  <Ionicons name="albums-outline" size={15} color={CampusTheme.colors.primary} />
                  <Text style={styles.secondaryBtnText}>Departments</Text>
                </Pressable>
                <Pressable
                  style={styles.addSpotBtn}
                  onPress={handleOpenAddRoom}
                >
                  <Ionicons name="add-circle" size={16} color={CampusTheme.colors.background} />
                  <Text style={styles.addSpotBtnText}>+ Add Room</Text>
                </Pressable>
              </View>
            </View>

            {/* Department Filter Pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.deptFilterRow}>
              {['All', ...departments.map((d) => d.name)].map((dept) => {
                const isActive = selectedDepartmentFilter.toLowerCase() === dept.toLowerCase();
                return (
                  <Pressable
                    key={dept}
                    style={[styles.filterPill, isActive && styles.filterPillActive]}
                    onPress={() => setSelectedDepartmentFilter(dept)}
                  >
                    <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                      {dept}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.listContainer}>
              {filteredRooms.map((room) => (
                <Pressable
                  key={room.id}
                  style={styles.interactiveRoomCard}
                  onPress={() => setSelectedRoomDetails(room)}
                >
                  <View style={styles.itemIconBox}>
                    <Ionicons name="business" size={22} color={CampusTheme.colors.primary} />
                  </View>
                  <View style={styles.itemMain}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.itemName}>{room.name}</Text>
                      <View style={styles.roomBadge}>
                        <Text style={styles.roomBadgeText}>{room.type}</Text>
                      </View>
                    </View>
                    <Text style={styles.itemMeta}>
                      {room.department} • {room.buildingName} • {room.floor}
                    </Text>
                    {room.departmentTeacher ? (
                      <View style={styles.teacherBadgeRow}>
                        <Ionicons name="person-circle-outline" size={13} color={CampusTheme.colors.primary} />
                        <Text style={styles.teacherInChargeText}>
                          Teacher In-Charge: {room.departmentTeacher}
                        </Text>
                      </View>
                    ) : null}
                    <Text style={styles.itemDesc} numberOfLines={2}>
                      {room.description}
                    </Text>
                  </View>

                  <View style={styles.cardActionsCol}>
                    <Pressable
                      style={styles.iconActionBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleOpenEditRoom(room);
                      }}
                      hitSlop={6}
                    >
                      <Ionicons name="create-outline" size={16} color={CampusTheme.colors.primary} />
                    </Pressable>
                    <Pressable
                      style={styles.iconActionBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleDeleteRoom(room.id);
                      }}
                      hitSlop={6}
                    >
                      <Ionicons name="trash-outline" size={16} color={CampusTheme.colors.danger} />
                    </Pressable>
                  </View>
                </Pressable>
              ))}

              {filteredRooms.length === 0 && (
                <View style={styles.emptyBox}>
                  <Ionicons name="business-outline" size={32} color={CampusTheme.colors.textMuted} />
                  <Text style={styles.emptyText}>No rooms found for {selectedDepartmentFilter}.</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ========================================== */}
        {/* FOOD COURT OWNERS TAB (Replaced Canteen)  */}
        {/* ========================================== */}
        {activeTab === 'canteen' && (
          <View style={styles.section}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.sectionTitle}>Food Court Owners & Access</Text>
                <Text style={styles.sectionSub}>
                  Create, view, and manage canteen owner login credentials (ID, password, name, and mobile number).
                </Text>
              </View>
              <Pressable
                style={styles.addSpotBtn}
                onPress={handleOpenAddCanteenOwner}
              >
                <Ionicons name="person-add" size={16} color={CampusTheme.colors.background} />
                <Text style={styles.addSpotBtnText}>+ Add Canteen Owner</Text>
              </Pressable>
            </View>

            <View style={styles.listContainer}>
              {canteenOwners.map((owner) => {
                const showPass = showPasswordMap[owner.uid];
                return (
                  <View key={owner.uid} style={styles.canteenOwnerCard}>
                    <View style={styles.ownerHeaderRow}>
                      <View style={styles.ownerIconBox}>
                        <Ionicons name="fast-food" size={22} color={CampusTheme.colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.ownerName}>{owner.name}</Text>
                        <Text style={styles.ownerSub}>
                          {owner.designation || 'Food Court Owner'} • {owner.assignedFoodCourtId || 'Central Food Court'}
                        </Text>
                      </View>
                      <View style={styles.activeTag}>
                        <Text style={styles.activeTagText}>Active Licensee</Text>
                      </View>
                    </View>

                    {/* Credentials Info Grid */}
                    <View style={styles.credentialsGrid}>
                      <View style={styles.credRow}>
                        <Text style={styles.credLabel}>Login ID / Username:</Text>
                        <Text style={styles.credValue}>{owner.username || owner.email}</Text>
                      </View>

                      <View style={styles.credRow}>
                        <Text style={styles.credLabel}>Password:</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={styles.credValue}>
                            {showPass ? owner.passwordHash || '••••••••' : '••••••••'}
                          </Text>
                          <Pressable
                            onPress={() =>
                              setShowPasswordMap((prev) => ({
                                ...prev,
                                [owner.uid]: !prev[owner.uid],
                              }))
                            }
                            hitSlop={8}
                          >
                            <Ionicons
                              name={showPass ? 'eye-off' : 'eye'}
                              size={16}
                              color={CampusTheme.colors.primary}
                            />
                          </Pressable>
                        </View>
                      </View>

                      <View style={styles.credRow}>
                        <Text style={styles.credLabel}>Mobile Number:</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons name="call" size={13} color={CampusTheme.colors.primary} />
                          <Text style={styles.credValue}>{owner.phone || 'Not configured'}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Action buttons */}
                    <View style={styles.ownerActionRow}>
                      <Pressable
                        style={styles.editActionBtn}
                        onPress={() => handleOpenEditCanteenOwner(owner)}
                      >
                        <Ionicons name="create-outline" size={14} color={CampusTheme.colors.primary} />
                        <Text style={styles.editActionBtnText}>Edit Details</Text>
                      </Pressable>
                      <Pressable
                        style={styles.deleteActionBtn}
                        onPress={() => handleDeleteCanteenOwner(owner.uid)}
                      >
                        <Ionicons name="trash-outline" size={14} color={CampusTheme.colors.danger} />
                        <Text style={styles.deleteActionBtnText}>Delete ID</Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}

              {canteenOwners.length === 0 && (
                <View style={styles.emptyBox}>
                  <Ionicons name="fast-food-outline" size={32} color={CampusTheme.colors.textMuted} />
                  <Text style={styles.emptyText}>No food court owners configured yet.</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ========================================== */}
        {/* FACULTY TAB                                */}
        {/* ========================================== */}
        {activeTab === 'faculty' && (
          <View style={styles.section}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.sectionTitle}>Academic Faculty & Staff</Text>
                <Text style={styles.sectionSub}>
                  Faculty instructors, mobile numbers, designations, and departmental roles.
                </Text>
              </View>
              <Pressable
                style={styles.addSpotBtn}
                onPress={handleOpenAddFaculty}
              >
                <Ionicons name="person-add" size={16} color={CampusTheme.colors.background} />
                <Text style={styles.addSpotBtnText}>+ Add Faculty</Text>
              </Pressable>
            </View>

            <View style={styles.listContainer}>
              {faculty.map((fac) => (
                <View key={fac.id} style={styles.facultyCard}>
                  <View style={styles.itemIconBox}>
                    <Ionicons name="person" size={22} color={CampusTheme.colors.primary} />
                  </View>
                  <View style={styles.itemMain}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.itemName}>{fac.name}</Text>
                      {fac.isClassTeacher && (
                        <View style={styles.classTeacherBadge}>
                          <Text style={styles.classTeacherBadgeText}>Class Teacher</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.itemMeta}>
                      {fac.designation} • {fac.department}
                    </Text>

                    {/* Prominent Mobile Number & Email */}
                    <View style={styles.contactRow}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <Ionicons name="call" size={13} color={CampusTheme.colors.primary} />
                        <Text style={styles.contactPhone}>{fac.phone || 'No mobile'}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                        <Ionicons name="mail" size={13} color={CampusTheme.colors.textMuted} />
                        <Text style={styles.contactEmail}>{fac.email}</Text>
                      </View>
                    </View>

                    <Text style={styles.itemDesc}>
                      Office: {fac.officeRoom} • Subjects: {fac.subjects.join(', ')}
                    </Text>
                  </View>

                  <View style={styles.cardActionsCol}>
                    <Pressable
                      style={styles.iconActionBtn}
                      onPress={() => handleOpenEditFaculty(fac)}
                      hitSlop={6}
                    >
                      <Ionicons name="create-outline" size={16} color={CampusTheme.colors.primary} />
                    </Pressable>
                    <Pressable
                      style={styles.iconActionBtn}
                      onPress={() => handleDeleteFaculty(fac.id)}
                      hitSlop={6}
                    >
                      <Ionicons name="trash-outline" size={16} color={CampusTheme.colors.danger} />
                    </Pressable>
                  </View>
                </View>
              ))}

              {faculty.length === 0 && (
                <View style={styles.emptyBox}>
                  <Ionicons name="people-outline" size={32} color={CampusTheme.colors.textMuted} />
                  <Text style={styles.emptyText}>No faculty members found.</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ========================================== */}
        {/* NOTICES TAB                                */}
        {/* ========================================== */}
        {activeTab === 'notices' && (
          <View style={styles.section}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.sectionTitle}>Institutional Announcements</Text>
                <Text style={styles.sectionSub}>Broadcasted live to student feeds across all divisions</Text>
              </View>
              <Pressable
                style={styles.addSpotBtn}
                onPress={handleOpenAddNotice}
              >
                <Ionicons name="megaphone" size={16} color={CampusTheme.colors.background} />
                <Text style={styles.addSpotBtnText}>+ Publish Notice</Text>
              </Pressable>
            </View>

            <View style={styles.listContainer}>
              {notices.map((n) => (
                <View key={n.id} style={styles.noticeCard}>
                  <View style={styles.itemIconBox}>
                    <Ionicons name="megaphone" size={22} color={CampusTheme.colors.primary} />
                  </View>
                  <View style={styles.itemMain}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.itemName}>{n.title}</Text>
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>{n.category}</Text>
                      </View>
                    </View>
                    <Text style={styles.itemMeta}>{n.timeAgo || n.date}</Text>
                    <Text style={styles.itemDesc}>{n.summary}</Text>
                    {n.venue ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                        <Ionicons name="location-outline" size={13} color={CampusTheme.colors.primary} />
                        <Text style={styles.venueText}>{n.venue}</Text>
                      </View>
                    ) : null}
                  </View>

                  <View style={styles.cardActionsCol}>
                    <Pressable
                      style={styles.iconActionBtn}
                      onPress={() => handleOpenEditNotice(n)}
                      hitSlop={6}
                    >
                      <Ionicons name="create-outline" size={16} color={CampusTheme.colors.primary} />
                    </Pressable>
                    <Pressable
                      style={styles.iconActionBtn}
                      onPress={() => handleDeleteNotice(n.id)}
                      hitSlop={6}
                    >
                      <Ionicons name="trash-outline" size={16} color={CampusTheme.colors.danger} />
                    </Pressable>
                  </View>
                </View>
              ))}

              {notices.length === 0 && (
                <View style={styles.emptyBox}>
                  <Ionicons name="notifications-outline" size={32} color={CampusTheme.colors.textMuted} />
                  <Text style={styles.emptyText}>No published announcements.</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* ========================================== */}
        {/* 360 SPACES TAB                             */}
        {/* ========================================== */}
        {activeTab === '360' && (
          <View style={styles.section}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.sectionTitle}>360° Campus Virtual Experiences</Text>
                <Text style={styles.sectionSub}>
                  Curate virtual tour locations. All tours open directly inside the app without external redirects.
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

                  <View style={styles.itemBottomActions360}>
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

        {/* ========================================== */}
        {/* STAFF & ROLE DELEGATION TAB                */}
        {/* ========================================== */}
        {activeTab === 'staff' && (
          <View style={styles.section}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.sectionTitle}>Staff & Power Delegation</Text>
                <Text style={styles.sectionSub}>
                  Assign field-specific powers to staff: Canteen manager, 360° tour curator, notices publisher, or room allocator.
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
                          360° Curator
                        </Text>
                      </Pressable>

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
                          Notice Publisher
                        </Text>
                      </Pressable>

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
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* ========================================== */}
      {/* 1. ROOM DETAILS MODAL (When card is clicked) */}
      {/* ========================================== */}
      {selectedRoomDetails && (
        <Modal
          visible={!!selectedRoomDetails}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedRoomDetails(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalTop}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.modalHeading}>{selectedRoomDetails.name}</Text>
                  <View style={styles.roomBadge}>
                    <Text style={styles.roomBadgeText}>{selectedRoomDetails.type}</Text>
                  </View>
                </View>
                <Pressable onPress={() => setSelectedRoomDetails(null)}>
                  <Ionicons name="close-circle" size={24} color={CampusTheme.colors.textMuted} />
                </Pressable>
              </View>

              <ScrollView style={{ maxHeight: 420 }}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Room Number:</Text>
                  <Text style={styles.detailValue}>{selectedRoomDetails.roomNumber}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Department:</Text>
                  <Text style={styles.detailValue}>{selectedRoomDetails.department}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Building & Floor:</Text>
                  <Text style={styles.detailValue}>
                    {selectedRoomDetails.buildingName} • {selectedRoomDetails.floor}
                  </Text>
                </View>

                <View style={styles.detailHighlightCard}>
                  <Text style={styles.detailHighlightTitle}>Department Teacher In-Charge</Text>
                  <Text style={styles.detailTeacherName}>
                    {selectedRoomDetails.departmentTeacher || 'Not assigned'}
                  </Text>
                  {selectedRoomDetails.teacherPhone ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <Ionicons name="call" size={13} color={CampusTheme.colors.primary} />
                      <Text style={styles.detailHighlightPhone}>{selectedRoomDetails.teacherPhone}</Text>
                    </View>
                  ) : null}
                  {selectedRoomDetails.teacherEmail ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <Ionicons name="mail" size={13} color={CampusTheme.colors.textMuted} />
                      <Text style={styles.detailHighlightEmail}>{selectedRoomDetails.teacherEmail}</Text>
                    </View>
                  ) : null}
                </View>

                {selectedRoomDetails.capacity ? (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Seating Capacity:</Text>
                    <Text style={styles.detailValue}>{selectedRoomDetails.capacity} students</Text>
                  </View>
                ) : null}

                <View style={{ marginTop: 10 }}>
                  <Text style={styles.detailLabel}>Facility Description:</Text>
                  <Text style={styles.detailDesc}>{selectedRoomDetails.description}</Text>
                </View>
              </ScrollView>

              <View style={styles.modalActionsRow}>
                <Pressable
                  style={styles.modalEditBtn}
                  onPress={() => {
                    const r = selectedRoomDetails;
                    setSelectedRoomDetails(null);
                    handleOpenEditRoom(r);
                  }}
                >
                  <Ionicons name="create-outline" size={16} color="#0D1411" />
                  <Text style={styles.modalEditBtnText}>Edit Room</Text>
                </Pressable>

                <Pressable
                  style={styles.modalDeleteBtn}
                  onPress={() => {
                    const id = selectedRoomDetails.id;
                    setSelectedRoomDetails(null);
                    handleDeleteRoom(id);
                  }}
                >
                  <Ionicons name="trash-outline" size={16} color={CampusTheme.colors.danger} />
                  <Text style={styles.modalDeleteBtnText}>Delete</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ========================================== */}
      {/* 2. ADD / EDIT ROOM MODAL                   */}
      {/* ========================================== */}
      {showRoomModal && (
        <Modal
          visible={showRoomModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowRoomModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalTop}>
                <Text style={styles.modalHeading}>
                  {editingRoom ? 'Edit Room / Facility' : 'Add Campus Room / Lab'}
                </Text>
                <Pressable onPress={() => setShowRoomModal(false)}>
                  <Ionicons name="close" size={24} color={CampusTheme.colors.textMuted} />
                </Pressable>
              </View>

              <ScrollView style={{ maxHeight: 460 }}>
                <Text style={styles.inputLabel}>Room Name *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Robotics & AI Lab"
                  placeholderTextColor={CampusTheme.colors.textDim}
                  value={roomName}
                  onChangeText={setRoomName}
                />

                <Text style={styles.inputLabel}>Room Number *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. IT-305"
                  placeholderTextColor={CampusTheme.colors.textDim}
                  value={roomNumber}
                  onChangeText={setRoomNumber}
                />

                <Text style={styles.inputLabel}>Department</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
                  {departments.map((d) => (
                    <Pressable
                      key={d.id}
                      style={[
                        styles.choiceChip,
                        roomDept.toLowerCase() === d.name.toLowerCase() && styles.choiceChipActive,
                      ]}
                      onPress={() => setRoomDept(d.name)}
                    >
                      <Text
                        style={[
                          styles.choiceChipText,
                          roomDept.toLowerCase() === d.name.toLowerCase() && styles.choiceChipTextActive,
                        ]}
                      >
                        {d.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>

                <Text style={styles.inputLabel}>Room Type</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
                  {(['Classroom', 'Lab', 'Library', 'Auditorium', 'Office', 'Canteen', 'Other'] as RoomType[]).map(
                    (t) => (
                      <Pressable
                        key={t}
                        style={[styles.choiceChip, roomType === t && styles.choiceChipActive]}
                        onPress={() => setRoomType(t)}
                      >
                        <Text style={[styles.choiceChipText, roomType === t && styles.choiceChipTextActive]}>
                          {t}
                        </Text>
                      </Pressable>
                    )
                  )}
                </ScrollView>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Building</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. IT Building"
                      placeholderTextColor={CampusTheme.colors.textDim}
                      value={roomBuilding}
                      onChangeText={setRoomBuilding}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Floor</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. 3rd Floor"
                      placeholderTextColor={CampusTheme.colors.textDim}
                      value={roomFloor}
                      onChangeText={setRoomFloor}
                    />
                  </View>
                </View>

                <Text style={styles.inputLabel}>Department Teacher In-Charge</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Prof. Sneha Deshmukh"
                  placeholderTextColor={CampusTheme.colors.textDim}
                  value={roomTeacher}
                  onChangeText={setRoomTeacher}
                />

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Teacher Mobile No.</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="+91 98230 11223"
                      placeholderTextColor={CampusTheme.colors.textDim}
                      value={roomTeacherPhone}
                      onChangeText={setRoomTeacherPhone}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Teacher Email</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="teacher@jspm.edu"
                      placeholderTextColor={CampusTheme.colors.textDim}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={roomTeacherEmail}
                      onChangeText={setRoomTeacherEmail}
                    />
                  </View>
                </View>

                <Text style={styles.inputLabel}>Capacity</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="60"
                  placeholderTextColor={CampusTheme.colors.textDim}
                  keyboardType="numeric"
                  value={roomCapacity}
                  onChangeText={setRoomCapacity}
                />

                <Text style={styles.inputLabel}>Description / Amenities</Text>
                <TextInput
                  style={[styles.textInput, { height: 60 }]}
                  multiline
                  placeholder="e.g. High-performance dual monitor workstations & projectors."
                  placeholderTextColor={CampusTheme.colors.textDim}
                  value={roomDesc}
                  onChangeText={setRoomDesc}
                />
              </ScrollView>

              <Pressable style={styles.saveSpotBtn} onPress={handleSaveRoom}>
                <Ionicons name="checkmark-circle" size={18} color="#0D1411" />
                <Text style={styles.saveSpotBtnText}>
                  {editingRoom ? 'Save Room Updates' : 'Create Room'}
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}

      {/* ========================================== */}
      {/* 3. MANAGE DEPARTMENTS MODAL                */}
      {/* ========================================== */}
      {showDeptModal && (
        <Modal
          visible={showDeptModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDeptModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalTop}>
                <Text style={styles.modalHeading}>Manage Departments</Text>
                <Pressable onPress={() => setShowDeptModal(false)}>
                  <Ionicons name="close" size={24} color={CampusTheme.colors.textMuted} />
                </Pressable>
              </View>

              {/* Add New Department Row */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                <TextInput
                  style={[styles.textInput, { flex: 1 }]}
                  placeholder="New Department Name"
                  placeholderTextColor={CampusTheme.colors.textDim}
                  value={newDeptName}
                  onChangeText={setNewDeptName}
                />
                <Pressable style={styles.addDeptBtn} onPress={handleAddDepartment}>
                  <Ionicons name="add" size={18} color="#0D1411" />
                  <Text style={styles.addDeptBtnText}>Add</Text>
                </Pressable>
              </View>

              <Text style={styles.inputLabel}>Existing Departments ({departments.length})</Text>
              <ScrollView style={{ maxHeight: 300 }}>
                {departments.map((d) => (
                  <View key={d.id} style={styles.deptItemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.deptItemName}>{d.name}</Text>
                      {d.code ? <Text style={styles.deptItemCode}>Code: {d.code}</Text> : null}
                    </View>
                    <Pressable
                      style={styles.deleteDeptBtn}
                      onPress={() => handleDeleteDepartment(d.id, d.name)}
                    >
                      <Ionicons name="trash-outline" size={15} color={CampusTheme.colors.danger} />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}

      {/* ========================================== */}
      {/* 4. ADD / EDIT CANTEEN OWNER MODAL          */}
      {/* ========================================== */}
      {showCanteenOwnerModal && (
        <Modal
          visible={showCanteenOwnerModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowCanteenOwnerModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalTop}>
                <Text style={styles.modalHeading}>
                  {editingOwner ? 'Edit Canteen Owner' : 'Add Canteen Owner ID'}
                </Text>
                <Pressable onPress={() => setShowCanteenOwnerModal(false)}>
                  <Ionicons name="close" size={24} color={CampusTheme.colors.textMuted} />
                </Pressable>
              </View>

              <ScrollView style={{ maxHeight: 420 }}>
                <Text style={styles.inputLabel}>Full Name *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Suresh Patil"
                  placeholderTextColor={CampusTheme.colors.textDim}
                  value={ownerName}
                  onChangeText={setOwnerName}
                />

                <Text style={styles.inputLabel}>Login ID / Username *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. suresh_canteen"
                  placeholderTextColor={CampusTheme.colors.textDim}
                  autoCapitalize="none"
                  value={ownerUsername}
                  onChangeText={setOwnerUsername}
                />

                <Text style={styles.inputLabel}>Password * (Min 6 characters)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter secure password"
                  placeholderTextColor={CampusTheme.colors.textDim}
                  value={ownerPassword}
                  onChangeText={setOwnerPassword}
                />

                <Text style={styles.inputLabel}>Mobile Number *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. +91 98765 43210"
                  placeholderTextColor={CampusTheme.colors.textDim}
                  keyboardType="phone-pad"
                  value={ownerPhone}
                  onChangeText={setOwnerPhone}
                />
              </ScrollView>

              <Pressable style={styles.saveSpotBtn} onPress={handleSaveCanteenOwner}>
                <Ionicons name="checkmark-circle" size={18} color="#0D1411" />
                <Text style={styles.saveSpotBtnText}>
                  {editingOwner ? 'Save Owner Updates' : 'Create Canteen Owner'}
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}

      {/* ========================================== */}
      {/* 5. ADD / EDIT FACULTY MODAL                */}
      {/* ========================================== */}
      {showFacultyModal && (
        <Modal
          visible={showFacultyModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowFacultyModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalTop}>
                <Text style={styles.modalHeading}>
                  {editingFaculty ? 'Edit Faculty Member' : 'Add Faculty Member'}
                </Text>
                <Pressable onPress={() => setShowFacultyModal(false)}>
                  <Ionicons name="close" size={24} color={CampusTheme.colors.textMuted} />
                </Pressable>
              </View>

              <ScrollView style={{ maxHeight: 460 }}>
                <Text style={styles.inputLabel}>Full Name *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Prof. Sneha Deshmukh"
                  placeholderTextColor={CampusTheme.colors.textDim}
                  value={facName}
                  onChangeText={setFacName}
                />

                <Text style={styles.inputLabel}>Mobile Number *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. +91 98230 11223"
                  placeholderTextColor={CampusTheme.colors.textDim}
                  keyboardType="phone-pad"
                  value={facPhone}
                  onChangeText={setFacPhone}
                />

                <Text style={styles.inputLabel}>Email Address *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. sneha.deshmukh@jspm.edu"
                  placeholderTextColor={CampusTheme.colors.textDim}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={facEmail}
                  onChangeText={setFacEmail}
                />

                <Text style={styles.inputLabel}>Department</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
                  {departments.map((d) => (
                    <Pressable
                      key={d.id}
                      style={[
                        styles.choiceChip,
                        facDept.toLowerCase() === d.name.toLowerCase() && styles.choiceChipActive,
                      ]}
                      onPress={() => setFacDept(d.name)}
                    >
                      <Text
                        style={[
                          styles.choiceChipText,
                          facDept.toLowerCase() === d.name.toLowerCase() && styles.choiceChipTextActive,
                        ]}
                      >
                        {d.name}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Designation</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Assistant Professor"
                      placeholderTextColor={CampusTheme.colors.textDim}
                      value={facDesignation}
                      onChangeText={setFacDesignation}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Office Room</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. IT-208"
                      placeholderTextColor={CampusTheme.colors.textDim}
                      value={facOfficeRoom}
                      onChangeText={setFacOfficeRoom}
                    />
                  </View>
                </View>

                <Text style={styles.inputLabel}>Subjects (Comma Separated)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="DBMS, Advanced Database, System Design"
                  placeholderTextColor={CampusTheme.colors.textDim}
                  value={facSubjects}
                  onChangeText={setFacSubjects}
                />

                <Pressable
                  style={styles.checkboxRow}
                  onPress={() => setFacIsClassTeacher(!facIsClassTeacher)}
                >
                  <Ionicons
                    name={facIsClassTeacher ? 'checkbox' : 'square-outline'}
                    size={20}
                    color={CampusTheme.colors.primary}
                  />
                  <Text style={styles.checkboxLabel}>Designate as Class Teacher</Text>
                </Pressable>

                {facIsClassTeacher && (
                  <View style={{ marginTop: 8 }}>
                    <Text style={styles.inputLabel}>Assigned Division</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="e.g. Div A"
                      placeholderTextColor={CampusTheme.colors.textDim}
                      value={facDivision}
                      onChangeText={setFacDivision}
                    />
                  </View>
                )}
              </ScrollView>

              <Pressable style={styles.saveSpotBtn} onPress={handleSaveFaculty}>
                <Ionicons name="checkmark-circle" size={18} color="#0D1411" />
                <Text style={styles.saveSpotBtnText}>
                  {editingFaculty ? 'Save Faculty Updates' : 'Add Faculty Member'}
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}

      {/* ========================================== */}
      {/* 6. ADD / EDIT NOTICE MODAL                 */}
      {/* ========================================== */}
      {showNoticeModal && (
        <Modal
          visible={showNoticeModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowNoticeModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalTop}>
                <Text style={styles.modalHeading}>
                  {editingNotice ? 'Edit Notice Announcement' : 'Publish Institutional Notice'}
                </Text>
                <Pressable onPress={() => setShowNoticeModal(false)}>
                  <Ionicons name="close" size={24} color={CampusTheme.colors.textMuted} />
                </Pressable>
              </View>

              <ScrollView style={{ maxHeight: 420 }}>
                <Text style={styles.inputLabel}>Notice Title *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Mid-sem project expo registrations are live"
                  placeholderTextColor={CampusTheme.colors.textDim}
                  value={noticeTitle}
                  onChangeText={setNoticeTitle}
                />

                <Text style={styles.inputLabel}>Category</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginVertical: 4 }}>
                  {(['Event', 'Campus', 'Opportunity', 'Urgent'] as const).map((cat) => (
                    <Pressable
                      key={cat}
                      style={[styles.choiceChip, noticeCategory === cat && styles.choiceChipActive]}
                      onPress={() => setNoticeCategory(cat)}
                    >
                      <Text style={[styles.choiceChipText, noticeCategory === cat && styles.choiceChipTextActive]}>
                        {cat}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.inputLabel}>Summary *</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Brief synopsis shown on student home feed"
                  placeholderTextColor={CampusTheme.colors.textDim}
                  value={noticeSummary}
                  onChangeText={setNoticeSummary}
                />

                <Text style={styles.inputLabel}>Full Content</Text>
                <TextInput
                  style={[styles.textInput, { height: 70 }]}
                  multiline
                  placeholder="Detailed announcement details, instructions, and dates..."
                  placeholderTextColor={CampusTheme.colors.textDim}
                  value={noticeContent}
                  onChangeText={setNoticeContent}
                />

                <Text style={styles.inputLabel}>Venue / Location</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Main Auditorium & IT Labs"
                  placeholderTextColor={CampusTheme.colors.textDim}
                  value={noticeVenue}
                  onChangeText={setNoticeVenue}
                />
              </ScrollView>

              <Pressable style={styles.saveSpotBtn} onPress={handleSaveNotice}>
                <Ionicons name="megaphone" size={18} color="#0D1411" />
                <Text style={styles.saveSpotBtnText}>
                  {editingNotice ? 'Save Notice Updates' : 'Publish Announcement'}
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}

      {/* ========================================== */}
      {/* 7. ADD 360 MODAL                           */}
      {/* ========================================== */}
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
                <Text style={styles.modalHeading}>Upload 360° Virtual Tour</Text>
                <Pressable onPress={() => setShowAdd360Modal(false)}>
                  <Ionicons name="close" size={24} color={CampusTheme.colors.textMuted} />
                </Pressable>
              </View>

              <Text style={styles.inputLabel}>Space Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Mechanical Workshop or Main Lawn"
                placeholderTextColor={CampusTheme.colors.textDim}
                value={newSpotName}
                onChangeText={setNewSpotName}
              />

              <Text style={styles.inputLabel}>Category</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Labs, Library, Auditorium, Campus Quad"
                placeholderTextColor={CampusTheme.colors.textDim}
                value={newSpotCategory}
                onChangeText={setNewSpotCategory}
              />

              <Text style={styles.inputLabel}>Floor / Location</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 2nd Floor or West Wing"
                placeholderTextColor={CampusTheme.colors.textDim}
                value={newSpotFloor}
                onChangeText={setNewSpotFloor}
              />

              <Text style={styles.inputLabel}>360° Tour URL (Clear Pano or Matterport)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="https://tours.clearpano.com/..."
                placeholderTextColor={CampusTheme.colors.textDim}
                autoCapitalize="none"
                value={newSpotUrl}
                onChangeText={setNewSpotUrl}
              />

              <Text style={styles.inputLabel}>Description</Text>
              <TextInput
                style={[styles.textInput, { height: 60 }]}
                multiline
                placeholder="Brief summary for students exploring the 360 viewer"
                placeholderTextColor={CampusTheme.colors.textDim}
                value={newSpotDesc}
                onChangeText={setNewSpotDesc}
              />

              <Pressable style={styles.saveSpotBtn} onPress={handleAdd360Spot}>
                <Ionicons name="checkmark-circle" size={18} color="#0D1411" />
                <Text style={styles.saveSpotBtnText}>Save 360° Space</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}

      {/* ========================================== */}
      {/* 8. ADD STAFF MODAL                         */}
      {/* ========================================== */}
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
                <Text style={styles.modalHeading}>Create Staff Account</Text>
                <Pressable onPress={() => setShowAddStaffModal(false)}>
                  <Ionicons name="close" size={24} color={CampusTheme.colors.textMuted} />
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
                placeholder="e.g. Lab Technician or Assistant Professor"
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

      {/* IN-APP 360 PANORAMA VIEWER */}
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
  metricCardInteractive: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#14231B',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.15)',
  },
  metricHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricNumber: {
    fontSize: 30,
    fontWeight: '900',
    color: CampusTheme.colors.text,
    marginTop: 10,
  },
  metricLabel: {
    fontSize: 13,
    color: CampusTheme.colors.textMuted,
    fontWeight: '700',
    marginTop: 2,
  },
  metricHint: {
    fontSize: 10,
    color: CampusTheme.colors.primary,
    fontWeight: '700',
    marginTop: 6,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#14231B',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
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
    marginBottom: 12,
  },
  addSpotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: CampusTheme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addSpotBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: CampusTheme.colors.background,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#162820',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.25)',
  },
  secondaryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: CampusTheme.colors.primary,
  },
  deptFilterRow: {
    paddingVertical: 8,
    gap: 8,
    marginBottom: 12,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#162820',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  filterPillActive: {
    backgroundColor: CampusTheme.colors.primary,
    borderColor: CampusTheme.colors.primary,
  },
  filterPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: CampusTheme.colors.textMuted,
  },
  filterPillTextActive: {
    color: '#0D1411',
    fontWeight: '800',
  },
  listContainer: {
    gap: 12,
  },
  interactiveRoomCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#14231B',
    padding: 16,
    borderRadius: 16,
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
  teacherBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  teacherInChargeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A3D9BE',
  },
  itemDesc: {
    fontSize: 12,
    color: CampusTheme.colors.textMuted,
    marginTop: 4,
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
  cardActionsCol: {
    gap: 8,
    alignItems: 'center',
  },
  iconActionBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#1B2E24',
  },
  canteenOwnerCard: {
    backgroundColor: '#14231B',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.15)',
  },
  ownerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  ownerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(244, 114, 182, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ownerName: {
    fontSize: 16,
    fontWeight: '800',
    color: CampusTheme.colors.text,
  },
  ownerSub: {
    fontSize: 12,
    color: CampusTheme.colors.textMuted,
    marginTop: 1,
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
  credentialsGrid: {
    backgroundColor: '#0F1A14',
    borderRadius: 12,
    padding: 12,
    marginVertical: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  credRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  credLabel: {
    fontSize: 12,
    color: CampusTheme.colors.textMuted,
    fontWeight: '600',
  },
  credValue: {
    fontSize: 13,
    color: CampusTheme.colors.text,
    fontWeight: '700',
  },
  ownerActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  editActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#1B2E24',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.2)',
  },
  editActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: CampusTheme.colors.primary,
  },
  deleteActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  deleteActionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: CampusTheme.colors.danger,
  },
  facultyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#14231B',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.12)',
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginVertical: 4,
  },
  contactPhone: {
    fontSize: 12,
    fontWeight: '700',
    color: CampusTheme.colors.primary,
  },
  contactEmail: {
    fontSize: 12,
    fontWeight: '600',
    color: CampusTheme.colors.textMuted,
  },
  classTeacherBadge: {
    backgroundColor: '#1E3528',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: CampusTheme.colors.primary,
  },
  classTeacherBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: CampusTheme.colors.primary,
  },
  noticeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#14231B',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.12)',
  },
  categoryBadge: {
    backgroundColor: '#1C3528',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: CampusTheme.colors.warning,
  },
  venueText: {
    fontSize: 11,
    fontWeight: '600',
    color: CampusTheme.colors.primary,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: CampusTheme.colors.textMuted,
  },
  // 360 card
  itemCard360: {
    backgroundColor: '#14231B',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.15)',
  },
  itemTopRow360: {
    flexDirection: 'row',
    gap: 12,
  },
  urlChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0D1511',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 6,
  },
  urlChipText: {
    fontSize: 10,
    color: CampusTheme.colors.primary,
    fontWeight: '600',
  },
  itemBottomActions360: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
  },
  previewInPageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: CampusTheme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  previewInPageBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0D1411',
  },
  deleteSpotBtn: {
    padding: 6,
  },
  // Staff card
  staffCard: {
    backgroundColor: '#14231B',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.15)',
  },
  staffHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  staffAvatar: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#1A3326',
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffName: {
    fontSize: 14,
    fontWeight: '800',
    color: CampusTheme.colors.text,
  },
  staffMeta: {
    fontSize: 11,
    color: CampusTheme.colors.textMuted,
  },
  roleTag: {
    backgroundColor: '#1E3528',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
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
    color: CampusTheme.colors.textMuted,
    marginTop: 12,
    marginBottom: 6,
  },
  powersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  powerToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
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
  // Modals
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
    maxWidth: 480,
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
  choiceChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#0E1712',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    marginRight: 6,
  },
  choiceChipActive: {
    backgroundColor: CampusTheme.colors.primary,
    borderColor: CampusTheme.colors.primary,
  },
  choiceChipText: {
    fontSize: 11,
    color: CampusTheme.colors.textMuted,
    fontWeight: '600',
  },
  choiceChipTextActive: {
    color: '#0D1411',
    fontWeight: '800',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingVertical: 4,
  },
  checkboxLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: CampusTheme.colors.text,
  },
  saveSpotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: CampusTheme.colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 18,
  },
  saveSpotBtnText: {
    color: '#0D1411',
    fontSize: 14,
    fontWeight: '800',
  },
  // Details Modal styles
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  detailLabel: {
    fontSize: 12,
    color: CampusTheme.colors.textMuted,
    fontWeight: '600',
  },
  detailValue: {
    fontSize: 13,
    color: CampusTheme.colors.text,
    fontWeight: '700',
  },
  detailHighlightCard: {
    backgroundColor: '#0E1712',
    borderRadius: 12,
    padding: 12,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.2)',
  },
  detailHighlightTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: CampusTheme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailTeacherName: {
    fontSize: 15,
    fontWeight: '800',
    color: CampusTheme.colors.text,
    marginTop: 4,
  },
  detailHighlightPhone: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A3D9BE',
  },
  detailHighlightEmail: {
    fontSize: 12,
    fontWeight: '600',
    color: CampusTheme.colors.textMuted,
  },
  detailDesc: {
    fontSize: 12,
    color: CampusTheme.colors.textMuted,
    lineHeight: 18,
    marginTop: 4,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  modalEditBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: CampusTheme.colors.primary,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalEditBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0D1411',
  },
  modalDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  modalDeleteBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: CampusTheme.colors.danger,
  },
  // Manage Departments modal
  addDeptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: CampusTheme.colors.primary,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  addDeptBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0D1411',
  },
  deptItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F1A14',
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  deptItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: CampusTheme.colors.text,
  },
  deptItemCode: {
    fontSize: 10,
    color: CampusTheme.colors.primary,
    fontWeight: '600',
  },
  deleteDeptBtn: {
    padding: 6,
  },
});
