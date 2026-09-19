import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import React, { createContext, useContext, useState, useEffect } from 'react';

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
  };

  useEffect(() => {
    // Instant initial setup for snappy render on web
    setLoading(false);

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
        }
      } catch (err) {
        console.error('Auth sync error:', err);
      } finally {
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

      // 1. Check institutional fast-path & cloud-stored staff/canteen credentials
      const institutionalProfile = await DataService.authenticateCredentials(cleanId, cleanPass);
      if (institutionalProfile) {
        await syncProfileAndCollege(institutionalProfile);
        setLoading(false);
        return;
      }

      // 2. Authenticate student or general user via Firebase Auth
      // Build candidate emails (if user typed Registration ID or username, resolve to canonical alias)
      const candidateEmails: string[] = [];
      if (cleanId.includes('@')) {
        candidateEmails.push(cleanId);
      } else {
        candidateEmails.push(toCanonicalAlias(cleanId));
        candidateEmails.push(`${cleanId.replace(/[^a-z0-9._-]/g, '')}@canteen.campus`);
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
          if (fbErr?.code === 'auth/wrong-password' || fbErr?.code === 'auth/invalid-credential') {
            throw fbErr;
          }
        }
      }

      if (lastError) {
        throw lastError;
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
