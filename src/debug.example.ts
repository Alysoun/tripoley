/**
 * Copy this file to `src/debug.ts` (gitignored) and tweak values for local dev.
 *
 *   copy src\debug.example.ts src\debug.ts
 *
 * Reload after edits. Chip/timer values apply on the next deal or new round.
 * In the browser console you can also mutate live:
 *   __TRIPOLEY_DEBUG__.startingChips = 999
 */
import type { DebugConfig } from './debug.types';

export const DEBUG: DebugConfig = {
  enabled: true,

  startingChips: null,
  playerActionTurnMs: null,
  aiTurnDelayMs: null,
  logActions: false,
  skipAnimations: false,

  autoStart: null,
  // autoStart: {
  //   enabled: true,
  //   playerCount: 4,
  //   humanSeats: [0],
  //   houseRulesPreset: 'homeTable',
  // },
};
