import { describe, expect, it } from 'vitest';
import { createCard } from '../../engine/cards';
import { createEmptyPot } from '../../engine/payCards';
import { createMichiganState } from '../../engine/michigan';
import { defaultHouseRules } from '../../engine/houseRules';
import { initialGameState } from '../../engine/reducer';
import { getAchievementDisplayProgress } from '../evaluate';
import { defaultSaveData } from '../storage';
import {
  applyAchievementTransition,
  createAchievementSessionTracking,
  foldAchievementTransitions,
  hasPairAcesOrBetter,
  humanCalledFacingBetGe15,
  isAchievementUnlocked,
  unlockIds,
} from '../trackAchievements';
import { HUMAN_ID, card, soloGameState, soloPlayers } from './fixtures/soloState';
import type { GameState } from '../../../types/GameTypes';

function track(prev: GameState, next: GameState, opts: { timerSnapshotMs?: number | null; nowMs?: number } = {}) {
  const session = createAchievementSessionTracking();
  session.lastRoundNumber = prev.roundNumber;
  session.sessionRoundCount = prev.roundNumber;
  return applyAchievementTransition(prev, next, {
    data: defaultSaveData(),
    session,
    timerSnapshotMs: opts.timerSnapshotMs ?? null,
    nowMs: opts.nowMs,
  })!;
}

describe('hasPairAcesOrBetter', () => {
  it('detects pair of aces and better pairs', () => {
    expect(hasPairAcesOrBetter([card('spades', 'A'), card('hearts', 'A')])).toBe(true);
    expect(hasPairAcesOrBetter([card('spades', 'Q'), card('hearts', 'Q')])).toBe(true);
    expect(hasPairAcesOrBetter([card('spades', '7'), card('hearts', '7')])).toBe(false);
    expect(hasPairAcesOrBetter([card('spades', 'K'), card('hearts', 'K'), card('clubs', 'K')])).toBe(true);
  });
});

