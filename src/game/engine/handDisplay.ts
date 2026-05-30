import { Card, Suit } from '../../types/GameTypes';
import { rankValue } from './cards';
import { evaluateBestPokerHand } from './poker';

/** Black suits first, then red — ascending rank within each suit (Michigan-friendly). */
const MICHIGAN_SUIT_ORDER: Suit[] = ['spades', 'clubs', 'hearts', 'diamonds'];

export function sortForMichiganHand(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => {
    const suitDiff =
      MICHIGAN_SUIT_ORDER.indexOf(a.suit) - MICHIGAN_SUIT_ORDER.indexOf(b.suit);
    if (suitDiff !== 0) return suitDiff;
    return rankValue(a.value) - rankValue(b.value);
  });
}

export interface PokerHandDisplay {
  cards: Card[];
  bestFiveIds: Set<string>;
  label: string;
}

/** Best five first (left of fan), remainder sorted high-to-low; highlights best poker hand. */
export function arrangeForPokerDisplay(cards: Card[]): PokerHandDisplay {
  if (cards.length === 0) {
    return { cards: [], bestFiveIds: new Set(), label: '' };
  }

  const result = evaluateBestPokerHand(cards);
  const bestFiveIds = new Set(result.bestFive.map((c) => c.id));
  const bestCards = result.bestFive.map((bf) => cards.find((c) => c.id === bf.id)!);
  const rest = cards
    .filter((c) => !bestFiveIds.has(c.id))
    .sort((a, b) => rankValue(b.value) - rankValue(a.value));

  return {
    cards: [...bestCards, ...rest],
    bestFiveIds,
    label: result.label,
  };
}

export function sortByRank(cards: Card[]): Card[] {
  return [...cards].sort((a, b) => rankValue(a.value) - rankValue(b.value));
}

export function bumpRedSuitsForward(cards: Card[]): Card[] {
  const isRed = (s: Suit) => s === 'hearts' || s === 'diamonds';
  return [...cards.filter((c) => isRed(c.suit)), ...cards.filter((c) => !isRed(c.suit))];
}

export function sameCardOrder(a: Card[], b: Card[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((c, i) => c.id === b[i].id);
}
