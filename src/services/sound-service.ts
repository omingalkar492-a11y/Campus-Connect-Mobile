import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const SOUND_PREF_KEY = 'cc_sound_alerts_enabled';

class SoundServiceImpl {
  private audioCtx: any = null;
  private soundEnabled: boolean = true;
  private initialized: boolean = false;

  constructor() {
    this.initPreference();
  }

  private async initPreference() {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem(SOUND_PREF_KEY);
        if (stored !== null) {
          this.soundEnabled = stored === 'true';
          this.initialized = true;
          return;
        }
      }
      const asyncStored = await AsyncStorage.getItem(SOUND_PREF_KEY);
      if (asyncStored !== null) {
        this.soundEnabled = asyncStored === 'true';
      } else {
        this.soundEnabled = true; // Default ON for counter staff
      }
    } catch (e) {
      this.soundEnabled = true;
    } finally {
      this.initialized = true;
    }
  }

  public async isSoundEnabled(): Promise<boolean> {
    if (!this.initialized) {
      await this.initPreference();
    }
    return this.soundEnabled;
  }

  public getSoundEnabledSync(): boolean {
    return this.soundEnabled;
  }

  public async setSoundEnabled(enabled: boolean): Promise<void> {
    this.soundEnabled = enabled;
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(SOUND_PREF_KEY, String(enabled));
      }
      await AsyncStorage.setItem(SOUND_PREF_KEY, String(enabled));
    } catch (e) {
      console.warn('Could not persist sound preference:', e);
    }
  }

  /**
   * Unlock AudioContext on first user interaction (browser autoplay compliance)
   */
  public async unlockAudioContext(): Promise<void> {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    try {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }

      if (this.audioCtx.state === 'suspended') {
        await this.audioCtx.resume();
      }
    } catch (e) {
      console.warn('AudioContext unlock failed:', e);
    }
  }

  private getAudioContext(): any {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return null;

    try {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return null;

      if (!this.audioCtx || this.audioCtx.state === 'closed') {
        this.audioCtx = new AudioContextClass();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }

      return this.audioCtx;
    } catch (e) {
      return null;
    }
  }

  /**
   * Upbeat 3-tone harmonic chime for incoming food court orders
   * Notes: D5 (587.3Hz) -> A5 (880.0Hz) -> D6 (1174.7Hz)
   */
  public playNewOrderChime(): void {
    if (!this.soundEnabled) return;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // Note 1: D5 (Warm intro note)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.28, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.35);

      // Note 2: A5 (Bright kitchen bell tone)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880.0, now + 0.12);
      gain2.gain.setValueAtTime(0.32, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.65);

      // Note 3: D6 (Crystal peak flourish)
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'triangle';
      osc3.frequency.setValueAtTime(1174.66, now + 0.24);
      gain3.gain.setValueAtTime(0.25, now + 0.24);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(now + 0.24);
      osc3.stop(now + 0.85);
    } catch (e) {
      console.warn('Could not play new order chime:', e);
    }
  }

  /**
   * Double-ding notification chime when food is marked ready for pickup
   * Notes: F#5 (739.99Hz) -> C#6 (1108.73Hz)
   */
  public playOrderReadyChime(): void {
    if (!this.soundEnabled) return;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // First Ding: F#5
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(739.99, now);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.4);

      // Second Ding: C#6
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1108.73, now + 0.18);
      gain2.gain.setValueAtTime(0.35, now + 0.18);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.75);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.18);
      osc2.stop(now + 0.75);
    } catch (e) {
      console.warn('Could not play order ready chime:', e);
    }
  }

  /**
   * Test chime for staff volume check
   */
  public async testChime(): Promise<boolean> {
    await this.unlockAudioContext();
    this.playNewOrderChime();
    return true;
  }
}

export const SoundService = new SoundServiceImpl();