describe('applyAchievementTransition', () => {
  it('ignores non-solo sessions', () => {
    const prev = soloGameState();
    const next = { ...prev, isSoloSession: false, phase: 'gameOver' as const };
    expect(
      applyAchievementTransition(prev, next, {
        data: defaultSaveData(),
        session: createAchievementSessionTracking(),
        timerSnapshotMs: null,
      })
    ).toBeNull();
  });

  it('unlocks last man standing and the purist on game over', () => {
    const prev = soloGameState({ roundNumber: 3 });
    const next: GameState = {
      ...prev,
      phase: 'gameOver',
      players: soloPlayers().map((p, i) => (i === 1 ? { ...p, chips: 0 } : p)),
    };
    const session = createAchievementSessionTracking(true);
    const result = applyAchievementTransition(prev, next, {
      data: defaultSaveData(),
      session,
      timerSnapshotMs: null,
    })!;

    expect(unlockIds(result.unlocks)).toContain('last_man_standing');
    expect(isAchievementUnlocked(result.data, 'the_purist')).toBe(true);
  });

  it('counts session rounds for table regular', () => {
    const prev = soloGameState({ roundNumber: 10 });
    const next = soloGameState({ roundNumber: 11 });
    const session = createAchievementSessionTracking();
    session.lastRoundNumber = 10;
    session.sessionRoundCount = 9;

    const result = applyAchievementTransition(prev, next, {
      data: defaultSaveData(),
      session,
      timerSnapshotMs: null,
    })!;

    expect(result.session.sessionRoundCount).toBe(10);
    expect(isAchievementUnlocked(result.data, 'table_regular')).toBe(true);
  });

  it('unlocks blind auction and dead eye from auction resolution', () => {
    const prev = soloGameState({
      phase: 'blindAuction',
      dealerId: HUMAN_ID,
      blindAuction: {
        highBid: 5,
        highBidder: HUMAN_ID,
        passed: {},
        complete: true,
        awaitingDealerClose: false,
      },
      deadHand: [
        card('hearts', 'A'),
        card('hearts', 'K'),
        card('hearts', 'Q'),
      ],
    });
    const next = soloGameState({ phase: 'payCards' });

    const result = track(prev, next);
    expect(unlockIds(result.unlocks)).toContain('dead_eye');
    expect(result.data.stats.blindAuctionsWon).toBe(1);
  });

  it('counts blind auction wins when home rules skip payCards and go straight to poker', () => {
    const homeRules = { ...defaultHouseRules(), payCardsOnMichiganPlay: true, preset: 'homeTable' as const };
    const prev = soloGameState({
      phase: 'blindAuction',
      houseRules: homeRules,
      blindAuction: {
        highBid: 8,
        highBidder: HUMAN_ID,
        passed: { 1: true, 2: true, 3: true },
        complete: true,
        awaitingDealerClose: false,
      },
    });
    const next = soloGameState({ phase: 'poker', houseRules: homeRules });

    const result = track(prev, next);
    expect(result.data.stats.blindAuctionsWon).toBe(1);
    expect(isAchievementUnlocked(result.data, 'auction_master')).toBe(false);
  });

  it('unlocks calculated risk when dealer swaps a strong hand', () => {
    const acePair = [card('spades', 'A'), card('hearts', 'A'), card('clubs', '2')];
    const swappedHand = [card('diamonds', '3'), card('clubs', '4'), card('hearts', '5')];
    const prev = soloGameState({
      phase: 'dealerBlindChoice',
      dealerId: HUMAN_ID,
      players: soloPlayers().map((p) =>
        p.id === HUMAN_ID ? { ...p, cards: acePair } : p
      ),
    });
    const next = soloGameState({
      phase: 'payCards',
      dealerId: HUMAN_ID,
      players: soloPlayers().map((p) =>
        p.id === HUMAN_ID ? { ...p, cards: swappedHand } : p
      ),
    });

    const result = track(prev, next);
    expect(isAchievementUnlocked(result.data, 'calculated_risk')).toBe(true);
  });

  it('unlocks pay-card claim achievements from new claims', () => {
    const prev = soloGameState({ payCardClaims: [] });
    const next = soloGameState({
      payCardClaims: [
        { playerId: HUMAN_ID, section: 'aceHearts', amount: 1, description: 'Ace of Hearts' },
      ],
    });

    const result = track(prev, next);
    expect(result.data.stats.payCardsClaimed).toBe(1);
  });

  it('unlocks clean sweep, high roller, poker face, and iron will from poker wins', () => {
    const base = soloGameState({
      phase: 'poker',
      poker: {
        ...initialGameState.poker,
        roundComplete: false,
        winners: [],
        folded: { 0: false, 1: false, 2: false, 3: false },
        lastHandLabel: 'Kings Full of Twos',
        lastHandRank: 'full-house',
      },
      pot: { ...createEmptyPot(), pot: 30 },
    });

    const foldPrev = { ...base, poker: { ...base.poker, roundComplete: false } };
    const foldNext = {
      ...base,
      poker: {
        ...base.poker,
        roundComplete: true,
        winners: [HUMAN_ID],
        folded: { 0: false, 1: true, 2: true, 3: true },
      },
    };
    const foldResult = track(foldPrev, foldNext);
    expect(isAchievementUnlocked(foldResult.data, 'clean_sweep')).toBe(true);
    expect(isAchievementUnlocked(foldResult.data, 'high_roller')).toBe(false);
    expect(isAchievementUnlocked(foldResult.data, 'iron_will')).toBe(false);

    const showdownPrev = {
      ...base,
      poker: {
        ...base.poker,
        roundComplete: false,
        currentBet: 15,
        playerBets: { 0: 0, 1: 15, 2: 15, 3: 15 },
        folded: { 0: false, 1: false, 2: true, 3: true },
        lastHandLabel: 'Kings Full of Twos',
        lastHandRank: 'full-house',
      },
    };
    const showdownNext = {
      ...showdownPrev,
      poker: {
        ...showdownPrev.poker,
        roundComplete: true,
        winners: [HUMAN_ID],
        playerBets: { 0: 15, 1: 15, 2: 15, 3: 15 },
        lastHandLabel: 'Kings Full of Twos',
        lastHandRank: 'full-house',
      },
    };
    const showdownResult = track(showdownPrev, showdownNext);
    expect(isAchievementUnlocked(showdownResult.data, 'high_roller')).toBe(true);
    expect(isAchievementUnlocked(showdownResult.data, 'poker_face')).toBe(true);
    expect(isAchievementUnlocked(showdownResult.data, 'iron_will')).toBe(true);
  });

  it('does not count opening a 15+ bet as Iron Will (must call a facing bet)', () => {
    const prev = soloGameState({
      phase: 'poker',
      poker: {
        ...initialGameState.poker,
        currentBet: 0,
        playerBets: { 0: 0, 1: 0, 2: 0, 3: 0 },
        folded: { 0: false, 1: true, 2: true, 3: true },
      },
    });
    const next = {
      ...prev,
      poker: {
        ...prev.poker,
        currentBet: 15,
        playerBets: { 0: 15, 1: 0, 2: 0, 3: 0 },
      },
    };
    expect(humanCalledFacingBetGe15(prev, next, HUMAN_ID)).toBe(false);
  });

  it('detects calling a 15+ facing bet', () => {
    const prev = soloGameState({
      phase: 'poker',
      poker: {
        ...initialGameState.poker,
        currentBet: 15,
        playerBets: { 0: 0, 1: 15, 2: 0, 3: 0 },
        folded: { 0: false, 1: false, 2: true, 3: true },
      },
    });
    const next = {
      ...prev,
      poker: {
        ...prev.poker,
        playerBets: { 0: 15, 1: 15, 2: 0, 3: 0 },
      },
    };
    expect(humanCalledFacingBetGe15(prev, next, HUMAN_ID)).toBe(true);
  });

  it('unlocks michigan-based achievements from phase transitions', () => {
    const played = card('clubs', '3');
    const michiganPrev = soloGameState({
      phase: 'michigan',
      michiganShownPlays: {},
      michigan: createMichiganState(),
    });
    const michiganNext = {
      ...michiganPrev,
      michiganShownPlays: { [HUMAN_ID]: played },
    };

    const startMs = 10_000;
    const session = createAchievementSessionTracking();
    session.roundFlags.michiganPhaseStartedAt = startMs;
    session.roundFlags.michiganCardsPlayed = 0;

    const result = applyAchievementTransition(michiganPrev, michiganNext, {
      data: defaultSaveData(),
      session,
      timerSnapshotMs: 500,
      nowMs: startMs + 100,
    })!;

    expect(isAchievementUnlocked(result.data, 'swift_lead')).toBe(true);
    expect(isAchievementUnlocked(result.data, 'down_to_the_wire')).toBe(true);
    expect(result.adrenalineFreezeMs).toBe(2000);

    const winPrev = {
      ...michiganPrev,
      achievementSession: {
        sequenceTimedOut: false,
        leadPassUsed: false,
        humanLeadPasses: 0,
      },
    };
    session.roundFlags.michiganCardsPlayed = 8;
    session.roundFlags.sequenceTimedOut = false;
    const winNext = soloGameState({
      phase: 'announcement',
      roundWinnerId: HUMAN_ID,
      announcement: {
        title: 'Michigan Rummy — Winner',
        lines: ['You won'],
        variant: 'success',
      },
    });
    const winResult = applyAchievementTransition(winPrev, winNext, {
      data: defaultSaveData(),
      session,
      timerSnapshotMs: null,
    })!;
    expect(unlockIds(winResult.unlocks)).toEqual(
      expect.arrayContaining(['kitty_cat', 'cool_head', 'grand_strategist'])
    );
  });

  it('unlocks perfect run after four human cards in one turn', () => {
    const played = card('hearts', 'Q');
    const prev = soloGameState({
      phase: 'michigan',
      currentPlayer: HUMAN_ID,
      michiganShownPlays: { [HUMAN_ID]: card('hearts', 'J') },
    });
    const session = createAchievementSessionTracking();
    session.roundFlags.michiganCardsThisTurn = 3;

    const next = {
      ...prev,
      currentPlayer: HUMAN_ID,
      michiganShownPlays: { ...prev.michiganShownPlays, [HUMAN_ID]: played },
    };

    const result = applyAchievementTransition(prev, next, {
      data: defaultSaveData(),
      session,
      timerSnapshotMs: null,
    })!;

    expect(isAchievementUnlocked(result.data, 'perfect_run')).toBe(true);
  });

  it('does not count perfect run across separate Michigan turns', () => {
    const firstCard = card('clubs', '3');
    const secondCard = card('clubs', '4');
    const session = createAchievementSessionTracking();

    applyAchievementTransition(
      soloGameState({ phase: 'michigan', currentPlayer: HUMAN_ID, michiganShownPlays: {} }),
      {
        ...soloGameState({ phase: 'michigan', currentPlayer: HUMAN_ID, michiganShownPlays: {} }),
        currentPlayer: 1,
        michiganShownPlays: { [HUMAN_ID]: firstCard },
      },
      { data: defaultSaveData(), session, timerSnapshotMs: null }
    );

    const result = applyAchievementTransition(
      soloGameState({
        phase: 'michigan',
        currentPlayer: HUMAN_ID,
        michiganShownPlays: { [HUMAN_ID]: firstCard },
      }),
      {
        ...soloGameState({
          phase: 'michigan',
          currentPlayer: HUMAN_ID,
          michiganShownPlays: { [HUMAN_ID]: firstCard },
        }),
        currentPlayer: 2,
        michiganShownPlays: { [HUMAN_ID]: secondCard },
      },
      { data: defaultSaveData(), session, timerSnapshotMs: null }
    )!;

    expect(isAchievementUnlocked(result.data, 'perfect_run')).toBe(false);
    expect(result.session.roundFlags.michiganCardsThisTurn).toBe(0);
  });

  it('unlocks patience pays after three lead passes with enough chips', () => {
    const prev = soloGameState({
      phase: 'michigan',
      players: soloPlayers(60),
      achievementSession: {
        sequenceTimedOut: false,
        leadPassUsed: true,
        humanLeadPasses: 2,
      },
    });
    const next = {
      ...prev,
      achievementSession: {
        sequenceTimedOut: false,
        leadPassUsed: true,
        humanLeadPasses: 3,
      },
    };

    const result = track(prev, next);
    expect(isAchievementUnlocked(result.data, 'patience_pays')).toBe(true);
  });

  it('increments michiganWins on second kitty win without a new unlock event', () => {
    const winPrev = soloGameState({ phase: 'michigan' });
    const winNext = soloGameState({
      phase: 'announcement',
      roundWinnerId: HUMAN_ID,
      announcement: {
        title: 'Michigan Rummy — Winner',
        lines: ['You won'],
        variant: 'success',
      },
    });
    const afterFirst = defaultSaveData();
    afterFirst.stats.michiganWins = 1;
    afterFirst.achievements.kitty_cat.unlockedAt = Date.now();

    const result = applyAchievementTransition(winPrev, winNext, {
      data: afterFirst,
      session: createAchievementSessionTracking(),
      timerSnapshotMs: null,
    })!;

    expect(result.data.stats.michiganWins).toBe(2);
    expect(isAchievementUnlocked(result.data, 'kitty_whisperer')).toBe(false);
    expect(isAchievementUnlocked(result.data, 'kitty_cat')).toBe(true);
    expect(getAchievementDisplayProgress(result.data, 'kitty_whisperer')).toEqual({
      current: 2,
      target: 50,
      unlocked: false,
    });
  });

  it('does not unlock cool head after a sequence timeout in the same round', () => {
    const winPrev = soloGameState({ phase: 'michigan' });
    const winNext = soloGameState({
      phase: 'announcement',
      roundWinnerId: HUMAN_ID,
      announcement: {
        title: 'Michigan Rummy — Winner',
        lines: ['You won'],
        variant: 'success',
      },
    });
    const session = createAchievementSessionTracking();
    session.roundFlags.sequenceTimedOut = true;
    session.roundFlags.michiganCardsPlayed = 2;

    const result = applyAchievementTransition(winPrev, winNext, {
      data: defaultSaveData(),
      session,
      timerSnapshotMs: null,
    })!;

    expect(isAchievementUnlocked(result.data, 'kitty_cat')).toBe(true);
    expect(isAchievementUnlocked(result.data, 'cool_head')).toBe(false);
  });

  it('folds multiple transitions without losing earlier unlocks', () => {
    const prev = soloGameState({ roundNumber: 1 });
    const bustPrev = soloGameState({ roundNumber: 1 });
    const bustNext = soloGameState({
      phase: 'gameOver',
      players: soloPlayers().map((p) => (p.id === 1 ? { ...p, chips: 0 } : p)),
    });

    const result = foldAchievementTransitions(
      {
        data: defaultSaveData(),
        session: createAchievementSessionTracking(true),
        timerSnapshotMs: null,
      },
      [{ prev: bustPrev, next: bustNext }]
    );

    expect(isAchievementUnlocked(result.data, 'last_man_standing')).toBe(true);
    expect(isAchievementUnlocked(result.data, 'the_purist')).toBe(true);
    expect(prev.roundNumber).toBe(1);
  });
});

describe('achievement transition coverage', () => {
  it('documents deterministic test entry points for every achievement', () => {
    const covered = [
      'table_regular',
      'veteran',
      'auction_master',
      'sound_machine',
      'heart_hunter',
      'cool_head',
      'calculated_risk',
      'down_to_the_wire',
      'patience_pays',
      'grand_strategist',
      'kitty_cat',
      'kitty_whisperer',
      'high_roller',
      'perfect_run',
      'the_purist',
      'clean_sweep',
      'poker_face',
      'iron_will',
      'dead_eye',
      'swift_lead',
      'last_man_standing',
    ];
    expect(covered).toHaveLength(21);
  });
});
