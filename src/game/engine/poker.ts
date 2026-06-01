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

const RANK_LABEL: Record<number, { singular: string; plural: string }> = {
  2: { singular: 'Two', plural: 'Twos' },
  3: { singular: 'Three', plural: 'Threes' },
  4: { singular: 'Four', plural: 'Fours' },
  5: { singular: 'Five', plural: 'Fives' },
  6: { singular: 'Six', plural: 'Sixes' },
  7: { singular: 'Seven', plural: 'Sevens' },
  8: { singular: 'Eight', plural: 'Eights' },
  9: { singular: 'Nine', plural: 'Nines' },
  10: { singular: 'Ten', plural: 'Tens' },
  11: { singular: 'Jack', plural: 'Jacks' },
  12: { singular: 'Queen', plural: 'Queens' },
  13: { singular: 'King', plural: 'Kings' },
  14: { singular: 'Ace', plural: 'Aces' },
};

function rankLabel(value: number, plural = false): string {
  const entry = RANK_LABEL[value];
  if (!entry) return String(value);
  return plural ? entry.plural : entry.singular;
}

function straightHighRankValue(values: number[]): number {
  const sorted = [...new Set(values)].sort((a, b) => a - b);
  if (sorted.length === 5 && sorted.join(',') === '2,3,4,5,14') return 5;
  return sorted[sorted.length - 1];
}

function isRoyalStraightValues(values: number[]): boolean {
  const sorted = [...new Set(values)].sort((a, b) => a - b);
  return sorted.length === 5 && sorted.join(',') === '10,11,12,13,14';
}

/** Short display label for HUD / logs, e.g. "Pair of Kings" or "Three of a Kind, Fours". */
export function formatPokerHandLabel(
  rank: PokerHandRank,
  groups: Array<[number, number]>,
  values: number[]
): string {
  switch (rank) {
    case 'high-card':
      return `${rankLabel(values[0])}-High`;
    case 'pair':
      return `Pair of ${rankLabel(groups[0][0], true)}`;
    case 'two-pair':
      return `Two Pair, ${rankLabel(groups[0][0], true)} and ${rankLabel(groups[1][0], true)}`;
    case 'three-of-a-kind':
      return `Three of a Kind, ${rankLabel(groups[0][0], true)}`;
    case 'straight': {
      const high = straightHighRankValue(values);
      return high === 5 ? 'Five-High Straight' : `Straight, ${rankLabel(high)}-High`;
    }
    case 'flush':
      return `Flush, ${rankLabel(values[0])}-High`;
    case 'full-house':
      return `${rankLabel(groups[0][0], true)} Full of ${rankLabel(groups[1][0], true)}`;
    case 'four-of-a-kind':
      return `Four of a Kind, ${rankLabel(groups[0][0], true)}`;
    case 'straight-flush':
      if (isRoyalStraightValues(values)) return 'Royal Flush';
      {
        const high = straightHighRankValue(values);
        if (high === 5) return 'Five-High Straight Flush';
        return `Straight Flush, ${rankLabel(high)}-High`;
      }
    default:
      return 'High Card';
  }
}

/** Phrase after "with" in win copy — correct article and casing, e.g. "a pair of kings". */
export function formatPokerWinPhrase(rank: PokerHandRank, label: string): string {
  const text = label.toLowerCase();
  switch (rank) {
    case 'pair':
    case 'flush':
    case 'straight':
      return `a ${text}`;
    case 'straight-flush':
      return text === 'royal flush' ? 'a royal flush' : `a ${text}`;
    case 'high-card':
    case 'two-pair':
    case 'three-of-a-kind':
    case 'four-of-a-kind':
    case 'full-house':
      return text;
    default:
      return text;
  }
}

export function isPremiumPokerHand(rank: PokerHandRank): boolean {
  return RANK_SCORE[rank] >= RANK_SCORE['full-house'];
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

  if (straight && isFlush) {
    rank = 'straight-flush';
  } else if (pattern === '4-1') {
    rank = 'four-of-a-kind';
  } else if (pattern === '3-2') {
    rank = 'full-house';
  } else if (isFlush) {
    rank = 'flush';
  } else if (straight) {
    rank = 'straight';
  } else if (pattern === '3-1-1') {
    rank = 'three-of-a-kind';
  } else if (pattern === '2-2-1') {
    rank = 'two-pair';
  } else if (pattern === '2-1-1-1') {
    rank = 'pair';
  }

  const label = formatPokerHandLabel(rank, groups, values);

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
