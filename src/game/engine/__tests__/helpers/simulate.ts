import { GameAction, GameState, SeatConfig, Card, PokerAction } from '../../../../types/GameTypes';
import { HouseRules } from '../../houseRules';
import { STARTING_CHIPS, POT_SECTION_KEYS } from '../../constants';
import { gameReducer, initialGameState } from '../../reducer';
import { getAIAction } from '../../ai';
import { getLegalMichiganPlays, canPassLead } from '../../michigan';
import { michiganRecoveryActions } from '../../michiganRecovery';

export function totalChipsInSystem(state: GameState): number {
  const playerTotal = state.players.reduce((sum, p) => sum + p.chips, 0);
  const potTotal = POT_SECTION_KEYS.reduce((sum, key) => sum + state.pot[key], 0);
  return playerTotal + potTotal;
}

export function allCardsAccountedFor(state: GameState): boolean {
  const seen = new Set<string>();
  const note = (cards: Card[]) => {
    for (const c of cards) {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
    }
    return true;
  };

  for (const p of state.players) {
    if (!note(p.cards)) return false;
  }
  if (!note(state.deadHand)) return false;
  if (!note(state.michiganPlayArea)) return false;

  return seen.size <= 52;
}

export function aiSeats(count: number): SeatConfig[] {
  return Array.from({ length: count }, () => ({ isHuman: false }));
}

function aiPayloadToAction(raw: ReturnType<typeof getAIAction>): GameAction | null {
  if (!raw) return null;

  switch (raw.type) {
    case 'DEALER_BLIND_CHOICE':
      return {
        type: 'DEALER_BLIND_CHOICE',
        choice: raw.payload!.choice as 'swap' | 'auction' | 'keep',
      };
    case 'BLIND_AUCTION_BID':
      return { type: 'BLIND_AUCTION_BID', amount: raw.payload!.amount as number };
    case 'BLIND_AUCTION_PASS':
      return { type: 'BLIND_AUCTION_PASS' };
    case 'BLIND_AUCTION_RESOLVE':
      return { type: 'BLIND_AUCTION_RESOLVE' };
    case 'POKER_ACTION':
      return {
        type: 'POKER_ACTION',
        action: raw.payload!.action as PokerAction,
        amount: raw.payload!.amount as number,
      };
    case 'MICHIGAN_PLAY':
      return { type: 'MICHIGAN_PLAY', card: raw.payload!.card as Card };
    case 'MICHIGAN_PASS_LEAD':
      return { type: 'MICHIGAN_PASS_LEAD' };
    case 'MICHIGAN_SYNC_TURN':
      return { type: 'MICHIGAN_SYNC_TURN' };
    case 'POKER_SYNC_TURN':
      return { type: 'POKER_SYNC_TURN' };
    default:
      return null;
  }
}

/** Pick the next automated action for an all-AI simulation (no UI timers). */
export function resolveAutomationAction(state: GameState): GameAction | null {
  if (state.phase === 'announcement') return { type: 'DISMISS_ANNOUNCEMENT' };
  if (state.phase === 'roundSummary') return { type: 'START_NEW_ROUND' };
  if (state.phase === 'payCards') return { type: 'ADVANCE_PHASE' };

  const player = state.players[state.currentPlayer];
  if (!player) return null;

  if (state.phase === 'michigan') {
    const legal = getLegalMichiganPlays(
      player.cards,
      state.michigan,
      player.id,
      state.currentPlayer
    );
    if (legal.length === 0) {
      if (canPassLead(player.cards, state.michigan, player.id, state.currentPlayer)) {
        return { type: 'MICHIGAN_PASS_LEAD' };
      }
      return { type: 'MICHIGAN_SYNC_TURN' };
    }
  }

  if (state.phase === 'poker' && state.poker.folded[player.id]) {
    return { type: 'POKER_SYNC_TURN' };
  }

  const aiAction = aiPayloadToAction(getAIAction(state));
  if (aiAction) return aiAction;

  if (state.phase === 'michigan') {
    const legal = getLegalMichiganPlays(
      player.cards,
      state.michigan,
      player.id,
      state.currentPlayer
    );
    if (legal.length > 0) {
      return { type: 'MICHIGAN_PLAY', card: legal[0] };
    }
  }

  return null;
}

