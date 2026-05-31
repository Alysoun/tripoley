import { GameAction, GameState } from '../../types/GameTypes';
import { PLAYER_ACTION_TURN_MS } from './constants';
import {
  decideBlindBid,
  decideDealerBlindChoice,
  decideMichiganCard,
  decidePokerAction,
  decidePokerBetAmount,
} from './ai';
import { isDealerInAuction } from './blindAuction';
import { canPassLead } from './michigan';
import { handHasPayCard } from './payCards';
import { isEliminated } from './playerStatus';
import { debugPlayerActionTurnMs } from '../../debugConfig';

export function countHumanPlayers(state: GameState): number {
  return state.players.filter((p) => p.isHuman).length;
}

export function isSoloPlay(state: GameState): boolean {
  return countHumanPlayers(state) === 1;
}

/** End-of-round continue prompts — no timer in solo; multiplayer waits for first Continue later. */
export function isRoundEndContinueTimer(state: GameState): boolean {
  if (state.phase === 'roundSummary') return true;
  return state.phase === 'announcement' && state.announcementContinue === 'roundSummary';
}

export function getPlayerActionTimerMs(_state: GameState): number {
  return debugPlayerActionTurnMs(PLAYER_ACTION_TURN_MS);
}

/** Michigan follow-sequence uses MICHIGAN_TIMER_EXPIRE instead of ACTION_TIMER_EXPIRE. */
export function isMichiganSequenceTimerContext(state: GameState): boolean {
  return (
    state.phase === 'michigan' &&
    state.houseRules.michiganSequenceTimer &&
    state.michigan.mode === 'follow' &&
    state.michigan.activeSuit !== null &&
    state.michigan.nextValue !== null
  );
}

/** Stable key — new key resets the countdown when the acting human or decision context changes. */
export function getPlayerActionTimerKey(state: GameState): string | null {
  if (state.phase === 'setup' || state.phase === 'gameOver' || state.phase === 'payCards') {
    return null;
  }

  const hasHuman = state.players.some((p) => p.isHuman);

  if (state.phase === 'announcement') {
    if (!state.announcement || !hasHuman) return null;
    if (isSoloPlay(state) && isRoundEndContinueTimer(state)) return null;
    return `announcement:${state.announcement.title}`;
  }

  if (state.phase === 'roundSummary') {
    if (!hasHuman) return null;
    if (isSoloPlay(state)) return null;
    return `round-summary:${state.roundNumber}`;
  }

  const player = state.players[state.currentPlayer];
  if (!player?.isHuman || isEliminated(player)) return null;

  if (isMichiganSequenceTimerContext(state)) {
    const { activeSuit, nextValue } = state.michigan;
    return `michigan-seq:${state.currentPlayer}:${activeSuit}:${nextValue}`;
  }

  switch (state.phase) {
    case 'dealerBlindChoice':
      if (player.id !== state.dealerId) return null;
      return `dealer-blind:${state.currentPlayer}:${state.roundNumber}`;

    case 'blindAuction': {
      const { awaitingDealerClose, highBid, highBidder } = state.blindAuction;
      if (player.id === state.dealerId) {
        if (!awaitingDealerClose) return null;
        return `blind-close:${state.currentPlayer}:${highBid}:${highBidder}`;
      }
      if (awaitingDealerClose || state.blindAuction.passed[player.id] || isEliminated(player)) {
        return null;
      }
      return `blind-bid:${state.currentPlayer}:${highBid}:${highBidder}`;
    }

    case 'poker':
      if (state.poker.folded[player.id] || state.poker.roundComplete) return null;
      return `poker:${state.currentPlayer}:${state.poker.currentBet}:${JSON.stringify(state.poker.playerBets[player.id] ?? 0)}`;

    case 'michigan':
      return `michigan:${state.currentPlayer}:${state.michigan.mode}:${state.michigan.leadColor}:${state.michigan.activeSuit}:${state.michigan.nextValue}`;

    default:
      return null;
  }
}

export function getActionTimerHint(state: GameState): string | null {
  if (!getPlayerActionTimerKey(state)) return null;

  if (isMichiganSequenceTimerContext(state)) {
    return 'Next card assumed in the dead hand if not played';
  }

  switch (state.phase) {
    case 'dealerBlindChoice':
      return 'Choose swap, auction, or keep';
    case 'blindAuction':
      if (state.blindAuction.awaitingDealerClose) {
        return state.blindAuction.highBidder !== null
          ? 'Confirm high bidder takes the blind'
          : 'No bids — blind stays face down';
      }
      return 'Bid or pass — passing is permanent for this auction';
    case 'poker':
      return 'Check, call, bet, raise, or fold';
    case 'michigan':
      return 'Play a card or pass the lead';
    case 'announcement':
      return 'Continuing automatically';
    case 'roundSummary':
      return isSoloPlay(state) ? 'Tap Next Round when ready' : 'Starting the next round';
    default:
      return 'Act before time runs out';
  }
}

/** Default action when a human runs out of time. */
export function resolvePlayerActionTimeout(state: GameState): GameAction | null {
  if (state.phase === 'announcement' && state.announcement) {
    return { type: 'DISMISS_ANNOUNCEMENT' };
  }

  if (state.phase === 'roundSummary') {
    return { type: 'START_NEW_ROUND' };
  }

  const player = state.players[state.currentPlayer];
  if (!player?.isHuman || isEliminated(player)) return null;

  if (isMichiganSequenceTimerContext(state)) {
    return { type: 'MICHIGAN_TIMER_EXPIRE' };
  }

  switch (state.phase) {
    case 'dealerBlindChoice':
      if (player.id !== state.dealerId) return null;
      return {
        type: 'DEALER_BLIND_CHOICE',
        choice: decideDealerBlindChoice(player, state),
      };

    case 'blindAuction':
      if (player.id === state.dealerId && state.blindAuction.awaitingDealerClose) {
        return { type: 'BLIND_AUCTION_RESOLVE' };
      }
      if (
        isDealerInAuction(state, player.id) ||
        state.blindAuction.passed[player.id] ||
        isEliminated(player)
      ) {
        return null;
      }
      if (handHasPayCard(player.cards)) {
        return { type: 'BLIND_AUCTION_PASS' };
      }
      const bid = decideBlindBid(player, state, state.blindAuction.highBid);
      if (bid > state.blindAuction.highBid) {
        return { type: 'BLIND_AUCTION_BID', amount: bid };
      }
      return { type: 'BLIND_AUCTION_PASS' };

    case 'poker': {
      if (state.poker.folded[player.id] || state.poker.roundComplete) return null;
      const action = decidePokerAction(player, state);
      if (action === 'bet' || action === 'raise') {
        return {
          type: 'POKER_ACTION',
          action,
          amount: decidePokerBetAmount(player, state, action),
        };
      }
      return { type: 'POKER_ACTION', action, amount: 0 };
    }

    case 'michigan': {
      const card = decideMichiganCard(player, state);
      if (card) return { type: 'MICHIGAN_PLAY', card };
      if (canPassLead(player.cards, state.michigan, player.id, state.currentPlayer)) {
        return { type: 'MICHIGAN_PASS_LEAD' };
      }
      return { type: 'MICHIGAN_SYNC_TURN' };
    }

    default:
      return null;
  }
}
