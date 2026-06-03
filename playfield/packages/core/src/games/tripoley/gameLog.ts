import type { GameLogEntry, GameState } from './types';

export const UI_LOG_CAP = 40;
/** Rolling session buffer for export/debug — oldest lines drop first (FIFO). */
export const SESSION_LOG_MAX_BYTES = 512 * 1024;

let logCounter = 0;

export function resetLogCounter(): void {
  logCounter = 0;
}

function maxNumericLogId(entries: Iterable<GameLogEntry>): number {
  let max = 0;
  for (const entry of entries) {
    const match = /^log-(\d+)$/.exec(entry.id);
    if (match) max = Math.max(max, Number.parseInt(match[1], 10));
  }
  return max;
}

/** Align the module counter with ids already present (saved sessions, HMR). */
export function adoptLogCounterFromState(state: GameState): void {
  const maxId = maxNumericLogId([...state.log, ...(state.sessionLog ?? [])]);
  logCounter = Math.max(logCounter, maxId);
}

/** Re-id duplicate log lines so React keys stay unique after reload or HMR. */
export function ensureUniqueLogIds(state: GameState): GameState {
  const seen = new Set<string>();
  let nextNum = logCounter;

  const reid = (entries: GameLogEntry[]): GameLogEntry[] =>
    entries.map((entry) => {
      const numeric = /^log-(\d+)$/.exec(entry.id);
      if (numeric) nextNum = Math.max(nextNum, Number.parseInt(numeric[1], 10));

      if (!seen.has(entry.id)) {
        seen.add(entry.id);
        return entry;
      }

      nextNum += 1;
      const id = `log-${nextNum}`;
      seen.add(id);
      return { ...entry, id };
    });

  logCounter = nextNum;
  const log = reid(state.log);
  const sessionLog = state.sessionLog ? reid(state.sessionLog) : state.sessionLog;
  if (sessionLog === state.sessionLog && log === state.log) return state;
  return { ...state, log, sessionLog };
}

export function createLogEntry(
  message: string,
  type: GameLogEntry['type'] = 'info'
): GameLogEntry {
  logCounter += 1;
  return { id: `log-${logCounter}`, message, type };
}

export function sessionLogEntryBytes(entry: GameLogEntry): number {
  return new TextEncoder().encode(`${entry.id}\t${entry.type}\t${entry.message}\n`).length;
}

export function sessionLogByteSize(entries: GameLogEntry[]): number {
  return entries.reduce((sum, entry) => sum + sessionLogEntryBytes(entry), 0);
}

/** Append one line and drop oldest entries until under the byte cap. */
export function appendSessionLogFifo(
  sessionLog: GameLogEntry[] | undefined,
  entry: GameLogEntry,
  maxBytes = SESSION_LOG_MAX_BYTES
): { sessionLog: GameLogEntry[]; dropped: number } {
  let log = [...(sessionLog ?? []), entry];
  let dropped = 0;
  while (log.length > 1 && sessionLogByteSize(log) > maxBytes) {
    log.shift();
    dropped += 1;
  }
  return { sessionLog: log, dropped };
}

/** Rolling UI log; session export log capped at SESSION_LOG_MAX_BYTES. */
export function pushLog(state: GameState, entry: GameLogEntry): GameState {
  const uiLog = [...state.log.slice(-(UI_LOG_CAP - 1)), entry];

  if (state.sessionLog === undefined && state.sessionStartedAt === undefined) {
    return { ...state, log: uiLog };
  }

  const { sessionLog, dropped } = appendSessionLogFifo(state.sessionLog, entry);
  return {
    ...state,
    log: uiLog,
    sessionLog,
    sessionLogDroppedCount: (state.sessionLogDroppedCount ?? 0) + dropped,
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

export function hasExportableSessionLog(state: GameState): boolean {
  return state.phase !== 'setup' && sessionLogEntries(state).length > 0;
}
