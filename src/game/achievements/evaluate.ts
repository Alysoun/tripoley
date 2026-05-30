import { ACHIEVEMENT_BY_ID, ACHIEVEMENT_DEFINITIONS } from './definitions';

import {

  AchievementId,

  AchievementProgress,

  AchievementSaveData,

  AchievementUnlockEvent,

  LifetimeStats,

} from './types';



function setProgress(

  data: AchievementSaveData,

  id: AchievementId,

  progress: number

): void {

  const entry = data.achievements[id];

  if (!entry || entry.unlockedAt) return;

  entry.progress = Math.max(entry.progress, progress);

}



function unlock(

  data: AchievementSaveData,

  id: AchievementId,

  events: AchievementUnlockEvent[]

): void {

  const entry = data.achievements[id];

  if (!entry || entry.unlockedAt) return;

  entry.unlockedAt = Date.now();

  const def = ACHIEVEMENT_BY_ID[id];

  events.push({ id, title: def.title, perkLabel: def.perkLabel });

}



function progressForStat(data: AchievementSaveData, id: AchievementId): number {

  const stats = data.stats;

  switch (id) {

    case 'table_regular':

      return stats.sessionRoundsCompleted;

    case 'veteran':

      return stats.roundsCompleted;

    case 'auction_master':

      return stats.blindAuctionsWon;

    case 'sound_machine':

    case 'heart_hunter':

      return stats.payCardsClaimed;

    default:

      return data.achievements[id]?.progress ?? 0;

  }

}



export function syncProgressFromStats(data: AchievementSaveData): void {

  for (const def of ACHIEVEMENT_DEFINITIONS) {

    if (def.target != null) {

      setProgress(data, def.id, progressForStat(data, def.id));

    }

  }

}



export function evaluateUnlocks(data: AchievementSaveData): AchievementUnlockEvent[] {

  syncProgressFromStats(data);

  const events: AchievementUnlockEvent[] = [];



  for (const def of ACHIEVEMENT_DEFINITIONS) {

    if (data.achievements[def.id]?.unlockedAt) continue;



    if (def.target != null) {

      if (data.achievements[def.id].progress >= def.target) {

        unlock(data, def.id, events);

      }

      continue;

    }



    switch (def.id) {

      case 'cool_head':

        if (data.stats.michiganWinsWithoutTimeout >= 1) unlock(data, def.id, events);

        break;

      case 'calculated_risk':

        if (data.stats.calculatedRiskSwaps >= 1) unlock(data, def.id, events);

        break;

      case 'down_to_the_wire':

        if (data.achievements.down_to_the_wire.progress >= 1) unlock(data, def.id, events);

        break;

      case 'patience_pays':

        if (data.achievements.patience_pays.progress >= 1) unlock(data, def.id, events);

        break;

      case 'grand_strategist':

        if (data.stats.grandStrategistWins >= 1) unlock(data, def.id, events);

        break;

      case 'kitty_cat':

        if (data.stats.michiganWins >= 1) unlock(data, def.id, events);

        break;

      case 'high_roller':

        if (data.stats.largestPokerPot >= 24) unlock(data, def.id, events);

        break;

      case 'perfect_run':

        if (data.stats.perfectRunTurns >= 1) unlock(data, def.id, events);

        break;

      case 'the_purist':

        if (data.stats.puristGamesCompleted >= 1) unlock(data, def.id, events);

        break;

      case 'clean_sweep':

        if (data.stats.cleanSweepPokerWins >= 1) unlock(data, def.id, events);

        break;

      case 'poker_face':

        if (data.stats.pokerFullHouseOrBetterWins >= 1) unlock(data, def.id, events);

        break;

      case 'iron_will':

        if (data.stats.ironWillPokerWins >= 1) unlock(data, def.id, events);

        break;

      case 'dead_eye':

        if (data.stats.deadEyeBlindBuys >= 1) unlock(data, def.id, events);

        break;

      case 'swift_lead':

        if (data.stats.swiftLeadPlays >= 1) unlock(data, def.id, events);

        break;

      case 'last_man_standing':

        if (data.stats.aiBusts >= 1) unlock(data, def.id, events);

        break;

      default:

        break;

    }

  }



  return events;

}



