import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signOut,
  updatePassword,
  deleteUser,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { Platform } from 'react-native';

import { db, auth, secondaryAuth } from '@/lib/firebase';
import {
  SEED_COLLEGES,
  SEED_ROOMS,
  SEED_FACULTY,
  SEED_TIMETABLE,
  SEED_360_LOCATIONS,
  SEED_FOOD_ITEMS,
  SEED_NOTICES,
  SEED_ACTIVE_ORDER,
  DEMO_PROFILES,
  SUPER_ADMIN_ACCOUNT,
  SEED_PAYOUT_CONFIGS,
  SEED_DEPARTMENTS,
  SEED_CANTEEN_OWNER,
} from './seed-data';
import {
  College,
  Room,
  Faculty,
  TimetableSlot,
  Campus360Location,
  FoodItem,
  Notice,
  Order,
  UserProfile,
  OrderStatus,
  PaymentMethod,
  StaffPermission,
  FoodCourtPayoutConfig,
  UserRole,
  Department,
} from '@/types';

// In-memory runtime cache/store to ensure snappy UI and offline/demo resilience
let runtimeOrders: Order[] = [{ ...SEED_ACTIVE_ORDER }];
let runtimeFoodItems: FoodItem[] = [...SEED_FOOD_ITEMS];
let runtime360Locations: Campus360Location[] = [...SEED_360_LOCATIONS];
let runtimeRooms: Room[] = [...SEED_ROOMS];
let runtimeFaculty: Faculty[] = [...SEED_FACULTY];
let runtimeNotices: Notice[] = [...SEED_NOTICES];
let runtimeDepartments: Department[] = [...SEED_DEPARTMENTS];
let runtimeUsers: Record<string, UserProfile> = {};
let runtimeCollegeAdmins: Record<string, UserProfile> = {};
let runtimeCanteenOwners: Record<string, UserProfile> = {
  [SEED_CANTEEN_OWNER.uid]: SEED_CANTEEN_OWNER,
  [SEED_CANTEEN_OWNER.username!.toLowerCase()]: SEED_CANTEEN_OWNER,
  [SEED_CANTEEN_OWNER.email!.toLowerCase()]: SEED_CANTEEN_OWNER,
};
let runtimePayoutConfigs: Record<string, FoodCourtPayoutConfig> = { ...SEED_PAYOUT_CONFIGS };
let otpAttempts: Record<string, number> = {};

const USERS_STORAGE_KEY = 'cc_registered_users';
const COLLEGE_ADMINS_STORAGE_KEY = 'cc_college_admins';
const FOOD_ITEMS_STORAGE_KEY = 'cc_food_items';
const LOCATIONS_360_STORAGE_KEY = 'cc_360_locations';
const PAYOUT_CONFIGS_STORAGE_KEY = 'cc_payout_configs';
const ORDERS_STORAGE_KEY = 'cc_orders';
const ROOMS_STORAGE_KEY = 'cc_rooms';
const FACULTY_STORAGE_KEY = 'cc_faculty';
const NOTICES_STORAGE_KEY = 'cc_notices';
const DEPARTMENTS_STORAGE_KEY = 'cc_departments';
const CANTEEN_OWNERS_STORAGE_KEY = 'cc_canteen_owners';

const saveToStorage = async (key: string, data: any) => {
  try {
    const raw = JSON.stringify(data);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, raw);
    } else if (Platform.OS !== 'web') {
      await AsyncStorage.setItem(key, raw);
    }
  } catch (e) {
    console.error(`Error persisting ${key}:`, e);
  }
};

/**
 * Canonical email alias generator for registration IDs and usernames.
 * Guarantees that any identifier without an '@' can be stored & authenticated in Firebase Auth.
 */
export const toCanonicalAlias = (identifier: string): string => {
  const clean = identifier.toLowerCase().trim();
  if (clean.includes('@')) return clean;
  return `${clean.replace(/[^a-z0-9._-]/g, '')}@campusconnect.edu`;
};

/**
 * Encodes complete profile metadata safely into Firebase Auth user attributes.
 * Uses compact JSON for displayName (under 250 chars) and extended URL-encoding in photoURL (up to 2048 chars).
 */
export const encodeProfileMetadata = (
  profile: UserProfile
): { displayName: string; photoURL: string } => {
  const compact = {
    uid: profile.uid,
    n: profile.name,
    r: profile.role,
    col: profile.collegeId,
    u: profile.username,
    id: profile.studentId || profile.registrationId,
    p: profile.phone,
    d: profile.department,
    y: profile.year,
    div: profile.division,
    roll: profile.rollNumber,
    des: profile.designation,
    fc: profile.assignedFoodCourtId,
    pw: profile.passwordHash,
  };

  const json = JSON.stringify(compact);
  const truncatedDisplayName = json.length <= 250 ? json : profile.name.slice(0, 250);
  const photoURL = 'https://campus.internal/profile?m=' + encodeURIComponent(json);

  return { displayName: truncatedDisplayName, photoURL };
};

/**
 * Decodes profile metadata from Firebase Auth user photoURL or displayName.
 */
export const decodeProfileMetadata = (user: FirebaseUser): Partial<UserProfile> => {
  // 1. Check photoURL param (safely carries full metadata)
  if (user.photoURL && user.photoURL.includes('?m=')) {
    try {
      const raw = decodeURIComponent(user.photoURL.split('?m=')[1]);
      const obj = JSON.parse(raw);
      return {
        uid: obj.uid,
        name: obj.n,
        role: obj.r,
        collegeId: obj.col,
        username: obj.u,
        studentId: obj.id,
        registrationId: obj.id,
        phone: obj.p,
        department: obj.d,
        year: obj.y,
        division: obj.div,
        rollNumber: obj.roll,
        designation: obj.des,
        assignedFoodCourtId: obj.fc,
        passwordHash: obj.pw,
      };
    } catch {}
  }

  // 2. Check displayName JSON
  if (user.displayName) {
    try {
      const obj = JSON.parse(user.displayName);
      return {
        uid: obj.uid,
        name: obj.n || obj.name,
        role: obj.r || obj.role,
        collegeId: obj.col || obj.collegeId,
        username: obj.u || obj.username,
        studentId: obj.id || obj.studentId || obj.registrationId,
        registrationId: obj.id || obj.registrationId || obj.studentId,
        phone: obj.p || obj.phone,
        department: obj.d || obj.department,
        year: obj.y || obj.year,
        division: obj.div || obj.division,
        rollNumber: obj.roll || obj.rollNumber,
        designation: obj.des || obj.designation,
        assignedFoodCourtId: obj.fc || obj.assignedFoodCourtId,
        passwordHash: obj.pw || obj.passwordHash,
      };
    } catch {
      return { name: user.displayName };
    }
  }

  return {};
};

/**
 * Parses user profile metadata from a Firebase Auth user, falling back cleanly.
 */
export const parseProfileFromUser = (
  user: FirebaseUser,
  fallbackEmailOrId?: string
): UserProfile => {
  const meta = decodeProfileMetadata(user);
  const email = user.email || fallbackEmailOrId || '';
  const isAlias =
    email.endsWith('@campusconnect.edu') || email.endsWith('@canteen.campus');
  const derivedUsername = isAlias ? email.split('@')[0] : undefined;

  const profile: UserProfile = {
    uid: meta.uid || user.uid,
    name:
      meta.name ||
      (user.displayName && !user.displayName.trim().startsWith('{') ? user.displayName : '') ||
      (email ? email.split('@')[0] : 'Campus User'),
    role:
      meta.role ||
      (email.includes('canteen') ? 'food_court_staff' : 'student'),
    collegeId: meta.collegeId || 'col_jspm_tathawade',
    email:
      // meta.email is not encoded in compact metadata; derive from context
      (isAlias
        ? meta.username
          ? `${meta.username}@campusconnect.edu`
          : email
        : email),
    status: 'active',
    createdAt: new Date().toISOString(),
    username: meta.username || derivedUsername,
    studentId: meta.studentId || meta.registrationId,
    registrationId: meta.registrationId || meta.studentId,
    department: meta.department,
    year: meta.year,
    division: meta.division,
    rollNumber: meta.rollNumber,
    phone: meta.phone,
    designation: meta.designation,
    assignedFoodCourtId: meta.assignedFoodCourtId,
    // permissions and passwordHash are not stored in the compact metadata encoding
    passwordHash: meta.passwordHash,
  };

  return profile;
};

/**
 * Registers or updates a cloud identity in Firebase Auth.
 * Tries secondaryAuth first (which does not affect active login session),
 * falling back to primary auth only if no user is currently signed in.
 * Ensures credentials can be authenticated from ANY device with ID and password.
 */
