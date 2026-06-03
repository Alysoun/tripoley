import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  gameReducer,
  initialGameState,
  rulesFromPreset,
  STARTING_CHIPS,
  repairLoadedGameSession,
  MIN_PLAYERS,
} from '@playfield/core';
import {
  clearGameSession,
  loadGameSession,
  saveGameSession,
} from '../sessionStorage';

function totalChips(state: ReturnType<typeof gameReducer>): number {
  const inPot = Object.values(state.pot).reduce((sum, n) => sum + n, 0);
  const inPlayers = state.players.reduce((sum, p) => sum + p.chips, 0);
  return inPot + inPlayers;
}

describe('@playfield/core integration', () => {
  it('starts a game with the expected player count and chip total', () => {
    const state = gameReducer(initialGameState, {
      type: 'START_GAME',
      seats: [
        { isHuman: true, name: 'You' },
        { isHuman: false },
        { isHuman: false },
        { isHuman: false },
      ],
      houseRules: rulesFromPreset('official'),
    });

    expect(state.phase).not.toBe('setup');
    expect(state.players.length).toBeGreaterThanOrEqual(MIN_PLAYERS);
    expect(totalChips(state)).toBe(state.players.length * STARTING_CHIPS);
  });

  it('repairs a stuck dealer-blind snapshot like the app loader', () => {
    let state = gameReducer(initialGameState, {
      type: 'START_GAME',
      seats: Array.from({ length: 4 }, () => ({ isHuman: false })),
      houseRules: rulesFromPreset('official'),
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

describe('session storage + core repair', () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    });
  });

  afterEach(() => {
    clearGameSession();
    vi.unstubAllGlobals();
  });

  it('round-trips an in-progress session', () => {
    const live = gameReducer(initialGameState, {
      type: 'START_GAME',
      seats: [
        { isHuman: true, name: 'You' },
        { isHuman: false },
        { isHuman: false },
        { isHuman: false },
      ],
      houseRules: rulesFromPreset('official'),
    });
    expect(live.players.length).toBeGreaterThan(0);
    saveGameSession(live);
    const loaded = loadGameSession();
    expect(loaded).not.toBeNull();
    expect(loaded!.players).toHaveLength(live.players.length);
    expect(loaded!.phase).toBe(live.phase);
    expect(loaded!.animations).toEqual([]);
  });
});
