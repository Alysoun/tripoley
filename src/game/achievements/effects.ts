import {

  AchievementId,

  AchievementPreferences,

  AchievementSaveData,

  AchievementUnlock,

  ActiveAchievementEffects,

  DEFAULT_PREFERENCES,

  FeltColor,

  NO_ACTIVE_EFFECTS,

  VictoryFanfareVariant,

} from './types';



const UNLOCK_PREFERENCE_KEY: Partial<

  Record<AchievementUnlock, keyof AchievementPreferences>

> = {

  timer_bonus_3s: 'timerBonus3s',

  timer_bonus_4s: 'timerBonus4s',

  faint_trace: 'faintTrace',

  adrenaline_buffer: 'adrenalineBuffer',

  grace_interval: 'graceInterval',

  suit_peek_cues: 'suitPeekCues',

  neon_tracers: 'neonTracers',

  gilded_borders: 'gildedBorders',

  retro_sounds: 'retroSounds',

  pot_firework: 'potFirework',

  sort_by_rank: 'sortByRank',

  red_scan: 'redScan',

  opponent_counts: 'opponentCounts',

  ghost_counter: 'ghostCounter',

  action_focus: 'actionFocus',

  instant_fan: 'instantFan',

};



const FELT_UNLOCK: Partial<Record<FeltColor, AchievementId>> = {

  tabby: 'kitty_cat',

  royal: 'high_roller',

  vaporwave: 'the_purist',

};



export function preferenceKeyForUnlock(

  unlock: AchievementUnlock

): keyof AchievementPreferences | null {

  return UNLOCK_PREFERENCE_KEY[unlock] ?? null;

}



export function isFeltUnlocked(data: AchievementSaveData, color: FeltColor): boolean {

  if (color === 'classic') return true;

  const id = FELT_UNLOCK[color];

  return id ? isUnlocked(data, id) : false;

}



function isUnlocked(data: AchievementSaveData, id: AchievementId): boolean {

  return data.achievements[id]?.unlockedAt != null;

}



function resolveFeltColor(data: AchievementSaveData): FeltColor {

  const preferred = data.preferences.feltColor;

  return isFeltUnlocked(data, preferred) ? preferred : 'classic';

}



/** Resolve active perks from unlocks + preference toggles. */

export function getActiveEffects(

  data: AchievementSaveData,

  adrenalineFreezeMs = 0

): ActiveAchievementEffects {

  const p = data.preferences;

  const u = (id: AchievementId) => isUnlocked(data, id);



  let timerBonusMs = 0;

  if (u('cool_head') && p.timerBonus3s) timerBonusMs += 3000;

  if (u('table_regular') && p.timerBonus4s) timerBonusMs += 4000;



  const graceIntervalMs =

    u('patience_pays') && p.graceInterval ? 1000 : 0;



  const victoryFanfare: VictoryFanfareVariant =

    u('last_man_standing') ? p.victoryFanfare : 'classic';



  return {

    feltColor: resolveFeltColor(data),

    timerBonusMs,

    graceIntervalMs,

    faintTrace: u('calculated_risk') && p.faintTrace,

    adrenalineBuffer: u('down_to_the_wire') && p.adrenalineBuffer,

    suitPeekCues: u('grand_strategist') && p.suitPeekCues,

    neonTracers: u('perfect_run') && p.neonTracers,

    gildedBorders: u('auction_master') && p.gildedBorders,

    retroSounds: u('sound_machine') && p.retroSounds,

    potFirework: u('clean_sweep') && p.potFirework,

    sortByRank: u('poker_face') && p.sortByRank,

    redScan: u('heart_hunter') && p.redScan,

    opponentCounts: u('iron_will') && p.opponentCounts,

    ghostCounter: u('dead_eye') && p.ghostCounter,

    actionFocus: u('veteran') && p.actionFocus,

    instantFan: u('swift_lead') && p.instantFan,

    victoryFanfare,

    adrenalineFreezeMs:

      u('down_to_the_wire') && p.adrenalineBuffer ? adrenalineFreezeMs : 0,

  };

}



export function getActiveEffectsForGameplay(

  data: AchievementSaveData | null,

  isSoloSession: boolean,

  adrenalineFreezeMs = 0

): ActiveAchievementEffects {

  if (!data || !isSoloSession) return NO_ACTIVE_EFFECTS;

  return getActiveEffects(data, adrenalineFreezeMs);

}



export function setPreference<K extends keyof AchievementPreferences>(

  data: AchievementSaveData,

  key: K,

  value: AchievementPreferences[K]

): void {

  data.preferences[key] = value;

}



export function migratePreferences(raw: Partial<AchievementSaveData>): AchievementPreferences {

  const merged = { ...DEFAULT_PREFERENCES, ...raw.preferences };

  const felt = merged.feltColor;

  if (felt === 'royal_blue' as FeltColor) merged.feltColor = 'royal';

  if (felt === 'casino_red' as FeltColor) merged.feltColor = 'tabby';

  if (!['classic', 'tabby', 'royal', 'vaporwave'].includes(merged.feltColor)) {

    merged.feltColor = 'classic';

  }

  if (!['classic', 'warm', 'triumph'].includes(merged.victoryFanfare)) {

    merged.victoryFanfare = 'classic';

  }

  return merged;

}