export const registerCloudIdentity = async (
  emailOrAlias: string,
  password: string,
  profile: UserProfile
): Promise<boolean> => {
  const email = toCanonicalAlias(emailOrAlias);
  const { displayName, photoURL } = encodeProfileMetadata(profile);

  // Use secondaryAuth if available to avoid touching primary auth session
  const authInstances = [
    secondaryAuth && secondaryAuth !== auth ? secondaryAuth : null,
    !auth.currentUser || auth.currentUser.uid === profile.uid ? auth : null,
  ].filter(Boolean);

  for (const authInst of authInstances) {
    try {
      const cred = await createUserWithEmailAndPassword(
        authInst,
        email,
        password
      );
      await updateProfile(cred.user, { displayName, photoURL });
      if (authInst === secondaryAuth) {
        await signOut(secondaryAuth).catch(() => {});
      }
      return true;
    } catch (authErr: any) {
      if (authErr?.code === 'auth/email-already-in-use') {
        try {
          let cred;
          try {
            cred = await signInWithEmailAndPassword(authInst, email, password);
          } catch {
            if (profile.passwordHash && profile.passwordHash !== password) {
              try {
                cred = await signInWithEmailAndPassword(
                  authInst,
                  email,
                  profile.passwordHash
                );
                await updatePassword(cred.user, password);
              } catch {}
            }
          }
          if (cred) {
            await updateProfile(cred.user, { displayName, photoURL });
            if (authInst === secondaryAuth) {
              await signOut(secondaryAuth).catch(() => {});
            }
            return true;
          }
        } catch {}
      }
    }
  }

  return false;
};

/**
 * Deletes or disables a cloud identity in Firebase Auth.
 */
export const removeCloudIdentity = async (
  emailOrAlias?: string,
  currentPassword?: string
): Promise<void> => {
  if (!emailOrAlias) return;
  const email = toCanonicalAlias(emailOrAlias);
  const authInstances = [
    secondaryAuth && secondaryAuth !== auth ? secondaryAuth : null,
    !auth.currentUser ? auth : null,
  ].filter(Boolean);

  for (const authInst of authInstances) {
    try {
      if (currentPassword) {
        const cred = await signInWithEmailAndPassword(
          authInst,
          email,
          currentPassword
        );
        await deleteUser(cred.user);
        if (authInst === secondaryAuth) {
          await signOut(secondaryAuth).catch(() => {});
        }
        return;
      }
    } catch {}
  }
};

// Initialize runtime cache from local persistence
(async () => {
  try {
    const readStorage = async (key: string) => {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      if (Platform.OS !== 'web') {
        return await AsyncStorage.getItem(key);
      }
      return null;
    };

    const usersRaw = await readStorage(USERS_STORAGE_KEY);
    if (usersRaw) {
      const parsedUsers = JSON.parse(usersRaw);
      Object.assign(runtimeUsers, parsedUsers);
    }

    const adminsRaw = await readStorage(COLLEGE_ADMINS_STORAGE_KEY);
    if (adminsRaw) {
      const parsedAdmins = JSON.parse(adminsRaw);
      Object.assign(runtimeCollegeAdmins, parsedAdmins);
      Object.assign(runtimeUsers, parsedAdmins);
    }

    const canteenOwnersRaw = await readStorage(CANTEEN_OWNERS_STORAGE_KEY);
    if (canteenOwnersRaw) {
      const parsedOwners = JSON.parse(canteenOwnersRaw);
      Object.assign(runtimeCanteenOwners, parsedOwners);
      Object.assign(runtimeUsers, parsedOwners);
    }

    const roomsRaw = await readStorage(ROOMS_STORAGE_KEY);
    if (roomsRaw) {
      const parsedRooms = JSON.parse(roomsRaw);
      if (Array.isArray(parsedRooms) && parsedRooms.length > 0) {
        runtimeRooms = parsedRooms;
      }
    }

    const facultyRaw = await readStorage(FACULTY_STORAGE_KEY);
    if (facultyRaw) {
      const parsedFaculty = JSON.parse(facultyRaw);
      if (Array.isArray(parsedFaculty) && parsedFaculty.length > 0) {
        runtimeFaculty = parsedFaculty;
      }
    }

    const deptsRaw = await readStorage(DEPARTMENTS_STORAGE_KEY);
    if (deptsRaw) {
      const parsedDepts = JSON.parse(deptsRaw);
      if (Array.isArray(parsedDepts) && parsedDepts.length > 0) {
        runtimeDepartments = parsedDepts;
      }
    }

    const noticesRaw = await readStorage(NOTICES_STORAGE_KEY);
    if (noticesRaw) {
      const parsedNotices = JSON.parse(noticesRaw);
      if (Array.isArray(parsedNotices) && parsedNotices.length > 0) {
        runtimeNotices = parsedNotices;
      }
    }

    const foodRaw = await readStorage(FOOD_ITEMS_STORAGE_KEY);
    if (foodRaw) {
      const parsedFood = JSON.parse(foodRaw);
      if (Array.isArray(parsedFood) && parsedFood.length > 0) {
        runtimeFoodItems = parsedFood;
      }
    }

    const locsRaw = await readStorage(LOCATIONS_360_STORAGE_KEY);
    if (locsRaw) {
      const parsedLocs = JSON.parse(locsRaw);
      if (Array.isArray(parsedLocs) && parsedLocs.length > 0) {
        runtime360Locations = parsedLocs;
      }
    }

    const payoutRaw = await readStorage(PAYOUT_CONFIGS_STORAGE_KEY);
    if (payoutRaw) {
      const parsedPayout = JSON.parse(payoutRaw);
      if (parsedPayout && typeof parsedPayout === 'object') {
        runtimePayoutConfigs = { ...runtimePayoutConfigs, ...parsedPayout };
      }
    }

    const ordersRaw = await readStorage(ORDERS_STORAGE_KEY);
    if (ordersRaw) {
      const parsedOrders = JSON.parse(ordersRaw);
      if (Array.isArray(parsedOrders) && parsedOrders.length > 0) {
        runtimeOrders = parsedOrders;
      }
    } else {
      // Save initial seed order
      await saveToStorage(ORDERS_STORAGE_KEY, runtimeOrders);
    }
  } catch (e) {
    console.warn('Storage init warning:', e);
  }
})();

const withTimeout = <T>(promise: Promise<T>, timeoutMs = 5000): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Firestore operation timed out')), timeoutMs)
    ),
  ]);
};

