import { describe, expect, it } from 'vitest';
import {
  ANTE_SECTION_COUNT,
  distributePlayerAnte,
  FULL_ANTE_TOTAL,
} from '../antes';
import { gameReducer, initialGameState } from '../reducer';
import { totalChipsInSystem } from './helpers/simulate';
import type { SeatConfig } from '../types';

describe('short-stack antes', () => {
  it('distributes only chips the player can afford', () => {
    const { sections, chipsSpent } = distributePlayerAnte(5);
    expect(chipsSpent).toBe(5);
    expect(sections).toHaveLength(5);
    expect(sections[0]).toBe('aceHearts');
    expect(sections[4]).toBe('tenHearts');
    expect(sections).not.toContain('kitty');
  });

  it('does not inflate chip supply when a player is short on antes', () => {
    const seats: SeatConfig[] = Array.from({ length: 4 }, () => ({ isHuman: false }));
    let state = gameReducer(initialGameState, {
      type: 'START_GAME',
      seats,
      houseRules: { ...initialGameState.houseRules, preset: 'official' },
    });
    const brokeId = 2;
    const before = state.players.find((p) => p.id === brokeId)!;
    const trim = before.chips - 5;
    state = {
      ...state,
      players: state.players.map((p) =>
        p.id === brokeId ? { ...p, chips: 5 } : p
      ),
      pot: { ...state.pot, kitty: state.pot.kitty + trim },
    };
    const totalBeforeRound = totalChipsInSystem(state);
    state = gameReducer(state, { type: 'START_NEW_ROUND' });
    const broke = state.players.find((p) => p.id === brokeId)!;
    expect(broke.chips).toBe(0);
    expect(broke.anteSections).toHaveLength(5);
    expect(totalChipsInSystem(state)).toBe(totalBeforeRound);
  });

  it('full stack antes all sections', () => {
    const { sections, chipsSpent } = distributePlayerAnte(200);
    expect(chipsSpent).toBe(FULL_ANTE_TOTAL);
    expect(sections).toHaveLength(ANTE_SECTION_COUNT);
  });
});
