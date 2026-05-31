import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  advanceKonamiInput,
  enableSpectatorUnlock,
  clearSpectatorUnlock,
  isSpectatorAutoPlay,
  isSpectatorUnlocked,
  resetKonamiProgress,
} from '../spectatorMode';
import { initialGameState } from '../engine/reducer';

describe('spectatorMode', () => {
  beforeEach(() => {
    const bag = new Map<string, string>();
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => bag.get(key) ?? null,
      setItem: (key: string, value: string) => {
        bag.set(key, value);
      },
      removeItem: (key: string) => {
        bag.delete(key);
      },
    });
    clearSpectatorUnlock();
    resetKonamiProgress();
  });

  it('unlocks with the Konami letter sequence', () => {
    const seq = 'uuddlrlrba';
    for (let i = 0; i < seq.length - 1; i += 1) {
      expect(advanceKonamiInput('', seq[i]!)).toBe(false);
    }
    expect(advanceKonamiInput('', seq[seq.length - 1]!)).toBe(true);
    enableSpectatorUnlock();
    expect(isSpectatorUnlocked()).toBe(true);
  });

  it('auto-play only when unlocked and all seats are AI', () => {
    enableSpectatorUnlock();
    const allAi = {
      ...initialGameState,
      players: [
        { id: 0, name: 'A', isHuman: false, chips: 200, cards: [], originalHand: [] },
        { id: 1, name: 'B', isHuman: false, chips: 200, cards: [], originalHand: [] },
      ],
    };
    const withHuman = {
      ...allAi,
      players: [{ ...allAi.players[0], isHuman: true }, allAi.players[1]],
    };
    expect(isSpectatorAutoPlay(allAi)).toBe(true);
    expect(isSpectatorAutoPlay(withHuman)).toBe(false);
  });
});
