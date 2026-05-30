export type SoundName =
  | 'cardPlay'
  | 'cardDraw'
  | 'chipMove'
  | 'win'
  | 'lose'
  | 'shuffle'
  | 'error'
  | 'buttonClick';

class SoundManager {
  private static instance: SoundManager;
  private audioContext: AudioContext | null = null;
  private ready = false;
  private enabled = true;
  private retroMode = false;
  private enhancedWin = false;
  private victoryVariant: 'classic' | 'warm' | 'triumph' = 'classic';
  private readonly volume = 0.38;
  private lastChipAt = 0;
  private lastCardAt = 0;

  private constructor() {}

  static getInstance(): SoundManager {
    if (!SoundManager.instance) {
      SoundManager.instance = new SoundManager();
    }
    return SoundManager.instance;
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    return this.audioContext;
  }

  /** Resume Web Audio after a user gesture (click, key, etc.). */
  async unlock(): Promise<boolean> {
    if (typeof window === 'undefined') return false;
    try {
      const ctx = this.getContext();
      if (!ctx) return false;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      this.ready = ctx.state === 'running';
      return this.ready;
    } catch {
      this.ready = false;
      return false;
    }
  }

  isReady(): boolean {
    return this.ready && this.audioContext?.state === 'running';
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setRetroMode(retro: boolean): void {
    this.retroMode = retro;
  }

  setEnhancedWin(enhanced: boolean): void {
    this.enhancedWin = enhanced;
  }

  setVictoryFanfare(variant: 'classic' | 'warm' | 'triumph'): void {
    this.victoryVariant = variant;
  }

  play(soundName: SoundName | string): void {
    if (!this.enabled || !this.isReady()) return;
    switch (soundName as SoundName) {
      case 'cardPlay':
        this.playCardSlap();
        break;
      case 'cardDraw':
        this.playCardDraw();
        break;
      case 'chipMove':
        this.playChipClink();
        break;
      case 'win':
        this.playWin();
        break;
      case 'lose':
        this.playLose();
        break;
      case 'shuffle':
        this.playShuffle();
        break;
      case 'error':
        this.playError();
        break;
      case 'buttonClick':
        this.playButtonClick();
        break;
      default:
        break;
    }
  }

  private tone(
    frequency: number,
    duration: number,
    type: OscillatorType = 'sine',
    gainLevel = this.volume
  ): void {
    const ctx = this.getContext();
    if (!ctx || ctx.state !== 'running') return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    gain.gain.setValueAtTime(gainLevel, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  }

  private noiseBurst(durationSec: number, filterHz: number, gainLevel: number): void {
    const ctx = this.getContext();
    if (!ctx || ctx.state !== 'running') return;

    const sampleCount = Math.floor(ctx.sampleRate * durationSec);
    const buffer = ctx.createBuffer(1, sampleCount, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) {
      const decay = Math.exp(-i / (sampleCount * 0.2));
      data[i] = (Math.random() * 2 - 1) * decay;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterHz;
    filter.Q.value = 0.9;
    const gain = ctx.createGain();
    gain.gain.value = gainLevel;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  }

  private playCardSlap(): void {
    const now = Date.now();
    if (now - this.lastCardAt < 100) return;
    this.lastCardAt = now;
    if (this.retroMode) {
      this.tone(220, 0.04, 'square', this.volume * 0.2);
      window.setTimeout(() => this.tone(110, 0.05, 'square', this.volume * 0.16), 30);
      return;
    }
    this.noiseBurst(0.07, 900, this.volume * 0.55);
    this.tone(110, 0.05, 'sine', this.volume * 0.35);
  }

  private playCardDraw(): void {
    if (this.retroMode) {
      this.tone(440, 0.05, 'square', this.volume * 0.14);
      window.setTimeout(() => this.tone(330, 0.06, 'square', this.volume * 0.12), 40);
      return;
    }
    this.noiseBurst(0.12, 1400, this.volume * 0.22);
    this.tone(420, 0.08, 'triangle', this.volume * 0.12);
  }

  private playChipClink(): void {
    const now = Date.now();
    if (now - this.lastChipAt < 90) return;
    this.lastChipAt = now;
    if (this.retroMode) {
      this.tone(880, 0.04, 'square', this.volume * 0.18);
      window.setTimeout(() => this.tone(660, 0.04, 'square', this.volume * 0.14), 24);
      return;
    }
    this.tone(2100, 0.035, 'triangle', this.volume * 0.22);
    window.setTimeout(() => this.tone(2600, 0.03, 'triangle', this.volume * 0.18), 28);
  }

  private playWin(): void {
    if (this.retroMode) {
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        window.setTimeout(() => this.tone(freq, 0.1, 'square', this.volume * 0.22), i * 70);
      });
      return;
    }
    const steps =
      this.victoryVariant === 'warm'
        ? [392, 493.88, 587.33, 739.99]
        : this.victoryVariant === 'triumph'
          ? [523.25, 659.25, 830.61, 987.77, 1174.66]
          : this.enhancedWin
            ? [523.25, 659.25, 783.99, 987.77, 1046.5, 1318.5]
            : [523.25, 659.25, 783.99, 1046.5];
    steps.forEach((freq, i) => {
      window.setTimeout(() => this.tone(freq, 0.18, 'sine', this.volume * 0.28), i * 85);
    });
  }

  private playLose(): void {
    if (this.retroMode) {
      this.tone(196, 0.12, 'square', this.volume * 0.14);
      window.setTimeout(() => this.tone(147, 0.14, 'square', this.volume * 0.12), 90);
      return;
    }
    this.tone(220, 0.2, 'sawtooth', this.volume * 0.12);
    window.setTimeout(() => this.tone(165, 0.25, 'sawtooth', this.volume * 0.1), 120);
  }

  private playShuffle(): void {
    if (this.retroMode) {
      for (let i = 0; i < 4; i++) {
        window.setTimeout(
          () => this.tone(180 + i * 40, 0.03, 'square', this.volume * 0.12),
          i * 55
        );
      }
      return;
    }
    for (let i = 0; i < 6; i++) {
      window.setTimeout(
        () => this.noiseBurst(0.04, 600 + i * 80, this.volume * 0.2),
        i * 45
      );
    }
  }

  private playError(): void {
    if (this.retroMode) {
      this.tone(120, 0.08, 'square', this.volume * 0.14);
      return;
    }
    this.tone(140, 0.12, 'square', this.volume * 0.15);
    window.setTimeout(() => this.tone(90, 0.15, 'square', this.volume * 0.12), 90);
  }

  private playButtonClick(): void {
    if (this.retroMode) {
      this.tone(660, 0.025, 'square', this.volume * 0.12);
      return;
    }
    this.tone(880, 0.025, 'sine', this.volume * 0.15);
  }
}

export const soundManager = SoundManager.getInstance();

function installAudioUnlockListeners(): void {
  if (typeof window === 'undefined') return;

  const unlockFromGesture = () => {
    void soundManager.unlock();
  };

  window.addEventListener('pointerdown', unlockFromGesture, { once: true, passive: true });
  window.addEventListener('keydown', unlockFromGesture, { once: true });
}

installAudioUnlockListeners();

/** Map a new game-log line to an appropriate sound. */
export function soundForLogMessage(message: string, type: 'info' | 'success' | 'error'): SoundName | null {
  const msg = message.toLowerCase();

  if (msg.startsWith('poker:')) return null;
  if (msg.includes('empties their hand') || msg.includes('wins the kitty')) return null;

  if (msg.includes(' play ') || msg.includes(' plays ')) return null;
  if (msg.includes(' folds')) return 'lose';
  if (msg.includes('checks') || msg.includes(' passes')) return 'buttonClick';
  if (
    msg.includes(' bids ') ||
    msg.includes(' antes ') ||
    msg.includes(' pays ') ||
    msg.includes(' bets ') ||
    msg.includes(' wins blind') ||
    msg.includes(' chip(s) for remaining') ||
    msg.includes(' claimed')
  ) {
    return null;
  }
  if (msg.includes(' deals') || (msg.includes('round ') && msg.includes(' — '))) return 'shuffle';
  if (type === 'error') return 'error';

  return null;
}

export function soundForAnnouncement(title: string): SoundName {
  if (title.toLowerCase().includes('poker')) return 'win';
  if (title.toLowerCase().includes('michigan')) return 'win';
  if (title.toLowerCase().includes('pay cards')) return 'chipMove';
  return 'buttonClick';
}
