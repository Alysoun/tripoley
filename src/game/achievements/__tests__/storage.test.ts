import { beforeEach, describe, expect, it, vi } from 'vitest';
import { recordBlindAuctionWin } from '../evaluate';
import { loadAchievementData, defaultSaveData } from '../storage';

describe('achievement storage load', () => {
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
  });

  it('syncs progress bars from lifetime stats on load', () => {
    const raw = defaultSaveData();
    raw.stats.blindAuctionsWon = 3;
    raw.achievements.auction_master.progress = 0;
    store.set('tripoley-achievements-v3', JSON.stringify(raw));

    const loaded = loadAchievementData();
    expect(loaded.stats.blindAuctionsWon).toBe(3);
    expect(loaded.achievements.auction_master.progress).toBe(3);

    recordBlindAuctionWin(loaded);
    expect(loaded.stats.blindAuctionsWon).toBe(4);
    expect(loaded.achievements.auction_master.progress).toBe(4);
  });
});
