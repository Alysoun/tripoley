import { describe, expect, it } from 'vitest';
import { gameReducer, initialGameState, repairLoadedGameSession } from '../reducer';
import { OFFICIAL_HOUSE_RULES } from '../houseRules';
import type { SeatConfig } from '../../../types/GameTypes';

const aiSeats = (): SeatConfig[] =>
  Array.from({ length: 4 }, () => ({ isHuman: false }));

describe('dealer blind choice when dealer is busted', () => {
  it('skips blind choice after short-stack antes zero the dealer', () => {
    let state = gameReducer(initialGameState, {
      type: 'START_GAME',
      seats: aiSeats(),
      houseRules: { ...OFFICIAL_HOUSE_RULES },
    });

    state = {
      ...state,
      players: state.players.map((p, i) =>
        i === 1 ? { ...p, chips: 5 } : { ...p, chips: 200 }
      ),
      dealerId: 0,
    };

    state = gameReducer(state, { type: 'START_NEW_ROUND' });

    expect(state.phase).not.toBe('dealerBlindChoice');
    expect(state.log.some((e) => e.message.includes('skipping dealer blind choice'))).toBe(
      true
    );
  });

  it('repairs a soft-locked saved session on load', () => {
    let state = gameReducer(initialGameState, {
      type: 'START_GAME',
      seats: aiSeats(),
      houseRules: { ...OFFICIAL_HOUSE_RULES },
    });
    state = gameReducer(state, { type: 'START_NEW_ROUND' });
    const stuck = {
      ...state,
      phase: 'dealerBlindChoice' as const,
      players: state.players.map((p, i) => (i === 1 ? { ...p, chips: 0 } : p)),
      dealerId: 1,
      currentPlayer: 0,
    };
    const repaired = repairLoadedGameSession(stuck);
    expect(repaired.phase).not.toBe('dealerBlindChoice');
  });
});
