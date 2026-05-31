import type { GameLogEntry, GameState } from '../../types/GameTypes';

export const UI_LOG_CAP = 40;

let logCounter = 0;

export function resetLogCounter(): void {
  logCounter = 0;
}

export function createLogEntry(
  message: string,
  type: GameLogEntry['type'] = 'info'
): GameLogEntry {
  logCounter += 1;
  return { id: `log-${logCounter}`, message, type };
}

/** Rolling UI log; full `sessionLog` when `recordFullSessionLog` (AI-only tables). */
export function pushLog(state: GameState, entry: GameLogEntry): GameState {
  const uiLog = [...state.log.slice(-(UI_LOG_CAP - 1)), entry];
  if (!state.recordFullSessionLog) {
    return { ...state, log: uiLog };
  }
  return {
    ...state,
    log: uiLog,
    sessionLog: [...(state.sessionLog ?? []), entry],
  };
}

export function pushLogMessage(
  state: GameState,
  message: string,
  type: GameLogEntry['type'] = 'info'
): GameState {
  return pushLog(state, createLogEntry(message, type));
}

export function sessionLogEntries(state: GameState): GameLogEntry[] {
  return state.sessionLog ?? state.log;
}
