import type { HouseRulesPreset } from './game/engine/houseRules';

/** Optional auto-start from the setup screen (dev only). */
export interface DebugAutoStart {
  enabled: boolean;
  playerCount: number;
  /** Seat indices (0-based) that are human; rest are AI. */
  humanSeats: number[];
  houseRulesPreset?: Exclude<HouseRulesPreset, 'custom'>;
}

/**
 * Local dev overrides — edit `src/debug.ts` (gitignored; copy from debug.example.ts).
 * Mutable at runtime via `window.__TRIPOLEY_DEBUG__` in the browser console.
 */
export interface DebugConfig {
  /** Master switch — overrides only apply when true and `import.meta.env.DEV`. */
  enabled: boolean;
  /** null = use engine default (200). Applies on next START_GAME / new round deal. */
  startingChips: number | null;
  /** null = use 15s player action timer. */
  playerActionTurnMs: number | null;
  /** null = use 700ms AI turn delay in useAITurn. */
  aiTurnDelayMs: number | null;
  /** Log every dispatch to the console. */
  logActions: boolean;
  /** Skip chip/card fly animations. */
  skipAnimations: boolean;
  autoStart: DebugAutoStart | null;
}

declare global {
  interface Window {
    __TRIPOLEY_DEBUG__?: DebugConfig;
  }
}

export {};
