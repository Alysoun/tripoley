import { Card, Rank, Suit } from '../../types/GameTypes';
import {
  nextRank,
  rankValue,
  removeCard,
} from './cards';

export function findPlayerWithCard(
  hands: Card[][],
  suit: Suit,
  value: Rank
): number | null {
  for (let i = 0; i < hands.length; i++) {
    if (hands[i].some((c) => c.suit === suit && c.value === value)) {
      return i;
    }
  }
  return null;
}

export type MichiganColor = 'black' | 'red';

export const BLACK_SUITS: Suit[] = ['clubs', 'spades'];
export const RED_SUITS: Suit[] = ['hearts', 'diamonds'];

export interface MichiganState {
  /** 'lead' = play lowest black/red; 'follow' = play next card in active suit */
  mode: 'lead' | 'follow';
  leadColor: MichiganColor;
  activeSuit: Suit | null;
  nextValue: Rank | null;
  lastPlayerId: number | null;
}

export function createMichiganState(): MichiganState {
  return {
    mode: 'lead',
    leadColor: 'black',
    activeSuit: null,
    nextValue: null,
    lastPlayerId: null,
  };
}

export function suitColor(suit: Suit): MichiganColor {
  return BLACK_SUITS.includes(suit) ? 'black' : 'red';
}

export function oppositeColor(color: MichiganColor): MichiganColor {
  return color === 'black' ? 'red' : 'black';
}

export function leftOfDealer(dealerId: number, playerCount: number): number {
  return (dealerId + 1) % playerCount;
}

export function nextPlayerLeft(currentId: number, playerCount: number): number {
  return (currentId + 1) % playerCount;
}

/** Skip players who have already emptied their hand */
export function nextActivePlayerLeft(fromId: number, hands: Card[][]): number {
  const n = hands.length;
  for (let i = 1; i <= n; i++) {
    const id = (fromId + i) % n;
    if (hands[id].length > 0) return id;
  }
  return fromId;
}

export function getLowestOfColor(hand: Card[], color: MichiganColor): Card | null {
  const suits = color === 'black' ? BLACK_SUITS : RED_SUITS;
  const cards = hand.filter((c) => suits.includes(c.suit));
  if (cards.length === 0) return null;
  return cards.reduce((lowest, c) =>
    rankValue(c.value) < rankValue(lowest.value) ? c : lowest
  );
}

export function hasColor(hand: Card[], color: MichiganColor): boolean {
  return getLowestOfColor(hand, color) !== null;
}

export function getLegalMichiganPlays(
  hand: Card[],
  michigan: MichiganState,
  playerId: number,
  currentPlayerId: number
): Card[] {
  if (hand.length === 0 || playerId !== currentPlayerId) return [];

  if (michigan.mode === 'follow') {
    if (!michigan.activeSuit || !michigan.nextValue) return [];
    const required = hand.find(
      (c) => c.suit === michigan.activeSuit && c.value === michigan.nextValue
    );
    return required ? [required] : [];
  }

  const lowest = getLowestOfColor(hand, michigan.leadColor);
  return lowest ? [lowest] : [];
}

export function canPassLead(
  hand: Card[],
  michigan: MichiganState,
  playerId: number,
  currentPlayerId: number
): boolean {
  return (
    michigan.mode === 'lead' &&
    playerId === currentPlayerId &&
    hand.length > 0 &&
    !hasColor(hand, michigan.leadColor)
  );
}

export function validateMichiganPlay(
  hand: Card[],
  card: Card,
  michigan: MichiganState,
  playerId: number,
  currentPlayerId: number
): boolean {
  const legal = getLegalMichiganPlays(hand, michigan, playerId, currentPlayerId);
  return legal.some((c) => c.id === card.id);
}

/** After a card is played, determine next michigan state and who acts */
export function resolveAfterMichiganPlay(
  hands: Card[][],
  michigan: MichiganState,
  playedCard: Card,
  playerId: number
): { michigan: MichiganState; currentPlayer: number } {
  const playedColor = suitColor(playedCard.suit);

  if (michigan.mode === 'lead') {
    const next = nextRank(playedCard.value);
    if (next && findPlayerWithCard(hands, playedCard.suit, next) !== null) {
      const holder = findPlayerWithCard(hands, playedCard.suit, next)!;
      return {
        michigan: {
          mode: 'follow',
          leadColor: michigan.leadColor,
          activeSuit: playedCard.suit,
          nextValue: next,
          lastPlayerId: playerId,
        },
        currentPlayer: holder,
      };
    }
    // Nobody follows — same player leads opposite color
    const opp = oppositeColor(playedColor);
    return {
      michigan: {
        mode: 'lead',
        leadColor: opp,
        activeSuit: null,
        nextValue: null,
        lastPlayerId: playerId,
      },
      currentPlayer: playerId,
    };
  }

  // follow mode
  const next = nextRank(playedCard.value);
  if (next && findPlayerWithCard(hands, playedCard.suit, next) !== null) {
    const holder = findPlayerWithCard(hands, playedCard.suit, next)!;
    return {
      michigan: {
        mode: 'follow',
        leadColor: michigan.leadColor,
        activeSuit: playedCard.suit,
        nextValue: next,
        lastPlayerId: playerId,
      },
      currentPlayer: holder,
    };
  }

  const opp = oppositeColor(playedColor);
  return {
    michigan: {
      mode: 'lead',
      leadColor: opp,
      activeSuit: null,
      nextValue: null,
      lastPlayerId: playerId,
    },
    currentPlayer: playerId,
  };
}

