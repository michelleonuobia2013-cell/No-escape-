import type { SettingsConfig } from '../game/types';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicTimer: number | null = null;
  private droneOsc1: OscillatorNode | null = null;
  private droneOsc2: OscillatorNode | null = null;
  private settings: SettingsConfig = {
    soundVolume: 75,
    musicVolume: 55,
    muted: false,
    graphicsQuality: 'high',
    language: 'en',
    cameraSensitivity: 1,
    invertY: false,
    touchControls: 'auto',
  };
  private noteStep = 0;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      try {
        this.ctx = new AudioCtx();
        this.sfxGain = this.ctx.createGain();
        this.musicGain = this.ctx.createGain();
        this.sfxGain.connect(this.ctx.destination);
        this.musicGain.connect(this.ctx.destination);
        this.applyVolumes();
      } catch {
        return null;
      }
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public unlockAndStartMusic() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (!this.droneOsc1) {
      this.startAmbientMusic();
    }
  }

  public updateSettings(next: SettingsConfig) {
    this.settings = next;
    this.applyVolumes();
  }

  private applyVolumes() {
    if (!this.ctx || !this.sfxGain || !this.musicGain) return;
    const now = this.ctx.currentTime;
    const sfxLevel = this.settings.muted ? 0 : (this.settings.soundVolume / 100) * 0.35;
    const musicLevel = this.settings.muted ? 0 : (this.settings.musicVolume / 100) * 0.16;
    this.sfxGain.gain.setTargetAtTime(sfxLevel, now, 0.05);
    this.musicGain.gain.setTargetAtTime(musicLevel, now, 0.08);
  }

  private startAmbientMusic() {
    const ctx = this.ensureContext();
    if (!ctx || !this.musicGain) return;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    filter.connect(this.musicGain);

    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = 65.41; // C2 dark drone

    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = 98.0; // G2 fifth

    const droneSub = ctx.createGain();
    droneSub.gain.value = 0.45;
    osc1.connect(droneSub);
    osc2.connect(droneSub);
    droneSub.connect(filter);

    osc1.start();
    osc2.start();
    this.droneOsc1 = osc1;
    this.droneOsc2 = osc2;

    // Mysterious minor-9th arpeggio notes in Hz
    const motif = [261.63, 311.13, 392.0, 493.88, 587.33, 392.0, 311.13, 246.94];
    this.musicTimer = window.setInterval(() => {
      if (!this.ctx || !this.musicGain || this.ctx.state !== 'running') return;
      if (this.settings.muted || this.settings.musicVolume <= 1) return;

      const freq = motif[this.noteStep % motif.length];
      this.noteStep += 1;

      const t = this.ctx.currentTime;
      const bell = this.ctx.createOscillator();
      const env = this.ctx.createGain();
      bell.type = 'sine';
      bell.frequency.setValueAtTime(freq, t);

      env.gain.setValueAtTime(0.0001, t);
      env.gain.exponentialRampToValueAtTime(0.28, t + 0.06);
      env.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);

      bell.connect(env);
      env.connect(this.musicGain);
      bell.start(t);
      bell.stop(t + 2.5);
    }, 1850);
  }

  private playTone(
    freq: number,
    duration = 0.14,
    type: OscillatorType = 'sine',
    gainPeak = 0.25,
    slideTo?: number,
  ) {
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain || this.settings.muted || this.settings.soundVolume <= 0) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(slideTo, t + duration);
    }
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gainPeak, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }

  public playClick() {
    this.unlockAndStartMusic();
    this.playTone(520, 0.08, 'triangle', 0.2, 680);
  }

  public playToggle(on: boolean) {
    this.unlockAndStartMusic();
    this.playTone(on ? 440 : 330, 0.11, 'sine', 0.22, on ? 660 : 240);
  }

  public playPuzzleStep() {
    this.unlockAndStartMusic();
    this.playTone(400 + Math.random() * 80, 0.07, 'triangle', 0.18, 480);
  }

  public playClueFound() {
    this.unlockAndStartMusic();
    this.playTone(523.25, 0.18, 'sine', 0.26);
    setTimeout(() => this.playTone(659.25, 0.22, 'sine', 0.24), 90);
    setTimeout(() => this.playTone(783.99, 0.35, 'triangle', 0.2), 180);
  }

  public playPuzzleSolved() {
    this.unlockAndStartMusic();
    const notes = [392.0, 493.88, 587.33, 783.99];
    notes.forEach((n, idx) => {
      setTimeout(() => this.playTone(n, 0.34, 'triangle', 0.26), idx * 105);
    });
  }

  public playPuzzleError() {
    this.unlockAndStartMusic();
    this.playTone(170, 0.22, 'sawtooth', 0.16, 120);
  }

  public playFootstep() {
    if (this.settings.muted || this.settings.soundVolume <= 0) return;
    const pitch = 95 + Math.random() * 25;
    this.playTone(pitch, 0.055, 'sine', 0.08, 60);
  }

  public dispose() {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    this.droneOsc1?.stop();
    this.droneOsc2?.stop();
    this.ctx?.close().catch(() => {});
  }
}

export const soundEngine = new SoundEngine();
