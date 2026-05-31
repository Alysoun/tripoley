import { GameState, Player } from '../../types/GameTypes';
import { displayPlayerName } from '../../utils/playerName';

export function isEliminated(player: Player | undefined): boolean {
  return !player || player.chips <= 0;
}

export function inGamePlayers(state: GameState): Player[] {
  return state.players.filter((p) => !isEliminated(p));
}

export function clampPlayerChips(players: Player[]): Player[] {
  return players.map((p) => (p.chips < 0 ? { ...p, chips: 0 } : p));
}

/** Next seat with chips, searching left from fromId (exclusive). */
export function nextInGamePlayer(state: GameState, fromId: number): number | null {
  const n = state.players.length;
  if (n === 0) return null;

  for (let i = 1; i <= n; i += 1) {
    const id = (fromId + i) % n;
    if (!isEliminated(state.players[id])) return id;
  }
  return null;
}

export function firstInGameLeftOfDealer(state: GameState): number {
  return nextInGamePlayer(state, state.dealerId) ?? state.dealerId;
}

export function nextInGameDealer(state: GameState): number {
  const n = state.players.length;
  for (let i = 1; i <= n; i += 1) {
    const id = (state.dealerId + i) % n;
    if (!isEliminated(state.players[id])) return id;
  }
  return state.dealerId;
}

function eliminationLogName(player: Player): string {
  return displayPlayerName(player);
}

function autoFoldEliminated(state: GameState): GameState {
  if (state.phase !== 'poker') return state;

  let folded = { ...state.poker.folded };
  let changed = false;
  for (const p of state.players) {
    if (isEliminated(p) && !folded[p.id]) {
      folded[p.id] = true;
      changed = true;
    }
  }
  if (!changed) return state;
  return { ...state, poker: { ...state.poker, folded } };
}

function skipEliminatedCurrentPlayer(state: GameState): GameState {
  const current = state.players[state.currentPlayer];
  if (!isEliminated(current)) return state;
  // Busted players still play out Michigan if they hold cards (sequence / kitty).
  if (state.phase === 'michigan' && current.cards.length > 0) return state;
  const nextId = nextInGamePlayer(state, state.currentPlayer);
  if (nextId === null || nextId === state.currentPlayer) return state;
  return { ...state, currentPlayer: nextId };
}

function gameOverState(state: GameState, message: string): GameState {
  return {
    ...state,
    phase: 'gameOver',
    announcement: null,
    announcementContinue: null,
    log: [
      ...state.log.slice(-39),
      {
        id: `log-go-${Date.now()}`,
        message,
        type: 'error' as const,
      },
    ],
  };
}

/** Clamp negative balances, fold busted players, end solo games when human is out. */
export function finalizePlayerStatus(state: GameState, prev: GameState): GameState {
  if (state.phase === 'setup' || state.phase === 'gameOver') return state;

  let next: GameState = {
    ...state,
    players: clampPlayerChips(state.players),
  };

  const newlyBusted = next.players.filter(
    (p) => isEliminated(p) && (prev.players[p.id]?.chips ?? 0) > 0
  );
  for (const p of newlyBusted) {
    next = {
      ...next,
      log: [
        ...next.log.slice(-39),
        {
          id: `log-out-${p.id}-${Date.now()}`,
          message: `${eliminationLogName(p)} is out — no chips remaining`,
          type: 'error' as const,
        },
      ],
    };
  }

  next = autoFoldEliminated(next);

  const human = next.players.find((p) => p.isHuman);
  if (human && isEliminated(human)) {
    return gameOverState(next, `${eliminationLogName(human)} is out of chips.`);
  }

  const survivors = inGamePlayers(next);
  if (survivors.length <= 1 && next.players.length > 1 && next.phase !== 'setup') {
    const winner = survivors[0];
    const msg = winner
      ? `${eliminationLogName(winner)} wins — last player standing.`
      : 'Everyone is out of chips.';
    return gameOverState(next, msg);
  }

  return skipEliminatedCurrentPlayer(next);
}
