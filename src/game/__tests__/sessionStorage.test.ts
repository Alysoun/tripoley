import { beforeEach, describe, expect, it, vi } from 'vitest';
import { initialGameState } from '@playfield/core';
import { clearGameSession, loadGameSession, saveGameSession } from '../sessionStorage';

describe('game session persistence', () => {
  const store = new Map<string, string>();

  beforeEach(() => {
    store.clear();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    });
    clearGameSession();
  });

  it('round-trips an in-progress game', () => {
    const midGame = {
      ...initialGameState,
      players: [
        {
          id: 0,
          name: 'You',
          isHuman: true,
          chips: 150,
          cards: [],
          originalHand: [],
        },
      ],
      phase: 'poker' as const,
      roundNumber: 3,
    };
    saveGameSession(midGame);
    const loaded = loadGameSession();
    expect(loaded?.phase).toBe('poker');
    expect(loaded?.roundNumber).toBe(3);
    expect(loaded?.players[0].chips).toBe(150);
  });

  it('does not save or restore game over', () => {
    saveGameSession({
      ...initialGameState,
      players: [{ id: 0, name: 'You', isHuman: true, chips: 0, cards: [], originalHand: [] }],
      phase: 'gameOver',
    });
    expect(store.has('tripoley-active-session')).toBe(false);
    expect(loadGameSession()).toBeNull();
  });
});
