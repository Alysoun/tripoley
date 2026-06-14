import { GameState, Player, Card, PokerAction, AIDifficulty } from './types';
import { getLegalMichiganPlays, canPassLead } from './michigan';
import { estimateHandStrength, evaluateBestPokerHand } from './poker';
import { handHasPayCard } from './payCards';
import { isEliminated } from './playerStatus';
import { shouldForceAllInPoker } from './suddenDeath';

export type DealerBlindChoice = 'swap' | 'auction' | 'keep';

interface PokerAiProfile {
  aggression: number;
  /** Base chance to bet/raise with a weak hand (before credibility & table noise). */
  bluffFreq: number;
  /** How often strong made hands pull the trigger for value. */
  valueFreq: number;
  /** Willingness to fold marginal hands to pressure. */
  foldDiscipline: number;
}

const POKER_PROFILE: Record<AIDifficulty, PokerAiProfile> = {
  easy: { aggression: 0.55, bluffFreq: 0.1, valueFreq: 0.72, foldDiscipline: 0.45 },
  medium: { aggression: 0.82, bluffFreq: 0.2, valueFreq: 0.84, foldDiscipline: 0.62 },
  hard: { aggression: 1.05, bluffFreq: 0.3, valueFreq: 0.9, foldDiscipline: 0.76 },
  cardShark: { aggression: 1.28, bluffFreq: 0.42, valueFreq: 0.93, foldDiscipline: 0.86 },
};

/** Fresh random rolls each decision — mixes skill with unpredictable bluff/value timing. */
interface PokerRolls {
  value: number;
  bluff: number;
  pressure: number;
  /** Table “mood” noise: same hand can play differently each time. */
  noise: number;
}

function pokerProfile(player: Player): PokerAiProfile {
  return POKER_PROFILE[player.aiDifficulty ?? 'medium'];
}

function pokerRolls(): PokerRolls {
  return {
    value: Math.random(),
    bluff: Math.random(),
    pressure: Math.random(),
    noise: Math.random(),
  };
}

function handRank(player: Player): number {
  return evaluateBestPokerHand(player.cards).score;
}

/** 0–1: weak hands with high cards / live draws look more believable as bluffs. */
function bluffCredibility(player: Player): number {
  const hand = evaluateBestPokerHand(player.cards);
  const top = hand.tiebreakers[0] ?? 0;
  let cred = 0.25 + top / 20;
  if (hand.score >= 2) cred += 0.08;
  const suits = new Set(player.cards.map((c) => c.suit));
  if (suits.size <= 2) cred += 0.06;
  return Math.min(1, cred);
}

function activeOpponents(state: GameState, playerId: number): number {
  return state.players.filter((p) => !state.poker.folded[p.id] && p.id !== playerId).length;
}

function shouldBluff(
  player: Player,
  state: GameState,
  toCall: number,
  rolls: PokerRolls,
  facingBet: boolean
): boolean {
  const profile = pokerProfile(player);
  const rank = handRank(player);
  if (rank >= 4) return false;

  const cred = bluffCredibility(player);
  const opponents = activeOpponents(state, player.id);
  const pot = state.pot.pot;

  let chance = profile.bluffFreq * profile.aggression * (0.55 + cred * 0.45);
  chance *= 0.85 + rolls.noise * 0.3;
  if (facingBet) chance *= 0.55;
  if (toCall > 4) chance *= 0.35;
  if (opponents <= 2) chance *= 1.15;
  if (pot >= 8) chance *= 1.1;

  return rolls.bluff < Math.min(0.65, chance);
}

function shouldValueBet(rank: number, rolls: PokerRolls, profile: PokerAiProfile): boolean {
  if (rank >= 6) return rolls.value < profile.valueFreq * profile.aggression;
  if (rank >= 4) return rolls.value < profile.valueFreq * 0.88 * profile.aggression;
  if (rank >= 3) return rolls.value < profile.valueFreq * 0.72 * profile.aggression;
  if (rank >= 2) return rolls.value < profile.valueFreq * 0.5 * profile.aggression;
  return false;
}

function isBluffAction(player: Player, action: PokerAction): boolean {
  if (action === 'check' || action === 'fold' || action === 'call') return false;
  return handRank(player) <= 2;
}

export function decideDealerBlindChoice(player: Player, state: GameState): DealerBlindChoice {
  const handStrength = estimateHandStrength(player.cards);
  const deadSize = state.deadHand?.length ?? 0;
  const canSwap =
    !handHasPayCard(player.cards) && handStrength < 0.35 && deadSize >= player.cards.length;
  if (canSwap) return 'swap';
  if (state.houseRules.dealerBlindKeepOption && handStrength > 0.55) return 'keep';
  return 'auction';
}

export function decideBlindBid(player: Player, state: GameState, currentHigh: number): number {
  if (handHasPayCard(player.cards)) return 0;
  if (state.blindAuction.passed[player.id]) return 0;
  if (state.blindAuction.highBidder === player.id) return 0;
  if (player.chips <= 0) return 0;

  const strength = estimateHandStrength(player.cards);
  const maxBid = Math.min(player.chips, Math.floor(player.chips * 0.25));
  if (maxBid <= currentHigh) return 0;
  const target = Math.floor(strength * maxBid);
  if (target <= currentHigh) return 0;
  const bid = Math.min(maxBid, currentHigh + 1 + Math.floor(Math.random() * 2));
  if (bid <= currentHigh) return 0;
  return bid;
}

