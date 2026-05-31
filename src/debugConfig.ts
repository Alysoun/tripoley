import type { DebugConfig } from './debug.types';
import type { GameState } from './types/GameTypes';
import { spectatorAiDelayMs, shouldSpectatorSkipAnimations } from './game/spectatorMode';

const DEFAULT_DEBUG: DebugConfig = {
  enabled: false,
  startingChips: null,
  playerActionTurnMs: null,
  aiTurnDelayMs: null,
  logActions: false,
  skipAnimations: false,
  autoStart: null,
};

/** Loads optional gitignored `./debug.ts` when present (see debug.example.ts). */
const localModules = import.meta.glob<{ DEBUG: Partial<DebugConfig> }>('./debug.ts', {
  eager: true,
});

function mergeDebug(base: DebugConfig, patch: Partial<DebugConfig>): DebugConfig {
  return {
    ...base,
    ...patch,
    autoStart: patch.autoStart === undefined ? base.autoStart : patch.autoStart,
  };
}

/** Live object — safe to mutate in the devtools console between rounds. */
export const DEBUG: DebugConfig = mergeDebug(
  DEFAULT_DEBUG,
  localModules['./debug.ts']?.DEBUG ?? {}
);

export function isDebugActive(): boolean {
  return import.meta.env.DEV && DEBUG.enabled;
}

export function debugStartingChips(fallback: number): number {
  if (!isDebugActive() || DEBUG.startingChips == null) return fallback;
  return DEBUG.startingChips;
}

export function debugPlayerActionTurnMs(fallback: number): number {
  if (!isDebugActive() || DEBUG.playerActionTurnMs == null) return fallback;
  return DEBUG.playerActionTurnMs;
}

export function debugAiTurnDelayMs(fallback: number, state?: GameState): number {
  if (state) {
    const spec = spectatorAiDelayMs(state);
    if (spec != null) return spec;
  }
  if (!isDebugActive() || DEBUG.aiTurnDelayMs == null) return fallback;
  return DEBUG.aiTurnDelayMs;
}

export function debugSkipAnimations(state?: GameState): boolean {
  if (state && shouldSpectatorSkipAnimations(state)) return true;
  return isDebugActive() && DEBUG.skipAnimations;
}

export function debugLogActions(): boolean {
  return isDebugActive() && DEBUG.logActions;
}

if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.__TRIPOLEY_DEBUG__ = DEBUG;
}
