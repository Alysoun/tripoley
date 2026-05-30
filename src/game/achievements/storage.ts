import { ACHIEVEMENT_DEFINITIONS } from './definitions';

import {
  AchievementId,
  AchievementProgress,
  AchievementSaveData,
  LifetimeStats,
} from './types';

import { migratePreferences } from './effects';



const STORAGE_KEY = 'tripoley-achievements-v3';

const LEGACY_KEYS = ['tripoley-achievements-v2', 'tripoley-achievements-v1'];



export const DEFAULT_STATS: LifetimeStats = {

  gamesStarted: 0,

  roundsCompleted: 0,

  sessionRoundsCompleted: 0,

  michiganWins: 0,

  pokerWins: 0,

  payCardsClaimed: 0,

  blindAuctionsWon: 0,

  largestPokerPot: 0,

  michiganWinsWithoutTimeout: 0,

  pokerFullHouseOrBetterWins: 0,

  cleanSweepPokerWins: 0,

  ironWillPokerWins: 0,

  deadEyeBlindBuys: 0,

  aiBusts: 0,

  swiftLeadPlays: 0,

  grandStrategistWins: 0,

  calculatedRiskSwaps: 0,

  perfectRunTurns: 0,

  puristGamesCompleted: 0,

};



function defaultProgress(): Record<AchievementId, AchievementProgress> {

  return Object.fromEntries(

    ACHIEVEMENT_DEFINITIONS.map((def) => [def.id, { unlockedAt: null, progress: 0 }])

  ) as Record<AchievementId, AchievementProgress>;

}



export function defaultSaveData(): AchievementSaveData {

  return {

    stats: { ...DEFAULT_STATS },

    achievements: defaultProgress(),

    preferences: { ...migratePreferences({}) },

  };

}



function loadLegacyRaw(): Partial<AchievementSaveData> | null {

  for (const key of [STORAGE_KEY, ...LEGACY_KEYS]) {

    try {

      const raw = localStorage.getItem(key);

      if (raw) return JSON.parse(raw) as Partial<AchievementSaveData>;

    } catch {

      /* try next */

    }

  }

  return null;

}



export function loadAchievementData(): AchievementSaveData {

  try {

    const parsed = loadLegacyRaw();

    if (!parsed) return defaultSaveData();

    const base = defaultSaveData();

    return {

      stats: { ...base.stats, ...parsed.stats },

      achievements: { ...base.achievements, ...parsed.achievements },

      preferences: migratePreferences(parsed),

    };

  } catch {

    return defaultSaveData();

  }

}



export function saveAchievementData(data: AchievementSaveData): void {

  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

}



export function isUnlocked(data: AchievementSaveData, id: AchievementId): boolean {

  return data.achievements[id]?.unlockedAt != null;

}



export function isUnlockTypeActive(

  data: AchievementSaveData,

  unlock: (typeof ACHIEVEMENT_DEFINITIONS)[number]['unlock']

): boolean {

  return ACHIEVEMENT_DEFINITIONS.some(

    (def) => def.unlock === unlock && isUnlocked(data, def.id)

  );

}


