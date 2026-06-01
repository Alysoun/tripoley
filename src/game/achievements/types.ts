export type AchievementId =

  | 'cool_head'

  | 'table_regular'

  | 'calculated_risk'

  | 'down_to_the_wire'

  | 'patience_pays'

  | 'grand_strategist'

  | 'kitty_cat'
  | 'kitty_whisperer'

  | 'high_roller'

  | 'perfect_run'

  | 'auction_master'

  | 'the_purist'

  | 'sound_machine'

  | 'clean_sweep'

  | 'poker_face'

  | 'heart_hunter'

  | 'iron_will'

  | 'dead_eye'

  | 'veteran'

  | 'swift_lead'

  | 'last_man_standing';



export type FeltColor = 'classic' | 'tabby' | 'royal' | 'vaporwave';



export type VictoryFanfareVariant = 'classic' | 'warm' | 'triumph';



export type AchievementCategory = 'time' | 'cosmetic' | 'qol';



/** Permanent unlock effect id — never changes chip counts or pot values. */

export type AchievementUnlock =

  | 'timer_bonus_3s'

  | 'timer_bonus_4s'

  | 'faint_trace'

  | 'adrenaline_buffer'

  | 'grace_interval'

  | 'suit_peek_cues'

  | 'felt_tabby'

  | 'felt_royal'

  | 'neon_tracers'

  | 'gilded_borders'

  | 'felt_vaporwave'

  | 'retro_sounds'

  | 'pot_firework'

  | 'sort_by_rank'

  | 'red_scan'

  | 'opponent_counts'

  | 'ghost_counter'

  | 'action_focus'

  | 'instant_fan'
  | 'cat_walk'

  | 'fanfare_picker';



export interface AchievementPreferences {

  feltColor: FeltColor;

  timerBonus3s: boolean;

  timerBonus4s: boolean;

  faintTrace: boolean;

  adrenalineBuffer: boolean;

  graceInterval: boolean;

  suitPeekCues: boolean;

  neonTracers: boolean;

  gildedBorders: boolean;

  retroSounds: boolean;

  potFirework: boolean;

  sortByRank: boolean;

  redScan: boolean;

  opponentCounts: boolean;

  ghostCounter: boolean;

  actionFocus: boolean;

  instantFan: boolean;
  catWalk: boolean;

  victoryFanfare: VictoryFanfareVariant;

}



export const DEFAULT_PREFERENCES: AchievementPreferences = {

  feltColor: 'classic',

  timerBonus3s: true,

  timerBonus4s: true,

  faintTrace: true,

  adrenalineBuffer: true,

  graceInterval: true,

  suitPeekCues: true,

  neonTracers: true,

  gildedBorders: true,

  retroSounds: true,

  potFirework: true,

  sortByRank: true,

  redScan: true,

  opponentCounts: true,

  ghostCounter: true,

  actionFocus: true,

  instantFan: true,
  catWalk: true,

  victoryFanfare: 'classic',

};



export interface AchievementDef {

  id: AchievementId;

  title: string;

  description: string;

  perkLabel: string;

  unlock: AchievementUnlock;

  target?: number;

  category: AchievementCategory;

}



export interface LifetimeStats {

  gamesStarted: number;

  roundsCompleted: number;

  sessionRoundsCompleted: number;

  michiganWins: number;

  pokerWins: number;

  payCardsClaimed: number;

  blindAuctionsWon: number;

  largestPokerPot: number;

  michiganWinsWithoutTimeout: number;

  pokerFullHouseOrBetterWins: number;

  cleanSweepPokerWins: number;

  ironWillPokerWins: number;

  deadEyeBlindBuys: number;

  aiBusts: number;

  swiftLeadPlays: number;

  grandStrategistWins: number;

  calculatedRiskSwaps: number;

  perfectRunTurns: number;

  puristGamesCompleted: number;

}



export interface AchievementProgress {

  unlockedAt: number | null;

  progress: number;

}



export interface AchievementSaveData {

  stats: LifetimeStats;

  achievements: Record<AchievementId, AchievementProgress>;

  preferences: AchievementPreferences;

}



export interface AchievementUnlockEvent {

  id: AchievementId;

  title: string;

  perkLabel: string;

}



export interface ActiveAchievementEffects {

  feltColor: FeltColor;

  timerBonusMs: number;

  graceIntervalMs: number;

  faintTrace: boolean;

  adrenalineBuffer: boolean;

  suitPeekCues: boolean;

  neonTracers: boolean;

  gildedBorders: boolean;

  retroSounds: boolean;

  potFirework: boolean;

  sortByRank: boolean;

  redScan: boolean;

  opponentCounts: boolean;

  ghostCounter: boolean;

  actionFocus: boolean;

  instantFan: boolean;
  catWalk: boolean;

  victoryFanfare: VictoryFanfareVariant;

  /** Next Michigan sequence timer gets +2s freeze (one-shot per round). */

  adrenalineFreezeMs: number;

}



export const NO_ACTIVE_EFFECTS: ActiveAchievementEffects = {

  feltColor: 'classic',

  timerBonusMs: 0,

  graceIntervalMs: 0,

  faintTrace: false,

  adrenalineBuffer: false,

  suitPeekCues: false,

  neonTracers: false,

  gildedBorders: false,

  retroSounds: false,

  potFirework: false,

  sortByRank: false,

  redScan: false,

  opponentCounts: false,

  ghostCounter: false,

  actionFocus: false,

  instantFan: false,
  catWalk: false,

  victoryFanfare: 'classic',

  adrenalineFreezeMs: 0,

};


