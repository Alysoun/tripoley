import { ANTE_PER_SECTION } from './constants';
import { ANTE_SECTION_COUNT } from './antes';
import type { GameState } from './types';
import { inGamePlayers } from './playerStatus';

/** Round cap — long tables auto-enter sudden death. */
export const SUDDEN_DEATH_ROUND_CAP = 150;
/** Consecutive heads-up rounds before sudden death. */
export const SUDDEN_DEATH_TWO_PLAYER_STREAK = 20;
/** Board ante multiplier once sudden death is active. */
export const SUDDEN_DEATH_ANTE_MULTIPLIER = 2;
/** Extra bleed when only two players remain during sudden death. */
export const SUDDEN_DEATH_HEADS_UP_ANTE_MULTIPLIER = 3;

export type SuddenDeathReason = 'roundCap' | 'twoPlayerStalemate';

export interface SuddenDeathState {
  active: boolean;
  triggeredAtRound: number;
  reason: SuddenDeathReason;
  roundsSinceTrigger: number;
}

export function updateTwoPlayerStreak(state: GameState): number {
  if (inGamePlayers(state).length === 2) {
    return (state.twoPlayerStreak ?? 0) + 1;
  }
  return 0;
}

export function suddenDeathTriggerReason(
  nextRoundNumber: number,
  twoPlayerStreak: number
): SuddenDeathReason | null {
  if (nextRoundNumber >= SUDDEN_DEATH_ROUND_CAP) return 'roundCap';
  if (twoPlayerStreak >= SUDDEN_DEATH_TWO_PLAYER_STREAK) return 'twoPlayerStalemate';
  return null;
}

export function suddenDeathTriggerMessage(reason: SuddenDeathReason): string {
  if (reason === 'roundCap') {
    return `Sudden Death! Round ${SUDDEN_DEATH_ROUND_CAP} reached — antes are ${SUDDEN_DEATH_ANTE_MULTIPLIER}× and heads-up poker is all-in until someone wins.`;
  }
  return `Sudden Death! ${SUDDEN_DEATH_TWO_PLAYER_STREAK} consecutive heads-up rounds — antes are ${SUDDEN_DEATH_ANTE_MULTIPLIER}× and poker is all-in until someone wins.`;
}

export function antePerSectionForRound(state: GameState, activeCount: number): number {
  if (!state.suddenDeath?.active) return ANTE_PER_SECTION;
  const mult =
    activeCount === 2 ? SUDDEN_DEATH_HEADS_UP_ANTE_MULTIPLIER : SUDDEN_DEATH_ANTE_MULTIPLIER;
  return ANTE_PER_SECTION * mult;
}

export function fullAnteTotalForRound(state: GameState, activeCount: number): number {
  return antePerSectionForRound(state, activeCount) * ANTE_SECTION_COUNT;
}

export function shouldForceAllInPoker(state: GameState): boolean {
  return !!state.suddenDeath?.active && inGamePlayers(state).length === 2;
}

export function activateSuddenDeath(
  reason: SuddenDeathReason,
  roundNumber: number
): SuddenDeathState {
  return {
    active: true,
    triggeredAtRound: roundNumber,
    reason,
    roundsSinceTrigger: 0,
  };
}

export function advanceSuddenDeathRound(
  suddenDeath: SuddenDeathState | undefined
): SuddenDeathState | undefined {
  if (!suddenDeath?.active) return suddenDeath;
  return { ...suddenDeath, roundsSinceTrigger: suddenDeath.roundsSinceTrigger + 1 };
}

/** Apply sudden-death bookkeeping when starting a new round. */
export function planRoundTransition(state: GameState): {
  twoPlayerStreak: number;
  suddenDeath: SuddenDeathState | undefined;
  suddenDeathActivated: boolean;
  suddenDeathReason: SuddenDeathReason | null;
} {
  const twoPlayerStreak = updateTwoPlayerStreak(state);
  const nextRoundNumber = state.roundNumber + 1;
  let suddenDeath = advanceSuddenDeathRound(state.suddenDeath);
  let suddenDeathActivated = false;
  let reason: SuddenDeathReason | null = null;

  if (!suddenDeath?.active) {
    reason = suddenDeathTriggerReason(nextRoundNumber, twoPlayerStreak);
    if (reason) {
      suddenDeath = activateSuddenDeath(reason, nextRoundNumber);
      suddenDeathActivated = true;
    }
  }

  return {
    twoPlayerStreak,
    suddenDeath,
    suddenDeathActivated,
    suddenDeathReason: suddenDeathActivated ? reason : null,
  };
}
