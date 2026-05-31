import { describe, expect, it } from 'vitest';
import {
  createMichiganState,
  getLegalMichiganPlays,
  fixMichiganTurnIfStuck,
  validateMichiganPlay,
} from '../michigan';
import { createCard } from '../cards';
import { finalizePlayerStatus } from '../playerStatus';
import { gameReducer, initialGameState } from '../reducer';
import type { GameState } from '../../../types/GameTypes';
import { defaultHouseRules } from '../houseRules';

describe('michigan rules', () => {
  it('requires lowest black card on opening lead', () => {
    const michigan = createMichiganState();
    const hand = [createCard('clubs', '3'), createCard('hearts', '2')];
    const legal = getLegalMichiganPlays(hand, michigan, 0, 0);
    expect(legal).toHaveLength(1);
    expect(legal[0].suit).toBe('clubs');
    expect(legal[0].value).toBe('3');
  });

  it('accepts only the next card in sequence when following', () => {
    const michigan = {
      ...createMichiganState(),
      mode: 'follow' as const,
      activeSuit: 'hearts' as const,
      nextValue: 'Q' as const,
      lastPlayerId: 1,
    };
    const hand = [createCard('hearts', 'Q'), createCard('hearts', 'K'), createCard('spades', '2')];
    const legal = getLegalMichiganPlays(hand, michigan, 2, 2);
    expect(legal).toHaveLength(1);
    expect(legal[0].value).toBe('Q');
  });

  it('rejects illegal plays', () => {
    const michigan = createMichiganState();
    const hand = [createCard('hearts', '2'), createCard('clubs', '5')];
    expect(validateMichiganPlay(hand, createCard('hearts', '2'), michigan, 0, 0)).toBe(false);
    expect(validateMichiganPlay(hand, createCard('clubs', '5'), michigan, 0, 0)).toBe(true);
  });

  it('keeps turn on busted player who must follow sequence', () => {
    const queen = createCard('clubs', 'Q');
    const prev: GameState = {
      ...initialGameState,
      phase: 'michigan',
      houseRules: defaultHouseRules(),
      currentPlayer: 1,
      players: [
        { id: 0, name: 'A', isHuman: false, chips: 100, cards: [], originalHand: [] },
        {
          id: 1,
          name: 'B',
          isHuman: false,
          chips: 0,
          cards: [queen, createCard('hearts', '5')],
          originalHand: [],
        },
        {
          id: 2,
          name: 'C',
          isHuman: true,
          chips: 100,
          cards: [createCard('spades', '2')],
          originalHand: [],
        },
        { id: 3, name: 'D', isHuman: false, chips: 100, cards: [], originalHand: [] },
      ],
      michigan: {
        mode: 'follow',
        leadColor: 'black',
        activeSuit: 'clubs',
        nextValue: 'Q',
        lastPlayerId: 0,
      },
    };

    const next = finalizePlayerStatus(prev, prev);
    expect(next.currentPlayer).toBe(1);
    expect(getLegalMichiganPlays(next.players[1].cards, next.michigan, 1, 1)).toHaveLength(1);

    const afterPlay = gameReducer(next, { type: 'MICHIGAN_PLAY', card: queen });
    expect(afterPlay.players[1].cards.some((c) => c.id === queen.id)).toBe(false);
    expect(afterPlay.phase).toBe('michigan');
  });

  it('fixMichiganTurnIfStuck sends turn to sequence holder', () => {
    const hands = [
      [createCard('clubs', '10')],
      [createCard('clubs', 'J')],
      [createCard('hearts', '2')],
      [],
    ];
    const michigan = {
      ...createMichiganState(),
      mode: 'follow' as const,
      activeSuit: 'clubs' as const,
      nextValue: 'J' as const,
      lastPlayerId: 0,
    };

    const fixed = fixMichiganTurnIfStuck(hands, michigan, 2);
    expect(fixed?.currentPlayer).toBe(1);
  });

  it('lead pass penalty skips busted players to preserve chip totals', () => {
    const prev: GameState = {
      ...initialGameState,
      phase: 'michigan',
      houseRules: { ...defaultHouseRules(), michiganLeadPassPenalty: true },
      currentPlayer: 1,
      players: [
        { id: 0, name: 'A', isHuman: false, chips: 50, cards: [createCard('hearts', '2')], originalHand: [] },
        {
          id: 1,
          name: 'B',
          isHuman: false,
          chips: 0,
          cards: [createCard('spades', '5')],
          originalHand: [],
        },
        { id: 2, name: 'C', isHuman: true, chips: 50, cards: [createCard('diamonds', '3')], originalHand: [] },
        { id: 3, name: 'D', isHuman: false, chips: 50, cards: [createCard('clubs', '4')], originalHand: [] },
      ],
      pot: { ...initialGameState.pot, kitty: 0 },
      michigan: {
        mode: 'lead',
        leadColor: 'black',
        activeSuit: null,
        nextValue: null,
        lastPlayerId: null,
      },
    };

    const beforeTotal =
      prev.players.reduce((sum, p) => sum + p.chips, 0) + Object.values(prev.pot).reduce((a, b) => a + b, 0);

    const next = gameReducer(prev, { type: 'MICHIGAN_PASS_LEAD' });
    const afterTotal =
      next.players.reduce((sum, p) => sum + p.chips, 0) + Object.values(next.pot).reduce((a, b) => a + b, 0);

    expect(afterTotal).toBe(beforeTotal);
    expect(next.pot.kitty).toBe(0);
  });
});
