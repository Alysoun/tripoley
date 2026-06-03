/**
 * Fast pre-release smoke — core loop, persistence, storage, and UI hooks.
 * Run: npm run smoke
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  gameReducer,
  initialGameState,
  rulesFromPreset,
  STARTING_CHIPS,
  getAIAction,
  pulsePotSection,
  configurePlayfield,
  defaultHouseRules,
  mergeHouseRules,
} from '@playfield/core';
import {
  loadStoredHouseRules,
  saveHouseRules,
  loadStoredAiPokerSettings,
  saveStoredAiPokerSettings,
} from '@playfield/core/storage';
import { syncPlayfieldFromDebug } from '../../playfieldClient';
import {
  clearGameSession,
  loadGameSession,
  saveGameSession,
} from '../sessionStorage';
import {
  applyAchievementTransition,
  createAchievementSessionTracking,
} from '../achievements/trackAchievements';
import { defaultSaveData } from '../achievements/storage';

const SEATS = [
  { isHuman: true, name: 'You' },
  { isHuman: false },
  { isHuman: false },
  { isHuman: false },
];

function chipTotal(state: ReturnType<typeof gameReducer>): number {
  const pot = Object.values(state.pot).reduce((n, v) => n + v, 0);
  const players = state.players.reduce((n, p) => n + p.chips, 0);
  return pot + players;
}

describe('release smoke', () => {
  it('loads @playfield/core and syncs playfield config', () => {
    expect(() => syncPlayfieldFromDebug()).not.toThrow();
    expect(initialGameState.phase).toBe('setup');
  });

  it('starts a table and conserves chips', () => {
    const state = gameReducer(initialGameState, {
      type: 'START_GAME',
      seats: SEATS,
      houseRules: rulesFromPreset('official'),
    });
    expect(state.players).toHaveLength(4);
    expect(state.phase).not.toBe('setup');
    expect(chipTotal(state)).toBe(4 * STARTING_CHIPS);
  });

  it('returns an AI action when it is an AI turn', () => {
    const state = gameReducer(initialGameState, {
      type: 'START_GAME',
      seats: Array.from({ length: 4 }, () => ({ isHuman: false })),
      houseRules: rulesFromPreset('homeTable'),
    });
    const actor = state.players[state.currentPlayer];
    expect(actor?.isHuman).toBe(false);
    const action = getAIAction(state);
    expect(action).not.toBeNull();
    expect(action!.type).toBeTruthy();
  });

  it('persists house rules and AI poker settings in localStorage', () => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k),
    });
    try {
      const custom = mergeHouseRules(defaultHouseRules(), { payCardsOnMichiganPlay: false });
      saveHouseRules(custom);
      expect(loadStoredHouseRules().payCardsOnMichiganPlay).toBe(false);
      saveStoredAiPokerSettings({ mode: 'manual', bySeat: { 1: 'hard' } });
      expect(loadStoredAiPokerSettings().bySeat[1]).toBe('hard');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('round-trips session storage for an active game', () => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k),
    });
    try {
      const live = gameReducer(initialGameState, {
        type: 'START_GAME',
        seats: SEATS,
        houseRules: rulesFromPreset('official'),
      });
      saveGameSession(live);
      const loaded = loadGameSession();
      expect(loaded?.players).toHaveLength(4);
      clearGameSession();
      expect(loadGameSession()).toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('invokes onPotPulse when a pot section pulses', () => {
    const heard: string[] = [];
    configurePlayfield({ onPotPulse: (section) => heard.push(section) });
    pulsePotSection('kitty');
    expect(heard).toContain('kitty');
  });

  it('achievement tracking accepts a solo session transition', () => {
    const state = gameReducer(initialGameState, {
      type: 'START_GAME',
      seats: SEATS,
      houseRules: rulesFromPreset('official'),
    });
    const solo = { ...state, isSoloSession: true };
    const result = applyAchievementTransition(solo, solo, {
      data: defaultSaveData(),
      session: createAchievementSessionTracking(),
      timerSnapshotMs: null,
    });
    expect(result).not.toBeNull();
  });
});
