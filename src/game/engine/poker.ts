import { Card } from '../../types/GameTypes';
import { rankValue } from './cards';

export type PokerHandRank =
  | 'high-card'
  | 'pair'
  | 'two-pair'
  | 'three-of-a-kind'
  | 'straight'
  | 'flush'
  | 'full-house'
  | 'four-of-a-kind'
  | 'straight-flush';

export interface PokerHandResult {
  rank: PokerHandRank;
  score: number;
  tiebreakers: number[];
  label: string;
  bestFive: Card[];
}

const RANK_SCORE: Record<PokerHandRank, number> = {
  'high-card': 1,
  pair: 2,
  'two-pair': 3,
  'three-of-a-kind': 4,
  straight: 5,
  flush: 6,
  'full-house': 7,
  'four-of-a-kind': 8,
  'straight-flush': 9,
};

function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];
  const [first, ...rest] = arr;
  const withFirst = combinations(rest, k - 1).map((c) => [first, ...c]);
  const withoutFirst = combinations(rest, k);
  return [...withFirst, ...withoutFirst];
}

function isStraight(values: number[]): boolean {
  const sorted = [...new Set(values)].sort((a, b) => a - b);
  if (sorted.length !== 5) return false;
  if (sorted[4] - sorted[0] === 4) return true;
  // Wheel: A-2-3-4-5
  if (sorted.join(',') === '2,3,4,5,14') return true;
  return false;
}

function evaluateFive(cards: Card[]): PokerHandResult {
  const values = cards.map((c) => rankValue(c.value)).sort((a, b) => b - a);
  const suits = cards.map((c) => c.suit);
  const isFlush = suits.every((s) => s === suits[0]);
  const straight = isStraight(values);

  const counts = new Map<number, number>();
  values.forEach((v) => counts.set(v, (counts.get(v) || 0) + 1));
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0]);
  const pattern = groups.map(([, c]) => c).join('-');

  let rank: PokerHandRank = 'high-card';
  let label = 'High Card';

  if (straight && isFlush) {
    rank = 'straight-flush';
    label = 'Straight Flush';
  } else if (pattern === '4-1') {
    rank = 'four-of-a-kind';
    label = 'Four of a Kind';
  } else if (pattern === '3-2') {
    rank = 'full-house';
    label = 'Full House';
  } else if (isFlush) {
    rank = 'flush';
    label = 'Flush';
  } else if (straight) {
    rank = 'straight';
    label = 'Straight';
  } else if (pattern === '3-1-1') {
    rank = 'three-of-a-kind';
    label = 'Three of a Kind';
  } else if (pattern === '2-2-1') {
    rank = 'two-pair';
    label = 'Two Pair';
  } else if (pattern === '2-1-1-1') {
    rank = 'pair';
    label = 'Pair';
  }

  return {
    rank,
    score: RANK_SCORE[rank],
    tiebreakers: values,
    label,
    bestFive: cards,
  };
}

export function evaluateBestPokerHand(hand: Card[]): PokerHandResult {
  if (hand.length === 0) {
    return evaluateFive([]);
  }
  if (hand.length <= 5) {
    const padded = [...hand];
    while (padded.length < 5) {
      padded.push(hand[0]);
    }
    return evaluateFive(padded.slice(0, 5));
  }
  let best: PokerHandResult | null = null;
  for (const combo of combinations(hand, 5)) {
    const result = evaluateFive(combo);
    if (!best || comparePokerHands(result, best) > 0) {
      best = result;
    }
  }
  return best!;
}

export function comparePokerHands(a: PokerHandResult, b: PokerHandResult): number {
  if (a.score !== b.score) return a.score - b.score;
  for (let i = 0; i < Math.max(a.tiebreakers.length, b.tiebreakers.length); i++) {
    const diff = (a.tiebreakers[i] || 0) - (b.tiebreakers[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export function estimateHandStrength(hand: Card[]): number {
  const result = evaluateBestPokerHand(hand);
  return result.score / 9 + (result.tiebreakers[0] || 0) / 140;
}
