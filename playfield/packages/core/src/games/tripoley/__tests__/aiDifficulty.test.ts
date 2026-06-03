import { describe, expect, it } from 'vitest';
import {
  AI_DIFFICULTY_ORDER,
  applyAiDifficultiesToSeats,
  assignAutomaticDifficulties,
} from '../aiDifficulty';
import type { SeatConfig } from '../types';

describe('aiDifficulty', () => {
  it('assigns one tier per AI seat in automatic mode', () => {
    const tiers = assignAutomaticDifficulties(5);
    expect(tiers).toHaveLength(5);
    for (const tier of tiers) {
      expect(AI_DIFFICULTY_ORDER).toContain(tier);
    }
  });

  it('uses manual bySeat settings and omits difficulty on human seats', () => {
    const seats: SeatConfig[] = [
      { isHuman: true, name: 'You' },
      { isHuman: false },
      { isHuman: false },
    ];
    const applied = applyAiDifficultiesToSeats(seats, {
      mode: 'manual',
      bySeat: { 1: 'hard', 2: 'easy' },
    });
    expect(applied[0].aiDifficulty).toBeUndefined();
    expect(applied[1].aiDifficulty).toBe('hard');
    expect(applied[2].aiDifficulty).toBe('easy');
  });

  it('reshuffles automatic mix across AI seats only', () => {
    const seats: SeatConfig[] = [
      { isHuman: true },
      { isHuman: false },
      { isHuman: false },
    ];
    const applied = applyAiDifficultiesToSeats(seats, { mode: 'automatic', bySeat: {} });
    expect(applied[0].aiDifficulty).toBeUndefined();
    expect(applied[1].aiDifficulty).toBeDefined();
    expect(applied[2].aiDifficulty).toBeDefined();
  });
});
