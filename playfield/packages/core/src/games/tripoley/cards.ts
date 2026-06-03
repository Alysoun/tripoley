import type { Card } from './types';
import { MIN_PLAYERS } from './constants';
import {
  SUITS,
  RANKS,
  cardId,
  createCard,
  createDeck,
  shuffle,
  rankValue,
  nextRank,
  cardsEqual,
  hasCard,
  removeCard,
  getLowestInSuit,
  getLowestCard,
} from '../../deck/standard52';

export {
  SUITS,
  RANKS,
  cardId,
  createCard,
  createDeck,
  shuffle,
  rankValue,
  nextRank,
  cardsEqual,
  hasCard,
  removeCard,
  getLowestInSuit,
  getLowestCard,
};

export function dealHands(playerCount: number, dealerId: number): {
  players: Card[][];
  deadHand: Card[];
} {
  const deck = createDeck();
  const totalPositions = playerCount + 1;
  const base = Math.floor(52 / totalPositions);
  const extra = 52 % totalPositions;

  const hands: Card[][] = Array.from({ length: playerCount }, () => []);
  let index = 0;

  const deadHand = deck.slice(index, index + base);
  index += base;

  for (let p = 0; p < playerCount; p++) {
    const positionFromDealer = (p - dealerId + playerCount) % playerCount;
    const extraCard = positionFromDealer > 0 && positionFromDealer <= extra ? 1 : 0;
    const count = base + extraCard;
    hands[p] = deck.slice(index, index + count);
    index += count;
  }

  return { players: hands, deadHand };
}

/** Deal a full table layout, but only active seats receive cards (eliminated seats stay empty). */
export function dealHandsFiltered(
  totalSeats: number,
  activeSeatIds: number[],
  dealerSeatId: number
): { playerHands: Card[][]; deadHand: Card[] } {
  const empty = Array.from({ length: totalSeats }, () => [] as Card[]);
  if (activeSeatIds.length === 0) {
    return { playerHands: empty, deadHand: [] };
  }

  const dealerAmongActive = Math.max(0, activeSeatIds.indexOf(dealerSeatId));
  const dealCount = Math.max(activeSeatIds.length, MIN_PLAYERS);
  const { players: virtualHands, deadHand } = dealHands(dealCount, dealerAmongActive);
  const playerHands = empty.map((hand) => [...hand]);
  activeSeatIds.forEach((seatId, i) => {
    playerHands[seatId] = virtualHands[i];
  });
  const phantomHands = virtualHands.slice(activeSeatIds.length);
  const mergedDeadHand =
    phantomHands.length > 0 ? [...deadHand, ...phantomHands.flat()] : deadHand;
  return { playerHands, deadHand: mergedDeadHand };
}
