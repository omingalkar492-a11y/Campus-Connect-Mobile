import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState, useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
  Dimensions,
} from 'react-native';

import { useAuth } from '@/context/auth-context';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

// ─── Animated Orb ──────────────────────────────────────────────────────────
function Orb({
  color,
  size,
  startX,
  startY,
  duration,
  delay = 0,
}: {
  color: string;
  size: number;
  startX: number;
  startY: number;
  duration: number;
  delay?: number;
}) {
  const posX = useRef(new Animated.Value(startX)).current;
  const posY = useRef(new Animated.Value(startY)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const rand = (min: number, max: number) => Math.random() * (max - min) + min;

    Animated.timing(opacity, {
      toValue: 0.55,
      duration: 1200,
      delay,
      useNativeDriver: true,
    }).start();

    const animate = () => {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(posX, {
            toValue: startX + rand(-120, 120),
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(posX, {
            toValue: startX + rand(-120, 120),
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(posX, {
            toValue: startX,
            duration,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(posY, {
            toValue: startY + rand(-140, 140),
            duration: duration * 1.15,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(posY, {
            toValue: startY + rand(-140, 140),
            duration: duration * 1.15,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(posY, {
            toValue: startY,
            duration: duration * 1.15,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(scale, {
            toValue: rand(0.85, 1.3),
            duration: duration * 0.9,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: rand(0.75, 1.15),
            duration: duration * 0.9,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: duration * 0.9,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ]).start(animate);
    };

    const t = setTimeout(animate, delay);
    return () => clearTimeout(t);
  }, []);

  return (
    <Animated.View
      style={[
        styles.orb,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity,
          transform: [{ translateX: posX }, { translateY: posY }, { scale }],
        },
      ]}
    />
  );
}

// ─── Glass Input ────────────────────────────────────────────────────────────
function GlassInput({
  icon,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
}: {
  icon: any;
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: any;
  autoCapitalize?: any;
}) {
  const [focused, setFocused] = useState(false);
  const focusAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    setFocused(true);
    Animated.timing(focusAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = () => {
    setFocused(false);
    Animated.timing(focusAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: false,
    }).start();
  };

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.15)', 'rgba(168,130,255,0.75)'],
  });

  const bgColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.06)', 'rgba(168,130,255,0.1)'],
  });

  return (
    <Animated.View
      style={[
        styles.glassInputWrap,
        { borderColor, backgroundColor: bgColor },
      ]}
    >
      <Ionicons
        name={icon}
        size={18}
        color={focused ? '#C4AAFF' : 'rgba(255,255,255,0.4)'}
        style={styles.inputIcon}
      />
      <TextInput
        style={styles.glassInput}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.28)"
        value={value}
        onChangeText={onChangeText}
        onFocus={handleFocus}
        onBlur={handleBlur}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType || 'default'}
        autoCapitalize={autoCapitalize || 'none'}
        autoCorrect={false}
      />
    </Animated.View>
  );
}

// ─── Main Login Screen ───────────────────────────────────────────────────────
export default function LoginScreen() {
  const router = useRouter();
  const { login, loginWithGoogle } = useAuth();

  const [activeTab, setActiveTab] = useState<'student' | 'staff'>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showPasswordHint, setShowPasswordHint] = useState(false);

  // Card entrance animation
  const cardAnim = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.88)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardAnim, {
        toValue: 1,
        duration: 700,
        delay: 300,
        easing: Easing.out(Easing.back(1.1)),
        useNativeDriver: true,
      }),
      Animated.spring(cardScale, {
        toValue: 1,
        delay: 300,
        tension: 65,
        friction: 9,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const getFriendlyError = (err: any): string => {
    const code = err?.code || '';
    const rawMsg = err?.message || (typeof err === 'string' ? err : '');
    const extracted = code || (rawMsg.match(/\((auth\/[^)]+)\)/)?.[1] || '');

    if (extracted === 'auth/too-many-requests') {
      return '🔒 Account temporarily locked. Please try with Google or wait a few minutes.';
    }
    if (['auth/user-not-found', 'auth/wrong-password', 'auth/invalid-credential'].includes(extracted)) {
      return '❌ Incorrect email or password. Please check your credentials.';
    }
    if (extracted === 'auth/invalid-email') return '⚠️ Please enter a valid email address.';
    if (extracted === 'auth/network-request-failed') return '📡 Network error. Check your connection.';
    if (['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(extracted)) return '';
    if (extracted === 'auth/popup-blocked') return '🚫 Popup blocked. Allow popups and try again.';
    if (extracted === 'auth/account-exists-with-different-credential') {
      return '⚠️ Account exists with a different sign-in method. Use email/password.';
    }

    const cleaned = rawMsg
      .replace(/^(FirebaseError|Firebase|Error):\s*/gi, '')
      .replace(/\(auth\/[^)]+\)\.?/g, '')
      .trim();

    if (cleaned && cleaned.toLowerCase() !== 'error') return cleaned;
    return '❌ Authentication failed. Please verify your credentials.';
  };

  const handleLogin = async () => {
    setErrorMsg('');
    const cleanEmail = email.trim();
    const cleanPass = password.trim();

    if (!cleanEmail || !cleanPass) {
      setErrorMsg('Please enter your email / ID and password.');
      return;
    }
    if (cleanPass.length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }

    try {
      setSubmitting(true);
      await login(cleanEmail, cleanPass);
      router.replace('/' as any);
    } catch (err: any) {
      const msg = getFriendlyError(err);
      if (msg) setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setErrorMsg('');
    try {
      setGoogleLoading(true);
      await loginWithGoogle();
      router.replace('/' as any);
    } catch (err: any) {
      const msg = getFriendlyError(err);
      if (msg) setErrorMsg(msg);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      {/* ── 3D Animated Orb Background ─────────────────────────── */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Orb color="#C84BFF" size={320} startX={-80} startY={-60} duration={7000} delay={0} />
        <Orb color="#FF4BA6" size={260} startX={SCREEN_W - 140} startY={60} duration={8500} delay={300} />
        <Orb color="#FF8A3D" size={180} startX={SCREEN_W - 60} startY={SCREEN_H - 180} duration={6200} delay={600} />
        <Orb color="#4B8EFF" size={210} startX={-40} startY={SCREEN_H - 220} duration={9000} delay={900} />
        <Orb color="#FF4BD8" size={130} startX={SCREEN_W / 2 - 60} startY={SCREEN_H * 0.35} duration={5400} delay={400} />
        <Orb color="#7B4BFF" size={160} startX={SCREEN_W * 0.65} startY={SCREEN_H * 0.55} duration={7800} delay={200} />
        <Orb color="#4BFFE8" size={100} startX={SCREEN_W * 0.2} startY={SCREEN_H * 0.2} duration={6800} delay={1200} />
      </View>

      {/* ── Background noise / deep blur overlay ───────────────── */}
      <View style={styles.backdropOverlay} pointerEvents="none" />

      {/* ── Scrollable content ──────────────────────────────────── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Brand header above card ─────────────────────────── */}
          <Animated.View
            style={[
              styles.brandRow,
              { opacity: cardAnim, transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }] },
            ]}
          >
            <View style={styles.brandIconRing}>
              <Ionicons name="school" size={26} color="#C4AAFF" />
            </View>
            <View>
              <Text style={styles.brandName}>CAMPUS CONNECT</Text>
              <Text style={styles.brandTagline}>Your Campus. Connected.</Text>
            </View>
          </Animated.View>

          {/* ── Glass Card ─────────────────────────────────────── */}
          <Animated.View
            style={[
              styles.glassCard,
              {
                opacity: cardAnim,
                transform: [
                  { scale: cardScale },
                  { translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) },
                ],
              },
            ]}
          >
            {/* Inner glass shimmer border */}
            <View style={styles.glassCardInner}>

              {/* Tab switcher */}
              <View style={styles.tabRow}>
                {(['student', 'staff'] as const).map((tab) => (
                  <Pressable
                    key={tab}
                    style={[styles.tabPill, activeTab === tab && styles.tabPillActive]}
                    onPress={() => { setActiveTab(tab); setErrorMsg(''); }}
                  >
                    <Ionicons
                      name={tab === 'student' ? 'person' : 'shield-checkmark'}
                      size={13}
                      color={activeTab === tab ? '#FFFFFF' : 'rgba(255,255,255,0.4)'}
                    />
                    <Text style={[styles.tabPillText, activeTab === tab && styles.tabPillTextActive]}>
                      {tab === 'student' ? 'Student' : 'Staff & Admin'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Title */}
              <Text style={styles.cardTitle}>
                {activeTab === 'student' ? 'Welcome Back' : 'Admin Access'}
              </Text>
              <Text style={styles.cardSubtitle}>
                {activeTab === 'student'
                  ? 'Sign in to access your campus dashboard'
                  : 'Authorized credentials only — issued by your institution'}
              </Text>

              {/* Error message */}
              {!!errorMsg && (
                <View style={styles.errorBanner}>
                  <Text style={styles.errorBannerText}>{errorMsg}</Text>
                </View>
              )}

              {/* Google button */}
              <Pressable
                style={({ pressed }) => [styles.googleBtn, pressed && { opacity: 0.8 }]}
                onPress={handleGoogle}
                disabled={submitting || googleLoading}
              >
                {googleLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <View style={styles.googleIconBox}>
                      <Ionicons name="logo-google" size={16} color="#EA4335" />
                    </View>
                    <Text style={styles.googleBtnText}>
                      {activeTab === 'student' ? 'Continue with Google' : 'Sign in with Google Workspace'}
                    </Text>
                  </>
                )}
              </Pressable>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerLabel}>or sign in with credentials</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Email input */}
              <GlassInput
                icon={activeTab === 'student' ? 'mail-outline' : 'person-outline'}
                placeholder={activeTab === 'student' ? 'Email or Registration ID' : 'Username, ID, or Email'}
                value={email}
                onChangeText={setEmail}
                keyboardType={activeTab === 'student' ? 'email-address' : 'default'}
              />

              {/* Password input */}
              <View style={styles.passwordRow}>
                <GlassInput
                  icon="lock-closed-outline"
                  placeholder="Password"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>

              {/* Sign in button */}
              <Pressable
                style={({ pressed }) => [styles.signInBtn, (submitting || pressed) && { opacity: 0.85 }]}
                onPress={handleLogin}
                disabled={submitting || googleLoading}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.signInBtnText}>
                      {activeTab === 'student' ? 'Enter Campus' : 'Authenticate'}
                    </Text>
                    <Ionicons name="arrow-forward" size={16} color="#fff" style={{ marginLeft: 8 }} />
                  </>
                )}
              </Pressable>

              {/* Info for students — no self-signup */}
              {activeTab === 'student' && (
                <View style={styles.infoBox}>
                  <Ionicons name="information-circle" size={16} color="#C4AAFF" />
                  <Text style={styles.infoText}>
                    New students are registered by your College Admin or Faculty. Contact your institution to get access.
                  </Text>
                </View>
              )}

              {activeTab === 'staff' && (
                <View style={[styles.infoBox, { borderColor: 'rgba(100,220,200,0.25)' }]}>
                  <Ionicons name="shield-half" size={16} color="#64DCC8" />
                  <Text style={[styles.infoText, { color: '#64DCC8' }]}>
                    Staff credentials are provisioned exclusively by the Super Admin.
                  </Text>
                </View>
              )}
            </View>
          </Animated.View>

          {/* Bottom version watermark */}
          <Animated.Text style={[styles.versionText, { opacity: cardAnim }]}>
            Campus Connect v1.0 · Secured by Firebase
          </Animated.Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0A0010',
  },
  orb: {
    position: 'absolute',
    // blur effect via boxShadow on web, shadow on native
    ...Platform.select({
      web: {
        filter: 'blur(72px)',
      },
      default: {
        shadowColor: '#C84BFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 70,
      },
    }),
  },
  backdropOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6,0,16,0.45)',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 60,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 28,
    alignSelf: 'center',
  },
  brandIconRing: {
    width: 52,
    height: 52,
    borderRadius: 17,
    backgroundColor: 'rgba(196,170,255,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(196,170,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { boxShadow: '0 0 20px rgba(196,170,255,0.3)' },
      default: {
        shadowColor: '#C4AAFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
    }),
  },
  brandName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  brandTagline: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(196,170,255,0.7)',
    marginTop: 1,
    letterSpacing: 0.5,
  },
  // ── Glass Card
  glassCard: {
    width: '100%',
    maxWidth: 440,
    borderRadius: 28,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        boxShadow: '0 24px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.12)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.5,
        shadowRadius: 40,
        elevation: 20,
      },
    }),
  },
  glassCardInner: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    padding: 28,
  },
  // ── Tabs
  tabRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 4,
    marginBottom: 24,
    gap: 4,
  },
  tabPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 11,
  },
  tabPillActive: {
    backgroundColor: 'rgba(196,170,255,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(196,170,255,0.45)',
    ...Platform.select({
      web: { boxShadow: '0 0 16px rgba(196,170,255,0.25)' },
      default: {
        shadowColor: '#C4AAFF',
        shadowOpacity: 0.3,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 0 },
      },
    }),
  },
  tabPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
  },
  tabPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  // ── Card text
  cardTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 22,
    lineHeight: 18,
  },
  // ── Error
  errorBanner: {
    backgroundColor: 'rgba(255,80,80,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,80,80,0.35)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    ...Platform.select({ web: { backdropFilter: 'blur(8px)' }, default: {} }),
  },
  errorBannerText: {
    color: '#FF8080',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  // ── Google button
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: 'rgba(255,255,255,0.09)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 20,
    ...Platform.select({
      web: {
        backdropFilter: 'blur(10px)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
      },
      default: {},
    }),
  },
  googleIconBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleBtnText: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  // ── Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  dividerLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  // ── Glass Input
  glassInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 0,
    minHeight: 52,
    marginBottom: 14,
    ...Platform.select({
      web: { backdropFilter: 'blur(10px)' },
      default: {},
    }),
  },
  inputIcon: {
    marginRight: 10,
  },
  glassInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '500',
    paddingVertical: Platform.OS === 'android' ? 12 : 0,
  },
  passwordRow: {
    marginBottom: 4,
  },
  // ── Sign in button
  signInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: 6,
    marginBottom: 18,
    backgroundColor: 'transparent',
    borderWidth: 0,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        background: 'linear-gradient(135deg, #9B5CFF 0%, #FF4BA6 100%)',
        boxShadow: '0 8px 32px rgba(155,92,255,0.45)',
      },
      default: {
        backgroundColor: '#9B5CFF',
        shadowColor: '#9B5CFF',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
      },
    }),
  },
  signInBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  // ── Info box
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(196,170,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(196,170,255,0.2)',
    borderRadius: 12,
    padding: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: 'rgba(196,170,255,0.75)',
    lineHeight: 17,
    fontWeight: '500',
  },
  // ── Version watermark
  versionText: {
    marginTop: 24,
    fontSize: 11,
    color: 'rgba(255,255,255,0.2)',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});