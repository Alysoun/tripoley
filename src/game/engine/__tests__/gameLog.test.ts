import { describe, expect, it, beforeEach } from 'vitest';
import { pushLog, pushLogMessage, resetLogCounter, sessionLogEntries, UI_LOG_CAP } from '../gameLog';
import { initialGameState } from '../reducer';
import type { GameState } from '../../../types/GameTypes';

describe('gameLog', () => {
  beforeEach(() => {
    resetLogCounter();
  });

  it('caps UI log for normal sessions', () => {
    let state: GameState = { ...initialGameState, log: [] };
    for (let i = 0; i < UI_LOG_CAP + 5; i += 1) {
      state = pushLogMessage(state, `line ${i}`);
    }
    expect(state.log.length).toBe(UI_LOG_CAP);
    expect(state.sessionLog).toBeUndefined();
  });

  it('keeps full sessionLog for AI-only tables', () => {
    let state: GameState = {
      ...initialGameState,
      log: [],
      recordFullSessionLog: true,
      sessionLog: [],
    };
    for (let i = 0; i < UI_LOG_CAP + 5; i += 1) {
      state = pushLog(state, {
        id: `e-${i}`,
        message: `event ${i}`,
        type: 'info',
      });
    }
    expect(state.log.length).toBe(UI_LOG_CAP);
    expect(sessionLogEntries(state).length).toBe(UI_LOG_CAP + 5);
  });
});
