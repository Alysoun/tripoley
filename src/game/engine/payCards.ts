import { ANTE_PER_SECTION, PotSectionKey } from './constants';
import { Card, Suit } from '../../types/GameTypes';
import { hasCard } from './cards';
import type { HouseRules } from './houseRules';
export type PotBoard = Record<PotSectionKey, number>;

export function createEmptyPot(): PotBoard {
  return {
    aceHearts: 0,
    kingHearts: 0,
    queenHearts: 0,
    jackHearts: 0,
    tenHearts: 0,
    kingQueen: 0,
    eightNineTen: 0,
    kitty: 0,
    pot: 0,
  };
}

export function clonePot(pot: PotBoard): PotBoard {
  return { ...pot };
}

export interface PayCardClaim {
  playerId: number;
  section: PotSectionKey;
  amount: number;
  description: string;
}

function cardInDeadHand(deadHand: Card[], suit: Suit, value: string): boolean {
  return deadHand.some((c) => c.suit === suit && c.value === value);
}

function hasHeart(hand: Card[], value: string): boolean {
  return hand.some((c) => c.suit === 'hearts' && c.value === value);
}

function hasEightNineTenRun(hand: Card[]): Suit | null {
  for (const suit of ['hearts', 'diamonds', 'clubs', 'spades'] as Suit[]) {
    if (
      hand.some((c) => c.suit === suit && c.value === '8') &&
      hand.some((c) => c.suit === suit && c.value === '9') &&
      hand.some((c) => c.suit === suit && c.value === '10')
    ) {
      return suit;
    }
  }
  return null;
}

const HEART_PAY_LABELS: Record<string, string> = {
  A: 'Ace of Hearts',
  K: 'King of Hearts',
  Q: 'Queen of Hearts',
  J: 'Jack of Hearts',
  '10': 'Ten of Hearts',
};

/** True if the hand holds any Tripoley pay-card (heart face cards, K-Q pair, or 8-9-10 run). */
export function handHasPayCard(hand: Card[]): boolean {
  if (['A', 'K', 'Q', 'J', '10'].some((value) => hasHeart(hand, value))) return true;
  return hasEightNineTenRun(hand) !== null;
}

/** Short labels for pay cards held (for UI / log messages). */
export function describePayCardsHeld(hand: Card[]): string[] {
  const labels: string[] = [];
  for (const value of ['A', 'K', 'Q', 'J', '10'] as const) {
    if (hasHeart(hand, value)) labels.push(HEART_PAY_LABELS[value]);
  }
  const runSuit = hasEightNineTenRun(hand);
  if (runSuit) {
    const suitName = runSuit.charAt(0).toUpperCase() + runSuit.slice(1);
    labels.push(`8-9-10 of ${suitName}`);
  }
  return labels;
}

function eightNineTenBlocked(deadHand: Card[]): boolean {
  for (const suit of ['hearts', 'diamonds', 'clubs', 'spades'] as Suit[]) {
    const inDead =
      deadHand.some((c) => c.suit === suit && c.value === '8') &&
      deadHand.some((c) => c.suit === suit && c.value === '9') &&
      deadHand.some((c) => c.suit === suit && c.value === '10');
    if (inDead) return true;
  }
  return false;
}

