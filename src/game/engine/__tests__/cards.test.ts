import { describe, expect, it } from 'vitest';
import { dealHands, createDeck } from '../cards';
import { mockRandom } from './helpers/rng';

describe('cards and dealing', () => {
  it('builds a full 52-card deck', () => {
    const restore = mockRandom(1);
    const deck = createDeck();
    restore();
    expect(deck).toHaveLength(52);
    expect(new Set(deck.map((c) => c.id)).size).toBe(52);
  });

  it('deals every card exactly once across hands and dead hand', () => {
    const restore = mockRandom(42);
    const { players, deadHand } = dealHands(4, 0);
    restore();

    const all = [...deadHand, ...players.flat()];
    expect(all).toHaveLength(52);
    expect(new Set(all.map((c) => c.id)).size).toBe(52);
  });

  it('gives extra cards to seats left of dealer when remainder exists', () => {
    const restore = mockRandom(7);
    const { players, deadHand } = dealHands(9, 0);
    restore();

    expect(deadHand.length).toBeGreaterThan(0);
    expect(players.reduce((n, hand) => n + hand.length, 0) + deadHand.length).toBe(52);
  });
});
