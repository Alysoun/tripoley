import { describe, expect, it } from 'vitest';
import { createCard } from '../cards';
import { comparePokerHands, evaluateBestPokerHand } from '../poker';

const c = (suit: 'hearts' | 'diamonds' | 'clubs' | 'spades', value: string) =>
  createCard(suit, value as 'A');

describe('poker hand evaluation', () => {
  it('recognizes a wheel straight (A-2-3-4-5)', () => {
    const wheel = [
      c('hearts', 'A'),
      c('clubs', '2'),
      c('diamonds', '3'),
      c('spades', '4'),
      c('hearts', '5'),
      c('clubs', '9'),
      c('diamonds', 'K'),
    ];
    const result = evaluateBestPokerHand(wheel);
    expect(result.rank).toBe('straight');
  });

  it('ranks full house above flush', () => {
    const fullHouse = evaluateBestPokerHand([
      c('hearts', 'K'),
      c('diamonds', 'K'),
      c('clubs', 'K'),
      c('spades', '2'),
      c('hearts', '2'),
    ]);
    const flush = evaluateBestPokerHand([
      c('hearts', 'A'),
      c('hearts', 'J'),
      c('hearts', '9'),
      c('hearts', '5'),
      c('hearts', '2'),
    ]);
    expect(comparePokerHands(fullHouse, flush)).toBeGreaterThan(0);
  });

  it('breaks ties by kicker values', () => {
    const pairAcesKing = evaluateBestPokerHand([
      c('hearts', 'A'),
      c('diamonds', 'A'),
      c('clubs', 'K'),
      c('spades', '5'),
      c('hearts', '3'),
    ]);
    const pairAcesQueen = evaluateBestPokerHand([
      c('hearts', 'A'),
      c('diamonds', 'A'),
      c('clubs', 'Q'),
      c('spades', '5'),
      c('hearts', '3'),
    ]);
    expect(comparePokerHands(pairAcesKing, pairAcesQueen)).toBeGreaterThan(0);
  });

  it('labels hands with rank detail for transparency', () => {
    expect(
      evaluateBestPokerHand([
        c('hearts', 'K'),
        c('diamonds', 'K'),
        c('clubs', '5'),
        c('spades', '3'),
        c('hearts', '2'),
      ]).label
    ).toBe('Pair of Kings');

    expect(
      evaluateBestPokerHand([
        c('hearts', 'K'),
        c('diamonds', 'K'),
        c('clubs', '9'),
        c('spades', '9'),
        c('hearts', '2'),
      ]).label
    ).toBe('Two pair, Kings and Nines');

    expect(
      evaluateBestPokerHand([
        c('hearts', 'K'),
        c('diamonds', 'K'),
        c('clubs', 'K'),
        c('spades', '2'),
        c('hearts', '2'),
      ]).label
    ).toBe('Kings full of Twos');

    expect(
      evaluateBestPokerHand([
        c('hearts', 'A'),
        c('hearts', 'K'),
        c('hearts', 'Q'),
        c('hearts', 'J'),
        c('hearts', '9'),
      ]).label
    ).toBe('Flush, ace high');
  });

  it('is antisymmetric for unequal hands', () => {
    const strong = evaluateBestPokerHand([
      c('hearts', 'A'),
      c('diamonds', 'A'),
      c('clubs', 'A'),
      c('spades', 'K'),
      c('hearts', 'Q'),
    ]);
    const weak = evaluateBestPokerHand([
      c('hearts', '2'),
      c('diamonds', '4'),
      c('clubs', '6'),
      c('spades', '8'),
      c('hearts', '9'),
    ]);
    expect(comparePokerHands(strong, weak)).toBeGreaterThan(0);
    expect(comparePokerHands(weak, strong)).toBeLessThan(0);
    expect(comparePokerHands(strong, strong)).toBe(0);
  });
});
