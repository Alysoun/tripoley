import { describe, expect, it } from 'vitest';
import { formatSessionLogText } from '../sessionLogExport';
import { initialGameState } from '../engine/reducer';

describe('sessionLogExport', () => {
  it('formats full session log with header and entries', () => {
    const state = {
      ...initialGameState,
      phase: 'gameOver' as const,
      roundNumber: 12,
      sessionStartedAt: Date.parse('2026-01-15T12:00:00.000Z'),
      recordFullSessionLog: true,
      players: [
        { id: 0, name: 'Ada', isHuman: false, chips: 40, cards: [], originalHand: [] },
        { id: 1, name: 'Bo', isHuman: false, chips: 0, cards: [], originalHand: [] },
      ],
      sessionLog: [
        { id: '1', message: 'Round 1 — 2 players', type: 'info' as const },
        { id: '2', message: 'Ada wins the Kitty!', type: 'success' as const },
      ],
      log: [{ id: '2', message: 'Ada wins the Kitty!', type: 'success' as const }],
    };

    const text = formatSessionLogText(state);
    expect(text).toContain('full session log');
    expect(text).toContain('Round 1 — 2 players');
    expect(text).toContain('[+] Ada wins the Kitty!');
    expect(text).toContain('Ada: 40');
    expect(text).toContain('Bo: 0 (OUT)');
  });
});
