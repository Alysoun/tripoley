import { describe, expect, it } from 'vitest';
import { createMichiganState, getLegalMichiganPlays, validateMichiganPlay } from '../michigan';
import { createCard } from '../cards';

describe('michigan rules', () => {
  it('requires lowest black card on opening lead', () => {
    const michigan = createMichiganState();
    const hand = [createCard('clubs', '3'), createCard('hearts', '2')];
    const legal = getLegalMichiganPlays(hand, michigan, 0, 0);
    expect(legal).toHaveLength(1);
    expect(legal[0].suit).toBe('clubs');
    expect(legal[0].value).toBe('3');
  });

  it('accepts only the next card in sequence when following', () => {
    const michigan = {
      ...createMichiganState(),
      mode: 'follow' as const,
      activeSuit: 'hearts' as const,
      nextValue: 'Q' as const,
      lastPlayerId: 1,
    };
    const hand = [createCard('hearts', 'Q'), createCard('hearts', 'K'), createCard('spades', '2')];
    const legal = getLegalMichiganPlays(hand, michigan, 2, 2);
    expect(legal).toHaveLength(1);
    expect(legal[0].value).toBe('Q');
  });

  it('rejects illegal plays', () => {
    const michigan = createMichiganState();
    const hand = [createCard('hearts', '2'), createCard('clubs', '5')];
    expect(
      validateMichiganPlay(hand, createCard('hearts', '2'), michigan, 0, 0)
    ).toBe(false);
    expect(
      validateMichiganPlay(hand, createCard('clubs', '5'), michigan, 0, 0)
    ).toBe(true);
  });
});
