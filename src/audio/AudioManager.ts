import { CharacterId, VoiceSlot } from '@shared/types';

export interface AudioSettings {
  masterVolume: number;
  bgmVolume: number;
  voiceVolume: number;
  sfxVolume: number;
  masterMuted: boolean;
  bgmMuted: boolean;
  voiceMuted: boolean;
  sfxMuted: boolean;
}

const DEFAULT_SETTINGS: AudioSettings = {
  masterVolume: 0.85,
  bgmVolume: 0.45,
  voiceVolume: 0.95,
  sfxVolume: 0.8,
  masterMuted: false,
  bgmMuted: false,
  voiceMuted: false,
  sfxMuted: false,
};

const STORAGE_KEY = 'nk_audio_settings_v1';

class AudioManagerImpl {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private voiceGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;

  private bufferCache = new Map<string, AudioBuffer>();
  private loadingPromises = new Map<string, Promise<AudioBuffer | null>>();

  private activeBgm: { track: string; source: AudioBufferSourceNode } | null = null;
  private activeVoices = new Map<string, { source: AudioBufferSourceNode; isSpecial: boolean }>();
  private specialLockUntilMs = 0;
  private lastSfxTime = new Map<string, number>();
  private settings: AudioSettings;
  private listeners = new Set<(s: AudioSettings) => void>();

  constructor() {
    this.settings = this.loadSettings();
  }

  private loadSettings(): AudioSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
      // ignore
    }
    return { ...DEFAULT_SETTINGS };
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // ignore
    }
    this.listeners.forEach((cb) => cb(this.getSettings()));
  }

  getSettings(): AudioSettings {
    return { ...this.settings };
  }

  subscribe(cb: (s: AudioSettings) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  updateSettings(patch: Partial<AudioSettings>): void {
    this.settings = { ...this.settings, ...patch };
    this.applyGains();
    this.saveSettings();
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.bgmGain = this.ctx.createGain();
      this.voiceGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();

      this.bgmGain.connect(this.masterGain);
      this.voiceGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
      this.applyGains();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  unlock(): void {
    this.ensureContext();
  }

  private applyGains(): void {
    if (!this.ctx || !this.masterGain || !this.bgmGain || !this.voiceGain || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(
      this.settings.masterMuted ? 0 : this.settings.masterVolume,
      now,
      0.02
    );
    this.bgmGain.gain.setTargetAtTime(
      this.settings.bgmMuted ? 0 : this.settings.bgmVolume,
      now,
      0.04
    );
    this.voiceGain.gain.setTargetAtTime(
      this.settings.voiceMuted ? 0 : this.settings.voiceVolume,
      now,
      0.02
    );
    this.sfxGain.gain.setTargetAtTime(
      this.settings.sfxMuted ? 0 : this.settings.sfxVolume,
      now,
      0.02
    );
  }

  private async loadBuffer(url: string): Promise<AudioBuffer | null> {
    if (this.bufferCache.has(url)) return this.bufferCache.get(url)!;
    if (this.loadingPromises.has(url)) return this.loadingPromises.get(url)!;

    const ctx = this.ensureContext();
    if (!ctx) return null;

    const p = fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.arrayBuffer();
      })
      .then((ab) => ctx.decodeAudioData(ab))
      .then((buf) => {
        this.bufferCache.set(url, buf);
        this.loadingPromises.delete(url);
        return buf;
      })
      .catch(() => {
        this.loadingPromises.delete(url);
        return null;
      });

    this.loadingPromises.set(url, p);
    return p;
  }

  async preloadCharacter(charId: CharacterId): Promise<void> {
    const slots: VoiceSlot[] = ['select', 'intro', 'attack1', 'attack2', 'hit', 'win', 'lose', 'special'];
    await Promise.all(slots.map((s) => this.loadBuffer(`/assets/audio/voices/${charId}/${s}.wav`)));
  }

  async playVoice(
    charId: CharacterId,
    slot: VoiceSlot,
    channelKey = 'global'
  ): Promise<void> {
    const ctx = this.ensureContext();
    if (!ctx || !this.voiceGain) return;
    if (this.settings.masterMuted || this.settings.voiceMuted) return;

    const nowMs = performance.now();
    const isSpecial = slot === 'special';

    // Prevent normal attack/hit grunts from interrupting an active Special voice line
    if (!isSpecial && nowMs < this.specialLockUntilMs) {
      return;
    }

    const url = `/assets/audio/voices/${charId}/${slot}.wav`;
    const buf = await this.loadBuffer(url);
    if (!buf) return;

    // Stop prior voice on this channel key to prevent overlapping voices
    const prev = this.activeVoices.get(channelKey);
    if (prev) {
      try {
        prev.source.stop();
      } catch {
        // already stopped
      }
      this.activeVoices.delete(channelKey);
    }

    if (isSpecial) {
      // Stop any competing non-special voices and duck BGM dramatically
      for (const [key, v] of this.activeVoices.entries()) {
        if (!v.isSpecial) {
          try {
            v.source.stop();
          } catch {
            // ignore
          }
          this.activeVoices.delete(key);
        }
      }
      this.specialLockUntilMs = nowMs + Math.min(2600, buf.duration * 1000);
      this.duckBgm(buf.duration);
    }

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.voiceGain);
    this.activeVoices.set(channelKey, { source: src, isSpecial });
    src.onended = () => {
      const cur = this.activeVoices.get(channelKey);
      if (cur?.source === src) {
        this.activeVoices.delete(channelKey);
      }
    };
    src.start(0);
  }

  private duckBgm(durationSec: number): void {
    if (!this.ctx || !this.bgmGain || this.settings.bgmMuted) return;
    const now = this.ctx.currentTime;
    const target = this.settings.bgmVolume;
    this.bgmGain.gain.cancelScheduledValues(now);
    this.bgmGain.gain.setTargetAtTime(target * 0.25, now, 0.04);
    this.bgmGain.gain.setTargetAtTime(target, now + Math.min(2.8, durationSec), 0.25);
  }

  async playSfx(
    name: 'punch' | 'kick' | 'crit' | 'block' | 'grab' | 'ko' | 'countdown' | 'fight' | 'ui_click'
  ): Promise<void> {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;
    if (this.settings.masterMuted || this.settings.sfxMuted) return;

    const nowMs = performance.now();
    const last = this.lastSfxTime.get(name) ?? 0;
    if (nowMs - last < 45) return;
    this.lastSfxTime.set(name, nowMs);

    const buf = await this.loadBuffer(`/assets/audio/sfx/${name}.wav`);
    if (!buf) return;

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.sfxGain);
    src.start(0);
  }

  async playBgm(track: 'bgm_menu' | 'bgm_fight' | 'bgm_boss'): Promise<void> {
    const ctx = this.ensureContext();
    if (!ctx || !this.bgmGain) return;
    if (this.activeBgm?.track === track) return;

    this.stopBgm();
    const buf = await this.loadBuffer(`/assets/audio/bgm/${track}.wav`);
    if (!buf) return;

    // Re-check if another BGM started while loading
    if (this.activeBgm) this.stopBgm();

    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.connect(this.bgmGain);
    src.start(0);
    this.activeBgm = { track, source: src };
  }

  stopBgm(): void {
    if (this.activeBgm) {
      try {
        this.activeBgm.source.stop();
      } catch {
        // ignore
      }
      this.activeBgm = null;
    }
  }
}

export const AudioManager = new AudioManagerImpl();
