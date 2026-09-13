import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import React, { createContext, useContext, useState, useEffect } from 'react';

import { auth } from '@/lib/firebase';
import { DataService } from '@/services/data-service';
import { DEMO_PROFILES, SEED_COLLEGES } from '@/services/seed-data';
import { UserProfile, College, UserRole } from '@/types';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  college: College | null;
  role: UserRole | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
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
  const [profile, setProfile] = useState<UserProfile | null>(DEMO_PROFILES['student@jspm.edu']);
  const [college, setCollege] = useState<College | null>(SEED_COLLEGES[0]);
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

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      try {
        if (fbUser) {
          setUser(fbUser);
          const p = await DataService.getUserProfile(fbUser.uid, fbUser.email || undefined);
          if (p) {
            await syncProfileAndCollege(p);
          }
        } else {
          // If no active Firebase user, ensure demo student state is active
          if (!profile) {
            const defaultProfile = DEMO_PROFILES['student@jspm.edu'];
            await syncProfileAndCollege(defaultProfile);
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

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const cleanEmail = email.toLowerCase().trim();
      const cleanPass = pass.trim();

      if (!cleanEmail || !cleanPass) {
        throw new Error('Please enter both email and password.');
      }

      // Check if it's one of the demo test credentials
      if (DEMO_PROFILES[cleanEmail]) {
        const demoUser = DEMO_PROFILES[cleanEmail];
        await syncProfileAndCollege(demoUser);
        setLoading(false);
        return;
      }

      const res = await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
      setUser(res.user);
      const p = await DataService.getUserProfile(res.user.uid, res.user.email || cleanEmail);
      if (p) {
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

      // Save locally and in memory first
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
      let targetProfile = DEMO_PROFILES[emailOrRole.toLowerCase().trim()];
      if (!targetProfile) {
        // Find by role
        const match = Object.values(DEMO_PROFILES).find(
          (p) => p.role.toLowerCase() === emailOrRole.toLowerCase()
        );
        if (match) targetProfile = match;
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
