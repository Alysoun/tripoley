import { GameState } from '../../types/GameTypes';
import { isEliminated } from './playerStatus';

/** Non-dealer players who may bid on the blind hand */
export function getAuctionBidders(state: GameState): number[] {
  return state.players
    .filter((p) => p.id !== state.dealerId && !isEliminated(p))
    .map((p) => p.id);
}

export function isDealerInAuction(state: GameState, playerId: number): boolean {
  return playerId === state.dealerId;
}

export function allBiddersPassed(state: GameState): boolean {
  return getAuctionBidders(state).every((id) => state.blindAuction.passed[id] === true);
}

/** Non-dealer seats still in the auction (have not passed). */
export function getActiveBidders(state: GameState): number[] {
  return getAuctionBidders(state).filter((id) => !state.blindAuction.passed[id]);
}

/** Everyone else passed — high bidder wins without another turn. */
export function onlyHighBidderRemains(state: GameState): boolean {
  const { highBidder } = state.blindAuction;
  if (highBidder === null) return false;
  const active = getActiveBidders(state);
  return active.length === 1 && active[0] === highBidder;
}

/** Next seat that may bid (never the dealer) */
export function firstAuctionBidder(state: GameState): number {
  const n = state.players.length;
  for (let i = 1; i <= n; i += 1) {
    const id = (state.dealerId + i) % n;
    if (id !== state.dealerId && !isEliminated(state.players[id])) return id;
  }
  return (state.dealerId + 1) % n;
}

export function findNextActiveBidder(
  state: GameState,
  fromId: number,
  excludeId?: number
): number | null {
  const bidders = getAuctionBidders(state);
  if (bidders.length === 0) return null;

  const fromIndex = bidders.indexOf(fromId);
  const start = fromIndex >= 0 ? fromIndex : -1;

  for (let i = 1; i <= bidders.length; i++) {
    const id = bidders[(start + i) % bidders.length];
    if (excludeId !== undefined && id === excludeId) continue;
    if (!state.blindAuction.passed[id]) return id;
  }
  return null;
}

/** After a new bid, who still needs a chance to respond (never the bidder themself) */
export function findRespondersToBid(state: GameState, bidderId: number): number | null {
  return findNextActiveBidder(state, bidderId, bidderId);
}
