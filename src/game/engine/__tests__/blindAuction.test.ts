import { describe, expect, it } from 'vitest';
import {
  allBiddersPassed,
  firstAuctionBidder,
  getAuctionBidders,
  onlyHighBidderRemains,
} from '../blindAuction';
import { startGame, dispatch } from './helpers/simulate';
import { OFFICIAL_HOUSE_RULES } from '../houseRules';

describe('blind auction', () => {
  it('lists every non-dealer seat as a bidder', () => {
    const state = startGame(4, OFFICIAL_HOUSE_RULES);
    expect(getAuctionBidders(state)).toEqual([1, 2, 3]);
    expect(firstAuctionBidder(state)).toBe(1);
  });

  it('detects when only the high bidder remains', () => {
    let state = startGame(4, OFFICIAL_HOUSE_RULES);
    state = dispatch(state, { type: 'DEALER_BLIND_CHOICE', choice: 'auction' });
    state = {
      ...state,
      blindAuction: {
        ...state.blindAuction,
        highBidder: 1,
        highBid: 5,
        passed: { 2: true, 3: true },
      },
      currentPlayer: 1,
    };
    expect(onlyHighBidderRemains(state)).toBe(true);
    expect(allBiddersPassed(state)).toBe(false);
  });

  it('detects when every bidder passed', () => {
    let state = startGame(4, OFFICIAL_HOUSE_RULES);
    state = dispatch(state, { type: 'DEALER_BLIND_CHOICE', choice: 'auction' });
    state = {
      ...state,
      blindAuction: {
        ...state.blindAuction,
        passed: { 1: true, 2: true, 3: true },
      },
    };
    expect(allBiddersPassed(state)).toBe(true);
  });
});
