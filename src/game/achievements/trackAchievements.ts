import { Card, GameState } from '../../types/GameTypes';
import {
  recordAiBust,
  recordBlindAuctionWin,
  recordCalculatedRiskSwap,
  recordDeadEyeBuy,
  recordDownToTheWire,
  recordMichiganLoss,
  recordMichiganWin,
  recordPatiencePays,
  recordPayCardClaims,
  recordPerfectRunTurn,
  recordPokerWin,
  recordPuristGame,
  recordRoundCompleted,
  recordSwiftLead,
} from './evaluate';
import { AchievementSaveData, AchievementUnlockEvent } from './types';
import { rankValue } from '../engine/cards';
import { describePayCardsHeld } from '../engine/payCards';

export interface AchievementRoundFlags {
  sequenceTimedOut: boolean;
  leadPassCount: number;
  michiganCardsPlayed: number;
  michiganPhaseStartedAt: number | null;
  michiganCardsThisTurn: number;
  lastMichiganTurnPlayer: number | null;
  pokerHumanHandLabel: string | null;
  pokerHumanFolded: boolean;
  pokerHumanCalledBig: boolean;
}

export interface AchievementSessionTracking {
  lastRoundNumber: number;
  sessionRoundCount: number;
  roundFlags: AchievementRoundFlags;
  sequenceTimerOffForGame: boolean;
}

export interface ApplyAchievementTransitionInput {
  data: AchievementSaveData;
  session: AchievementSessionTracking;
  /** Human sequence timer remaining ms when a Michigan card is played. */
  timerSnapshotMs: number | null;
  /** Injectable clock for swift-lead detection (defaults to Date.now()). */
  nowMs?: number;
}

export interface ApplyAchievementTransitionResult {
  data: AchievementSaveData;
  session: AchievementSessionTracking;
  unlocks: AchievementUnlockEvent[];
  adrenalineFreezeMs: number;
}

export function emptyAchievementRoundFlags(): AchievementRoundFlags {
  return {
    sequenceTimedOut: false,
    leadPassCount: 0,
    michiganCardsPlayed: 0,
    michiganPhaseStartedAt: null,
    michiganCardsThisTurn: 0,
    lastMichiganTurnPlayer: null,
    pokerHumanHandLabel: null,
    pokerHumanFolded: false,
    pokerHumanCalledBig: false,
  };
}

export function createAchievementSessionTracking(
  sequenceTimerOffForGame = false
): AchievementSessionTracking {
  return {
    lastRoundNumber: 0,
    sessionRoundCount: 0,
    roundFlags: emptyAchievementRoundFlags(),
    sequenceTimerOffForGame,
  };
}

function cloneSaveData(data: AchievementSaveData): AchievementSaveData {
  return JSON.parse(JSON.stringify(data)) as AchievementSaveData;
}

function humanId(state: GameState): number | null {
  return state.players.find((p) => p.isHuman)?.id ?? null;
}

/** True when the player matched an existing 15+ facing bet (a call, not opening the betting). */
export function humanCalledFacingBetGe15(
  prev: GameState,
  next: GameState,
  playerId: number
): boolean {
  const prevBet = prev.poker.playerBets[playerId] ?? 0;
  const nextBet = next.poker.playerBets[playerId] ?? 0;
  const facing = prev.poker.currentBet;
  return (
    facing >= 15 &&
    prevBet < facing &&
    nextBet > prevBet &&
    nextBet === facing
  );
}

/** Showdown = at least one opponent still in the hand (not a win by folds only). */
export function pokerWasShowdown(state: GameState, humanPlayerId: number): boolean {
  return state.players.some(
    (p) => p.id !== humanPlayerId && !state.poker.folded[p.id]
  );
}

export function hasPairAcesOrBetter(cards: Card[]): boolean {
  const byRank = new Map<string, number>();
  for (const c of cards) {
    byRank.set(c.value, (byRank.get(c.value) ?? 0) + 1);
  }
  if ((byRank.get('A') ?? 0) >= 2) return true;
  for (const [rank, count] of byRank) {
    if (count >= 2 && rankValue(rank as Card['value']) >= rankValue('Q')) return true;
  }
  for (const count of byRank.values()) {
    if (count >= 3) return true;
  }
  return false;
}

