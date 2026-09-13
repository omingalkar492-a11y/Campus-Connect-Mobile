import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
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
import { useAppTheme } from '@/context/theme-context';
import { SEED_COLLEGES } from '@/services/seed-data';

export default function LoginScreen() {
  const router = useRouter();
  const { login, signup, switchDemoRole, loading: authLoading } = useAuth();
  const { colors, isDark } = useAppTheme();

  const [activeTab, setActiveTab] = useState<'student' | 'staff'>('student');
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [selectedCollegeId, setSelectedCollegeId] = useState(SEED_COLLEGES[0].id);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const getFriendlyAuthError = (err: any): string => {
    const code = err?.code || '';
    const msg = err?.message || '';

    if (code === 'auth/email-already-in-use') {
      return 'This email is already registered. Please switch to sign in.';
    }
    if (code === 'auth/weak-password') {
      return 'Password must be at least 6 characters long.';
    }
    if (code === 'auth/invalid-email') {
      return 'Please enter a valid campus email address.';
    }
    if (
      code === 'auth/user-not-found' ||
      code === 'auth/wrong-password' ||
      code === 'auth/invalid-credential'
    ) {
      return 'Incorrect email or password. Please verify your credentials.';
    }
    if (code === 'auth/network-request-failed') {
      return 'Network request failed. Please check your internet connection.';
    }
    return msg.replace(/^Firebase:\s*/i, '').replace(/\(auth\/[^)]+\)\.?/g, '').trim() ||
      'Authentication failed. Please check your information.';
  };

  const handleAuth = async () => {
    setErrorMsg('');
    const cleanEmail = email.trim();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    if (cleanPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    try {
      setSubmitting(true);
      if (isSignup && activeTab === 'student') {
        if (!name.trim()) {
          setErrorMsg('Please enter your full name.');
          setSubmitting(false);
          return;
        }
        await signup(cleanEmail, cleanPassword, name.trim(), 'student', selectedCollegeId, {
          department: 'Information Technology',
          year: '3rd Year',
          division: 'Div A',
        });
        router.replace('/(student)' as any);
      } else {
        await login(cleanEmail, cleanPassword);
        router.replace('/' as any);
      }
    } catch (err: any) {
      setErrorMsg(getFriendlyAuthError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoLogin = async (demoEmail: string) => {
    setErrorMsg('');
    setSubmitting(true);
    try {
      await switchDemoRole(demoEmail);
      router.replace('/' as any);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Demo sign-in failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContainer}
      keyboardShouldPersistTaps="handled"
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        {/* Brand Header */}
        <View style={styles.logoRow}>
          <View style={styles.iconBox}>
            <Ionicons name="school" size={28} color={CampusTheme.colors.primary} />
          </View>
          <View>
            <Text style={styles.brandTitle}>CAMPUS CONNECT</Text>
            <Text style={styles.brandTagline}>Your Campus. Connected.</Text>
          </View>
        </View>

        {/* Portal Type Switcher */}
        <View style={styles.tabContainer}>
          <Pressable
            style={[styles.tabButton, activeTab === 'student' && styles.activeTabButton]}
            onPress={() => {
              setActiveTab('student');
              setErrorMsg('');
            }}
          >
            <Ionicons
              name="person"
              size={16}
              color={
                activeTab === 'student'
                  ? CampusTheme.colors.pillActiveText
                  : CampusTheme.colors.textMuted
              }
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'student' && styles.activeTabText,
              ]}
            >
              Student Portal
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tabButton, activeTab === 'staff' && styles.activeTabButton]}
            onPress={() => {
              setActiveTab('staff');
              setIsSignup(false);
              setErrorMsg('');
            }}
          >
            <Ionicons
              name="shield-checkmark"
              size={16}
              color={
                activeTab === 'staff'
                  ? CampusTheme.colors.pillActiveText
                  : CampusTheme.colors.textMuted
              }
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'staff' && styles.activeTabText,
              ]}
            >
              Staff & Admin
            </Text>
          </Pressable>
        </View>

        <Text style={styles.formTitle}>
          {activeTab === 'student'
            ? isSignup
              ? 'Student Registration'
              : 'Student Sign In'
            : 'Staff & Administrative Access'}
        </Text>
        <Text style={styles.formSubtitle}>
          {activeTab === 'student'
            ? 'Access timetable, 360° campus spaces, and canteen orders.'
            : 'Authorized credentials issued by institutional administration.'}
        </Text>

        {errorMsg ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={18} color={CampusTheme.colors.danger} />
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* Form Inputs */}
        {isSignup && activeTab === 'student' && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Aarav Kulkarni"
              placeholderTextColor={CampusTheme.colors.textDim}
              value={name}
              onChangeText={setName}
            />
          </View>
        )}

        {isSignup && activeTab === 'student' && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Select College</Text>
            <View style={styles.collegeSelector}>
              {SEED_COLLEGES.map((c) => (
                <Pressable
                  key={c.id}
                  style={[
                    styles.collegePill,
                    selectedCollegeId === c.id && styles.activeCollegePill,
                  ]}
                  onPress={() => setSelectedCollegeId(c.id)}
                >
                  <Text
                    style={[
                      styles.collegePillText,
                      selectedCollegeId === c.id && styles.activeCollegePillText,
                    ]}
                  >
                    {c.shortName}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Campus Email Address</Text>
          <TextInput
            style={styles.input}
            placeholder={
              activeTab === 'student' ? 'student@jspm.edu' : 'admin@jspm.edu'
            }
            placeholderTextColor={CampusTheme.colors.textDim}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={CampusTheme.colors.textDim}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <Pressable
          style={[styles.submitButton, submitting && { opacity: 0.7 }]}
          onPress={handleAuth}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color={CampusTheme.colors.background} />
          ) : (
            <Text style={styles.submitButtonText}>
              {activeTab === 'student'
                ? isSignup
                  ? 'Complete Registration'
                  : 'Enter Campus'
                : 'Authenticate Staff Portal'}
            </Text>
          )}
        </Pressable>

        {activeTab === 'student' && (
          <Pressable
            style={styles.switchAuthMode}
            onPress={() => {
              setIsSignup(!isSignup);
              setErrorMsg('');
            }}
          >
            <Text style={styles.switchAuthText}>
              {isSignup
                ? 'Already registered? Sign in here'
                : "New student? Create an account"}
            </Text>
          </Pressable>
        )}

        {/* Quick Demo Access Bar */}
        <View style={styles.demoSection}>
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>ONE-TAP DEMO PROFILES</Text>
            <View style={styles.dividerLine} />
          </View>
          <Text style={styles.demoSubtext}>
            Test each institutional role instantly with realistic live data:
          </Text>

          <View style={styles.demoPillsContainer}>
            <Pressable
              style={styles.demoPill}
              onPress={() => handleDemoLogin('student@jspm.edu')}
            >
              <Ionicons name="school" size={14} color={CampusTheme.colors.primary} />
              <Text style={styles.demoPillText}>Student (Aarav - JSPM)</Text>
            </Pressable>

            <Pressable
              style={styles.demoPill}
              onPress={() => handleDemoLogin('admin@jspm.edu')}
            >
              <Ionicons name="business" size={14} color={CampusTheme.colors.warning} />
              <Text style={styles.demoPillText}>College Admin (JSPM)</Text>
            </Pressable>

            <Pressable
              style={styles.demoPill}
              onPress={() => handleDemoLogin('canteen@jspm.edu')}
            >
              <Ionicons name="fast-food" size={14} color="#F472B6" />
              <Text style={styles.demoPillText}>Food Court Staff (Suresh)</Text>
            </Pressable>

            <Pressable
              style={styles.demoPill}
              onPress={() => handleDemoLogin('faculty@jspm.edu')}
            >
              <Ionicons name="person-circle" size={14} color="#60A5FA" />
              <Text style={styles.demoPillText}>Faculty (Sneha Deshmukh)</Text>
            </Pressable>

            <Pressable
              style={styles.demoPill}
              onPress={() => handleDemoLogin('superadmin@campusconnect.in')}
            >
              <Ionicons name="planet" size={14} color="#A78BFA" />
              <Text style={styles.demoPillText}>Super Admin (Platform)</Text>
            </Pressable>

            <Pressable
              style={[styles.demoPill, { borderColor: 'rgba(255, 255, 255, 0.2)' }]}
              onPress={() => handleDemoLogin('student@coep.edu')}
            >
              <Ionicons name="shield" size={14} color="#34D399" />
              <Text style={styles.demoPillText}>COEP Student (College B)</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CampusTheme.colors.background,
  },
  scrollContainer: {
    padding: 20,
    paddingTop: 50,
    paddingBottom: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: CampusTheme.colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: CampusTheme.colors.cardBorder,
    padding: 24,
    ...CampusTheme.shadows.card,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 24,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: CampusTheme.colors.pillInactiveBg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: CampusTheme.colors.cardBorder,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: CampusTheme.colors.text,
    letterSpacing: 1.2,
  },
  brandTagline: {
    fontSize: 13,
    color: CampusTheme.colors.primary,
    fontWeight: '500',
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: CampusTheme.colors.pillInactiveBg,
    borderRadius: 14,
    padding: 4,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: CampusTheme.colors.cardBorder,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  activeTabButton: {
    backgroundColor: CampusTheme.colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: CampusTheme.colors.textMuted,
  },
  activeTabText: {
    color: CampusTheme.colors.pillActiveText,
    fontWeight: '700',
  },
  formTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: CampusTheme.colors.text,
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 13,
    color: CampusTheme.colors.textMuted,
    marginBottom: 20,
    lineHeight: 18,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: CampusTheme.colors.dangerBg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.3)',
  },
  errorText: {
    color: CampusTheme.colors.danger,
    fontSize: 13,
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: CampusTheme.colors.textMuted,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#0F1A14',
    borderWidth: 1,
    borderColor: CampusTheme.colors.cardBorder,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
    color: CampusTheme.colors.text,
    fontSize: 15,
  },
  collegeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  collegePill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: CampusTheme.colors.pillInactiveBg,
    borderWidth: 1,
    borderColor: CampusTheme.colors.cardBorder,
  },
  activeCollegePill: {
    backgroundColor: CampusTheme.colors.primaryDim,
    borderColor: CampusTheme.colors.primary,
  },
  collegePillText: {
    fontSize: 12,
    color: CampusTheme.colors.textMuted,
    fontWeight: '600',
  },
  activeCollegePillText: {
    color: CampusTheme.colors.primary,
    fontWeight: '700',
  },
  submitButton: {
    backgroundColor: CampusTheme.colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 16,
    ...CampusTheme.shadows.glow,
  },
  submitButtonText: {
    color: CampusTheme.colors.background,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  switchAuthMode: {
    alignItems: 'center',
    marginBottom: 20,
  },
  switchAuthText: {
    color: CampusTheme.colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  demoSection: {
    marginTop: 10,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.07)',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '700',
    color: CampusTheme.colors.textDim,
    marginHorizontal: 10,
    letterSpacing: 1,
  },
  demoSubtext: {
    fontSize: 12,
    color: CampusTheme.colors.textMuted,
    marginBottom: 12,
    textAlign: 'center',
  },
  demoPillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  demoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9999,
    backgroundColor: '#0F1A14',
    borderWidth: 1,
    borderColor: CampusTheme.colors.cardBorder,
  },
  demoPillText: {
    fontSize: 12,
    color: CampusTheme.colors.text,
    fontWeight: '600',
  },
});