export function decidePokerAction(player: Player, state: GameState): PokerAction {
  const rank = handRank(player);
  const strength = estimateHandStrength(player.cards);
  const toCall = state.poker.currentBet - (state.poker.playerBets[player.id] || 0);
  const profile = pokerProfile(player);
  const rolls = pokerRolls();

  if (state.poker.folded[player.id]) return 'fold';

  if (shouldForceAllInPoker(state)) {
    return toCall > 0 ? 'call' : 'check';
  }

  if (toCall === 0) {
    if (shouldValueBet(rank, rolls, profile)) return 'bet';
    if (shouldBluff(player, state, toCall, rolls, false)) return 'bet';
    if (rank === 1 && rolls.noise < 0.08 * profile.aggression) return 'check';
    return 'check';
  }

  if (rank >= 6) {
    return rolls.pressure < 0.55 * profile.aggression ? 'raise' : 'call';
  }
  if (rank >= 5) {
    return toCall <= 4 && rolls.pressure < 0.42 * profile.aggression ? 'raise' : 'call';
  }
  if (rank >= 4) {
    if (toCall <= 6) return 'call';
    return rolls.value < 0.3 ? 'call' : 'fold';
  }
  if (rank >= 3) {
    if (toCall <= 4) return 'call';
    return rolls.value < 0.38 * profile.foldDiscipline ? 'call' : 'fold';
  }
  if (rank >= 2) {
    if (toCall <= 2) return 'call';
    if (toCall <= 4 && rolls.noise < 0.22 * profile.aggression) return 'call';
    return 'fold';
  }

  if (shouldBluff(player, state, toCall, rolls, true)) {
    return toCall <= 3 ? 'raise' : 'call';
  }
  if (toCall <= 1 && strength > 0.18 && rolls.noise < 0.35) return 'call';
  return 'fold';
}

export function decidePokerBetAmount(
  player: Player,
  state: GameState,
  action: PokerAction = 'bet'
): number {
  const rank = handRank(player);
  const toCall = state.poker.currentBet - (state.poker.playerBets[player.id] || 0);
  const profile = pokerProfile(player);
  const bluff = isBluffAction(player, action);
  const jitter = Math.floor(Math.random() * 3);

  if (bluff) {
    const base = action === 'raise' ? Math.max(2, toCall) : 2;
    const cap = Math.min(player.chips, Math.max(4, Math.floor(player.chips * 0.1)));
    return Math.min(cap, base + jitter);
  }

  const premium = rank >= 7 ? 4 : rank >= 5 ? 3 : rank >= 3 ? 2 : 1;
  const base = action === 'raise' ? Math.max(2, toCall) : 2;
  const cap = Math.min(player.chips, Math.max(6, Math.floor(player.chips * 0.22 * profile.aggression)));
  return Math.min(cap, base + premium + jitter);
}

export function decideMichiganCard(player: Player, state: GameState): Card | null {
  const legal = getLegalMichiganPlays(
    player.cards,
    state.michigan,
    player.id,
    state.currentPlayer
  );
  if (legal.length === 0) return null;
  return legal[0];
}

export function getAIAction(state: GameState): { type: string; payload?: Record<string, unknown> } | null {
  const player = state.players[state.currentPlayer];
  if (!player || player.isHuman) return null;

  switch (state.phase) {
    case 'dealerBlindChoice':
      if (player.id !== state.dealerId) return null;
      return { type: 'DEALER_BLIND_CHOICE', payload: { choice: decideDealerBlindChoice(player, state) } };

    case 'blindAuction': {
      if (player.id === state.dealerId) {
        if (state.blindAuction.awaitingDealerClose) {
          return { type: 'BLIND_AUCTION_RESOLVE' };
        }
        return null;
      }
      const high = state.blindAuction.highBid;
      const bid = decideBlindBid(player, state, high);
      if (bid > high) return { type: 'BLIND_AUCTION_BID', payload: { amount: bid } };
      return { type: 'BLIND_AUCTION_PASS' };
    }

    case 'poker': {
      if (state.poker.folded[player.id] || state.poker.roundComplete || isEliminated(player)) {
        return { type: 'POKER_SYNC_TURN' };
      }
      const action = decidePokerAction(player, state);
      if (action === 'bet' || action === 'raise') {
        return {
          type: 'POKER_ACTION',
          payload: { action, amount: decidePokerBetAmount(player, state, action) },
        };
      }
      return { type: 'POKER_ACTION', payload: { action, amount: 0 } };
    }

    case 'michigan': {
      const card = decideMichiganCard(player, state);
      if (card) {
        return { type: 'MICHIGAN_PLAY', payload: { card } };
      }
      if (canPassLead(player.cards, state.michigan, player.id, state.currentPlayer)) {
        return { type: 'MICHIGAN_PASS_LEAD' };
      }
      return { type: 'MICHIGAN_SYNC_TURN' };
    }

    default:
      return null;
  }
}
