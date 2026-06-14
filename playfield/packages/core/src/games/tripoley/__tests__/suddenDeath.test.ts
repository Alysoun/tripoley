import { describe, expect, it } from 'vitest';
import {
  SUDDEN_DEATH_ROUND_CAP,
  SUDDEN_DEATH_TWO_PLAYER_STREAK,
  SUDDEN_DEATH_ANTE_MULTIPLIER,
  SUDDEN_DEATH_HEADS_UP_ANTE_MULTIPLIER,
  activateSuddenDeath,
  antePerSectionForRound,
  planRoundTransition,
  shouldForceAllInPoker,
  suddenDeathTriggerReason,
  updateTwoPlayerStreak,
} from '../suddenDeath';
import { initialGameState, gameReducer } from '../reducer';
import type { GameState, Player } from '../types';
import { ANTE_PER_SECTION } from '../constants';
import { ANTE_SECTION_COUNT } from '../antes';
import { createEmptyPot } from '../payCards';

function player(id: number, chips: number): Player {
  return {
    id,
    name: `P${id}`,
    isHuman: false,
    chips,
    cards: [],
    originalHand: [],
  };
}

function headsUpState(streak: number, roundNumber: number): GameState {
  return {
    ...initialGameState,
    phase: 'roundSummary',
    roundNumber,
    twoPlayerStreak: streak,
    players: [
      player(0, 500),
      player(1, 400),
      player(2, 0),
      player(3, 0),
    ],
  };
}

describe('suddenDeath', () => {
  it('counts consecutive heads-up rounds', () => {
    expect(updateTwoPlayerStreak(headsUpState(5, 40))).toBe(6);
    expect(
      updateTwoPlayerStreak({
        ...headsUpState(5, 40),
        players: [player(0, 500), player(1, 400), player(2, 100), player(3, 0)],
      })
    ).toBe(0);
  });

  it('triggers on round cap or heads-up streak', () => {
    expect(suddenDeathTriggerReason(SUDDEN_DEATH_ROUND_CAP, 0)).toBe('roundCap');
    expect(suddenDeathTriggerReason(SUDDEN_DEATH_ROUND_CAP - 1, 0)).toBeNull();
    expect(suddenDeathTriggerReason(50, SUDDEN_DEATH_TWO_PLAYER_STREAK)).toBe(
      'twoPlayerStalemate'
    );
    expect(suddenDeathTriggerReason(50, SUDDEN_DEATH_TWO_PLAYER_STREAK - 1)).toBeNull();
  });

  it('activates sudden death when starting a new round', () => {
    const plan = planRoundTransition(headsUpState(SUDDEN_DEATH_TWO_PLAYER_STREAK - 1, 90));
    expect(plan.suddenDeathActivated).toBe(true);
    expect(plan.suddenDeath?.reason).toBe('twoPlayerStalemate');
    expect(plan.suddenDeath?.triggeredAtRound).toBe(91);
  });

  it('multiplies antes during sudden death', () => {
    const sd = activateSuddenDeath('roundCap', 150);
    const state: GameState = { ...initialGameState, suddenDeath: sd, players: [player(0, 100)] };
    expect(antePerSectionForRound(state, 4)).toBe(ANTE_PER_SECTION * SUDDEN_DEATH_ANTE_MULTIPLIER);
    expect(antePerSectionForRound(state, 2)).toBe(
      ANTE_PER_SECTION * SUDDEN_DEATH_HEADS_UP_ANTE_MULTIPLIER
    );
    expect(antePerSectionForRound(state, 2) * ANTE_SECTION_COUNT).toBe(27);
  });

  it('forces all-in poker for heads-up sudden death rounds', () => {
    let state: GameState = {
      ...headsUpState(SUDDEN_DEATH_TWO_PLAYER_STREAK, 90),
      suddenDeath: activateSuddenDeath('twoPlayerStalemate', 91),
      phase: 'payCards',
      houseRules: { ...initialGameState.houseRules, payCardsOnMichiganPlay: true },
      players: [
        { ...player(0, 120), cards: [{ suit: 'clubs', value: '2', id: 'c2' }] },
        { ...player(1, 80), cards: [{ suit: 'spades', value: '3', id: 's3' }] },
        player(2, 0),
        player(3, 0),
      ],
    };

    state = gameReducer(state, { type: 'ADVANCE_PHASE' });
    expect(state.poker.roundComplete).toBe(true);
    expect(state.log.some((e) => e.message.includes('Sudden Death all-in'))).toBe(true);
    expect(state.phase === 'announcement' || state.phase === 'gameOver').toBe(true);
    if (state.phase === 'gameOver') {
      expect(state.log.some((e) => e.message.includes('last player standing'))).toBe(true);
    }
  });

  it('does not soft-lock when sudden-death heads-up fold is attempted mid-pot', () => {
    const hand = [
      { suit: 'hearts' as const, value: 'A' as const, id: 'hA' },
      { suit: 'hearts' as const, value: 'K' as const, id: 'hK' },
      { suit: 'hearts' as const, value: 'Q' as const, id: 'hQ' },
      { suit: 'hearts' as const, value: 'J' as const, id: 'hJ' },
      { suit: 'hearts' as const, value: '10' as const, id: 'h10' },
    ];
    const weakHand = [
      { suit: 'clubs' as const, value: '2' as const, id: 'c2' },
      { suit: 'clubs' as const, value: '3' as const, id: 'c3' },
      { suit: 'clubs' as const, value: '4' as const, id: 'c4' },
      { suit: 'clubs' as const, value: '5' as const, id: 'c5' },
      { suit: 'clubs' as const, value: '7' as const, id: 'c7' },
    ];
    const state: GameState = {
      ...headsUpState(0, 150),
      suddenDeath: activateSuddenDeath('roundCap', 150),
      phase: 'poker',
      currentPlayer: 1,
      dealerId: 0,
      pot: { ...createEmptyPot(), pot: 30 },
      players: [
        { ...player(0, 100), cards: hand, originalHand: hand },
        { ...player(1, 50), cards: weakHand, originalHand: weakHand },
        player(2, 0),
        player(3, 0),
      ],
      poker: {
        currentBet: 14,
        playerBets: { 0: 14, 1: 5, 2: 0, 3: 0 },
        folded: { 0: false, 1: false, 2: true, 3: true },
        acted: { 0: true, 1: false, 2: true, 3: true },
        roundComplete: false,
        winners: [],
        lastHandLabel: '',
        lastHandRank: null,
      },
    };

    expect(shouldForceAllInPoker(state)).toBe(true);

    const next = gameReducer(state, { type: 'POKER_ACTION', action: 'fold' });
    expect(next.poker.roundComplete).toBe(true);
    expect(next.phase).not.toBe('poker');
  });
});
