import { describe, expect, it } from 'vitest';
import {
  buildStandard52Deck,
  createDeck,
  rankValue,
  removeCard,
  createCard,
} from '../standard52';
import { mockRandom } from '../../games/tripoley/__tests__/helpers/rng';

describe('standard52 deck', () => {
  it('builds an ordered 52-card deck', () => {
    const deck = buildStandard52Deck();
    expect(deck).toHaveLength(52);
    expect(new Set(deck.map((c) => c.id)).size).toBe(52);
  });

  it('shuffles into a full deck', () => {
    const restore = mockRandom(1);
    const deck = createDeck();
    restore();
    expect(deck).toHaveLength(52);
    expect(new Set(deck.map((c) => c.id)).size).toBe(52);
  });

  it('orders ranks for comparisons', () => {
    expect(rankValue('2')).toBeLessThan(rankValue('A'));
  });

  it('removes a card by id', () => {
    const card = createCard('hearts', 'A');
    const hand = [card, createCard('spades', 'K')];
    expect(removeCard(hand, card)).toHaveLength(1);
  });
});