export function recordMichiganWin(

  data: AchievementSaveData,

  opts: {

    noSequenceTimeout: boolean;

    cardsPlayed: number;

  }

): AchievementUnlockEvent[] {

  data.stats.michiganWins += 1;

  if (opts.noSequenceTimeout) data.stats.michiganWinsWithoutTimeout += 1;

  if (opts.cardsPlayed >= 8) data.stats.grandStrategistWins += 1;

  return evaluateUnlocks(data);

}



export function recordMichiganLoss(_data: AchievementSaveData): AchievementUnlockEvent[] {

  return evaluateUnlocks(_data);

}



export function recordPokerWin(

  data: AchievementSaveData,

  potTotal: number,

  handLabel: string | null,

  opts: { allOpponentsFolded: boolean; ironWillCall: boolean }

): AchievementUnlockEvent[] {

  data.stats.pokerWins += 1;

  data.stats.largestPokerPot = Math.max(data.stats.largestPokerPot, potTotal);

  if (handLabel && /full house|four of a kind|straight flush|royal flush/i.test(handLabel)) {

    data.stats.pokerFullHouseOrBetterWins += 1;

  }

  if (opts.allOpponentsFolded) data.stats.cleanSweepPokerWins += 1;

  if (opts.ironWillCall) data.stats.ironWillPokerWins += 1;

  return evaluateUnlocks(data);

}



export function recordPayCardClaims(

  data: AchievementSaveData,

  count: number

): AchievementUnlockEvent[] {

  data.stats.payCardsClaimed += count;

  return evaluateUnlocks(data);

}



export function recordBlindAuctionWin(data: AchievementSaveData): AchievementUnlockEvent[] {

  data.stats.blindAuctionsWon += 1;

  return evaluateUnlocks(data);

}



export function recordDeadEyeBuy(data: AchievementSaveData): AchievementUnlockEvent[] {

  data.stats.deadEyeBlindBuys += 1;

  return evaluateUnlocks(data);

}



export function recordCalculatedRiskSwap(data: AchievementSaveData): AchievementUnlockEvent[] {

  data.stats.calculatedRiskSwaps += 1;

  return evaluateUnlocks(data);

}



export function recordPerfectRunTurn(data: AchievementSaveData): AchievementUnlockEvent[] {

  data.stats.perfectRunTurns += 1;

  return evaluateUnlocks(data);

}



export function recordDownToTheWire(data: AchievementSaveData): AchievementUnlockEvent[] {

  setProgress(data, 'down_to_the_wire', 1);

  return evaluateUnlocks(data);

}



export function recordPatiencePays(data: AchievementSaveData): AchievementUnlockEvent[] {

  setProgress(data, 'patience_pays', 1);

  return evaluateUnlocks(data);

}



export function recordSwiftLead(data: AchievementSaveData): AchievementUnlockEvent[] {

  data.stats.swiftLeadPlays += 1;

  return evaluateUnlocks(data);

}



export function recordAiBust(data: AchievementSaveData): AchievementUnlockEvent[] {

  data.stats.aiBusts += 1;

  return evaluateUnlocks(data);

}



export function recordPuristGame(data: AchievementSaveData): AchievementUnlockEvent[] {

  data.stats.puristGamesCompleted += 1;

  return evaluateUnlocks(data);

}



export function recordRoundCompleted(

  data: AchievementSaveData,

  sessionRoundCount: number

): AchievementUnlockEvent[] {

  data.stats.roundsCompleted += 1;

  data.stats.sessionRoundsCompleted = sessionRoundCount;

  setProgress(data, 'table_regular', sessionRoundCount);

  return evaluateUnlocks(data);

}



export function recordGameStarted(data: AchievementSaveData): AchievementUnlockEvent[] {

  data.stats.gamesStarted += 1;

  data.stats.sessionRoundsCompleted = 0;

  return evaluateUnlocks(data);

}



export function getAchievementDisplayProgress(

  data: AchievementSaveData,

  id: AchievementId

): { current: number; target: number | null; unlocked: boolean } {

  const def = ACHIEVEMENT_BY_ID[id];

  const entry = data.achievements[id];

  const unlocked = entry.unlockedAt != null;

  if (unlocked) {

    return { current: def.target ?? 1, target: def.target ?? 1, unlocked: true };

  }

  if (def.target != null) {

    return { current: entry.progress, target: def.target, unlocked: false };

  }

  return { current: entry.progress, target: 1, unlocked: false };

}



export type { LifetimeStats, AchievementProgress };