/** Fallback when Michigan turn sync is a no-op (sequence card unavailable, etc.). */
function michiganRecoveryActionsForSim(state: GameState): GameAction[] {
  return [...michiganRecoveryActions(state), { type: 'ACTION_TIMER_EXPIRE' }];
}

function dispatchWithRecovery(state: GameState, action: GameAction): GameState {
  let next = gameReducer(state, action);
  if (next !== state || state.phase !== 'michigan') return next;

  for (const fallback of michiganRecoveryActionsForSim(state)) {
    if (fallback.type === action.type) continue;
    next = gameReducer(state, fallback);
    if (next !== state) return next;
  }

  const player = state.players[state.currentPlayer];
  if (player) {
    const legal = getLegalMichiganPlays(
      player.cards,
      state.michigan,
      player.id,
      state.currentPlayer
    );
    if (legal.length > 0) {
      next = gameReducer(state, { type: 'MICHIGAN_PLAY', card: legal[0] });
      if (next !== state) return next;
    }
  }

  return next;
}

export interface SimulationOptions {
  playerCount: number;
  houseRules: HouseRules;
  maxSteps?: number;
  maxRounds?: number;
}

export interface SimulationResult {
  finalState: GameState;
  steps: number;
  stuck: boolean;
  stuckPhase?: string;
  roundsCompleted: number;
}

export function simulateGame(options: SimulationOptions): SimulationResult {
  const { playerCount, houseRules, maxSteps = 200_000, maxRounds } = options;
  let state = gameReducer(initialGameState, {
    type: 'START_GAME',
    seats: aiSeats(playerCount),
    houseRules,
  });

  const expectedTotal = STARTING_CHIPS * playerCount;
  let steps = 0;
  let roundsCompleted = 0;
  let lastRound = state.roundNumber;

  while (steps < maxSteps && state.phase !== 'gameOver') {
    if (state.phase === 'setup') break;

    let action = resolveAutomationAction(state);
    if (!action) {
      if (state.phase === 'michigan') action = { type: 'MICHIGAN_SYNC_TURN' };
      else if (state.phase === 'poker') action = { type: 'POKER_SYNC_TURN' };
      else {
        return {
          finalState: state,
          steps,
          stuck: true,
          stuckPhase: state.phase,
          roundsCompleted,
        };
      }
    }

    const prev = state;
    state = dispatchWithRecovery(state, action);

    if (state === prev) {
      return {
        finalState: state,
        steps,
        stuck: true,
        stuckPhase: `${state.phase}:no-op`,
        roundsCompleted,
      };
    }

    const total = totalChipsInSystem(state);
    if (total !== expectedTotal) {
      throw new Error(
        `Chip conservation violated at step ${steps} (phase=${state.phase}, action=${action.type}): expected ${expectedTotal}, got ${total}`
      );
    }

    if (!allCardsAccountedFor(state)) {
      throw new Error(`Duplicate card detected at step ${steps} (phase=${state.phase})`);
    }

    if (state.roundNumber > lastRound) {
      roundsCompleted += 1;
      lastRound = state.roundNumber;
      if (maxRounds !== undefined && roundsCompleted >= maxRounds) {
        return { finalState: state, steps, stuck: false, roundsCompleted };
      }
    }

    steps += 1;
  }

  return {
    finalState: state,
    steps,
    stuck: state.phase !== 'gameOver' && steps >= maxSteps,
    stuckPhase: state.phase !== 'gameOver' ? state.phase : undefined,
    roundsCompleted,
  };
}

export function startGame(playerCount: number, houseRules: HouseRules): GameState {
  return gameReducer(initialGameState, {
    type: 'START_GAME',
    seats: aiSeats(playerCount),
    houseRules,
  });
}

export function dispatch(state: GameState, action: GameAction): GameState {
  return gameReducer(state, action);
}