export const DataService = {
  // 1. Colleges
  async getColleges(): Promise<College[]> {
    try {
      const snap = await withTimeout(getDocs(collection(db, 'colleges')), 1500);
      if (!snap.empty) {
        return snap.docs.map((d) => d.data() as College);
      }
    } catch {
      // Fallback to seeds
    }
    return SEED_COLLEGES;
  },

  async getCollege(collegeId: string): Promise<College | null> {
    try {
      const docRef = doc(db, 'colleges', collegeId);
      const snap = await withTimeout(getDoc(docRef), 1500);
      if (snap.exists()) {
        return snap.data() as College;
      }
    } catch {}
    return SEED_COLLEGES.find((c) => c.id === collegeId) || SEED_COLLEGES[0];
  },

  // 2. User Profiles (Multi-layered: Memory -> Local Storage -> Firestore)
  async getUserProfile(uid: string, email?: string): Promise<UserProfile | null> {
    const cleanEmail = email?.toLowerCase().trim();

    // Check Super Admin account (Omkumar Gajanan Ingalkar)
    if (
      uid === SUPER_ADMIN_ACCOUNT.uid ||
      cleanEmail === SUPER_ADMIN_ACCOUNT.email.toLowerCase() ||
      cleanEmail === SUPER_ADMIN_ACCOUNT.username?.toLowerCase()
    ) {
      return SUPER_ADMIN_ACCOUNT;
    }

    // Layer 1: Check in-memory registered users & college admins
    if (runtimeUsers[uid]) return runtimeUsers[uid];
    if (cleanEmail && runtimeUsers[cleanEmail]) return runtimeUsers[cleanEmail];
    if (runtimeCollegeAdmins[uid]) return runtimeCollegeAdmins[uid];
    if (cleanEmail && runtimeCollegeAdmins[cleanEmail]) return runtimeCollegeAdmins[cleanEmail];

    // Layer 2: Check local persistent storage
    try {
      let raw: string | null = null;
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        raw = window.localStorage.getItem(USERS_STORAGE_KEY);
      } else {
        raw = await AsyncStorage.getItem(USERS_STORAGE_KEY);
      }
      if (raw) {
        const parsed = JSON.parse(raw);
        Object.assign(runtimeUsers, parsed);
        if (runtimeUsers[uid]) return runtimeUsers[uid];
        if (cleanEmail && runtimeUsers[cleanEmail]) return runtimeUsers[cleanEmail];
      }

      let adminsRaw: string | null = null;
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        adminsRaw = window.localStorage.getItem(COLLEGE_ADMINS_STORAGE_KEY);
      } else {
        adminsRaw = await AsyncStorage.getItem(COLLEGE_ADMINS_STORAGE_KEY);
      }
      if (adminsRaw) {
        const parsed = JSON.parse(adminsRaw);
        Object.assign(runtimeCollegeAdmins, parsed);
        if (runtimeCollegeAdmins[uid]) return runtimeCollegeAdmins[uid];
        if (cleanEmail && runtimeCollegeAdmins[cleanEmail]) return runtimeCollegeAdmins[cleanEmail];
      }
    } catch {}

    // Layer 3: Check demo profiles
    if (cleanEmail && DEMO_PROFILES[cleanEmail]) {
      return DEMO_PROFILES[cleanEmail];
    }

    // Layer 4: Try Firestore with short timeout
    try {
      const docRef = doc(db, 'users', uid);
      const snap = await withTimeout(getDoc(docRef), 1500);
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        runtimeUsers[uid] = data;
        return data;
      }
    } catch {}

    // Layer 4.5: Check active Firebase Auth User metadata (for cross-device restores)
    if (auth.currentUser && auth.currentUser.uid === uid) {
      const parsed = parseProfileFromUser(auth.currentUser, cleanEmail);
      if (parsed && parsed.name && parsed.role) {
        runtimeUsers[uid] = parsed;
        if (cleanEmail) runtimeUsers[cleanEmail] = parsed;
        await saveToStorage(USERS_STORAGE_KEY, runtimeUsers);
        return parsed;
      }
    }

    // Layer 5: Fallback synthesization for registered student emails
    if (cleanEmail && cleanEmail.includes('@') && cleanEmail !== SUPER_ADMIN_ACCOUNT.email) {
      const namePart = cleanEmail.split('@')[0];
      const formattedName = namePart
        .replace(/[._]/g, ' ')
        .split(' ')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

      const synthesizedProfile: UserProfile = {
        uid,
        name: formattedName || 'Student',
        email: cleanEmail,
        role: 'student',
        collegeId: 'col_jspm_tathawade',
        status: 'active',
        createdAt: new Date().toISOString(),
      };
      runtimeUsers[uid] = synthesizedProfile;
      runtimeUsers[cleanEmail] = synthesizedProfile;
      return synthesizedProfile;
    }

    return null;
  },

  async saveUserProfile(profile: UserProfile): Promise<void> {
    // 1. Save in runtime memory
    runtimeUsers[profile.uid] = profile;
    if (profile.email) {
      runtimeUsers[profile.email.toLowerCase().trim()] = profile;
    }

    // 2. Persist locally to survive reloads/offline
    try {
      const json = JSON.stringify(runtimeUsers);
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(USERS_STORAGE_KEY, json);
      } else {
        await AsyncStorage.setItem(USERS_STORAGE_KEY, json);
      }
    } catch (e) {
      console.warn('Could not save user profile locally:', e);
    }

    // 3. Best-effort write to Cloud Firestore
    try {
      await withTimeout(setDoc(doc(db, 'users', profile.uid), profile, { merge: true }), 1500);
    } catch (e) {
      // Cloud Firestore API might be disabled or offline; locally preserved
    }
  },

  // 3. Rooms & Search (Multi-tenant scoped, full College Admin CRUD)
  async getRooms(collegeId: string, searchQuery?: string, filterType?: string): Promise<Room[]> {
    let list = runtimeRooms.filter((r) => r.collegeId === collegeId);

    if (filterType && filterType !== 'All') {
      const targetType = filterType.toLowerCase();
      list = list.filter(
        (r) =>
          r.type.toLowerCase().includes(targetType) ||
          r.department.toLowerCase() === targetType
      );
    }

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.roomNumber.toLowerCase().includes(q) ||
          r.department.toLowerCase().includes(q) ||
          r.description.toLowerCase().includes(q) ||
          r.buildingName.toLowerCase().includes(q) ||
          (r.departmentTeacher && r.departmentTeacher.toLowerCase().includes(q))
      );
    }

    return list;
  },

  async addRoom(room: Room, actorRole?: UserRole): Promise<Room> {
    if (actorRole && actorRole !== 'college_admin') {
      throw new Error('Security Violation: Only College Admin is authorized to add campus rooms.');
    }
    runtimeRooms.unshift(room);
    await saveToStorage(ROOMS_STORAGE_KEY, runtimeRooms);
    try {
      await withTimeout(setDoc(doc(db, 'rooms', room.id), room), 1500);
    } catch {}
    return room;
  },

  async updateRoom(roomId: string, updates: Partial<Room>, actorRole?: UserRole): Promise<Room> {
    if (actorRole && actorRole !== 'college_admin') {
      throw new Error('Security Violation: Only College Admin is authorized to edit campus rooms.');
    }
    const idx = runtimeRooms.findIndex((r) => r.id === roomId);
    if (idx === -1) throw new Error(`Room ${roomId} not found`);
    runtimeRooms[idx] = { ...runtimeRooms[idx], ...updates };
    await saveToStorage(ROOMS_STORAGE_KEY, runtimeRooms);
    try {
      await withTimeout(updateDoc(doc(db, 'rooms', roomId), updates), 1500);
    } catch {}
    return runtimeRooms[idx];
  },

  async deleteRoom(roomId: string, actorRole?: UserRole): Promise<void> {
    if (actorRole && actorRole !== 'college_admin') {
      throw new Error('Security Violation: Only College Admin is authorized to delete campus rooms.');
    }
    runtimeRooms = runtimeRooms.filter((r) => r.id !== roomId);
    await saveToStorage(ROOMS_STORAGE_KEY, runtimeRooms);
    try {
      await withTimeout(deleteDoc(doc(db, 'rooms', roomId)), 1500);
    } catch {}
  },

  // 3b. Departments (Full College Admin CRUD)
  async getDepartments(collegeId: string): Promise<Department[]> {
    return runtimeDepartments.filter((d) => d.collegeId === collegeId);
  },

  async addDepartment(collegeId: string, departmentName: string, actorRole?: UserRole): Promise<Department> {
    if (actorRole && actorRole !== 'college_admin') {
      throw new Error('Security Violation: Only College Admin is authorized to add departments.');
    }
    const cleanName = departmentName.trim();
    if (!cleanName) throw new Error('Department name cannot be empty.');
    const existing = runtimeDepartments.find(
      (d) => d.collegeId === collegeId && d.name.toLowerCase() === cleanName.toLowerCase()
    );
    if (existing) throw new Error(`Department "${cleanName}" already exists.`);

    const newDept: Department = {
      id: `dept_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      collegeId,
      name: cleanName,
      code: cleanName.substring(0, 4).toUpperCase(),
    };
    runtimeDepartments.push(newDept);
    await saveToStorage(DEPARTMENTS_STORAGE_KEY, runtimeDepartments);
    try {
      await withTimeout(setDoc(doc(db, 'departments', newDept.id), newDept), 1500);
    } catch {}
    return newDept;
  },

  async deleteDepartment(deptId: string, actorRole?: UserRole): Promise<void> {
    if (actorRole && actorRole !== 'college_admin') {
      throw new Error('Security Violation: Only College Admin is authorized to delete departments.');
    }
    runtimeDepartments = runtimeDepartments.filter((d) => d.id !== deptId);
    await saveToStorage(DEPARTMENTS_STORAGE_KEY, runtimeDepartments);
    try {
      await withTimeout(deleteDoc(doc(db, 'departments', deptId)), 1500);
    } catch {}
  },

  // 4. Faculty (Full College Admin CRUD)
  async getFaculty(collegeId: string, searchQuery?: string): Promise<Faculty[]> {
    let list = runtimeFaculty.filter((f) => f.collegeId === collegeId);

    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.department.toLowerCase().includes(q) ||
          f.designation.toLowerCase().includes(q) ||
          (f.phone && f.phone.toLowerCase().includes(q)) ||
          f.subjects.some((s) => s.toLowerCase().includes(q))
      );
    }

    return list;
  },

  async addFaculty(fac: Faculty, actorRole?: UserRole): Promise<Faculty> {
    if (actorRole && actorRole !== 'college_admin') {
      throw new Error('Security Violation: Only College Admin is authorized to add faculty members.');
    }
    runtimeFaculty.unshift(fac);
    await saveToStorage(FACULTY_STORAGE_KEY, runtimeFaculty);
    try {
      await withTimeout(setDoc(doc(db, 'faculty', fac.id), fac), 1500);
    } catch {}
    return fac;
  },

  async updateFaculty(facultyId: string, updates: Partial<Faculty>, actorRole?: UserRole): Promise<Faculty> {
    if (actorRole && actorRole !== 'college_admin') {
      throw new Error('Security Violation: Only College Admin is authorized to edit faculty members.');
    }
    const idx = runtimeFaculty.findIndex((f) => f.id === facultyId);
    if (idx === -1) throw new Error(`Faculty ${facultyId} not found`);
    runtimeFaculty[idx] = { ...runtimeFaculty[idx], ...updates };
    await saveToStorage(FACULTY_STORAGE_KEY, runtimeFaculty);
    try {
      await withTimeout(updateDoc(doc(db, 'faculty', facultyId), updates), 1500);
    } catch {}
    return runtimeFaculty[idx];
  },

  async deleteFaculty(facultyId: string, actorRole?: UserRole): Promise<void> {
    if (actorRole && actorRole !== 'college_admin') {
      throw new Error('Security Violation: Only College Admin is authorized to delete faculty members.');
    }
    runtimeFaculty = runtimeFaculty.filter((f) => f.id !== facultyId);
    await saveToStorage(FACULTY_STORAGE_KEY, runtimeFaculty);
    try {
      await withTimeout(deleteDoc(doc(db, 'faculty', facultyId)), 1500);
    } catch {}
  },

  // 5. Timetable
  async getTimetable(
    collegeId: string,
    department: string,
    year: string,
    division: string,
    dayOfWeek?: number
  ): Promise<TimetableSlot[]> {
    let list = SEED_TIMETABLE.filter(
      (t) =>
        t.collegeId === collegeId &&
        t.department.toLowerCase() === department.toLowerCase() &&
        t.year.toLowerCase() === year.toLowerCase() &&
        t.division.toLowerCase() === division.toLowerCase()
    );

    if (dayOfWeek !== undefined) {
      list = list.filter((t) => t.dayOfWeek === dayOfWeek);
    }

    return list;
  },

  // 6. 360 Locations (Strictly reserved for College Admin)
  async get360Locations(collegeId: string): Promise<Campus360Location[]> {
    return runtime360Locations.filter((l) => l.collegeId === collegeId && l.active);
  },

  async add360Location(location: Campus360Location, actorRole?: UserRole): Promise<void> {
    if (actorRole && actorRole !== 'college_admin') {
      throw new Error(
        actorRole === 'super_admin'
          ? 'Super Admin does not have permission to modify college 360° views. Only the assigned College Admin can manage campus 360° tours.'
          : 'Security Violation: Only College Admin is authorized to add campus 360° locations.'
      );
    }
    const url = (location.embedUrl || location.externalUrl || '').trim();
    const cleanLocation: Campus360Location = {
      ...location,
      embedUrl: url,
      externalUrl: url,
    };
    runtime360Locations.unshift(cleanLocation);
    await saveToStorage(LOCATIONS_360_STORAGE_KEY, runtime360Locations);
    try {
      await setDoc(doc(db, 'campus360Locations', cleanLocation.id), cleanLocation);
    } catch {}
  },

  async update360Location(locationId: string, updates: Partial<Campus360Location>, actorRole?: UserRole): Promise<void> {
    if (actorRole && actorRole !== 'college_admin') {
      throw new Error(
        actorRole === 'super_admin'
          ? 'Super Admin does not have permission to modify college 360° views. Only the assigned College Admin can manage campus 360° tours.'
          : 'Security Violation: Only College Admin is authorized to edit campus 360° locations.'
      );
    }
    const idx = runtime360Locations.findIndex((l) => l.id === locationId);
    if (idx !== -1) {
      if (updates.embedUrl) {
        updates.externalUrl = updates.embedUrl;
      }
      runtime360Locations[idx] = { ...runtime360Locations[idx], ...updates };
      await saveToStorage(LOCATIONS_360_STORAGE_KEY, runtime360Locations);
      try {
        await updateDoc(doc(db, 'campus360Locations', locationId), updates);
      } catch {}
    }
  },

  async delete360Location(locationId: string, actorRole?: UserRole): Promise<void> {
    if (actorRole && actorRole !== 'college_admin') {
      throw new Error(
        actorRole === 'super_admin'
          ? 'Super Admin does not have permission to modify college 360° views. Only the assigned College Admin can manage campus 360° tours.'
          : 'Security Violation: Only College Admin is authorized to delete campus 360° locations.'
      );
    }
    runtime360Locations = runtime360Locations.filter((l) => l.id !== locationId);
    await saveToStorage(LOCATIONS_360_STORAGE_KEY, runtime360Locations);
  },

  // 7. Food Items & Canteen (Full Menu Management for Food Court Staff & Admin)
  async getFoodItems(
    collegeId: string,
    category?: string,
    includeUnavailable = false
  ): Promise<FoodItem[]> {
    let list = runtimeFoodItems.filter((i) => i.collegeId === collegeId);
    if (!includeUnavailable) {
      list = list.filter((i) => i.available);
    }
    if (category && category !== 'All') {
      list = list.filter((i) => i.category.toLowerCase() === category.toLowerCase());
    }
    return list;
  },

  async addFoodItem(item: FoodItem): Promise<FoodItem> {
    runtimeFoodItems.unshift(item);
    await saveToStorage(FOOD_ITEMS_STORAGE_KEY, runtimeFoodItems);
    try {
      await setDoc(doc(db, 'foodItems', item.id), item);
    } catch {}
    return item;
  },

  async updateFoodItem(itemId: string, updates: Partial<FoodItem>): Promise<FoodItem> {
    const idx = runtimeFoodItems.findIndex((i) => i.id === itemId);
    if (idx === -1) {
      throw new Error(`Food item ${itemId} not found`);
    }
    runtimeFoodItems[idx] = { ...runtimeFoodItems[idx], ...updates };
    await saveToStorage(FOOD_ITEMS_STORAGE_KEY, runtimeFoodItems);
    try {
      await updateDoc(doc(db, 'foodItems', itemId), updates);
    } catch {}
    return runtimeFoodItems[idx];
  },

  async toggleFoodItemAvailability(itemId: string): Promise<boolean> {
    const item = runtimeFoodItems.find((i) => i.id === itemId);
    if (!item) {
      throw new Error(`Food item ${itemId} not found`);
    }
    item.available = !item.available;
    await saveToStorage(FOOD_ITEMS_STORAGE_KEY, runtimeFoodItems);
    try {
      await updateDoc(doc(db, 'foodItems', itemId), { available: item.available });
    } catch {}
    return item.available;
  },

  async deleteFoodItem(itemId: string): Promise<void> {
    runtimeFoodItems = runtimeFoodItems.filter((i) => i.id !== itemId);
    await saveToStorage(FOOD_ITEMS_STORAGE_KEY, runtimeFoodItems);
  },

  // 8. Orders & Live Status
  async getOrders(collegeId: string, studentUid?: string): Promise<Order[]> {
    // Dynamic storage sync to immediately pull orders/updates from other tabs/windows
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem(ORDERS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            runtimeOrders = parsed;
          }
        }
      } else if (Platform.OS !== 'web') {
        const stored = await AsyncStorage.getItem(ORDERS_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            runtimeOrders = parsed;
          }
        }
      }
    } catch {}

    let list = runtimeOrders.filter((o) => o.collegeId === collegeId);
    if (studentUid) {
      list = list.filter((o) => o.studentUid === studentUid);
    }
    // Sort latest first
    return list.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  async getOrderById(orderId: string): Promise<Order | null> {
    return runtimeOrders.find((o) => o.id === orderId) || null;
  },

  // 9. Server-Validated Order Creation (Instant & Non-Blocking)
  async createOrder(params: {
    collegeId: string;
    foodCourtId: string;
    studentUid: string;
    studentName: string;
    studentIdentifier?: string;
    items: { itemId: string; quantity: number }[];
    paymentMethod: PaymentMethod;
  }): Promise<Order> {
    // 1. Re-validate prices server-side
    let subtotal = 0;
    const validatedItems = params.items.map((cartItem) => {
      const originalItem = runtimeFoodItems.find((i) => i.id === cartItem.itemId);
      if (!originalItem) {
        throw new Error(`Item ${cartItem.itemId} not found`);
      }
      const itemSubtotal = originalItem.price * cartItem.quantity;
      subtotal += itemSubtotal;
      return {
        itemId: originalItem.id,
        name: originalItem.name,
        price: originalItem.price,
        quantity: cartItem.quantity,
        subtotal: itemSubtotal,
        imageUrl: originalItem.imageUrl,
      };
    });

    const tax = 0; // Tax policy
    const total = subtotal + tax;

    // 2. Generate clean 4-digit random pickup code (e.g. 4827)
    const pickupOtp = Math.floor(1000 + Math.random() * 9000).toString();
    const orderNumber = `#CC${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    const newOrder: Order = {
      id: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      orderNumber,
      collegeId: params.collegeId,
      foodCourtId: params.foodCourtId,
      studentUid: params.studentUid,
      studentName: params.studentName,
      studentIdentifier: params.studentIdentifier,
      items: validatedItems,
      subtotal,
      tax,
      total,
      paymentMethod: params.paymentMethod,
      paymentStatus: params.paymentMethod === 'UPI' ? 'paid' : 'cash_pending',
      orderStatus: 'placed',
      pickupOtp, // 4-digit pickup code
      createdAt: now,
      updatedAt: now,
      statusHistory: [
        {
          status: 'placed',
          timestamp: now,
          note: `Order placed via ${params.paymentMethod}`,
        },
      ],
    };

    runtimeOrders.unshift(newOrder);
    await saveToStorage(ORDERS_STORAGE_KEY, runtimeOrders);

    // Non-blocking Firestore write with timeout so UI never hangs
    withTimeout(setDoc(doc(db, 'orders', newOrder.id), newOrder), 1500).catch(() => {});

    return newOrder;
  },

  // 10. Order Status Transitions (Staff Actions)
  async updateOrderStatus(
    orderId: string,
    nextStatus: OrderStatus,
    staffName: string = 'Staff'
  ): Promise<Order> {
    const orderIndex = runtimeOrders.findIndex((o) => o.id === orderId);
    if (orderIndex === -1) {
      throw new Error('Order not found');
    }

    const order = runtimeOrders[orderIndex];
    const now = new Date().toISOString();

    const updatedOrder: Order = {
      ...order,
      orderStatus: nextStatus,
      updatedAt: now,
      statusHistory: [
        ...(order.statusHistory || []),
        {
          status: nextStatus,
          timestamp: now,
          note: `Status moved to ${nextStatus} by ${staffName}`,
        },
      ],
    };

    runtimeOrders[orderIndex] = updatedOrder;
    await saveToStorage(ORDERS_STORAGE_KEY, runtimeOrders);

    withTimeout(
      updateDoc(doc(db, 'orders', orderId), {
        orderStatus: nextStatus,
        updatedAt: now,
        statusHistory: updatedOrder.statusHistory,
      }),
      1500
    ).catch(() => {});

    return updatedOrder;
  },

  // 11. 4-Digit Pickup OTP Verification (Mainly for Online UPI Paid Orders)
  async verifyPickupOtp(
    orderId: string,
    enteredOtp: string,
    staffName: string = 'Food Court Staff'
  ): Promise<{ success: boolean; message: string; order?: Order }> {
    const orderIndex = runtimeOrders.findIndex((o) => o.id === orderId);
    if (orderIndex === -1) {
      return { success: false, message: 'Order not found.' };
    }

    const order = runtimeOrders[orderIndex];

    if (order.orderStatus === 'completed') {
      return { success: false, message: 'Order is already marked completed.' };
    }

    // Rate limiting
    const attempts = otpAttempts[orderId] || 0;
    if (attempts >= 5) {
      return {
        success: false,
        message: 'Too many failed attempts (5/5). Order locked for security. Contact admin.',
      };
    }

    if (!order.pickupOtp || order.pickupOtp.trim() !== enteredOtp.trim()) {
      otpAttempts[orderId] = attempts + 1;
      const remaining = 5 - otpAttempts[orderId];
      return {
        success: false,
        message: `Invalid 4-digit code. ${remaining} attempt(s) remaining.`,
      };
    }

    // Valid OTP!
    delete otpAttempts[orderId];
    const now = new Date().toISOString();

    const completedOrder: Order = {
      ...order,
      orderStatus: 'completed',
      paymentStatus: order.paymentMethod === 'CASH' ? 'cash_received' : order.paymentStatus,
      pickupVerifiedAt: now,
      updatedAt: now,
      statusHistory: [
        ...(order.statusHistory || []),
        {
          status: 'completed',
          timestamp: now,
          note: `Pickup verified with 4-digit OTP by ${staffName}`,
        },
      ],
    };

    runtimeOrders[orderIndex] = completedOrder;
    await saveToStorage(ORDERS_STORAGE_KEY, runtimeOrders);

    withTimeout(
      updateDoc(doc(db, 'orders', orderId), {
        orderStatus: 'completed',
        paymentStatus: completedOrder.paymentStatus,
        pickupVerifiedAt: now,
        updatedAt: now,
      }),
      1500
    ).catch(() => {});

    return {
      success: true,
      message: '4-digit code verified! Order completed & picked up.',
      order: completedOrder,
    };
  },

  // 12. Staff Confirms Cash Payment
  async confirmCashPayment(orderId: string, staffName: string): Promise<Order> {
    const orderIndex = runtimeOrders.findIndex((o) => o.id === orderId);
    if (orderIndex === -1) throw new Error('Order not found');

    const order = runtimeOrders[orderIndex];
    const now = new Date().toISOString();

    const updatedOrder: Order = {
      ...order,
      paymentStatus: 'cash_received',
      updatedAt: now,
      statusHistory: [
        ...(order.statusHistory || []),
        {
          status: order.orderStatus,
          timestamp: now,
          note: `Cash ₹${order.total} received at counter by ${staffName}`,
        },
      ],
    };

    runtimeOrders[orderIndex] = updatedOrder;
    await saveToStorage(ORDERS_STORAGE_KEY, runtimeOrders);

    withTimeout(
      updateDoc(doc(db, 'orders', orderId), {
        paymentStatus: 'cash_received',
        updatedAt: now,
      }),
      1500
    ).catch(() => {});

    return updatedOrder;
  },

  // 12b. 1-Click Counter Cash Pickup (OTP not mandatory for cash orders)
  async completeCashOrderWithoutOtp(
    orderId: string,
    staffName: string = 'Food Court Counter'
  ): Promise<Order> {
    const orderIndex = runtimeOrders.findIndex((o) => o.id === orderId);
    if (orderIndex === -1) throw new Error('Order not found');

    const order = runtimeOrders[orderIndex];
    const now = new Date().toISOString();

    const completedOrder: Order = {
      ...order,
      orderStatus: 'completed',
      paymentStatus: 'cash_received',
      pickupVerifiedAt: now,
      updatedAt: now,
      statusHistory: [
        ...(order.statusHistory || []),
        {
          status: 'completed',
          timestamp: now,
          note: `Cash ₹${order.total} received & food handed over at counter by ${staffName} (No OTP needed for cash)`,
        },
      ],
    };

    runtimeOrders[orderIndex] = completedOrder;
    await saveToStorage(ORDERS_STORAGE_KEY, runtimeOrders);

    withTimeout(
      updateDoc(doc(db, 'orders', orderId), {
        orderStatus: 'completed',
        paymentStatus: 'cash_received',
        pickupVerifiedAt: now,
        updatedAt: now,
      }),
      1500
    ).catch(() => {});

    return completedOrder;
  },

  // 12c. Student switches active cash order to Online UPI Payment at any time
  async switchOrderPaymentToUpi(orderId: string, upiRef: string): Promise<Order> {
    const orderIndex = runtimeOrders.findIndex((o) => o.id === orderId);
    if (orderIndex === -1) throw new Error('Order not found');

    const order = runtimeOrders[orderIndex];
    const now = new Date().toISOString();

    const updatedOrder: Order = {
      ...order,
      paymentMethod: 'UPI',
      paymentStatus: 'paid',
      updatedAt: now,
      statusHistory: [
        ...(order.statusHistory || []),
        {
          status: order.orderStatus,
          timestamp: now,
          note: `Switched to Online UPI Payment (Ref: ${upiRef})`,
        },
      ],
    };

    runtimeOrders[orderIndex] = updatedOrder;
    await saveToStorage(ORDERS_STORAGE_KEY, runtimeOrders);

    withTimeout(
      updateDoc(doc(db, 'orders', orderId), {
        paymentMethod: 'UPI',
        paymentStatus: 'paid',
        updatedAt: now,
      }),
      1500
    ).catch(() => {});

    return updatedOrder;
  },

  // 13. Notices & Updates (Full College Admin CRUD)
  async getNotices(collegeId: string): Promise<Notice[]> {
    return runtimeNotices.filter((n) => n.collegeId === collegeId);
  },

  async addNotice(notice: Notice, actorRole?: UserRole): Promise<Notice> {
    if (actorRole && actorRole !== 'college_admin') {
      throw new Error('Security Violation: Only College Admin is authorized to publish notices.');
    }
    runtimeNotices.unshift(notice);
    await saveToStorage(NOTICES_STORAGE_KEY, runtimeNotices);
    try {
      await withTimeout(setDoc(doc(db, 'notices', notice.id), notice), 1500);
    } catch {}
    return notice;
  },

  async updateNotice(noticeId: string, updates: Partial<Notice>, actorRole?: UserRole): Promise<Notice> {
    if (actorRole && actorRole !== 'college_admin') {
      throw new Error('Security Violation: Only College Admin is authorized to edit notices.');
    }
    const idx = runtimeNotices.findIndex((n) => n.id === noticeId);
    if (idx === -1) throw new Error(`Notice ${noticeId} not found`);
    runtimeNotices[idx] = { ...runtimeNotices[idx], ...updates };
    await saveToStorage(NOTICES_STORAGE_KEY, runtimeNotices);
    try {
      await withTimeout(updateDoc(doc(db, 'notices', noticeId), updates), 1500);
    } catch {}
    return runtimeNotices[idx];
  },

  async deleteNotice(noticeId: string, actorRole?: UserRole): Promise<void> {
    if (actorRole && actorRole !== 'college_admin') {
      throw new Error('Security Violation: Only College Admin is authorized to delete notices.');
    }
    runtimeNotices = runtimeNotices.filter((n) => n.id !== noticeId);
    await saveToStorage(NOTICES_STORAGE_KEY, runtimeNotices);
    try {
      await withTimeout(deleteDoc(doc(db, 'notices', noticeId)), 1500);
    } catch {}
  },

  // 14. Staff & Field Admin Permission Delegation
  async getStaffMembers(collegeId: string): Promise<UserProfile[]> {
    const staffList: UserProfile[] = [];
    const seenUids = new Set<string>();

    // 1. Check registered runtime users
    Object.values(runtimeUsers).forEach((u) => {
      if (
        (u.collegeId === collegeId || u.collegeId === 'all') &&
        (u.role === 'teacher_staff' || u.role === 'food_court_staff' || u.role === 'college_admin')
      ) {
        if (!seenUids.has(u.uid)) {
          seenUids.add(u.uid);
          staffList.push(u);
        }
      }
    });

    // 2. Check demo profiles
    Object.values(DEMO_PROFILES).forEach((p) => {
      if (
        (p.collegeId === collegeId || p.collegeId === 'all') &&
        (p.role === 'teacher_staff' || p.role === 'food_court_staff' || p.role === 'college_admin')
      ) {
        if (!seenUids.has(p.uid)) {
          seenUids.add(p.uid);
          const cached = runtimeUsers[p.uid] || runtimeUsers[p.email.toLowerCase()];
          staffList.push(cached || p);
        }
      }
    });

    return staffList;
  },

  async updateStaffPermissions(uid: string, permissions: StaffPermission[]): Promise<UserProfile> {
    let target = runtimeUsers[uid];
    if (!target) {
      const demo = Object.values(DEMO_PROFILES).find((p) => p.uid === uid);
      if (demo) {
        target = { ...demo };
      } else {
        throw new Error(`User ${uid} not found`);
      }
    }

    target = {
      ...target,
      permissions,
    };

    runtimeUsers[uid] = target;
    if (target.email) {
      runtimeUsers[target.email.toLowerCase()] = target;
    }

    await saveToStorage(USERS_STORAGE_KEY, runtimeUsers);
    try {
      await updateDoc(doc(db, 'users', uid), { permissions });
    } catch {}

    return target;
  },

  async addStaffMember(member: UserProfile, actorRole?: UserRole): Promise<UserProfile> {
    if (actorRole === 'super_admin') {
      throw new Error('Super Admin does not have permission to create Teacher or Food Court Staff accounts. Only the College Admin can issue staff credentials.');
    }
    if (member.role === 'college_admin' || member.role === 'super_admin') {
      throw new Error('Only Super Admin is authorized to create College Admin accounts.');
    }
    runtimeUsers[member.uid] = member;
    if (member.email) {
      runtimeUsers[member.email.toLowerCase()] = member;
    }
    await saveToStorage(USERS_STORAGE_KEY, runtimeUsers);
    try {
      await setDoc(doc(db, 'users', member.uid), member);
    } catch {}
    return member;
  },

  // 15. College Admin ID Authority (EXCLUSIVELY GOVERNED BY SUPER ADMIN)
  async getCollegeAdmins(collegeId?: string): Promise<UserProfile[]> {
    const list: UserProfile[] = [];
    const seen = new Set<string>();

    const checkAndAdd = (u: UserProfile) => {
      if (u.role === 'college_admin' && !seen.has(u.uid)) {
        if (!collegeId || u.collegeId === collegeId) {
          seen.add(u.uid);
          list.push(u);
        }
      }
    };

    Object.values(runtimeCollegeAdmins).forEach(checkAndAdd);
    Object.values(runtimeUsers).forEach(checkAndAdd);

    return list;
  },

  async addCollegeAdmin(
    adminData: {
      name: string;
      email: string;
      password: string;
      collegeId: string;
      designation?: string;
    },
    actorRole?: UserRole
  ): Promise<UserProfile> {
    if (actorRole && actorRole !== 'super_admin') {
      throw new Error('Security Violation: Only the Super Admin is permitted to create College Admin accounts.');
    }

    const cleanEmail = adminData.email.toLowerCase().trim();
    const cleanName = adminData.name.trim();
    const cleanPassword = adminData.password.trim();
    const derivedUsername = cleanEmail.split('@')[0];

    if (!cleanEmail || !cleanPassword || !cleanName) {
      throw new Error('Please provide name, email, and password for the College Admin.');
    }

    if (cleanPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    const newAdmin: UserProfile = {
      uid: `col_admin_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      role: 'college_admin',
      collegeId: adminData.collegeId,
      name: cleanName,
      email: cleanEmail,
      username: derivedUsername,
      passwordHash: cleanPassword,
      designation: adminData.designation?.trim() || 'Campus Administrator & Dean',
      status: 'active',
      createdAt: new Date().toISOString(),
      createdBy: 'super_admin',
    };

    runtimeCollegeAdmins[newAdmin.uid] = newAdmin;
    runtimeCollegeAdmins[cleanEmail] = newAdmin;
    if (derivedUsername) {
      runtimeCollegeAdmins[derivedUsername] = newAdmin;
    }
    runtimeUsers[newAdmin.uid] = newAdmin;
    runtimeUsers[cleanEmail] = newAdmin;
    if (derivedUsername) {
      runtimeUsers[derivedUsername] = newAdmin;
    }

    await saveToStorage(COLLEGE_ADMINS_STORAGE_KEY, runtimeCollegeAdmins);
    await saveToStorage(USERS_STORAGE_KEY, runtimeUsers);

    // Provision into Cloud Auth for multi-device access with email and username
    await registerCloudIdentity(cleanEmail, cleanPassword, newAdmin);
    if (derivedUsername) {
      await registerCloudIdentity(derivedUsername, cleanPassword, newAdmin);
    }

    try {
      await withTimeout(setDoc(doc(db, 'users', newAdmin.uid), newAdmin), 1500);
    } catch {}

    return newAdmin;
  },

  async deleteCollegeAdmin(uid: string, actorRole?: UserRole): Promise<void> {
    if (actorRole && actorRole !== 'super_admin') {
      throw new Error('Security Violation: Only the Super Admin is permitted to delete College Admin accounts.');
    }

    const admin = runtimeCollegeAdmins[uid] || runtimeUsers[uid];
    delete runtimeCollegeAdmins[uid];
    delete runtimeUsers[uid];
    if (admin?.email) {
      delete runtimeCollegeAdmins[admin.email.toLowerCase()];
      delete runtimeUsers[admin.email.toLowerCase()];
      await removeCloudIdentity(admin.email, admin.passwordHash);
    }
    if (admin?.username) {
      delete runtimeCollegeAdmins[admin.username.toLowerCase()];
      delete runtimeUsers[admin.username.toLowerCase()];
      await removeCloudIdentity(admin.username, admin.passwordHash);
    }

    await saveToStorage(COLLEGE_ADMINS_STORAGE_KEY, runtimeCollegeAdmins);
    await saveToStorage(USERS_STORAGE_KEY, runtimeUsers);

    try {
      await withTimeout(deleteDoc(doc(db, 'users', uid)), 1500);
    } catch {}
  },

  // 15b. Canteen Owners / Food Court Account Authority (Exclusively Governed by College Admin)
  async getCanteenOwners(collegeId?: string): Promise<UserProfile[]> {
    const list: UserProfile[] = [];
    const seen = new Set<string>();

    const checkAndAdd = (u: UserProfile) => {
      if (u.role === 'food_court_staff' && !seen.has(u.uid)) {
        if (!collegeId || u.collegeId === collegeId || u.collegeId === 'all') {
          seen.add(u.uid);
          list.push(u);
        }
      }
    };

    Object.values(runtimeCanteenOwners).forEach(checkAndAdd);
    Object.values(runtimeUsers).forEach(checkAndAdd);

    return list;
  },

  async addCanteenOwner(
    ownerData: {
      name: string;
      username: string;
      password: string;
      phone: string;
      collegeId: string;
      assignedFoodCourtId?: string;
    },
    actorRole?: UserRole
  ): Promise<UserProfile> {
    if (actorRole && actorRole !== 'college_admin') {
      throw new Error('Security Violation: Only College Admin is authorized to create Canteen Owner accounts.');
    }

    const cleanUsername = ownerData.username.toLowerCase().trim();
    const cleanName = ownerData.name.trim();
    const cleanPassword = ownerData.password.trim();
    const cleanPhone = ownerData.phone.trim();
    const digits = cleanPhone.replace(/\D/g, '');

    if (!cleanUsername || !cleanPassword || !cleanName || !cleanPhone) {
      throw new Error('Please provide name, username/ID, password, and mobile number.');
    }

    if (cleanPassword.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }

    const email = `${cleanUsername.replace(/[^a-z0-9]/g, '')}@canteen.campus`;
    const campusConnectEmail = `${cleanUsername.replace(/[^a-z0-9._-]/g, '')}@campusconnect.edu`;

    const newOwner: UserProfile = {
      uid: `canteen_owner_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      role: 'food_court_staff',
      collegeId: ownerData.collegeId,
      name: cleanName,
      username: cleanUsername,
      email,
      phone: cleanPhone,
      passwordHash: cleanPassword,
      designation: 'Food Court Owner & Licensee',
      assignedFoodCourtId: ownerData.assignedFoodCourtId || 'fc_jspm_main',
      status: 'active',
      createdAt: new Date().toISOString(),
      createdBy: 'college_admin',
      permissions: ['canteen_manager'],
    };

    runtimeCanteenOwners[newOwner.uid] = newOwner;
    runtimeCanteenOwners[cleanUsername] = newOwner;
    runtimeCanteenOwners[email] = newOwner;
    runtimeCanteenOwners[campusConnectEmail] = newOwner;
    if (digits.length >= 10) {
      runtimeCanteenOwners[digits] = newOwner;
      runtimeCanteenOwners[digits.slice(-10)] = newOwner;
    }

    runtimeUsers[newOwner.uid] = newOwner;
    runtimeUsers[cleanUsername] = newOwner;
    runtimeUsers[email] = newOwner;
    runtimeUsers[campusConnectEmail] = newOwner;
    if (digits.length >= 10) {
      runtimeUsers[digits] = newOwner;
      runtimeUsers[digits.slice(-10)] = newOwner;
    }

    await saveToStorage(CANTEEN_OWNERS_STORAGE_KEY, runtimeCanteenOwners);
    await saveToStorage(USERS_STORAGE_KEY, runtimeUsers);

    // Provision into Cloud Auth for multi-device access with username alias, email, and phone
    await registerCloudIdentity(cleanUsername, cleanPassword, newOwner);
    await registerCloudIdentity(email, cleanPassword, newOwner);
    await registerCloudIdentity(campusConnectEmail, cleanPassword, newOwner);
    if (digits.length >= 10) {
      await registerCloudIdentity(`${digits.slice(-10)}@campusconnect.edu`, cleanPassword, newOwner);
    }

    try {
      await withTimeout(setDoc(doc(db, 'users', newOwner.uid), newOwner), 1500);
    } catch {}

    return newOwner;
  },

  async updateCanteenOwner(
    uid: string,
    updates: Partial<UserProfile>,
    actorRole?: UserRole
  ): Promise<UserProfile> {
    if (actorRole && actorRole !== 'college_admin') {
      throw new Error('Security Violation: Only College Admin is authorized to update Canteen Owner accounts.');
    }

    const existing = runtimeCanteenOwners[uid] || runtimeUsers[uid];
    if (!existing) throw new Error(`Canteen Owner ${uid} not found`);

    const updated: UserProfile = {
      ...existing,
      ...updates,
    };

    runtimeCanteenOwners[uid] = updated;
    if (updated.username) runtimeCanteenOwners[updated.username.toLowerCase()] = updated;
    if (updated.email) runtimeCanteenOwners[updated.email.toLowerCase()] = updated;
    runtimeUsers[uid] = updated;
    if (updated.username) runtimeUsers[updated.username.toLowerCase()] = updated;
    if (updated.email) runtimeUsers[updated.email.toLowerCase()] = updated;

    await saveToStorage(CANTEEN_OWNERS_STORAGE_KEY, runtimeCanteenOwners);
    await saveToStorage(USERS_STORAGE_KEY, runtimeUsers);

    // Sync updated credentials to Cloud Auth
    const pwd = updated.passwordHash || existing.passwordHash || 'canteen123';
    if (updated.username) {
      const cleanU = updated.username.toLowerCase().trim();
      await registerCloudIdentity(cleanU, pwd, updated);
      await registerCloudIdentity(`${cleanU.replace(/[^a-z0-9]/g, '')}@canteen.campus`, pwd, updated);
      await registerCloudIdentity(`${cleanU.replace(/[^a-z0-9._-]/g, '')}@campusconnect.edu`, pwd, updated);
    }
    if (updated.email) {
      await registerCloudIdentity(updated.email, pwd, updated);
    }
    if (updated.phone) {
      const digits = updated.phone.replace(/\D/g, '');
      if (digits.length >= 10) {
        await registerCloudIdentity(`${digits.slice(-10)}@campusconnect.edu`, pwd, updated);
      }
    }

    try {
      await withTimeout(updateDoc(doc(db, 'users', uid), updates), 1500);
    } catch {}

    return updated;
  },

  async deleteCanteenOwner(uid: string, actorRole?: UserRole): Promise<void> {
    if (actorRole && actorRole !== 'college_admin') {
      throw new Error('Security Violation: Only College Admin is authorized to delete Canteen Owner accounts.');
    }

    const owner = runtimeCanteenOwners[uid] || runtimeUsers[uid];
    delete runtimeCanteenOwners[uid];
    delete runtimeUsers[uid];
    if (owner?.username) {
      const cleanU = owner.username.toLowerCase().trim();
      delete runtimeCanteenOwners[cleanU];
      delete runtimeUsers[cleanU];
      await removeCloudIdentity(cleanU, owner.passwordHash);
      await removeCloudIdentity(`${cleanU.replace(/[^a-z0-9]/g, '')}@canteen.campus`, owner.passwordHash);
      await removeCloudIdentity(`${cleanU.replace(/[^a-z0-9._-]/g, '')}@campusconnect.edu`, owner.passwordHash);
    }
    if (owner?.email) {
      delete runtimeCanteenOwners[owner.email.toLowerCase()];
      delete runtimeUsers[owner.email.toLowerCase()];
      await removeCloudIdentity(owner.email, owner.passwordHash);
    }
    if (owner?.phone) {
      const digits = owner.phone.replace(/\D/g, '');
      if (digits.length >= 10) {
        await removeCloudIdentity(`${digits.slice(-10)}@campusconnect.edu`, owner.passwordHash);
      }
    }

    await saveToStorage(CANTEEN_OWNERS_STORAGE_KEY, runtimeCanteenOwners);
    await saveToStorage(USERS_STORAGE_KEY, runtimeUsers);

    try {
      await withTimeout(deleteDoc(doc(db, 'users', uid)), 1500);
    } catch {}
  },

  // 16. Unified Institutional Credential Authenticator
  async authenticateCredentials(
    identifier: string,
    pass: string
  ): Promise<UserProfile | null> {
    const cleanId = identifier.toLowerCase().trim();
    const cleanPass = pass.trim();

    // 1. Super Admin Hardcoded Fast-Path (Omkumar Gajanan Ingalkar)
    if (
      cleanId === SUPER_ADMIN_ACCOUNT.email.toLowerCase() ||
      cleanId === SUPER_ADMIN_ACCOUNT.username?.toLowerCase()
    ) {
      if (cleanPass === SUPER_ADMIN_ACCOUNT.passwordHash) {
        return SUPER_ADMIN_ACCOUNT;
      }
      throw new Error('Incorrect password for Super Admin account.');
    }

    // 2. Pre-seeded Canteen Owner Fast-Path
    if (
      cleanId === SEED_CANTEEN_OWNER.username?.toLowerCase() ||
      cleanId === SEED_CANTEEN_OWNER.email.toLowerCase() ||
      (SEED_CANTEEN_OWNER.phone &&
        cleanId.replace(/[\s+-]/g, '') ===
          SEED_CANTEEN_OWNER.phone.replace(/[\s+-]/g, ''))
    ) {
      if (cleanPass === SEED_CANTEEN_OWNER.passwordHash) {
        return SEED_CANTEEN_OWNER;
      }
      throw new Error('Incorrect password for Canteen Owner account.');
    }

    // 3. Check local runtime cache & local storage
    const matchedAdmin =
      runtimeCollegeAdmins[cleanId] ||
      Object.values(runtimeCollegeAdmins).find(
        (a) =>
          a.email.toLowerCase() === cleanId ||
          a.username?.toLowerCase() === cleanId
      ) ||
      Object.values(runtimeUsers).find(
        (u) =>
          u.role === 'college_admin' &&
          (u.email.toLowerCase() === cleanId ||
            u.username?.toLowerCase() === cleanId)
      );

    if (matchedAdmin) {
      if (matchedAdmin.passwordHash && matchedAdmin.passwordHash === cleanPass) {
        return matchedAdmin;
      }
      throw new Error('Incorrect password for College Admin account.');
    }

    const matchedCanteenOwner =
      runtimeCanteenOwners[cleanId] ||
      Object.values(runtimeCanteenOwners).find(
        (o) =>
          o.username?.toLowerCase() === cleanId ||
          o.email?.toLowerCase() === cleanId ||
          (o.phone &&
            o.phone.replace(/[\s+-]/g, '') === cleanId.replace(/[\s+-]/g, ''))
      ) ||
      Object.values(runtimeUsers).find(
        (u) =>
          u.role === 'food_court_staff' &&
          (u.username?.toLowerCase() === cleanId ||
            u.email?.toLowerCase() === cleanId ||
            (u.phone &&
              u.phone.replace(/[\s+-]/g, '') === cleanId.replace(/[\s+-]/g, '')))
      );

    if (matchedCanteenOwner) {
      if (
        matchedCanteenOwner.passwordHash &&
        matchedCanteenOwner.passwordHash === cleanPass
      ) {
        return matchedCanteenOwner;
      }
      throw new Error('Incorrect password for Canteen Owner account.');
    }

    // 4. MULTI-DEVICE CLOUD AUTHENTICATION
    // Authenticates against Firebase Auth using canonical aliases for accounts created on any other device
    const candidates: string[] = [];
    if (cleanId.includes('@')) {
      candidates.push(cleanId);
    } else {
      const sanitized = cleanId.replace(/[^a-z0-9._-]/g, '');
      candidates.push(`${sanitized}@campusconnect.edu`);
      candidates.push(`${sanitized}@canteen.campus`);
      const digits = cleanId.replace(/\D/g, '');
      if (digits.length >= 10) {
        candidates.push(`${digits.slice(-10)}@campusconnect.edu`);
      }
    }

    const authInstances = [secondaryAuth, auth].filter(Boolean);

    for (const cand of candidates) {
      for (const authInst of authInstances) {
        try {
          const cred = await signInWithEmailAndPassword(
            authInst,
            cand,
            cleanPass
          );
          const profile = parseProfileFromUser(cred.user, cand);
          if (authInst === secondaryAuth) {
            await signOut(secondaryAuth).catch(() => {});
          }

          // Cache locally for fast future loads
          runtimeUsers[profile.uid] = profile;
          if (profile.username)
            runtimeUsers[profile.username.toLowerCase()] = profile;
          if (profile.email)
            runtimeUsers[profile.email.toLowerCase()] = profile;

          if (profile.role === 'college_admin') {
            runtimeCollegeAdmins[profile.uid] = profile;
            if (profile.username)
              runtimeCollegeAdmins[profile.username.toLowerCase()] = profile;
            if (profile.email)
              runtimeCollegeAdmins[profile.email.toLowerCase()] = profile;
            await saveToStorage(COLLEGE_ADMINS_STORAGE_KEY, runtimeCollegeAdmins);
          } else if (profile.role === 'food_court_staff') {
            runtimeCanteenOwners[profile.uid] = profile;
            if (profile.username)
              runtimeCanteenOwners[profile.username.toLowerCase()] = profile;
            if (profile.email)
              runtimeCanteenOwners[profile.email.toLowerCase()] = profile;
            await saveToStorage(CANTEEN_OWNERS_STORAGE_KEY, runtimeCanteenOwners);
          }
          await saveToStorage(USERS_STORAGE_KEY, runtimeUsers);

          return profile;
        } catch {
          // Continue testing all candidate aliases and auth instances without premature aborts
        }
      }
    }

    return null;
  },

  // 17. Cloud Bootstrap to ensure baseline institutional accounts are reachable from any device
  async ensureCloudBootstrap(): Promise<void> {
    try {
      // Provision Super Admin credentials to cloud
      await registerCloudIdentity(
        SUPER_ADMIN_ACCOUNT.email,
        SUPER_ADMIN_ACCOUNT.passwordHash!,
        SUPER_ADMIN_ACCOUNT
      );
      if (SUPER_ADMIN_ACCOUNT.username) {
        await registerCloudIdentity(
          SUPER_ADMIN_ACCOUNT.username,
          SUPER_ADMIN_ACCOUNT.passwordHash!,
          SUPER_ADMIN_ACCOUNT
        );
      }

      // Provision seed canteen owner to cloud
      if (SEED_CANTEEN_OWNER.username) {
        await registerCloudIdentity(
          SEED_CANTEEN_OWNER.username,
          SEED_CANTEEN_OWNER.passwordHash!,
          SEED_CANTEEN_OWNER
        );
      }
      if (SEED_CANTEEN_OWNER.email) {
        await registerCloudIdentity(
          SEED_CANTEEN_OWNER.email,
          SEED_CANTEEN_OWNER.passwordHash!,
          SEED_CANTEEN_OWNER
        );
      }

      // Sync all existing college admins and canteen owners to cloud
      await this.syncAllCollegeAdminsToCloud();
      await this.syncAllCanteenOwnersToCloud();
    } catch {}
  },

  async syncAllCanteenOwnersToCloud(collegeId?: string): Promise<number> {
    let count = 0;
    const owners = await this.getCanteenOwners(collegeId);
    for (const owner of owners) {
      const pwd = owner.passwordHash || 'canteen123';
      try {
        if (owner.username) {
          const cleanU = owner.username.toLowerCase().trim();
          await registerCloudIdentity(cleanU, pwd, owner);
          await registerCloudIdentity(`${cleanU.replace(/[^a-z0-9]/g, '')}@canteen.campus`, pwd, owner);
          await registerCloudIdentity(`${cleanU.replace(/[^a-z0-9._-]/g, '')}@campusconnect.edu`, pwd, owner);
        }
        if (owner.email) {
          await registerCloudIdentity(owner.email, pwd, owner);
        }
        if (owner.phone) {
          const digits = owner.phone.replace(/\D/g, '');
          if (digits.length >= 10) {
            await registerCloudIdentity(`${digits.slice(-10)}@campusconnect.edu`, pwd, owner);
          }
        }
        count++;
      } catch (e) {
        console.warn('Failed to sync canteen owner to cloud:', owner.username, e);
      }
    }
    return count;
  },

  async syncAllCollegeAdminsToCloud(): Promise<number> {
    let count = 0;
    const admins = await this.getCollegeAdmins();
    for (const admin of admins) {
      const pwd = admin.passwordHash || 'admin123';
      try {
        if (admin.email) {
          await registerCloudIdentity(admin.email, pwd, admin);
        }
        if (admin.username) {
          await registerCloudIdentity(admin.username, pwd, admin);
        }
        count++;
      } catch (e) {
        console.warn('Failed to sync college admin to cloud:', admin.email, e);
      }
    }
    return count;
  },

  // 12. Food Court Bank Account & Payout Gateway Configuration
  async getPayoutConfig(foodCourtId: string = 'fc_jspm_main'): Promise<FoodCourtPayoutConfig> {
    if (runtimePayoutConfigs[foodCourtId]) {
      return runtimePayoutConfigs[foodCourtId];
    }
    const fallback: FoodCourtPayoutConfig = {
      foodCourtId,
      collegeId: 'col_jspm_tathawade',
      businessName: 'JSPM Central Food Court',
      accountHolderName: 'Suresh Patil',
      bankName: 'HDFC Bank',
      accountNumber: '50100492819283',
      ifscCode: 'HDFC0001234',
      upiVpa: 'suresh.canteen@okhdfcbank',
      gatewayProvider: 'UPI_DIRECT',
      settlementSchedule: 'instant',
      verified: true,
      updatedAt: new Date().toISOString(),
    };
    runtimePayoutConfigs[foodCourtId] = fallback;
    return fallback;
  },

  async updatePayoutConfig(
    foodCourtId: string,
    updates: Partial<FoodCourtPayoutConfig>
  ): Promise<FoodCourtPayoutConfig> {
    const existing = await this.getPayoutConfig(foodCourtId);
    const updated: FoodCourtPayoutConfig = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    runtimePayoutConfigs[foodCourtId] = updated;
    await saveToStorage(PAYOUT_CONFIGS_STORAGE_KEY, runtimePayoutConfigs);
    try {
      await setDoc(doc(db, 'payoutConfigs', foodCourtId), updated, { merge: true });
    } catch {}
    return updated;
  },
};
