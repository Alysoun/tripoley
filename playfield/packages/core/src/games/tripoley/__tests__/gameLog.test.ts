import { describe, expect, it, beforeEach } from 'vitest';
import type { GameLogEntry, GameState } from '../types';
import {
  appendSessionLogFifo,
  adoptLogCounterFromState,
  createLogEntry,
  ensureUniqueLogIds,
  pushLogMessage,
  resetLogCounter,
  sessionLogEntries,
  UI_LOG_CAP,
} from '../gameLog';
import { initialGameState } from '../reducer';

function gameWithSessionLog(): GameState {
  return {
    ...initialGameState,
    log: [],
    sessionLog: [],
    sessionStartedAt: Date.now(),
    sessionLogDroppedCount: 0,
  };
}

describe('gameLog', () => {
  beforeEach(() => {
    resetLogCounter();
  });

  it('caps UI log while keeping session log for export', () => {
    let state: GameState = gameWithSessionLog();
    for (let i = 0; i < UI_LOG_CAP + 5; i += 1) {
      state = pushLogMessage(state, `line ${i}`);
    }
    expect(state.log.length).toBe(UI_LOG_CAP);
    expect(sessionLogEntries(state).length).toBe(UI_LOG_CAP + 5);
  });

  it('does not accumulate session log before a game starts', () => {
    let state: GameState = { ...initialGameState, log: [] };
    state = pushLogMessage(state, 'setup noise');
    expect(state.sessionLog).toBeUndefined();
  });

  it('adopts counter after reload so new lines do not reuse ids', () => {
    resetLogCounter();
    const restored = gameWithSessionLog();
    restored.log = [
      { id: 'log-12', message: 'saved', type: 'info' },
      { id: 'log-8', message: 'older', type: 'info' },
    ];
    adoptLogCounterFromState(restored);
    const next = createLogEntry('fresh');
    expect(next.id).toBe('log-13');
  });

  it('re-ids duplicate log keys in restored state', () => {
    resetLogCounter();
    const dupes = gameWithSessionLog();
    dupes.log = [
      { id: 'log-3', message: 'a', type: 'info' },
      { id: 'log-3', message: 'b', type: 'info' },
      { id: 'log-4', message: 'c', type: 'info' },
    ];
    const fixed = ensureUniqueLogIds(dupes);
    const ids = fixed.log.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids[0]).toBe('log-3');
    expect(ids[1]).not.toBe('log-3');
  });

  it('keeps the full session log for export (no byte cap)', () => {
    const big = 'x'.repeat(4000);
    let sessionLog: GameLogEntry[] = [];

    for (let i = 0; i < 200; i += 1) {
      const result = appendSessionLogFifo(sessionLog, {
        id: `e-${i}`,
        message: `${big}-${i}`,
        type: 'info',
      });
      sessionLog = result.sessionLog;
      expect(result.dropped).toBe(0);
    }

    expect(sessionLog.length).toBe(200);
    expect(sessionLog[0]?.message).toBe(`${big}-0`);
    expect(sessionLog[199]?.message).toBe(`${big}-199`);
  });
});