/** Pure achievement progress update for a single game-state transition (solo sessions only). */
export function applyAchievementTransition(
  prev: GameState,
  next: GameState,
  input: ApplyAchievementTransitionInput
): ApplyAchievementTransitionResult | null {
  if (!next.isSoloSession) return null;

  const hid = humanId(next);
  if (hid === null) return null;

  const nowMs = input.nowMs ?? Date.now();
  const session: AchievementSessionTracking = {
    ...input.session,
    roundFlags: { ...input.session.roundFlags },
  };
  const flags = session.roundFlags;
  let draft = cloneSaveData(input.data);
  let unlocks: AchievementUnlockEvent[] = [];
  let adrenalineFreezeMs = 0;

  if (next.phase === 'gameOver') {
    for (const p of next.players) {
      if (!p.isHuman && p.chips <= 0) {
        unlocks.push(...recordAiBust(draft));
      }
    }
    if (session.sequenceTimerOffForGame) {
      unlocks.push(...recordPuristGame(draft));
    }
    return { data: draft, session, unlocks, adrenalineFreezeMs };
  }

  if (next.roundNumber > session.lastRoundNumber && next.roundNumber > 1) {
    session.lastRoundNumber = next.roundNumber;
    session.sessionRoundCount += 1;
    unlocks.push(...recordRoundCompleted(draft, session.sessionRoundCount));
    session.roundFlags = emptyAchievementRoundFlags();
    return { data: draft, session, unlocks, adrenalineFreezeMs };
  }

  if (next.roundNumber === 1 && session.lastRoundNumber === 0) {
    session.lastRoundNumber = 1;
    session.sessionRoundCount = 1;
  }

  if (next.achievementSession?.sequenceTimedOut) {
    flags.sequenceTimedOut = true;
  }

  if (next.phase === 'michigan' && prev.phase !== 'michigan') {
    flags.michiganPhaseStartedAt = nowMs;
    flags.michiganCardsPlayed = 0;
    flags.michiganCardsThisTurn = 0;
    flags.lastMichiganTurnPlayer = null;
  }

  if (next.phase === 'michigan' && prev.phase === 'poker') {
    flags.pokerHumanFolded = prev.poker.folded[hid] ?? false;
    flags.pokerHumanHandLabel = prev.poker.lastHandLabel || null;
  }

  if (prev.phase === 'blindAuction' && next.phase !== 'blindAuction') {
    if (prev.blindAuction.highBidder === hid) {
      unlocks.push(...recordBlindAuctionWin(draft));
      if (describePayCardsHeld(prev.deadHand).length >= 3) {
        unlocks.push(...recordDeadEyeBuy(draft));
      }
    }
  }

  if (prev.phase === 'dealerBlindChoice' && next.phase !== 'dealerBlindChoice') {
    const before = prev.players[hid]?.cards ?? [];
    if (prev.dealerId === hid && hasPairAcesOrBetter(before) && before.length > 0) {
      const after = next.players[hid]?.cards ?? [];
      const swapped = after.some((c, i) => c.id !== before[i]?.id);
      if (swapped) unlocks.push(...recordCalculatedRiskSwap(draft));
    }
  }

  const newClaims = next.payCardClaims.length - prev.payCardClaims.length;
  if (newClaims > 0) {
    const humanNew = next.payCardClaims
      .slice(prev.payCardClaims.length)
      .filter((c) => c.playerId === hid).length;
    if (humanNew > 0) {
      unlocks.push(...recordPayCardClaims(draft, humanNew));
    }
  }

  if (prev.phase === 'poker' && next.phase === 'poker') {
    if (humanCalledFacingBetGe15(prev, next, hid)) {
      flags.pokerHumanCalledBig = true;
    }
  }

  if (!prev.poker.roundComplete && next.poker.roundComplete && next.poker.winners.includes(hid)) {
    const isShowdown = pokerWasShowdown(next, hid);
    const allOpponentsFolded = !isShowdown;
    const calledFacing15 =
      flags.pokerHumanCalledBig || humanCalledFacingBetGe15(prev, next, hid);
    const handLabel = flags.pokerHumanHandLabel || next.poker.lastHandLabel || null;
    unlocks.push(
      ...recordPokerWin(
        draft,
        prev.pot.pot,
        handLabel,
        {
          allOpponentsFolded,
          ironWillCall: calledFacing15 && isShowdown,
          isShowdown,
        },
        next.poker.lastHandRank
      )
    );
  }

  if (
    prev.phase === 'michigan' &&
    next.phase === 'announcement' &&
    next.announcement?.title === 'Michigan Rummy — Winner'
  ) {
    if (next.roundWinnerId === hid) {
      unlocks.push(
        ...recordMichiganWin(draft, {
          noSequenceTimeout: !flags.sequenceTimedOut,
          cardsPlayed: flags.michiganCardsPlayed,
        })
      );
    } else {
      unlocks.push(...recordMichiganLoss(draft));
    }
  }

  if (prev.phase === 'michigan' && next.phase === 'michigan') {
    const played =
      next.michiganShownPlays[hid]?.id &&
      next.michiganShownPlays[hid]?.id !== prev.michiganShownPlays[hid]?.id;

    if (played) {
      flags.michiganCardsPlayed += 1;

      if (prev.currentPlayer === hid) {
        flags.michiganCardsThisTurn += 1;
      } else {
        flags.michiganCardsThisTurn = 1;
      }

      if (flags.michiganCardsThisTurn >= 4) {
        unlocks.push(...recordPerfectRunTurn(draft));
      }

      if (next.currentPlayer !== hid) {
        flags.michiganCardsThisTurn = 0;
      }

      flags.lastMichiganTurnPlayer = hid;

      if (
        flags.michiganPhaseStartedAt &&
        flags.michiganCardsPlayed === 1 &&
        nowMs - flags.michiganPhaseStartedAt <= 500
      ) {
        unlocks.push(...recordSwiftLead(draft));
      }

      if (input.timerSnapshotMs !== null && input.timerSnapshotMs < 1000) {
        unlocks.push(...recordDownToTheWire(draft));
        adrenalineFreezeMs = 2000;
      }
    }

    const leadPasses = next.achievementSession?.humanLeadPasses ?? 0;
    const prevLeadPasses = prev.achievementSession?.humanLeadPasses ?? 0;
    if (leadPasses > prevLeadPasses) {
      const human = next.players[hid];
      if (human && human.chips >= 50 && leadPasses >= 3) {
        unlocks.push(...recordPatiencePays(draft));
      }
    }
  }

  for (const p of next.players) {
    if (!p.isHuman && p.chips <= 0 && (prev.players[p.id]?.chips ?? 0) > 0) {
      unlocks.push(...recordAiBust(draft));
    }
  }

  return { data: draft, session, unlocks, adrenalineFreezeMs };
}

