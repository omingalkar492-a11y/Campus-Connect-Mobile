import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  User as FirebaseUser,
} from 'firebase/auth';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';

import { auth } from '@/lib/firebase';
import {
  DataService,
  toCanonicalAlias,
  parseProfileFromUser,
  registerCloudIdentity,
  encodeProfileMetadata,
} from '@/services/data-service';
import { DEMO_PROFILES, SEED_COLLEGES, SUPER_ADMIN_ACCOUNT } from '@/services/seed-data';
import { UserProfile, College, UserRole } from '@/types';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  college: College | null;
  role: UserRole | null;
  loading: boolean;
  login: (emailOrUsername: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  signup: (
    email: string,
    pass: string,
    name: string,
    role: UserRole,
    collegeId: string,
    extra?: Partial<UserProfile>
  ) => Promise<void>;
  logout: () => Promise<void>;
  switchDemoRole: (emailOrRole: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [college, setCollege] = useState<College | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Load college and profile
  const syncProfileAndCollege = async (userProfile: UserProfile) => {
    setProfile(userProfile);
    if (userProfile.collegeId && userProfile.collegeId !== 'all') {
      const col = await DataService.getCollege(userProfile.collegeId);
      setCollege(col);
    } else {
      setCollege(SEED_COLLEGES[0]);
    }

    try {
      const raw = JSON.stringify(userProfile);
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('cc_active_profile', raw);
      } else if (Platform.OS !== 'web') {
        await AsyncStorage.setItem('cc_active_profile', raw);
      }
    } catch {}
  };

  useEffect(() => {
    let authListenerFired = false;

    // Bootstrap cloud baseline credentials in background
    DataService.ensureCloudBootstrap().catch(() => {});

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      try {
        if (fbUser) {
          setUser(fbUser);
          let p = await DataService.getUserProfile(fbUser.uid, fbUser.email || undefined);
          if (!p) {
            p = parseProfileFromUser(fbUser);
            await DataService.saveUserProfile(p);
          }
          if (p) {
            await syncProfileAndCollege(p);
          }
        } else {
          // No Firebase session — try to restore from local storage for offline/demo use
          if (!authListenerFired) {
            try {
              let savedRaw: string | null = null;
              if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
                savedRaw = window.localStorage.getItem('cc_active_profile');
              } else if (Platform.OS !== 'web') {
                savedRaw = await AsyncStorage.getItem('cc_active_profile');
              }
              if (savedRaw) {
                const savedProfile = JSON.parse(savedRaw);
                if (savedProfile && savedProfile.uid) {
                  await syncProfileAndCollege(savedProfile);
                }
              }
            } catch {}
          }
        }
      } catch (err) {
        console.error('Auth sync error:', err);
      } finally {
        authListenerFired = true;
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const login = async (emailOrUsername: string, pass: string) => {
    setLoading(true);
    try {
      const cleanId = emailOrUsername.toLowerCase().trim();
      const cleanPass = pass.trim();

      if (!cleanId || !cleanPass) {
        throw new Error('Please enter both identifier (email/registration ID) and password.');
      }

      // 1. Direct Email Sign-In Fast-Path: if input has '@', authenticate directly with Firebase Auth
      if (cleanId.includes('@')) {
        try {
          const res = await signInWithEmailAndPassword(auth, cleanId, cleanPass);
          setUser(res.user);
          let p = await DataService.getUserProfile(res.user.uid, res.user.email || cleanId);
          if (!p) {
            p = parseProfileFromUser(res.user, cleanId);
            await DataService.saveUserProfile(p);
          }
          if (p) {
            await syncProfileAndCollege(p);
          }
          return;
        } catch (directErr: any) {
          // If error is wrong password or user not found, also check institutional credentials
          // before failing (in case of hardcoded demo/seed staff profiles)
          if (
            directErr?.code !== 'auth/user-not-found' &&
            directErr?.code !== 'auth/invalid-credential' &&
            directErr?.code !== 'auth/wrong-password'
          ) {
            throw directErr;
          }
        }
      }

      // 2. Check institutional fast-path & cloud-stored staff/canteen credentials
      const institutionalProfile = await DataService.authenticateCredentials(cleanId, cleanPass);
      if (institutionalProfile) {
        try {
          const alias = institutionalProfile.email || toCanonicalAlias(institutionalProfile.username || cleanId);
          const cred = await signInWithEmailAndPassword(auth, alias, cleanPass);
          setUser(cred.user);
        } catch {}
        await syncProfileAndCollege(institutionalProfile);
        setLoading(false);
        return;
      }

      // 3. Authenticate non-email identifier (Registration ID, username, or phone) via candidate aliases
      const candidateEmails: string[] = [];
      if (!cleanId.includes('@')) {
        candidateEmails.push(toCanonicalAlias(cleanId));
        candidateEmails.push(`${cleanId.replace(/[^a-z0-9._-]/g, '')}@canteen.campus`);
        const digits = cleanId.replace(/\D/g, '');
        if (digits.length >= 10) {
          candidateEmails.push(`${digits.slice(-10)}@campusconnect.edu`);
        }
      }

      let lastError: any = null;
      for (const candidate of candidateEmails) {
        try {
          const res = await signInWithEmailAndPassword(auth, candidate, cleanPass);
          setUser(res.user);
          let p = await DataService.getUserProfile(res.user.uid, res.user.email || candidate);
          if (!p) {
            p = parseProfileFromUser(res.user, candidate);
            await DataService.saveUserProfile(p);
          }
          if (p) {
            await syncProfileAndCollege(p);
          }
          return;
        } catch (fbErr: any) {
          lastError = fbErr;
          // Continue loop to try next candidate alias without premature aborts
        }
      }

      if (lastError) {
        throw lastError;
      }
      throw new Error('Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      let res;
      if (Platform.OS === 'web') {
        res = await signInWithPopup(auth, provider);
      } else {
        try {
          res = await signInWithPopup(auth, provider);
        } catch (popupErr: any) {
          if (popupErr?.code === 'auth/operation-not-supported-in-this-environment') {
            throw new Error(
              'Google Sign-In on mobile devices requires a Web Browser or configured OAuth client. Please use your direct email and password to log in.'
            );
          }
          throw popupErr;
        }
      }

      if (res && res.user) {
        setUser(res.user);
        let p = await DataService.getUserProfile(res.user.uid, res.user.email || undefined);
        if (!p) {
          p = {
            uid: res.user.uid,
            name:
              res.user.displayName ||
              (res.user.email ? res.user.email.split('@')[0] : 'Campus Student'),
            email: res.user.email || '',
            role: 'student',
            collegeId: SEED_COLLEGES[0].id,
            status: 'active',
            photoURL: res.user.photoURL || undefined,
            createdAt: new Date().toISOString(),
          };
          await DataService.saveUserProfile(p);
        }
        await syncProfileAndCollege(p);
      }
    } finally {
      setLoading(false);
    }
  };

  const signup = async (
    email: string,
    pass: string,
    name: string,
    userRole: UserRole,
    collegeId: string,
    extra: Partial<UserProfile> = {}
  ) => {
    setLoading(true);
    try {
      const cleanEmail = email.toLowerCase().trim();
      const cleanPass = pass.trim();
      const cleanName = name.trim();

      if (!cleanEmail || !cleanPass) {
        throw new Error('Please provide both email and password.');
      }
      if (cleanPass.length < 6) {
        throw new Error('Password must be at least 6 characters long.');
      }

      // 1. Create primary Firebase Auth user
      const res = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPass);
      setUser(res.user);

      const newProfile: UserProfile = {
        uid: res.user.uid,
        role: userRole,
        collegeId,
        name: cleanName,
        email: cleanEmail,
        status: 'active',
        createdAt: new Date().toISOString(),
        ...extra,
      };

      // Store profile metadata safely in user attributes for multi-device restore
      const { displayName, photoURL } = encodeProfileMetadata(newProfile);
      try {
        await updateProfile(res.user, { displayName, photoURL });
      } catch {}

      // 2. If student provided Registration ID / PRN / Roll Number, register alias in cloud auth
      const regId = newProfile.registrationId || newProfile.studentId || newProfile.rollNumber;
      if (regId) {
        const cleanRegId = regId.toLowerCase().trim().replace(/[^a-z0-9._-]/g, '');
        if (cleanRegId && !cleanEmail.startsWith(cleanRegId)) {
          // Register alias so they can log in with their Registration ID on ANY device
          await registerCloudIdentity(cleanRegId, cleanPass, newProfile);
        }
      }

      // 3. Save locally and in memory
      await DataService.saveUserProfile(newProfile);
      await syncProfileAndCollege(newProfile);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setUser(null);
      setProfile(null);
      setCollege(null);
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('cc_active_profile');
      } else if (Platform.OS !== 'web') {
        await AsyncStorage.removeItem('cc_active_profile');
      }
    } catch {}
    setLoading(false);
  };

  const switchDemoRole = async (emailOrRole: string) => {
    setLoading(true);
    try {
      const clean = emailOrRole.toLowerCase().trim();
      let targetProfile = DEMO_PROFILES[clean];
      if (
        !targetProfile &&
        (clean === 'super_admin' ||
          clean === 'superadmin' ||
          clean === SUPER_ADMIN_ACCOUNT.email.toLowerCase() ||
          clean === SUPER_ADMIN_ACCOUNT.username?.toLowerCase())
      ) {
        targetProfile = SUPER_ADMIN_ACCOUNT;
      }
      if (targetProfile) {
        await syncProfileAndCollege(targetProfile);
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (profile) {
      const updated = await DataService.getUserProfile(profile.uid, profile.email);
      if (updated) {
        await syncProfileAndCollege(updated);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        college,
        role: profile?.role || null,
        loading,
        login,
        loginWithGoogle,
        signup,
        logout,
        switchDemoRole,
        refreshProfile,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
