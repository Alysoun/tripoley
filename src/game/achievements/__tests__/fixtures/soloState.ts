import {
  createCard,
  createEmptyPot,
  createMichiganState,
  defaultHouseRules,
  gameReducer,
  initialGameState,
} from '@playfield/core';
import type { Card, GameState, Player } from '../../../../types/GameTypes';

const SOLO_HUMAN_ID = 0;

function basePlayer(id: number, isHuman: boolean, chips = 100): Player {
  return {
    id,
    name: isHuman ? 'You' : `AI ${id}`,
    isHuman,
    chips,
    cards: [],
    originalHand: [],
  };
}

export function soloPlayers(humanChips = 100): Player[] {
  return [
    basePlayer(0, true, humanChips),
    basePlayer(1, false),
    basePlayer(2, false),
    basePlayer(3, false),
  ];
}

export function soloGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    ...initialGameState,
    isSoloSession: true,
    houseRules: defaultHouseRules(),
    players: soloPlayers(),
    pot: createEmptyPot(),
    michigan: createMichiganState(),
    roundNumber: 1,
    achievementSession: {
      sequenceTimedOut: false,
      leadPassUsed: false,
      humanLeadPasses: 0,
    },
    ...overrides,
  };
}

export function startSoloGame(seats = 4): GameState {
  return gameReducer(initialGameState, {
    type: 'START_GAME',
    seats: Array.from({ length: seats }, (_, i) => ({ isHuman: i === SOLO_HUMAN_ID })),
    houseRules: defaultHouseRules(),
  });
}

export const HUMAN_ID = SOLO_HUMAN_ID;

export function card(suit: Parameters<typeof createCard>[0], value: Parameters<typeof createCard>[1]): Card {
  return createCard(suit, value);
}

export function pokerWinTransition(
  prev: GameState,
  opts: {
    humanWins?: boolean;
    potTotal?: number;
    allOpponentsFolded?: boolean;
    handLabel?: string;
    handRank?: import('@playfield/core').PokerHandRank;
    humanCalledBig?: boolean;
  } = {}
): GameState {
  const humanWins = opts.humanWins ?? true;
  const allFolded = opts.allOpponentsFolded ?? false;
  const winners = humanWins ? [HUMAN_ID] : [1];
  const folded: Record<number, boolean> = {
    0: !humanWins,
    1: humanWins && allFolded,
    2: humanWins && allFolded,
    3: humanWins && allFolded,
  };

  return {
    ...prev,
    phase: 'poker',
    poker: {
      ...prev.poker,
      roundComplete: true,
      winners,
      folded,
      lastHandLabel: opts.handLabel ?? prev.poker.lastHandLabel,
      lastHandRank: opts.handRank ?? prev.poker.lastHandRank,
      currentBet: opts.humanCalledBig ? 15 : prev.poker.currentBet,
      playerBets: opts.humanCalledBig
        ? { ...prev.poker.playerBets, [HUMAN_ID]: 15 }
        : prev.poker.playerBets,
    },
    pot: {
      ...prev.pot,
      pot: opts.potTotal ?? prev.pot.pot,
    },
  };
}

export function michiganWinnerAnnouncement(prev: GameState, humanWins = true): GameState {
  return {
    ...prev,
    phase: 'announcement',
    roundWinnerId: humanWins ? HUMAN_ID : 1,
    announcement: {
      title: 'Michigan Rummy — Winner',
      lines: humanWins ? ['You won Michigan'] : ['AI won Michigan'],
      variant: 'success',
    },
  };
}

export function michiganPlayTransition(
  prev: GameState,
  playedCard: Card,
  opts: { cardsPlayedThisTurn?: number } = {}
): GameState {
  const flags = prev.achievementSession ?? {
    sequenceTimedOut: false,
    leadPassUsed: false,
    humanLeadPasses: 0,
  };
  const prevShown = prev.michiganShownPlays[HUMAN_ID]?.id ?? null;
  const turnCount = opts.cardsPlayedThisTurn ?? 1;

  return {
    ...prev,
    phase: 'michigan',
    michiganShownPlays: {
      ...prev.michiganShownPlays,
      [HUMAN_ID]: playedCard,
    },
    achievementSession: flags,
    ...(turnCount > 1
      ? {
          michiganShownPlays: {
            ...prev.michiganShownPlays,
            [HUMAN_ID]: playedCard,
          },
        }
      : {}),
    ...(prevShown === playedCard.id ? {} : {}),
  };
}