/** Fold multiple transitions in order (mirrors live play). */
export function foldAchievementTransitions(
  initial: ApplyAchievementTransitionInput,
  pairs: Array<{ prev: GameState; next: GameState; timerSnapshotMs?: number | null; nowMs?: number }>
): ApplyAchievementTransitionResult {
  let current = initial;
  let last: ApplyAchievementTransitionResult = {
    data: cloneSaveData(initial.data),
    session: {
      ...initial.session,
      roundFlags: { ...initial.session.roundFlags },
    },
    unlocks: [],
    adrenalineFreezeMs: 0,
  };

  for (const { prev, next, timerSnapshotMs, nowMs } of pairs) {
    const result = applyAchievementTransition(prev, next, {
      data: last.data,
      session: last.session,
      timerSnapshotMs: timerSnapshotMs ?? null,
      nowMs,
    });
    if (!result) continue;
    last = {
      ...result,
      unlocks: [...last.unlocks, ...result.unlocks],
    };
  }

  return last;
}

export function unlockIds(events: AchievementUnlockEvent[]): string[] {
  return events.map((e) => e.id);
}

export function isAchievementUnlocked(data: AchievementSaveData, id: string): boolean {
  return data.achievements[id as keyof typeof data.achievements]?.unlockedAt != null;
}
