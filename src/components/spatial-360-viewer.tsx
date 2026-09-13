import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { CampusTheme } from '@/constants/theme';
import { Campus360Location } from '@/types';

interface Spatial360ViewerProps {
  visible: boolean;
  location: Campus360Location | null;
  allLocations?: Campus360Location[];
  onClose: () => void;
}

const DEFAULT_JSPM_360: Campus360Location = {
  id: 'loc_360_jspm_main',
  collegeId: 'col_jspm_tathawade',
  name: 'Explore JSPM in 360°',
  description: 'Immersive 360° Clear Pano spatial tour of JSPM Tathawade Campus',
  category: 'Campus Tour',
  thumbnail: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=600&q=80',
  embedUrl: 'https://tours.clearpano.com/I4EFHxcx',
  externalUrl: 'https://tours.clearpano.com/I4EFHxcx',
  active: true,
  displayOrder: 0,
};

export function Spatial360Viewer({
  visible,
  location,
  allLocations = [],
  onClose,
}: Spatial360ViewerProps) {
  const [currentSpot, setCurrentSpot] = useState<Campus360Location | null>(location || DEFAULT_JSPM_360);
  const [loadingIframe, setLoadingIframe] = useState(true);

  useEffect(() => {
    if (location) {
      setCurrentSpot(location);
    }
  }, [location]);

  // Safety auto-dismiss loader after 1.8s so interaction is never obstructed
  useEffect(() => {
    if (visible) {
      setLoadingIframe(true);
      const timer = setTimeout(() => {
        setLoadingIframe(false);
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [visible, currentSpot]);

  if (!visible) return null;

  const activeSpot = currentSpot || location || DEFAULT_JSPM_360;

  // Use the exact Clear Pano link specified by the user
  const experienceUrl =
    activeSpot.embedUrl ||
    activeSpot.externalUrl ||
    'https://tours.clearpano.com/I4EFHxcx';

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.container,
          Platform.OS === 'web' &&
            ({
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: '100vw',
              height: '100vh',
              zIndex: 999999,
            } as any),
        ]}
      >
        {/* TOP BAR - Campus Connect Branding & In-App Navigation */}
        <View style={styles.topBar}>
          <Pressable
            style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.85 }]}
            onPress={onClose}
          >
            <Ionicons name="arrow-back" size={18} color={CampusTheme.colors.background} />
            <Text style={styles.backButtonText}>Back to Campus</Text>
          </Pressable>

          <View style={styles.titleCenter}>
            <View style={styles.brandBadge}>
              <Ionicons name="scan" size={12} color={CampusTheme.colors.primary} />
              <Text style={styles.brandBadgeText}>CLEAR PANO 360° TOUR</Text>
            </View>
            <Text style={styles.locationTitle} numberOfLines={1}>
              {activeSpot.name || 'Explore JSPM in 360°'}
            </Text>
          </View>

          <Pressable
            style={({ pressed }) => [styles.closeCircleBtn, pressed && { opacity: 0.8 }]}
            onPress={onClose}
          >
            <Ionicons name="close" size={20} color={CampusTheme.colors.text} />
          </Pressable>
        </View>

        {/* VENUE SWITCHER BAR (if multiple 360 spots available) */}
        {allLocations && allLocations.length > 1 && (
          <View style={styles.spotsBar}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.spotsScroll}
            >
              {allLocations.map((spot) => {
                const isSelected = (currentSpot?.id || activeSpot.id) === spot.id;
                return (
                  <Pressable
                    key={spot.id}
                    style={[styles.spotChip, isSelected && styles.spotChipActive]}
                    onPress={() => setCurrentSpot(spot)}
                  >
                    <Ionicons
                      name={isSelected ? 'navigate-circle' : 'location-outline'}
                      size={13}
                      color={isSelected ? '#0D1411' : CampusTheme.colors.primary}
                    />
                    <Text
                      style={[styles.spotChipText, isSelected && styles.spotChipTextActive]}
                      numberOfLines={1}
                    >
                      {spot.name}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* 360 CANVAS EMBED (Runs directly on our site inside in-app modal, never opening 3rd party window) */}
        <View style={styles.canvasContainer}>
          {Platform.OS === 'web' ? (
            <View style={styles.iframeContainer}>
              {loadingIframe && (
                <View style={styles.loadingOverlay} pointerEvents="none">
                  <ActivityIndicator size="large" color={CampusTheme.colors.primary} />
                  <Text style={styles.loadingText}>
                    Loading Clear Pano 360° Spatial Campus Experience...
                  </Text>
                </View>
              )}
              {/* @ts-ignore: Standard Web Iframe directly embedded on site */}
              <iframe
                src={experienceUrl}
                title={activeSpot.name || 'Clear Pano 360 Campus Experience'}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  backgroundColor: '#070A09',
                }}
                onLoad={() => setLoadingIframe(false)}
                allow="accelerometer; gyroscope; magnetometer; vr; xr; fullscreen; autoplay; execution-while-out-of-viewport; execution-while-not-rendered"
                allowFullScreen
              />
            </View>
          ) : (
            <View style={styles.nativeFallback}>
              <View style={styles.fallbackIcon}>
                <Ionicons name="cube-outline" size={54} color={CampusTheme.colors.primary} />
              </View>
              <Text style={styles.fallbackTitle}>{activeSpot.name}</Text>
              <Text style={styles.fallbackDesc}>
                {activeSpot.description || 'Clear Pano 360° Interactive Campus Tour'}
              </Text>
              <Pressable
                style={styles.openInAppBtn}
                onPress={() => {
                  if (experienceUrl) {
                    WebBrowser.openBrowserAsync(experienceUrl, {
                      presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
                      toolbarColor: '#070A09',
                    });
                  }
                }}
              >
                <Ionicons name="scan" size={18} color="#0D1411" />
                <Text style={styles.openInAppBtnText}>Open In-App 360° View</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* BOTTOM HUD CONTROLS */}
        <View style={styles.bottomHud}>
          <View style={styles.hudLeft}>
            <Ionicons name="compass-outline" size={16} color={CampusTheme.colors.primary} />
            <Text style={styles.hudText}>
              Drag with mouse or touch to look 360°. Click arrows to walk inside buildings.
            </Text>
          </View>

          <View style={styles.hudRight}>
            <View style={styles.livePill}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>IN-APP 360°</Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070A09',
    width: '100%',
    height: '100%',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 48 : 14,
    paddingBottom: 12,
    backgroundColor: '#0D1411',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(142, 228, 175, 0.15)',
    zIndex: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: CampusTheme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  backButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: CampusTheme.colors.background,
  },
  titleCenter: {
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 10,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#15251E',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.2)',
    marginBottom: 2,
  },
  brandBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: CampusTheme.colors.primary,
    letterSpacing: 0.8,
  },
  locationTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: CampusTheme.colors.text,
  },
  closeCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#15251E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.2)',
  },
  spotsBar: {
    backgroundColor: '#0A100D',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(142, 228, 175, 0.1)',
    paddingVertical: 8,
  },
  spotsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  spotChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#131F19',
    borderWidth: 1,
    borderColor: 'rgba(142, 228, 175, 0.18)',
  },
  spotChipActive: {
    backgroundColor: CampusTheme.colors.primary,
    borderColor: CampusTheme.colors.primary,
  },
  spotChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: CampusTheme.colors.textMuted,
  },
  spotChipTextActive: {
    color: '#0D1411',
    fontWeight: '800',
  },
  canvasContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#070A09',
    overflow: 'hidden',
  },
  iframeContainer: {
    position: 'relative',
    flex: 1,
    width: '100%',
    height: '100%',
    minHeight: 400,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#070A09',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  loadingText: {
    color: CampusTheme.colors.primary,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 12,
    letterSpacing: 0.5,
  },
  nativeFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  fallbackIcon: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#14251D',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: CampusTheme.colors.primary,
    marginBottom: 16,
  },
  fallbackTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: CampusTheme.colors.text,
    textAlign: 'center',
  },
  fallbackDesc: {
    fontSize: 13,
    color: CampusTheme.colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
  },
  openInAppBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: CampusTheme.colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 10,
  },
  openInAppBtnText: {
    color: '#0D1411',
    fontWeight: '700',
    fontSize: 14,
  },
  bottomHud: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#0D1411',
    borderTopWidth: 1,
    borderTopColor: 'rgba(142, 228, 175, 0.12)',
  },
  hudLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  hudText: {
    fontSize: 11,
    color: CampusTheme.colors.textMuted,
    fontWeight: '500',
  },
  hudRight: {},
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#15251E',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: CampusTheme.colors.primary,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: CampusTheme.colors.primary,
  },
  liveText: {
    fontSize: 9,
    fontWeight: '800',
    color: CampusTheme.colors.primary,
    letterSpacing: 0.5,
  },
});
