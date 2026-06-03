import type { PotSectionKey } from './games/tripoley/types';

export interface PlayfieldConfig {
  /** Override default starting chip count (Tripoley). */
  startingChips?: number;
  /** Solo human action timer duration in ms. */
  playerActionTurnMs?: number;
  /** Optional host hook when a pot section should pulse in the UI. */
  onPotPulse?: (section: PotSectionKey) => void;
}

let config: PlayfieldConfig = {};

export function configurePlayfield(patch: PlayfieldConfig): void {
  config = { ...config, ...patch };
}

export function getPlayfieldConfig(): Readonly<PlayfieldConfig> {
  return config;
}

export function playfieldStartingChips(fallback: number): number {
  return config.startingChips ?? fallback;
}

export function playfieldPlayerActionTurnMs(fallback: number): number {
  return config.playerActionTurnMs ?? fallback;
}

export function playfieldPotPulse(section: PotSectionKey): void {
  config.onPotPulse?.(section);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('playfield-pot-pulse', { detail: { section } }));
  }
}
