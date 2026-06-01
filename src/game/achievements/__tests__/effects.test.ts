import { describe, expect, it } from 'vitest';
import { getActiveEffects, getActiveEffectsForGameplay, isFeltUnlocked } from '../effects';
import { defaultSaveData } from '../storage';
import type { AchievementId } from '../types';

function freshSave() {
  return defaultSaveData();
}

function unlock(data: ReturnType<typeof freshSave>, id: AchievementId) {
  data.achievements[id].unlockedAt = Date.now();
}

describe('achievement active effects', () => {
  it('returns no effects outside solo sessions', () => {
    const data = freshSave();
    unlock(data, 'cool_head');
    expect(getActiveEffectsForGameplay(data, false)).toMatchObject({
      timerBonusMs: 0,
      faintTrace: false,
    });
  });

  it('stacks timer bonuses from cool head and table regular', () => {
    const data = freshSave();
    unlock(data, 'cool_head');
    unlock(data, 'table_regular');
    expect(getActiveEffects(data).timerBonusMs).toBe(7000);
  });

  it('respects preference toggles', () => {
    const data = freshSave();
    unlock(data, 'calculated_risk');
    data.preferences.faintTrace = false;
    expect(getActiveEffects(data).faintTrace).toBe(false);

    data.preferences.faintTrace = true;
    expect(getActiveEffects(data).faintTrace).toBe(true);
  });

  it('maps unlocked achievements to their perk flags', () => {
    const data = freshSave();
    const mapping: Array<[AchievementId, keyof ReturnType<typeof getActiveEffects>]> = [
      ['calculated_risk', 'faintTrace'],
      ['down_to_the_wire', 'adrenalineBuffer'],
      ['patience_pays', 'graceIntervalMs'],
      ['grand_strategist', 'suitPeekCues'],
      ['perfect_run', 'neonTracers'],
      ['auction_master', 'gildedBorders'],
      ['sound_machine', 'retroSounds'],
      ['clean_sweep', 'potFirework'],
      ['poker_face', 'sortByRank'],
      ['heart_hunter', 'redScan'],
      ['iron_will', 'opponentCounts'],
      ['dead_eye', 'ghostCounter'],
      ['veteran', 'actionFocus'],
      ['swift_lead', 'instantFan'],
      ['kitty_whisperer', 'catWalk'],
    ];

    for (const [id, key] of mapping) {
      const solo = freshSave();
      unlock(solo, id);
      const effects = getActiveEffects(solo);
      if (key === 'graceIntervalMs') {
        expect(effects.graceIntervalMs).toBe(1000);
      } else {
        expect(effects[key]).toBe(true);
      }
    }
  });

  it('passes adrenaline freeze only when down to the wire is unlocked and enabled', () => {
    const data = freshSave();
    unlock(data, 'down_to_the_wire');
    expect(getActiveEffects(data, 2000).adrenalineFreezeMs).toBe(2000);
    data.preferences.adrenalineBuffer = false;
    expect(getActiveEffects(data, 2000).adrenalineFreezeMs).toBe(0);
  });

  it('respects cat walk toggle', () => {
    const data = freshSave();
    unlock(data, 'kitty_whisperer');
    data.preferences.catWalk = false;
    expect(getActiveEffects(data).catWalk).toBe(false);
    data.preferences.catWalk = true;
    expect(getActiveEffects(data).catWalk).toBe(true);
  });

  it('falls back to classic felt when cosmetic unlock is missing', () => {
    const data = freshSave();
    data.preferences.feltColor = 'royal';
    expect(getActiveEffects(data).feltColor).toBe('classic');
    expect(isFeltUnlocked(data, 'royal')).toBe(false);

    unlock(data, 'high_roller');
    expect(isFeltUnlocked(data, 'royal')).toBe(true);
    expect(getActiveEffects(data).feltColor).toBe('royal');
  });

  it('uses victory fanfare picker only after last man standing', () => {
    const data = freshSave();
    expect(getActiveEffects(data).victoryFanfare).toBe('classic');
    unlock(data, 'last_man_standing');
    data.preferences.victoryFanfare = 'triumph';
    expect(getActiveEffects(data).victoryFanfare).toBe('triumph');
  });
});