/** Resolve pay-card claims at the start of the Hearts phase (official Tripoley order). */
export function resolvePayCardClaims(
  playerHands: Card[][],
  deadHand: Card[],
  pot: PotBoard,
  rules: Pick<HouseRules, 'deadHandBlocksPayCards'> = { deadHandBlocksPayCards: true }
): { pot: PotBoard; claims: PayCardClaim[]; playerChipDeltas: number[] } {
  const newPot = clonePot(pot);
  const claims: PayCardClaim[] = [];
  const playerChipDeltas = playerHands.map(() => 0);
  const blocked = rules.deadHandBlocksPayCards;

  const heartSections: { section: PotSectionKey; value: string; label: string }[] = [
    { section: 'aceHearts', value: 'A', label: 'Ace of Hearts' },
    { section: 'kingHearts', value: 'K', label: 'King of Hearts' },
    { section: 'queenHearts', value: 'Q', label: 'Queen of Hearts' },
    { section: 'jackHearts', value: 'J', label: 'Jack of Hearts' },
    { section: 'tenHearts', value: '10', label: 'Ten of Hearts' },
  ];

  for (const { section, value, label } of heartSections) {
    if (blocked && cardInDeadHand(deadHand, 'hearts', value)) continue;    const amount = newPot[section];
    if (amount <= 0) continue;

    for (let i = 0; i < playerHands.length; i++) {
      if (hasHeart(playerHands[i], value)) {
        playerChipDeltas[i] += amount;
        newPot[section] = 0;
        claims.push({
          playerId: i,
          section,
          amount,
          description: `${label} → Player ${i + 1}`,
        });
        break;
      }
    }
  }

  if (
    (!blocked ||
      (!cardInDeadHand(deadHand, 'hearts', 'K') &&
        !cardInDeadHand(deadHand, 'hearts', 'Q'))) &&
    newPot.kingQueen > 0
  ) {
    for (let i = 0; i < playerHands.length; i++) {
      if (hasHeart(playerHands[i], 'K') && hasHeart(playerHands[i], 'Q')) {
        const amount = newPot.kingQueen;
        playerChipDeltas[i] += amount;
        newPot.kingQueen = 0;
        claims.push({
          playerId: i,
          section: 'kingQueen',
          amount,
          description: `King-Queen of Hearts → Player ${i + 1}`,
        });
        break;
      }
    }
  }

  if (
    (!blocked || !eightNineTenBlocked(deadHand)) &&
    newPot.eightNineTen > 0
  ) {
    for (let i = 0; i < playerHands.length; i++) {
      const suit = hasEightNineTenRun(playerHands[i]);
      if (suit) {
        const amount = newPot.eightNineTen;
        playerChipDeltas[i] += amount;
        newPot.eightNineTen = 0;
        claims.push({
          playerId: i,
          section: 'eightNineTen',
          amount,
          description: `8-9-10 of ${suit} → Player ${i + 1}`,
        });
        break;
      }
    }
  }

  return { pot: newPot, claims, playerChipDeltas };
}

/** Home rule: claim pay sections when the matching card is played in Michigan. */
export function resolvePayCardClaimOnPlay(
  playedCard: Card,
  handBeforePlay: Card[],
  deadHand: Card[],
  pot: PotBoard,
  playerId: number,
  playerName: string,
  rules: Pick<HouseRules, 'deadHandBlocksPayCards'>
): { pot: PotBoard; claims: PayCardClaim[] } {
  const blocked = rules.deadHandBlocksPayCards;
  const newPot = clonePot(pot);
  const claims: PayCardClaim[] = [];

  const heartMap: Record<string, { section: PotSectionKey; label: string }> = {
    A: { section: 'aceHearts', label: 'Ace of Hearts' },
    K: { section: 'kingHearts', label: 'King of Hearts' },
    Q: { section: 'queenHearts', label: 'Queen of Hearts' },
    J: { section: 'jackHearts', label: 'Jack of Hearts' },
    '10': { section: 'tenHearts', label: 'Ten of Hearts' },
  };

  if (playedCard.suit === 'hearts') {
    const entry = heartMap[playedCard.value];
    if (
      entry &&
      newPot[entry.section] > 0 &&
      (!blocked || !cardInDeadHand(deadHand, 'hearts', playedCard.value))
    ) {
      const amount = newPot[entry.section];
      newPot[entry.section] = 0;
      claims.push({
        playerId,
        section: entry.section,
        amount,
        description: `${playerName} claims ${entry.label} by playing it (${amount} chips)`,
      });
    }
  }

  if (
    newPot.kingQueen > 0 &&
    (!blocked ||
      (!cardInDeadHand(deadHand, 'hearts', 'K') &&
        !cardInDeadHand(deadHand, 'hearts', 'Q'))) &&
    hasHeart(handBeforePlay, 'K') &&
    hasHeart(handBeforePlay, 'Q') &&
    playedCard.suit === 'hearts' &&
    (playedCard.value === 'K' || playedCard.value === 'Q')
  ) {
    const amount = newPot.kingQueen;
    newPot.kingQueen = 0;
    claims.push({
      playerId,
      section: 'kingQueen',
      amount,
      description: `${playerName} claims King-Queen of Hearts by playing (${amount} chips)`,
    });
  }

  if (
    newPot.eightNineTen > 0 &&
    (!blocked || !eightNineTenBlocked(deadHand))
  ) {
    const suit = hasEightNineTenRun(handBeforePlay);
    if (
      suit &&
      playedCard.suit === suit &&
      ['8', '9', '10'].includes(playedCard.value)
    ) {
      const amount = newPot.eightNineTen;
      newPot.eightNineTen = 0;
      claims.push({
        playerId,
        section: 'eightNineTen',
        amount,
        description: `${playerName} claims 8-9-10 of ${suit} by playing (${amount} chips)`,
      });
    }
  }

  return { pot: newPot, claims };
}

export function collectAntes(pot: PotBoard, playerCount: number): PotBoard {
  const newPot = clonePot(pot);
  for (const key of Object.keys(newPot) as PotSectionKey[]) {
    newPot[key] += ANTE_PER_SECTION * playerCount;
  }
  return newPot;
}

export { hasCard };
