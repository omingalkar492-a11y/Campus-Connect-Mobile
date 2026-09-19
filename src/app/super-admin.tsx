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
  ActivityIndicator,
} from 'react-native';

import { CampusTheme } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { DataService } from '@/services/data-service';
import { College, UserProfile } from '@/types';

export default function SuperAdminScreen() {
  const router = useRouter();
  const { profile, logout } = useAuth();

  const [colleges, setColleges] = useState<College[]>([]);
  const [collegeAdmins, setCollegeAdmins] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter & Selection State
  const [filterCollegeId, setFilterCollegeId] = useState<string>('all');
  const [selectedCollegeForManage, setSelectedCollegeForManage] = useState<College | null>(null);

  // Add College Admin Modal
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [newAdminDesignation, setNewAdminDesignation] = useState('');
  const [newAdminCollegeId, setNewAdminCollegeId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cols, admins] = await Promise.all([
        DataService.getColleges(),
        DataService.getCollegeAdmins(),
      ]);
      setColleges(cols);
      setCollegeAdmins(admins);
      if (cols.length > 0 && !newAdminCollegeId) {
        setNewAdminCollegeId(cols[0].id);
      }
      // Ensure all college admins are provisioned to cloud auth for multi-device access
      DataService.syncAllCollegeAdminsToCloud().catch(() => {});
    } catch (e) {
      console.error('Error loading super admin data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAddModal = (defaultCollegeId?: string) => {
    if (defaultCollegeId) {
      setNewAdminCollegeId(defaultCollegeId);
    } else if (colleges.length > 0 && !newAdminCollegeId) {
      setNewAdminCollegeId(colleges[0].id);
    }
    setShowAddAdminModal(true);
  };

  const handleCreateAdmin = async () => {
    const cleanName = newAdminName.trim();
    const cleanEmail = newAdminEmail.trim().toLowerCase();
    const cleanPassword = newAdminPassword.trim();

    if (!cleanName || !cleanEmail || !cleanPassword || !newAdminCollegeId) {
      Alert.alert('Missing Details', 'Please fill in Name, Campus Email, Password, and select a College.');
      return;
    }

    if (cleanPassword.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters long.');
      return;
    }

    try {
      setSubmitting(true);
      await DataService.addCollegeAdmin(
        {
          name: cleanName,
          email: cleanEmail,
          password: cleanPassword,
          collegeId: newAdminCollegeId,
          designation: newAdminDesignation.trim() || 'Campus Administrator & Dean',
        },
        'super_admin'
      );

      const targetCol = colleges.find((c) => c.id === newAdminCollegeId);
      Alert.alert(
        'College Admin ID Created',
        `Successfully issued College Admin credentials for ${cleanName} (${cleanEmail}) at ${targetCol?.shortName || 'the institution'}.\n\nThey can now sign in via the Staff & Admin portal.`
      );

      setShowAddAdminModal(false);
      setNewAdminName('');
      setNewAdminEmail('');
      setNewAdminPassword('');
      setNewAdminDesignation('');
      await loadData();
    } catch (err: any) {
      Alert.alert('Creation Failed', err?.message || 'Could not create College Admin account.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAdmin = (admin: UserProfile) => {
    const targetCol = colleges.find((c) => c.id === admin.collegeId);
    Alert.alert(
      'Revoke College Admin ID',
      `Are you sure you want to delete the College Admin ID for ${admin.name} (${admin.email})?\n\nThis user will immediately lose administrative access to ${targetCol?.name || 'this campus'}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Admin ID',
          style: 'destructive',
          onPress: async () => {
            try {
              await DataService.deleteCollegeAdmin(admin.uid, 'super_admin');
              await loadData();
              Alert.alert('ID Revoked', `College Admin ID for ${admin.email} has been permanently deleted.`);
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to delete College Admin account.');
            }
          },
        },
      ]
    );
  };

  const filteredAdmins =
    filterCollegeId === 'all'
      ? collegeAdmins
      : collegeAdmins.filter((a) => a.collegeId === filterCollegeId);

  const getCollegeForAdmin = (collegeId: string) => {
    return colleges.find((c) => c.id === collegeId);
  };

  return (
    <View style={styles.safeContainer}>
      {/* SUPER ADMIN HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.badge}>
            <Ionicons name="planet" size={18} color={CampusTheme.colors.background} />
          </View>
          <View>
            <View style={styles.adminNameRow}>
              <Text style={styles.headerTitle}>SUPER ADMIN PLATFORM</Text>
              <View style={styles.superBadge}>
                <Text style={styles.superBadgeText}>OMKUMAR G. INGALKAR</Text>
              </View>
            </View>
            <Text style={styles.headerSub}>Platform Architect • @omkumar_01</Text>
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
        {/* STATS OVERVIEW */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{colleges.length}</Text>
            <Text style={styles.statLabel}>Active Campuses</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: CampusTheme.colors.primary }]}>
              {collegeAdmins.length}
            </Text>
            <Text style={styles.statLabel}>College Admin IDs</Text>
          </View>
          <View style={styles.statBox}>
            <Ionicons name="shield-checkmark" size={20} color="#A78BFA" />
            <Text style={styles.statLabel}>Exclusive Authority</Text>
          </View>
        </View>

        {/* SECTION 1: NETWORK OF CAMPUSES */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Network of Campuses</Text>
            <Text style={styles.sectionSub}>Active institutional tenants operating on Campus Connect</Text>
          </View>
        </View>

        <View style={styles.collegesList}>
          {colleges.map((col) => {
            const adminCount = collegeAdmins.filter((a) => a.collegeId === col.id).length;
            return (
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
                  <View style={styles.tenantInfoCol}>
                    <Text style={styles.tenantIdText}>Tenant ID: {col.id}</Text>
                    <Text style={styles.tenantAdminCount}>
                      {adminCount} {adminCount === 1 ? 'Admin ID' : 'Admin IDs'} Assigned
                    </Text>
                  </View>
                  <Pressable
                    style={styles.manageBtn}
                    onPress={() => setSelectedCollegeForManage(col)}
                  >
                    <Ionicons name="settings-outline" size={13} color={CampusTheme.colors.primary} />
                    <Text style={styles.manageBtnText}>Manage Tenant</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>

        {/* SECTION 2: COLLEGE ADMINISTRATORS DIRECTORY */}
        <View style={[styles.sectionHeaderRow, { marginTop: 28 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>College Admin IDs</Text>
            <Text style={styles.sectionSub}>
              Only Super Admin can add or delete institutional College Admin IDs
            </Text>
          </View>
          <Pressable
            style={styles.addAdminHeaderBtn}
            onPress={() => handleOpenAddModal()}
          >
            <Ionicons name="add-circle" size={16} color="#0E1713" />
            <Text style={styles.addAdminHeaderBtnText}>+ Add College Admin ID</Text>
          </Pressable>
        </View>

        {/* Campus Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar}>
          <Pressable
            style={[styles.filterPill, filterCollegeId === 'all' && styles.activeFilterPill]}
            onPress={() => setFilterCollegeId('all')}
          >
            <Text
              style={[
                styles.filterPillText,
                filterCollegeId === 'all' && styles.activeFilterPillText,
              ]}
            >
              All Campuses ({collegeAdmins.length})
            </Text>
          </Pressable>
          {colleges.map((c) => {
            const count = collegeAdmins.filter((a) => a.collegeId === c.id).length;
            const isSelected = filterCollegeId === c.id;
            return (
              <Pressable
                key={c.id}
                style={[styles.filterPill, isSelected && styles.activeFilterPill]}
                onPress={() => setFilterCollegeId(c.id)}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    isSelected && styles.activeFilterPillText,
                  ]}
                >
                  {c.shortName} ({count})
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* College Admins Cards List */}
        {filteredAdmins.length === 0 ? (
          <View style={styles.emptyAdminsCard}>
            <Ionicons name="shield-outline" size={36} color={CampusTheme.colors.textDim} />
            <Text style={styles.emptyAdminsTitle}>No College Admin IDs Found</Text>
            <Text style={styles.emptyAdminsSub}>
              {filterCollegeId === 'all'
                ? 'No College Admin IDs have been provisioned yet. Use the button below to create one.'
                : 'No College Admin ID is currently assigned to this campus.'}
            </Text>
            <Pressable
              style={styles.emptyAddBtn}
              onPress={() => handleOpenAddModal(filterCollegeId !== 'all' ? filterCollegeId : undefined)}
            >
              <Ionicons name="add" size={16} color="#0E1713" />
              <Text style={styles.emptyAddBtnText}>Create College Admin ID</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.adminsList}>
            {filteredAdmins.map((admin) => {
              const col = getCollegeForAdmin(admin.collegeId);
              return (
                <View key={admin.uid} style={styles.adminCard}>
                  <View style={styles.adminCardLeft}>
                    <View style={styles.adminAvatar}>
                      <Text style={styles.adminInitial}>
                        {admin.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.adminDetails}>
                      <View style={styles.adminNameLine}>
                        <Text style={styles.adminName}>{admin.name}</Text>
                        <View style={styles.adminBadge}>
                          <Text style={styles.adminBadgeText}>COLLEGE ADMIN</Text>
                        </View>
                      </View>
                      <Text style={styles.adminEmail}>{admin.email}</Text>
                      <Text style={styles.adminDesignation}>{admin.designation || 'Administrator'}</Text>
                      <View style={styles.adminCollegeTag}>
                        <Ionicons name="business" size={11} color={CampusTheme.colors.primary} />
                        <Text style={styles.adminCollegeTagText}>
                          {col?.name || admin.collegeId}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <Pressable
                    style={styles.deleteAdminBtn}
                    onPress={() => handleDeleteAdmin(admin)}
                  >
                    <Ionicons name="trash-outline" size={16} color={CampusTheme.colors.danger} />
                    <Text style={styles.deleteAdminBtnText}>Delete ID</Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}

        {/* INSTITUTIONAL PRIVILEGE & GOVERNANCE BOUNDARIES */}
        <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Platform Governance & Boundaries</Text>
        <Text style={styles.sectionSub}>Strict enforcement of institutional separation</Text>
        <View style={styles.statusGrid}>
          <View style={styles.statusCard}>
            <Ionicons name="key" size={24} color={CampusTheme.colors.primary} />
            <Text style={styles.statusTitle}>Super Admin Authority</Text>
            <Text style={styles.statusSub}>
              Sole authority to provision & delete College Admin IDs. Restrained from altering college 360 views or creating teacher/food court IDs.
            </Text>
          </View>

          <View style={styles.statusCard}>
            <Ionicons name="image" size={24} color="#60A5FA" />
            <Text style={styles.statusTitle}>College Admin Autonomy</Text>
            <Text style={styles.statusSub}>
              Exclusively curates college 360° virtual spaces and creates Teacher & Food Court staff IDs for their campus.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* MODAL 1: ADD COLLEGE ADMIN ID */}
      <Modal
        visible={showAddAdminModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddAdminModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>+ Add College Admin ID</Text>
                <Text style={styles.modalSub}>
                  Issue administrative credentials for a campus tenant
                </Text>
              </View>
              <Pressable
                style={styles.modalCloseBtn}
                onPress={() => setShowAddAdminModal(false)}
              >
                <Ionicons name="close" size={20} color={CampusTheme.colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalFormScroll}>
              {/* Target Campus Selector */}
              <Text style={styles.inputLabel}>Select Campus Institution *</Text>
              <View style={styles.modalCollegePicker}>
                {colleges.map((c) => (
                  <Pressable
                    key={c.id}
                    style={[
                      styles.modalCollegePill,
                      newAdminCollegeId === c.id && styles.modalCollegePillActive,
                    ]}
                    onPress={() => setNewAdminCollegeId(c.id)}
                  >
                    <Text
                      style={[
                        styles.modalCollegePillText,
                        newAdminCollegeId === c.id && styles.modalCollegePillTextActive,
                      ]}
                    >
                      {c.shortName}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Admin Full Name */}
              <Text style={styles.inputLabel}>Admin Full Name *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Dr. Rajesh Sharma"
                placeholderTextColor={CampusTheme.colors.textDim}
                value={newAdminName}
                onChangeText={setNewAdminName}
              />

              {/* Campus Email Address */}
              <Text style={styles.inputLabel}>Campus Email Address *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. admin@jspm.edu"
                placeholderTextColor={CampusTheme.colors.textDim}
                keyboardType="email-address"
                autoCapitalize="none"
                value={newAdminEmail}
                onChangeText={setNewAdminEmail}
              />

              {/* Password */}
              <Text style={styles.inputLabel}>Assign Password (min 6 chars) *</Text>
              <View style={styles.passwordInputRow}>
                <TextInput
                  style={[styles.textInput, { flex: 1, marginBottom: 0 }]}
                  placeholder="e.g. AdminPass123!"
                  placeholderTextColor={CampusTheme.colors.textDim}
                  secureTextEntry={!showPassword}
                  value={newAdminPassword}
                  onChangeText={setNewAdminPassword}
                />
                <Pressable
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={18}
                    color={CampusTheme.colors.textMuted}
                  />
                </Pressable>
              </View>

              {/* Designation */}
              <Text style={styles.inputLabel}>Institutional Designation / Role</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Dean of Academics & Campus Administrator"
                placeholderTextColor={CampusTheme.colors.textDim}
                value={newAdminDesignation}
                onChangeText={setNewAdminDesignation}
              />

              {/* Notice */}
              <View style={styles.modalInfoBox}>
                <Ionicons name="information-circle" size={16} color={CampusTheme.colors.primary} />
                <Text style={styles.modalInfoText}>
                  This College Admin will have exclusive authority to curate 360° spaces, create teacher IDs, and manage food court staff for their campus.
                </Text>
              </View>

              <Pressable
                style={[styles.modalSubmitBtn, submitting && { opacity: 0.7 }]}
                onPress={handleCreateAdmin}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#0D1411" />
                ) : (
                  <>
                    <Ionicons name="shield-checkmark" size={16} color="#0D1411" />
                    <Text style={styles.modalSubmitBtnText}>Create College Admin ID</Text>
                  </>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: MANAGE TENANT */}
      <Modal
        visible={!!selectedCollegeForManage}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedCollegeForManage(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>{selectedCollegeForManage?.name}</Text>
                <Text style={styles.modalSub}>
                  Tenant ID: {selectedCollegeForManage?.id} • {selectedCollegeForManage?.city}, {selectedCollegeForManage?.state}
                </Text>
              </View>
              <Pressable
                style={styles.modalCloseBtn}
                onPress={() => setSelectedCollegeForManage(null)}
              >
                <Ionicons name="close" size={20} color={CampusTheme.colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalFormScroll}>
              <View style={styles.tenantModalHeaderRow}>
                <Text style={styles.tenantSectionTitle}>Assigned College Admin IDs</Text>
                <Pressable
                  style={styles.tenantAddBtn}
                  onPress={() => {
                    const cid = selectedCollegeForManage?.id;
                    setSelectedCollegeForManage(null);
                    handleOpenAddModal(cid);
                  }}
                >
                  <Ionicons name="add" size={14} color="#0E1713" />
                  <Text style={styles.tenantAddBtnText}>+ Add Admin</Text>
                </Pressable>
              </View>

              {collegeAdmins.filter((a) => a.collegeId === selectedCollegeForManage?.id).length === 0 ? (
                <View style={styles.tenantEmptyBox}>
                  <Ionicons name="person-outline" size={28} color={CampusTheme.colors.textDim} />
                  <Text style={styles.tenantEmptyTitle}>No Administrators Assigned</Text>
                  <Text style={styles.tenantEmptySub}>
                    This campus has no active College Admin IDs. Use "+ Add Admin" above to provision an administrator.
                  </Text>
                </View>
              ) : (
                <View style={{ gap: 10, marginTop: 10 }}>
                  {collegeAdmins
                    .filter((a) => a.collegeId === selectedCollegeForManage?.id)
                    .map((adm) => (
                      <View key={adm.uid} style={styles.tenantAdminItem}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.tenantAdminName}>{adm.name}</Text>
                          <Text style={styles.tenantAdminEmail}>{adm.email}</Text>
                          <Text style={styles.tenantAdminDesig}>{adm.designation || 'Administrator'}</Text>
                        </View>
                        <Pressable
                          style={styles.deleteAdminSmallBtn}
                          onPress={() => {
                            setSelectedCollegeForManage(null);
                            handleDeleteAdmin(adm);
                          }}
                        >
                          <Ionicons name="trash-outline" size={15} color={CampusTheme.colors.danger} />
                        </Pressable>
                      </View>
                    ))}
                </View>
              )}

              <View style={[styles.modalInfoBox, { marginTop: 18 }]}>
                <Ionicons name="lock-closed" size={16} color={CampusTheme.colors.primary} />
                <Text style={styles.modalInfoText}>
                  College 360° views and campus staff credentials can only be edited by the College Admins listed above. Super Admin governs tenant provisioning.
                </Text>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#A78BFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  adminNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: CampusTheme.colors.text,
    letterSpacing: 0.5,
  },
  superBadge: {
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.3)',
  },
  superBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#C4B5FD',
    letterSpacing: 0.3,
  },
  headerSub: {
    fontSize: 11,
    color: CampusTheme.colors.textMuted,
    marginTop: 2,
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
    paddingBottom: 50,
    maxWidth: 720,
    alignSelf: 'center',
    width: '100%',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#13221A',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.1)',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: CampusTheme.colors.text,
  },
  statLabel: {
    fontSize: 10,
    color: CampusTheme.colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
    fontWeight: '600',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: CampusTheme.colors.text,
  },
  sectionSub: {
    fontSize: 12,
    color: CampusTheme.colors.textMuted,
    marginTop: 2,
  },
  addAdminHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: CampusTheme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addAdminHeaderBtnText: {
    color: '#0E1713',
    fontSize: 11,
    fontWeight: '800',
  },
  collegesList: {
    gap: 14,
  },
  collegeCard: {
    backgroundColor: '#15251E',
    borderRadius: 18,
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
    fontSize: 15,
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
    marginBottom: 12,
  },
  collegeBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 10,
  },
  tenantInfoCol: {
    flex: 1,
  },
  tenantIdText: {
    fontSize: 11,
    color: CampusTheme.colors.textDim,
  },
  tenantAdminCount: {
    fontSize: 11,
    color: CampusTheme.colors.primary,
    fontWeight: '700',
    marginTop: 2,
  },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1C3328',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.2)',
  },
  manageBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: CampusTheme.colors.primary,
  },
  filterBar: {
    flexDirection: 'row',
    marginVertical: 12,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#13221A',
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.1)',
    marginRight: 8,
  },
  activeFilterPill: {
    backgroundColor: CampusTheme.colors.primaryDim,
    borderColor: CampusTheme.colors.primary,
  },
  filterPillText: {
    fontSize: 12,
    color: CampusTheme.colors.textMuted,
    fontWeight: '600',
  },
  activeFilterPillText: {
    color: CampusTheme.colors.primary,
    fontWeight: '800',
  },
  emptyAdminsCard: {
    backgroundColor: '#13221A',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.1)',
    marginVertical: 10,
  },
  emptyAdminsTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: CampusTheme.colors.text,
    marginTop: 10,
  },
  emptyAdminsSub: {
    fontSize: 12,
    color: CampusTheme.colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 400,
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: CampusTheme.colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 14,
  },
  emptyAddBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0E1713',
  },
  adminsList: {
    gap: 10,
    marginTop: 6,
  },
  adminCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#13221A',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.12)',
  },
  adminCardLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
  },
  adminAvatar: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#1E382B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: CampusTheme.colors.primary,
  },
  adminInitial: {
    fontSize: 15,
    fontWeight: '800',
    color: CampusTheme.colors.primary,
  },
  adminDetails: {
    flex: 1,
  },
  adminNameLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adminName: {
    fontSize: 14,
    fontWeight: '800',
    color: CampusTheme.colors.text,
  },
  adminBadge: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.3)',
  },
  adminBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FBBF24',
  },
  adminEmail: {
    fontSize: 12,
    color: CampusTheme.colors.primary,
    marginTop: 2,
  },
  adminDesignation: {
    fontSize: 11,
    color: CampusTheme.colors.textMuted,
    marginTop: 2,
  },
  adminCollegeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  adminCollegeTagText: {
    fontSize: 11,
    color: CampusTheme.colors.textDim,
    fontWeight: '600',
  },
  deleteAdminBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginLeft: 10,
  },
  deleteAdminBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: CampusTheme.colors.danger,
  },
  statusGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
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
    fontSize: 13,
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
    lineHeight: 16,
  },
  // Modals
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '85%',
    backgroundColor: '#13221A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.2)',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    paddingBottom: 14,
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: CampusTheme.colors.text,
  },
  modalSub: {
    fontSize: 11,
    color: CampusTheme.colors.textMuted,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalFormScroll: {
    flexGrow: 0,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: CampusTheme.colors.text,
    marginBottom: 6,
    marginTop: 10,
  },
  modalCollegePicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  modalCollegePill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#0E1713',
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.15)',
  },
  modalCollegePillActive: {
    backgroundColor: CampusTheme.colors.primaryDim,
    borderColor: CampusTheme.colors.primary,
  },
  modalCollegePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: CampusTheme.colors.textMuted,
  },
  modalCollegePillTextActive: {
    color: CampusTheme.colors.primary,
  },
  textInput: {
    backgroundColor: '#0E1713',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: CampusTheme.colors.text,
    fontSize: 13,
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.15)',
    marginBottom: 6,
  },
  passwordInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  eyeBtn: {
    padding: 10,
    backgroundColor: '#0E1713',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.15)',
  },
  modalInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#0E1713',
    borderRadius: 10,
    padding: 12,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.1)',
  },
  modalInfoText: {
    fontSize: 11,
    color: CampusTheme.colors.textMuted,
    flex: 1,
    lineHeight: 16,
  },
  modalSubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: CampusTheme.colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    marginTop: 6,
    marginBottom: 8,
  },
  modalSubmitBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0E1713',
  },
  tenantModalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  tenantSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: CampusTheme.colors.text,
  },
  tenantAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: CampusTheme.colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  tenantAddBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0E1713',
  },
  tenantEmptyBox: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0E1713',
    borderRadius: 12,
    marginTop: 8,
  },
  tenantEmptyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: CampusTheme.colors.text,
    marginTop: 8,
  },
  tenantEmptySub: {
    fontSize: 11,
    color: CampusTheme.colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  tenantAdminItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0E1713',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.1)',
  },
  tenantAdminName: {
    fontSize: 13,
    fontWeight: '700',
    color: CampusTheme.colors.text,
  },
  tenantAdminEmail: {
    fontSize: 11,
    color: CampusTheme.colors.primary,
    marginTop: 1,
  },
  tenantAdminDesig: {
    fontSize: 10,
    color: CampusTheme.colors.textMuted,
    marginTop: 1,
  },
  deleteAdminSmallBtn: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
});
