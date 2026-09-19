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
  const { login, signup, loading: authLoading } = useAuth();
  const { colors, isDark } = useAppTheme();

  const [activeTab, setActiveTab] = useState<'student' | 'staff'>('student');
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [registrationId, setRegistrationId] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [selectedCollegeId, setSelectedCollegeId] = useState(SEED_COLLEGES[0].id);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const getFriendlyAuthError = (err: any): string => {
    const code = err?.code || '';
    const msg = err?.message || '';

    if (code === 'auth/email-already-in-use') {
      return 'This email or Registration ID is already registered. Please switch to sign in.';
    }
    if (code === 'auth/weak-password') {
      return 'Password must be at least 6 characters long.';
    }
    if (code === 'auth/invalid-email') {
      return 'Please enter a valid campus email address or Registration ID.';
    }
    if (
      code === 'auth/user-not-found' ||
      code === 'auth/wrong-password' ||
      code === 'auth/invalid-credential'
    ) {
      return 'Incorrect ID/Email or password. Please verify your credentials.';
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
    const cleanRegId = registrationId.trim().toUpperCase();

    if (!cleanEmail || !cleanPassword) {
      setErrorMsg(
        isSignup
          ? 'Please fill in all required fields.'
          : 'Please enter your ID/Email and password.'
      );
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
          registrationId: cleanRegId || undefined,
          studentId: cleanRegId || undefined,
          rollNumber: cleanRegId || undefined,
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
            <Text style={styles.inputLabel}>Student Registration ID / PRN (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 2024CS001 or PRN24101"
              placeholderTextColor={CampusTheme.colors.textDim}
              autoCapitalize="characters"
              value={registrationId}
              onChangeText={setRegistrationId}
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
          <Text style={styles.inputLabel}>
            {activeTab === 'student'
              ? isSignup
                ? 'Campus Email Address'
                : 'Campus Email or Registration ID / PRN'
              : 'Institutional ID, Username, or Email'}
          </Text>
          <TextInput
            style={styles.input}
            placeholder={
              activeTab === 'student'
                ? isSignup
                  ? 'e.g. student@jspm.edu'
                  : 'e.g. 2024CS001 or student@jspm.edu'
                : 'omkumar_01, admin_jspm, or email'
            }
            placeholderTextColor={CampusTheme.colors.textDim}
            keyboardType={
              activeTab === 'student' && isSignup ? 'email-address' : 'default'
            }
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

        {!isSignup && (
          <Text style={styles.deviceHintText}>
            Multi-device sync active: sign in with your ID & password on any device.
          </Text>
        )}

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

        {activeTab === 'staff' && (
          <View style={styles.staffNoticeBox}>
            <View style={styles.staffNoticeIcon}>
              <Ionicons name="shield-checkmark" size={16} color={CampusTheme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.staffNoticeTitle}>Platform Institutional Security</Text>
              <Text style={styles.staffNoticeText}>
                Super Admin has exclusive authority over College Admin IDs. College Admin accounts are provisioned directly by the Super Admin.
              </Text>
            </View>
          </View>
        )}
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
  deviceHintText: {
    fontSize: 12,
    color: CampusTheme.colors.textMint,
    textAlign: 'center',
    marginBottom: 10,
    opacity: 0.85,
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
  staffNoticeBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginTop: 18,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#0F1E17',
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.15)',
  },
  staffNoticeIcon: {
    marginTop: 2,
  },
  staffNoticeTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: CampusTheme.colors.primary,
    marginBottom: 2,
  },
  staffNoticeText: {
    fontSize: 11,
    color: CampusTheme.colors.textMuted,
    lineHeight: 16,
  },
});