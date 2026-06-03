import { describe, expect, it } from 'vitest';
import { MIN_PLAYERS, MAX_PLAYERS } from '../constants';
import { OFFICIAL_HOUSE_RULES, HOME_TABLE_HOUSE_RULES } from '../houseRules';
import { getLegalMichiganPlays } from '../michigan';
import { mockRandom, mulberry32 } from './helpers/rng';
import { simulateGame, totalChipsInSystem } from './helpers/simulate';

describe('full-game simulation', () => {
  const ruleSets = [
    { label: 'official', rules: OFFICIAL_HOUSE_RULES },
    { label: 'homeTable', rules: HOME_TABLE_HOUSE_RULES },
  ] as const;

  for (const { label, rules } of ruleSets) {
    for (let playerCount = MIN_PLAYERS; playerCount <= MAX_PLAYERS; playerCount += 1) {
      it(`runs ${playerCount} seats (${label}) for 1 round without getting stuck`, () => {
        const restore = mockRandom(playerCount * 1000 + (label === 'official' ? 1 : 2));
        const result = simulateGame({
          playerCount,
          houseRules: { ...rules },
          maxRounds: 1,
        });
        restore();

        expect(result.stuck, `stuck in ${result.stuckPhase} after ${result.steps} steps`).toBe(
          false
        );
        expect(totalChipsInSystem(result.finalState)).toBe(200 * playerCount);

        if (result.finalState.phase !== 'gameOver') {
          expect(result.roundsCompleted).toBeGreaterThanOrEqual(1);
        }
      });
    }
  }

  it('eventually reaches game over with enough steps (all AI, chips drain)', () => {
    const restore = mockRandom(999);
    const result = simulateGame({
      playerCount: 4,
      houseRules: { ...OFFICIAL_HOUSE_RULES },
      maxSteps: 25_000,
      startingChips: 60,
    });
    restore();

    expect(result.stuck).toBe(false);
    expect(result.finalState.phase).toBe('gameOver');
    expect(result.steps).toBeLessThan(25_000);
  });

  it('plays multiple rounds at 6 players without stuck state', () => {
    const restore = mockRandom(4242);
    const result = simulateGame({
      playerCount: 6,
      houseRules: { ...HOME_TABLE_HOUSE_RULES },
      maxRounds: 3,
    });
    restore();

    expect(result.stuck).toBe(false);
    expect(result.roundsCompleted).toBeGreaterThanOrEqual(3);
  });
});

describe('simulation stress (multiple seeds)', () => {
  it('runs 20 random seeds at 5 players without getting stuck', () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const restore = mockRandom(seed);
      const result = simulateGame({
        playerCount: 5,
        houseRules: { ...OFFICIAL_HOUSE_RULES },
        maxRounds: 1,
      });
      restore();
      expect(result.stuck, `seed ${seed} stuck in ${result.stuckPhase}`).toBe(false);
    }
  });
});

describe('deterministic simulation', () => {
  it('produces identical outcomes for the same seed', () => {
    const restoreA = mockRandom(1234);
    const a = simulateGame({ playerCount: 3, houseRules: OFFICIAL_HOUSE_RULES, maxRounds: 1 });
    restoreA();

    const restoreB = mockRandom(1234);
    const b = simulateGame({ playerCount: 3, houseRules: OFFICIAL_HOUSE_RULES, maxRounds: 1 });
    restoreB();

    expect(a.steps).toBe(b.steps);
    expect(a.finalState.phase).toBe(b.finalState.phase);
    expect(a.finalState.players.map((p) => p.chips)).toEqual(
      b.finalState.players.map((p) => p.chips)
    );
  });
});

describe('michigan legality spot-check', () => {
  it('legal plays are always cards from the player hand', () => {
    const random = mulberry32(88);
    for (let i = 0; i < 50; i += 1) {
      random();
    }
    const restore = mockRandom(88);
    const result = simulateGame({
      playerCount: 4,
      houseRules: HOME_TABLE_HOUSE_RULES,
      maxRounds: 1,
    });
    restore();
    expect(result.stuck).toBe(false);

    for (const p of result.finalState.players) {
      const legal = getLegalMichiganPlays(
        p.cards,
        result.finalState.michigan,
        p.id,
        result.finalState.currentPlayer
      );
      for (const card of legal) {
        expect(p.cards.some((c) => c.id === card.id)).toBe(true);
      }
    }
  });
});