export function applyMichiganPlay(
  hands: Card[][],
  playerId: number,
  card: Card
): Card[][] {
  return hands.map((h, i) => (i === playerId ? removeCard(h, card) : [...h]));
}

export function getMichiganStarter(_hands: Card[][], dealerId: number): number {
  return leftOfDealer(dealerId, _hands.length);
}

export function leadColorLabel(color: MichiganColor): string {
  return color === 'black' ? 'black (♣ ♠)' : 'red (♥ ♦)';
}

export function formatCardLabel(card: Card): string {
  return `${card.value} of ${card.suit}`;
}

export function formatPlayerPlays(playerName: string, card: Card, isHuman = false): string {
  const label = formatCardLabel(card);
  const who = isHuman ? `${playerName} (You)` : playerName;
  return `${who} plays ${label}`;
}

/** Next card in the active suit sequence (for peek-next-lead cosmetic). */
export function getSequencePeekCard(michigan: MichiganState): Card | null {
  if (michigan.mode !== 'follow' || !michigan.activeSuit || !michigan.nextValue) {
    return null;
  }
  const { activeSuit, nextValue } = michigan;
  return { suit: activeSuit, value: nextValue, id: `peek-${activeSuit}-${nextValue}` };
}

/** Hint text for the active Michigan player */
export function describeMichiganTurn(
  michigan: MichiganState,
  hand: Card[],
  playerId: number,
  currentPlayerId: number
): string | null {
  if (playerId !== currentPlayerId) return null;

  if (michigan.mode === 'lead') {
    const lowest = getLowestOfColor(hand, michigan.leadColor);
    if (lowest) {
      return `Play your lowest ${leadColorLabel(michigan.leadColor)}: ${formatCardLabel(lowest)}`;
    }
    return `Cannot lead ${leadColorLabel(michigan.leadColor)} — pay 1 chip to the kitty`;
  }

  if (michigan.mode === 'follow' && michigan.activeSuit && michigan.nextValue) {
    return `Play the ${michigan.nextValue} of ${michigan.activeSuit}`;
  }

  return null;
}

/** Sequence timer expired — next card treated as unavailable (dead hand) */
export function resolveMichiganSequenceTimeout(
  michigan: MichiganState
): { michigan: MichiganState; currentPlayer: number } | null {
  if (michigan.mode !== 'follow' || !michigan.activeSuit || !michigan.nextValue) {
    return null;
  }
  if (michigan.lastPlayerId === null) return null;

  const opp = oppositeColor(suitColor(michigan.activeSuit));
  return {
    michigan: {
      mode: 'lead',
      leadColor: opp,
      activeSuit: null,
      nextValue: null,
      lastPlayerId: michigan.lastPlayerId,
    },
    currentPlayer: michigan.lastPlayerId,
  };
}

export function emptyShownPlays(playerCount: number): Record<number, Card | null> {
  return Object.fromEntries(Array.from({ length: playerCount }, (_, i) => [i, null]));
}

export function recordShownPlay(
  shown: Record<number, Card | null>,
  playerId: number,
  card: Card
): Record<number, Card | null> {
  return { ...shown, [playerId]: card };
}

/** Reassign turn if current player cannot act (follow mode holder mismatch) */
export function fixMichiganTurnIfStuck(
  hands: Card[][],
  michigan: MichiganState,
  currentPlayer: number
): { michigan: MichiganState; currentPlayer: number } | null {
  const hand = hands[currentPlayer];
  if (!hand || hand.length === 0) {
    const next = nextActivePlayerLeft(currentPlayer, hands);
    if (next !== currentPlayer) {
      return { michigan, currentPlayer: next };
    }
    return null;
  }

  if (getLegalMichiganPlays(hand, michigan, currentPlayer, currentPlayer).length > 0) {
    return { michigan, currentPlayer };
  }

  if (canPassLead(hand, michigan, currentPlayer, currentPlayer)) {
    return null; // caller should MICHIGAN_PASS_LEAD
  }

  if (michigan.mode === 'follow' && michigan.activeSuit && michigan.nextValue) {
    const holder = findPlayerWithCard(hands, michigan.activeSuit, michigan.nextValue);
    if (holder !== null && holder !== currentPlayer) {
      return { michigan, currentPlayer: holder };
    }
    if (michigan.lastPlayerId !== null) {
      const last = michigan.lastPlayerId;
      const opp = oppositeColor(suitColor(michigan.activeSuit));
      return {
        michigan: {
          mode: 'lead',
          leadColor: opp,
          activeSuit: null,
          nextValue: null,
          lastPlayerId: last,
        },
        currentPlayer: last,
      };
    }
  }

  return null;
}