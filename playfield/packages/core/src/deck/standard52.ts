import type { Card, Rank, Suit } from '../types/cards';

export const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
export const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

const RANK_ORDER: Record<Rank, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

export function cardId(suit: Suit, value: Rank): string {
  return `${suit}-${value}`;
}

export function createCard(suit: Suit, value: Rank): Card {
  return { suit, value, id: cardId(suit, value) };
}

export function buildStandard52Deck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const value of RANKS) {
      deck.push(createCard(suit, value));
    }
  }
  return deck;
}

/** Shuffled standard 52-card deck (Fisher–Yates). */
export function createDeck(): Card[] {
  return shuffle(buildStandard52Deck());
}

export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function rankValue(value: Rank): number {
  return RANK_ORDER[value];
}

export function nextRank(value: Rank): Rank | null {
  const idx = RANKS.indexOf(value);
  return idx >= 0 && idx < RANKS.length - 1 ? RANKS[idx + 1] : null;
}

export function cardsEqual(a: Card, b: Card): boolean {
  return a.id === b.id;
}

export function hasCard(hand: Card[], card: Card): boolean {
  return hand.some((c) => c.id === card.id);
}

export function removeCard(hand: Card[], card: Card): Card[] {
  return hand.filter((c) => c.id !== card.id);
}

export function getLowestInSuit(hand: Card[], suit: Suit): Card | null {
  const suited = hand.filter((c) => c.suit === suit);
  if (suited.length === 0) return null;
  return suited.reduce((lowest, current) =>
    rankValue(current.value) < rankValue(lowest.value) ? current : lowest
  );
}

export function getLowestCard(hand: Card[]): Card | null {
  if (hand.length === 0) return null;
  return hand.reduce((lowest, current) =>
    rankValue(current.value) < rankValue(lowest.value) ? current : lowest
  );
}
