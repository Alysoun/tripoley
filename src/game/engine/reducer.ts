import {
  ANTE_PER_SECTION,
  MICHIGAN_KITTY_PENALTY,
  MICHIGAN_PENALTY_PER_CARD,
  POT_SECTION_KEYS,
  STARTING_CHIPS,
  MIN_PLAYERS,
  MAX_PLAYERS,
} from './constants';
import { dealHands, dealHandsFiltered } from './cards';
import { createEmptyPot, resolvePayCardClaims, resolvePayCardClaimOnPlay, clonePot, handHasPayCard, describePayCardsHeld } from './payCards';
import { defaultHouseRules, summarizeHouseRules } from './houseRules';
import {
  createMichiganState,
  applyMichiganPlay,
  validateMichiganPlay,
  getMichiganStarter,
  fixMichiganTurnIfStuck,
  canPassLead,
  getLegalMichiganPlays,
  advanceMichiganWhenSequenceUnavailable,
  resolveAfterMichiganPlay,
  nextActivePlayerLeft,
  leadColorLabel,
  resolveMichiganSequenceTimeout,
  emptyShownPlays,
  recordShownPlay,
  formatPlayerPlays,
  resolveLeadPassTurn,
} from './michigan';
import { comparePokerHands, evaluateBestPokerHand } from './poker';
import {
  GameState,
  GameAction,
  Player,
  GameLogEntry,
  PokerState,
  BlindAuctionState,
  Card,
  SectionLabel,
  PhaseAnnouncement,
  AnnouncementContinue,
  PokerAction,
} from '../../types/GameTypes';
import {
  allBiddersPassed,
  findNextActiveBidder,
  findRespondersToBid,
  firstAuctionBidder,
  getAuctionBidders,
  isDealerInAuction,
  onlyHighBidderRemains,
} from './blindAuction';
import { generateName } from '../../utils/nameGenerator';
import { displayPlayerName, sanitizePlayerName, DEFAULT_HUMAN_NAME } from '../../utils/playerName';
import { resolvePlayerActionTimeout } from './playerActionTimer';
import {
  finalizePlayerStatus,
  firstInGameLeftOfDealer,
  inGamePlayers,
  isEliminated,
  nextInGameDealer,
  nextInGamePlayer,
} from './playerStatus';
import {
  cardPlayAnimation,
  chipFromHumanOrPlayerToPot,
  chipFromPlayerToDealer,
  chipFromPotToPlayer,
  dealAnimationsForRound,
} from './animations';
import { createLogEntry, pushLog, resetLogCounter } from './gameLog';
import { debugStartingChips } from '../../debugConfig';
import {
  ANTE_SECTION_COUNT,
  applyAnteToPot,
  distributePlayerAnte,
  playerEligibleForSectionFromPlayer,
} from './antes';
import {
  planRoundTransition,
  shouldForceAllInPoker,
  suddenDeathTriggerMessage,
  antePerSectionForRound,
} from './suddenDeath';
import { michiganRecoveryActions } from './michiganRecovery';

function logPlayerName(player: Player): string {
  return displayPlayerName(player);
}

function log(message: string, type: GameLogEntry['type'] = 'info'): GameLogEntry {
  return createLogEntry(message, type);
}

function appendLog(state: GameState, entry: GameLogEntry): GameState {
  return pushLog(state, entry);
}

function createInitialPokerState(playerCount: number): PokerState {
  const folded: Record<number, boolean> = {};
  const acted: Record<number, boolean> = {};
  const playerBets: Record<number, number> = {};
  for (let i = 0; i < playerCount; i++) {
    folded[i] = false;
    acted[i] = false;
    playerBets[i] = 0;
  }
  return {
    currentBet: 0,
    playerBets,
    folded,
    acted,
    roundComplete: false,
    winners: [],
    lastHandLabel: '',
    lastHandRank: null,
  };
}

function createInitialBlindAuction(): BlindAuctionState {
  return { highBid: 0, highBidder: null, passed: {}, complete: false, awaitingDealerClose: false };
}

export const initialGameState: GameState = {
  players: [],
  currentPlayer: 0,
  dealerId: 0,
  deadHand: [],
  pot: createEmptyPot(),
  phase: 'setup',
  michigan: createMichiganState(),
  poker: createInitialPokerState(0),
  blindAuction: createInitialBlindAuction(),
  payCardClaims: [],
  roundNumber: 0,
  log: [],
  soundEnabled: true,
  michiganPlayArea: [],
  michiganShownPlays: {},
  houseRules: defaultHouseRules(),
  roundWinnerId: null,
  announcement: null,
  announcementContinue: null,
  animations: [],
};

function showAnnouncement(
  state: GameState,
  announcement: PhaseAnnouncement,
  continueTo: AnnouncementContinue
): GameState {
  return {
    ...state,
    phase: 'announcement',
    announcement,
    announcementContinue: continueTo,
  };
}

function dismissAnnouncement(state: GameState): GameState {
  const nextStep = state.announcementContinue;
  const cleared = {
    ...state,
    announcement: null,
    announcementContinue: null,
  };
  if (nextStep === 'michigan') return startMichiganPhase(cleared);
  if (nextStep === 'poker') return startPokerPhase(cleared);
  if (nextStep === 'roundSummary') {
    const human = cleared.players.find((p) => p.isHuman);
    return {
      ...cleared,
      phase: 'roundSummary',
      currentPlayer: human?.id ?? cleared.currentPlayer,
    };
  }
  return cleared;
}

function activePlayers(state: GameState): Player[] {
  return state.players.filter((p) => !state.poker.folded[p.id] && !isEliminated(p));
}

function playerNeedsPokerAction(state: GameState, playerId: number): boolean {
  if (state.poker.folded[playerId] || isEliminated(state.players[playerId])) return false;
  const bet = state.poker.playerBets[playerId] || 0;
  return !state.poker.acted[playerId] || bet < state.poker.currentBet;
}

function findNextPokerActor(state: GameState): number | null {
  const { players, currentPlayer } = state;
  if (players.length === 0) return null;

  let nextId = currentPlayer;
  for (let i = 0; i < players.length; i += 1) {
    nextId = nextPlayerIndex(state, nextId);
    if (playerNeedsPokerAction(state, nextId)) return nextId;
  }
  return null;
}

function fixPokerTurnIfStuck(state: GameState): GameState {
  const active = activePlayers(state);
  if (active.length <= 1) return resolvePokerShowdown(state);

  const allMatched = active.every((p) => {
    const bet = state.poker.playerBets[p.id] || 0;
    return bet >= state.poker.currentBet && state.poker.acted[p.id];
  });
  if (allMatched) return resolvePokerShowdown(state);

  const current = state.players[state.currentPlayer];
  if (current && playerNeedsPokerAction(state, current.id)) return state;

  const nextId = findNextPokerActor(state);
  if (nextId === null) return resolvePokerShowdown(state);
  if (nextId === state.currentPlayer) return state;

  return { ...state, currentPlayer: nextId };
}

function nextPlayerIndex(state: GameState, from: number): number {
  return nextInGamePlayer(state, from) ?? (from + 1) % state.players.length;
}

function firstLeftOfDealer(state: GameState): number {
  return firstInGameLeftOfDealer(state);
}

function applyChipDelta(players: Player[], deltas: number[]): Player[] {
  return players.map((p, i) => ({ ...p, chips: p.chips + (deltas[i] || 0) }));
}

function collectAntesFromPlayers(state: GameState): GameState {
  const active = inGamePlayers(state);
  const antePerSection = antePerSectionForRound(state, active.length);
  const fullAnteTotal = antePerSection * ANTE_SECTION_COUNT;
  let players = [...state.players];
  let pot = clonePot(state.pot);
  const logLines: string[] = [];

  for (const p of active) {
    const { sections, chipsSpent } = distributePlayerAnte(p.chips, antePerSection);
    players = players.map((x) =>
      x.id === p.id ? { ...x, chips: x.chips - chipsSpent, anteSections: sections } : x
    );
    applyAnteToPot(pot, sections, antePerSection);
    if (chipsSpent < fullAnteTotal) {
      logLines.push(
        `${logPlayerName(p)} antes ${chipsSpent} chip${chipsSpent === 1 ? '' : 's'} (${sections.length}/${ANTE_SECTION_COUNT} sections — short stack)`
      );
    }
  }

  const anteSummary =
    active.length === 0
      ? 'No active players remain to ante'
      : logLines.length > 0
        ? logLines.join('; ')
        : state.suddenDeath?.active
          ? `Each active player antes ${fullAnteTotal} chips across the board (Sudden Death ${antePerSection}× per section)`
          : `Each active player antes ${fullAnteTotal} chips across the board`;

  let next = appendLog({ ...state, players, pot }, log(anteSummary, 'info'));
  for (const p of active) {
    const sections = players.find((x) => x.id === p.id)?.anteSections ?? [];
    const animSection = sections.includes('pot') ? 'pot' : sections[sections.length - 1] ?? 'pot';
    next = chipFromHumanOrPlayerToPot(
      next,
      players.find((x) => x.id === p.id) ?? p,
      animSection,
      Math.min(Math.max(sections.length, 1), 6)
    );
  }
  return next;
}

/** Dealer can be busted by short-stack antes right after deal — they cannot act on blind choice. */
function resolveBustedDealerBlindChoice(state: GameState): GameState {
  if (state.phase !== 'dealerBlindChoice') return state;
  const dealer = state.players[state.dealerId];
  if (!dealer || !isEliminated(dealer)) return state;
  return startPayCardsPhase(
    appendLog(
      state,
      log(
        `${logPlayerName(dealer)} is out — skipping dealer blind choice`,
        'info'
      )
    )
  );
}

/** Fix known soft-lock states when restoring a saved session (e.g. busted dealer mid-blind). */
export function repairLoadedGameSession(state: GameState): GameState {
  let next = resolveBustedDealerBlindChoice(state);
  if (next.phase === 'dealerBlindChoice') {
    const dealer = next.players[next.dealerId];
    if (dealer && !isEliminated(dealer) && next.currentPlayer !== next.dealerId) {
      next = { ...next, currentPlayer: next.dealerId };
    }
  }
  if (next.isSoloSession == null && next.players.length > 0) {
    const humanCount = next.players.filter((p) => p.isHuman).length;
    next = { ...next, isSoloSession: humanCount === 1 };
  }
  if (next.poker.lastHandRank === undefined) {
    next = { ...next, poker: { ...next.poker, lastHandRank: null } };
  }
  return next;
}

function startPayCardsPhase(state: GameState): GameState {
  if (state.houseRules.payCardsOnMichiganPlay) {
    return appendLog(
      startPokerPhase({ ...state }),
      log('Pay card pots stay on the board until played in Michigan', 'info')
    );
  }

  const hands = state.players.map((p) => p.cards);
  const names = state.players.map((p) => displayPlayerName(p));
  const { pot, claims, playerChipDeltas } = resolvePayCardClaims(
    hands,
    state.deadHand,
    state.pot,
    state.houseRules,
    state.players.map((p) => p.anteSections)
  );
  let next: GameState = {
    ...state,
    pot,
    payCardClaims: claims,
    players: applyChipDelta(state.players, playerChipDeltas),
    phase: 'payCards',
    currentPlayer: firstLeftOfDealer(state),
  };
  if (claims.length === 0) {
    next = appendLog(next, log('No pay cards claimed this round', 'info'));
    return startPokerPhase(next);
  }
  const claimLines = claims.map((c) =>
    c.description.replace(
      `Player ${c.playerId + 1}`,
      names[c.playerId] ?? `Player ${c.playerId + 1}`
    )
  );
  claimLines.forEach((line) => {
    next = appendLog(next, log(line, 'success'));
  });
  return showAnnouncement(
    next,
    {
      title: 'Pay Cards — Claims',
      lines: claimLines,
      variant: 'success',
    },
    'poker'
  );
}

function startPokerPhase(state: GameState): GameState {
  if (shouldForceAllInPoker(state)) {
    return forceSuddenDeathAllInPoker(state);
  }
  return appendLog(
    {
      ...state,
      phase: 'poker',
      currentPlayer: firstLeftOfDealer(state),
      poker: createInitialPokerState(state.players.length),
    },
    log('Poker phase — betting begins left of dealer', 'info')
  );
}

function forceSuddenDeathAllInPoker(state: GameState): GameState {
  const active = inGamePlayers(state);
  if (active.length !== 2) {
    return appendLog(
      {
        ...state,
        phase: 'poker',
        currentPlayer: firstLeftOfDealer(state),
        poker: createInitialPokerState(state.players.length),
      },
      log('Poker phase — betting begins left of dealer', 'info')
    );
  }

  let next: GameState = {
    ...state,
    phase: 'poker',
    players: [...state.players],
    pot: clonePot(state.pot),
    poker: createInitialPokerState(state.players.length),
    currentPlayer: firstLeftOfDealer(state),
  };
  const commits: string[] = [];

  for (const p of active) {
    const bet = p.chips;
    if (bet <= 0) continue;
    next = {
      ...next,
      players: next.players.map((x) => (x.id === p.id ? { ...x, chips: 0 } : x)),
      pot: { ...next.pot, pot: next.pot.pot + bet },
      poker: {
        ...next.poker,
        playerBets: { ...next.poker.playerBets, [p.id]: bet },
        acted: { ...next.poker.acted, [p.id]: true },
      },
    };
    commits.push(`${logPlayerName(p)} ${bet}`);
    next = chipFromHumanOrPlayerToPot(next, p, 'pot', Math.min(bet, 6));
  }

  next = {
    ...next,
    poker: {
      ...next.poker,
      currentBet: Math.max(...active.map((p) => next.poker.playerBets[p.id] || 0), 0),
    },
  };

  next = appendLog(
    next,
    log(`Sudden Death all-in — ${commits.join(' vs ')}`, 'success')
  );

  return resolvePokerShowdown(next);
}

function advancePokerTurn(state: GameState): GameState {
  const active = activePlayers(state);

  if (active.length <= 1) {
    return resolvePokerShowdown(state);
  }

  const allMatched =
    active.length > 0 &&
    active.every((p) => {
      const bet = state.poker.playerBets[p.id] || 0;
      return bet >= state.poker.currentBet && state.poker.acted[p.id];
    });

  if (allMatched) {
    return resolvePokerShowdown(state);
  }

  const nextId = findNextPokerActor(state);
  if (nextId === null) {
    return resolvePokerShowdown(state);
  }

  return { ...state, currentPlayer: nextId };
}

function resolvePokerShowdown(state: GameState): GameState {
  const contenders = state.players.filter((p) => !state.poker.folded[p.id]);
  let best = contenders[0];
  let bestEval = evaluateBestPokerHand(best.cards);
  const winners = [best.id];

  for (let i = 1; i < contenders.length; i++) {
    const eval_ = evaluateBestPokerHand(contenders[i].cards);
    const cmp = comparePokerHands(eval_, bestEval);
    if (cmp > 0) {
      best = contenders[i];
      bestEval = eval_;
      winners.length = 0;
      winners.push(best.id);
    } else if (cmp === 0) {
      winners.push(contenders[i].id);
    }
  }

  const potAmount = state.pot.pot;
  const eligibleWinners = winners.filter((id) =>
    playerEligibleForSectionFromPlayer(state.players[id], 'pot')
  );
  const payoutWinners = eligibleWinners.length > 0 ? eligibleWinners : [];
  const share =
    payoutWinners.length > 0 ? Math.floor(potAmount / payoutWinners.length) : 0;
  const players = state.players.map((p) =>
    payoutWinners.includes(p.id) ? { ...p, chips: p.chips + share } : p
  );
  let pot = clonePot(state.pot);
  pot.pot = potAmount - share * payoutWinners.length;

  let next = appendLog(
    {
      ...state,
      players,
      pot,
      poker: {
        ...state.poker,
        roundComplete: true,
        winners,
        lastHandLabel: bestEval.label,
        lastHandRank: bestEval.rank,
      },
    },
    log(
      payoutWinners.length > 0
        ? `Poker: ${payoutWinners.map((w) => logPlayerName(state.players[w])).join(', ')} win ${share} with ${bestEval.label}`
        : `Poker: ${winners.map((w) => logPlayerName(state.players[w])).join(', ')} had best hand but did not ante the POT — chips stay on the board`,
      payoutWinners.length > 0 ? 'success' : 'info'
    )
  );

  const winnerNames = winners.map((w) => logPlayerName(state.players[w]));
  const foldedCount = state.players.filter((p) => state.poker.folded[p.id]).length;
  const lines: string[] = [];

  if (contenders.length === 1 && foldedCount === state.players.length - 1) {
    lines.push(
      payoutWinners.length > 0
        ? `${winnerNames[0]} wins ${share} chip${share === 1 ? '' : 's'} — all other players folded.`
        : `${winnerNames[0]} wins by fold but did not ante the POT — chips remain.`
    );
  } else if (winners.length === 1) {
    lines.push(
      payoutWinners.length > 0
        ? `${winnerNames[0]} wins ${share} chips with a ${bestEval.label}.`
        : `${winnerNames[0]} had a ${bestEval.label} but did not ante the POT — chips remain.`
    );
  } else {
    lines.push(
      payoutWinners.length > 0
        ? `${payoutWinners.map((w) => logPlayerName(state.players[w])).join(' and ')} split the pot — ${share} chips each with a ${bestEval.label}.`
        : `Best hand (${bestEval.label}) but no winner anted the POT — chips remain.`
    );
  }
  if (potAmount > 0) {
    lines.push(`Pot total: ${potAmount} chips.`);
  }

  return showAnnouncement(
    payoutWinners.reduce(
      (s, w) => chipFromPotToPlayer(s, 'pot', w, Math.max(share, 3)),
      next
    ),
    {
      title: 'Poker — Pot Won',
      lines,
      variant: 'success',
    },
    'michigan'
  );
}

function startMichiganPhase(state: GameState): GameState {
  let players = state.players.map((p) => ({
    ...p,
    cards: [...p.originalHand],
  }));

  if (state.houseRules.blindSwapShuffle && state.deadHand.length > 0) {
    const pool = [...state.deadHand];
    while (pool.length > 0) {
      const card = pool.pop()!;
      const target = Math.floor(Math.random() * players.length);
      players = players.map((p, i) =>
        i === target ? { ...p, cards: [...p.cards, card] } : p
      );
    }
  }

  const starter = getMichiganStarter(
    players.map((p) => p.cards),
    state.dealerId
  );
  let next = appendLog(
    {
      ...state,
      players,
      phase: 'michigan',
      michigan: createMichiganState(),
      michiganPlayArea: [],
      michiganShownPlays: emptyShownPlays(players.length),
      currentPlayer: starter,
      roundWinnerId: null,
      achievementSession: state.isSoloSession
        ? { sequenceTimedOut: false, leadPassUsed: false, humanLeadPasses: 0 }
        : undefined,
    },
    log(
      state.houseRules.blindSwapShuffle && state.deadHand.length > 0
        ? `Michigan Rummy — blind swap shuffle! Dead-hand cards injected into play`
        : `Michigan Rummy — ${state.players[starter] ? logPlayerName(state.players[starter]) : 'Player'} (left of dealer) must lead lowest ${leadColorLabel('black')}`,
      'info'
    )
  );
  if (!state.houseRules.blindSwapShuffle || state.deadHand.length === 0) {
    return next;
  }
  return appendLog(
    next,
    log(
      `${state.players[starter] ? logPlayerName(state.players[starter]) : 'Player'} leads lowest ${leadColorLabel('black')}`,
      'info'
    )
  );
}

function finishMichigan(state: GameState, winnerId: number): GameState {
  const winner = state.players[winnerId];
  const kittyEligible = playerEligibleForSectionFromPlayer(winner, 'kitty');
  const kittyAmount = kittyEligible ? state.pot.kitty : 0;
  const kittyLeftover = kittyEligible ? 0 : state.pot.kitty;
  const penalize = state.houseRules.michiganRemainingCardPenalty;
  let penaltyIncome = 0;
  let players = state.players.map((p) => {
    if (p.id === winnerId) return p;
    const owed = penalize ? p.cards.length * MICHIGAN_PENALTY_PER_CARD : 0;
    const paid = penalize ? Math.min(owed, p.chips) : 0;
    penaltyIncome += paid;
    return { ...p, chips: p.chips - paid };
  });
  players = players.map((p) =>
    p.id === winnerId ? { ...p, chips: p.chips + kittyAmount + penaltyIncome } : p
  );

  let pot = clonePot(state.pot);
  pot.kitty = kittyLeftover;

  let next: GameState = {
    ...state,
    players,
    pot,
    roundWinnerId: winnerId,
  };
  const winnerName = logPlayerName(state.players[winnerId]);
  const lines = [
    kittyEligible
      ? `${winnerName} emptied their hand and wins the Kitty (${kittyAmount} chips).`
      : `${winnerName} emptied their hand but did not ante the Kitty — ${kittyLeftover} chip${kittyLeftover === 1 ? '' : 's'} stay on the board.`,
  ];
  if (penaltyIncome > 0) {
    lines.push(
      `${winnerName} collects ${penaltyIncome} chip${penaltyIncome === 1 ? '' : 's'} from opponents' remaining cards.`
    );
  }

  next = appendLog(
    next,
    log(`${winnerName} empties their hand and wins the Kitty!`, 'success')
  );
  state.players.forEach((p) => {
    if (p.id === winnerId || p.cards.length === 0 || !penalize) return;
    const owed = p.cards.length * MICHIGAN_PENALTY_PER_CARD;
    const paid = Math.min(owed, p.chips);
    if (paid <= 0) return;
    lines.push(
      `${logPlayerName(p)} pays ${paid} chip${paid === 1 ? '' : 's'} to ${winnerName} for ${p.cards.length} remaining card${p.cards.length === 1 ? '' : 's'}.`
    );
    next = appendLog(
      next,
      log(`${logPlayerName(p)} pays ${paid} chip(s) for remaining cards`, 'info')
    );
  });

  return showAnnouncement(
    kittyEligible
      ? chipFromPotToPlayer(next, 'kitty', winnerId, Math.max(kittyAmount, 4))
      : next,
    {
      title: 'Michigan Rummy — Winner',
      lines,
      variant: 'success',
    },
    'roundSummary'
  );
}

function handlePokerAction(
  state: GameState,
  action: PokerAction,
  amount = 0
): GameState {
  const player = state.players[state.currentPlayer];
  if (!player || isEliminated(player)) return state;
  if (state.poker.folded[player.id]) {
    return advancePokerTurn(state);
  }

  let poker = { ...state.poker, acted: { ...state.poker.acted, [player.id]: true } };
  let players = [...state.players];
  let pot = clonePot(state.pot);
  let next = state;

  if (action === 'fold') {
    if (shouldForceAllInPoker(state)) return state;
    poker.folded[player.id] = true;
    next = appendLog({ ...state, poker }, log(`${logPlayerName(player)} folds`, 'info'));
    return advancePokerTurn(next);
  }

  const currentBet = poker.playerBets[player.id] || 0;
  let toPay = 0;
  let resolvedAction = action;

  if (action === 'check') {
    if (poker.currentBet > currentBet) {
      if (player.chips <= 0) {
        poker.folded[player.id] = true;
        next = appendLog({ ...state, poker }, log(`${logPlayerName(player)} folds`, 'info'));
        return advancePokerTurn(next);
      }
      resolvedAction = 'call';
      toPay = Math.min(poker.currentBet - currentBet, player.chips);
    }
  } else if (action === 'call') {
    toPay = poker.currentBet - currentBet;
  } else if (action === 'bet' || action === 'raise') {
    const raiseTo = action === 'bet' ? amount : poker.currentBet + amount;
    toPay = raiseTo - currentBet;
    poker.currentBet = raiseTo;
    poker.acted = Object.fromEntries(state.players.map((p) => [p.id, p.id === player.id]));
  }

  if (toPay > player.chips) toPay = player.chips;
  if (toPay > 0) {
    players = players.map((p) =>
      p.id === player.id ? { ...p, chips: p.chips - toPay } : p
    );
    poker.playerBets[player.id] = currentBet + toPay;
    pot.pot += toPay;
    next = appendLog(
      { ...state, players, pot, poker },
      log(`${logPlayerName(player)} ${resolvedAction}${toPay > 0 ? ` ${toPay}` : ''}`, 'info')
    );
    next = chipFromHumanOrPlayerToPot(next, player, 'pot', Math.min(toPay, 5));
  } else {
    next = { ...state, players, pot, poker };
    next = appendLog(next, log(`${logPlayerName(player)} checks`, 'info'));
  }

  return advancePokerTurn(next);
}

function resolveBlindAuctionEnd(state: GameState): GameState {
  const { highBidder, passed } = state.blindAuction;
  if (highBidder !== null && !passed[highBidder]) {
    return completeBlindAuction({
      ...state,
      blindAuction: { ...state.blindAuction, awaitingDealerClose: false },
    });
  }
  return startPayCardsPhase(
    appendLog(
      { ...state, blindAuction: createInitialBlindAuction() },
      log('No bids on blind hand — it stays face down; dealer keeps their hand', 'info')
    )
  );
}

function beginDealerAuctionClose(state: GameState): GameState {
  const winner = state.blindAuction.highBidder;
  const winnerName =
    winner !== null ? logPlayerName(state.players[winner]) : '';
  const msg =
    winner !== null
      ? `Bidding closed — ${winnerName} wins blind hand for ${state.blindAuction.highBid} chips`
      : 'Bidding closed — no sale';
  return appendLog(
    {
      ...state,
      currentPlayer: state.dealerId,
      blindAuction: { ...state.blindAuction, awaitingDealerClose: true },
    },
    log(msg, 'info')
  );
}

function advanceBlindAuctionAfterPass(state: GameState): GameState {
  if (onlyHighBidderRemains(state)) {
    return beginDealerAuctionClose(state);
  }
  if (allBiddersPassed(state)) {
    return beginDealerAuctionClose(state);
  }
  const next = findNextActiveBidder(state, state.currentPlayer);
  if (next === null) {
    return beginDealerAuctionClose(state);
  }
  return { ...state, currentPlayer: next };
}

function completeBlindAuction(state: GameState): GameState {
  const winner = state.blindAuction.highBidder!;
  const bid = state.blindAuction.highBid;
  const winnerPlayer = state.players[winner];
  const winnerOldHand = [...winnerPlayer.cards];
  const deadHand = [...(state.deadHand || [])];

  const players = state.players.map((p) => {
    if (p.id === winner) {
      return { ...p, cards: deadHand, originalHand: [...deadHand], chips: p.chips - bid };
    }
    if (p.id === state.dealerId) {
      return { ...p, chips: p.chips + bid };
    }
    return p;
  });

  return startPayCardsPhase(
    chipFromPlayerToDealer(
      appendLog(
        {
          ...state,
          players,
          deadHand: winnerOldHand,
          blindAuction: createInitialBlindAuction(),
        },
        log(`${logPlayerName(winnerPlayer)} wins blind auction for ${bid} chips`, 'success')
      ),
      winner,
      bid
    )
  );
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  const next = reduceGameState(state, action);
  if (next !== state) {
    const resolved = resolveBustedDealerBlindChoice(next);
    return finalizePlayerStatus(resolved, state);
  }

  if (
    state.phase === 'michigan' &&
    (action.type === 'MICHIGAN_SYNC_TURN' || action.type === 'MICHIGAN_PLAY')
  ) {
    const recovered = recoverMichiganFromNoOp(state, action);
    if (recovered !== state) return finalizePlayerStatus(recovered, state);
  }

  return state;
}

function recoverMichiganFromNoOp(state: GameState, attempted: GameAction): GameState {
  for (const fallback of michiganRecoveryActions(state)) {
    if (fallback.type === attempted.type) continue;
    const next = reduceGameState(state, fallback);
    if (next !== state) return next;
  }

  const hands = state.players.map((p) => p.cards);
  const advanced = advanceMichiganWhenSequenceUnavailable(hands, state.michigan);
  if (advanced) {
    return { ...state, michigan: advanced.michigan, currentPlayer: advanced.currentPlayer };
  }

  const player = state.players[state.currentPlayer];
  if (
    player &&
    !player.isHuman &&
    canPassLead(player.cards, state.michigan, player.id, state.currentPlayer)
  ) {
    return reduceGameState(state, { type: 'MICHIGAN_PASS_LEAD' });
  }

  const legal = player
    ? getLegalMichiganPlays(player.cards, state.michigan, player.id, state.currentPlayer)
    : [];
  if (legal.length > 0) {
    return reduceGameState(state, { type: 'MICHIGAN_PLAY', card: legal[0] });
  }

  return state;
}

function reduceGameState(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_GAME': {
      const seats = action.seats;
      const playerCount = seats.length;
      if (playerCount < MIN_PLAYERS || playerCount > MAX_PLAYERS) return state;
      const dealerId = 0;
      const soloHuman = seats.filter((s) => s.isHuman).length === 1;
      resetLogCounter();
      const { players: dealt, deadHand } = dealHands(playerCount, dealerId);
      const players: Player[] = seats.map((seat, i) => ({
        id: i,
        name: seat.isHuman
          ? sanitizePlayerName(seat.name || DEFAULT_HUMAN_NAME)
          : seat.name || generateName(),
        isHuman: seat.isHuman,
        chips: debugStartingChips(STARTING_CHIPS),
        cards: dealt[i],
        originalHand: [...dealt[i]],
        aiDifficulty: seat.isHuman ? undefined : seat.aiDifficulty ?? 'medium',
      }));

      const opening = [
        log(`Round 1 — ${playerCount} players`, 'info'),
        log(
          `House rules: ${summarizeHouseRules(action.houseRules ?? defaultHouseRules())}`,
          'info'
        ),
      ];

      let next: GameState = {
        ...initialGameState,
        players,
        dealerId,
        deadHand,
        pot: createEmptyPot(),
        phase: 'dealerBlindChoice',
        currentPlayer: dealerId,
        roundNumber: 1,
        poker: createInitialPokerState(playerCount),
        blindAuction: createInitialBlindAuction(),
        houseRules: action.houseRules ?? defaultHouseRules(),
        isSoloSession: soloHuman,
        achievementSession: soloHuman
          ? { sequenceTimedOut: false, leadPassUsed: false, humanLeadPasses: 0 }
          : undefined,
        recordFullSessionLog: true,
        sessionStartedAt: Date.now(),
        sessionLog: [...opening],
        sessionLogDroppedCount: 0,
        log: opening,
      };
      next = collectAntesFromPlayers(next);
      next = dealAnimationsForRound(next);
      return appendLog(next, log(`${logPlayerName(players[dealerId])} is dealer — blind hand decision`, 'info'));
    }

    case 'QUIT_GAME':
      return {
        ...initialGameState,
        soundEnabled: state.soundEnabled,
        houseRules: state.houseRules,
      };

    case 'DEALER_BLIND_CHOICE': {
      if (state.phase !== 'dealerBlindChoice') return state;
      const dealer = state.players[state.dealerId];
      if (action.choice === 'swap') {
        if (handHasPayCard(dealer.cards)) {
          const held = describePayCardsHeld(dealer.cards).join(', ');
          return appendLog(
            state,
            log(
              `${logPlayerName(dealer)} cannot swap with the blind — pay card in hand (${held})`,
              'error'
            )
          );
        }
        const dealerHand = [...dealer.cards];
        const deadHand = [...state.deadHand];
        const players = state.players.map((p) =>
          p.id === state.dealerId
            ? { ...p, cards: deadHand, originalHand: [...deadHand] }
            : p
        );
        return startPayCardsPhase(
          appendLog(
            { ...state, players, deadHand: dealerHand, phase: 'payCards' },
            log(`${logPlayerName(dealer)} swaps with the blind hand`, 'info')
          )
        );
      }
      if (action.choice === 'keep') {
        if (!state.houseRules.dealerBlindKeepOption) return state;
        return startPayCardsPhase(
          appendLog(
            { ...state, phase: 'payCards' },
            log(`${logPlayerName(dealer)} keeps their hand`, 'info')
          )
        );
      }
      if (action.choice === 'auction') {
        const passed: Record<number, boolean> = {};
        getAuctionBidders(state).forEach((id) => {
          passed[id] = false;
        });
        return appendLog(
          {
            ...state,
            phase: 'blindAuction',
            currentPlayer: firstAuctionBidder(state),
            blindAuction: {
              ...createInitialBlindAuction(),
              passed,
            },
          },
          log('Blind hand goes to auction — dealer does not bid', 'info')
        );
      }
      return state;
    }

    case 'BLIND_AUCTION_BID': {
      if (state.phase !== 'blindAuction' || state.blindAuction.awaitingDealerClose) return state;
      const player = state.players[state.currentPlayer];
      if (!player || isDealerInAuction(state, player.id) || isEliminated(player)) return state;
      if (state.blindAuction.passed[player.id]) {
        return appendLog(
          state,
          log(
            `${logPlayerName(player)} already passed — cannot bid again this auction`,
            'error'
          )
        );
      }
      if (action.amount <= state.blindAuction.highBid || action.amount > player.chips) {
        return state;
      }
      if (handHasPayCard(player.cards)) {
        const held = describePayCardsHeld(player.cards).join(', ');
        return appendLog(
          state,
          log(
            `${logPlayerName(player)} cannot bid on the blind — pay card in hand (${held})`,
            'error'
          )
        );
      }

      const blindAuction = {
        ...state.blindAuction,
        highBid: action.amount,
        highBidder: player.id,
        passed: { ...state.blindAuction.passed },
      };

      let next = appendLog(
        { ...state, blindAuction },
        log(`${logPlayerName(player)} bids ${action.amount} for blind hand`, 'info')
      );

      const nextBidder = findRespondersToBid(next, player.id);
      if (nextBidder === null) {
        return beginDealerAuctionClose(next);
      }
      return { ...next, currentPlayer: nextBidder };
    }

    case 'BLIND_AUCTION_PASS': {
      if (state.phase !== 'blindAuction' || state.blindAuction.awaitingDealerClose) return state;
      const player = state.players[state.currentPlayer];
      if (!player || isDealerInAuction(state, player.id) || isEliminated(player)) return state;
      if (state.blindAuction.passed[player.id]) return state;

      const wasHighBidder = state.blindAuction.highBidder === player.id;
      const withdrawnBid = wasHighBidder ? state.blindAuction.highBid : 0;

      let blindAuction = {
        ...state.blindAuction,
        passed: { ...state.blindAuction.passed, [player.id]: true },
      };
      if (wasHighBidder) {
        blindAuction = { ...blindAuction, highBidder: null, highBid: 0 };
      }

      const passMsg = wasHighBidder
        ? `${logPlayerName(player)} passes and withdraws ${withdrawnBid} chip bid for blind hand`
        : `${logPlayerName(player)} passes on blind hand`;

      let next = appendLog({ ...state, blindAuction }, log(passMsg, 'info'));
      return advanceBlindAuctionAfterPass(next);
    }

    case 'BLIND_AUCTION_RESOLVE': {
      if (state.phase !== 'blindAuction' || !state.blindAuction.awaitingDealerClose) return state;
      if (state.currentPlayer !== state.dealerId) return state;
      return resolveBlindAuctionEnd(state);
    }

    case 'ADVANCE_PHASE': {
      if (state.phase === 'payCards') return startPokerPhase(state);
      return state;
    }

    case 'POKER_ACTION':
      return handlePokerAction(state, action.action, action.amount ?? 0);

    case 'POKER_SYNC_TURN':
      if (state.phase !== 'poker') return state;
      return fixPokerTurnIfStuck(state);

    case 'MICHIGAN_PLAY': {
      if (state.phase !== 'michigan') return state;
      const player = state.players[state.currentPlayer];
      if (
        !player ||
        !validateMichiganPlay(
          player.cards,
          action.card,
          state.michigan,
          player.id,
          state.currentPlayer
        )
      ) {
        return state;
      }

      const hands = state.players.map((p) => p.cards);
      const newHands = applyMichiganPlay(hands, player.id, action.card);
      const turn = resolveAfterMichiganPlay(newHands, state.michigan, action.card, player.id);
      const shownPlays = recordShownPlay(state.michiganShownPlays, player.id, action.card);

      let players = state.players.map((p, i) => ({ ...p, cards: newHands[i] }));
      let pot = state.pot;
      let payCardClaims = state.payCardClaims;
      let next: GameState = state;

      if (state.houseRules.payCardsOnMichiganPlay) {
        const claimResult = resolvePayCardClaimOnPlay(
          action.card,
          player.cards,
          state.deadHand,
          pot,
          player.id,
          logPlayerName(player),
          state.houseRules,
          player.anteSections
        );
        pot = claimResult.pot;
        for (const claim of claimResult.claims) {
          players = players.map((p) =>
            p.id === player.id ? { ...p, chips: p.chips + claim.amount } : p
          );
          payCardClaims = [...payCardClaims, claim];
          next = appendLog(next, log(claim.description, 'success'));
          next = chipFromPotToPlayer(
            next,
            claim.section,
            player.id,
            Math.min(claim.amount, 6)
          );
        }
      }

      const playState = {
        ...next,
        players,
        pot,
        payCardClaims,
        michigan: { ...turn.michigan, leadPassOrigin: null },
        michiganShownPlays: shownPlays,
        michiganPlayArea: [...state.michiganPlayArea, action.card],
      };

      if (players[player.id].cards.length === 0) {
        return finishMichigan(
          cardPlayAnimation(
            {
              ...playState,
              currentPlayer: turn.currentPlayer,
            },
            player,
            action.card
          ),
          player.id
        );
      }

      return appendLog(
        cardPlayAnimation(
          {
            ...playState,
            currentPlayer: turn.currentPlayer,
          },
          player,
          action.card
        ),
        log(formatPlayerPlays(player.name, action.card, player.isHuman), 'info')
      );
    }

    case 'MICHIGAN_TIMER_EXPIRE': {
      if (state.phase !== 'michigan' || !state.houseRules.michiganSequenceTimer) return state;
      const result = resolveMichiganSequenceTimeout(state.michigan);
      if (!result) return state;

      const { activeSuit, nextValue } = state.michigan;
      const lastName = state.players[result.currentPlayer]
        ? logPlayerName(state.players[result.currentPlayer])
        : 'Player';
      return appendLog(
        {
          ...state,
          michigan: result.michigan,
          currentPlayer: result.currentPlayer,
          achievementSession: state.achievementSession
            ? { ...state.achievementSession, sequenceTimedOut: true }
            : state.achievementSession,
        },
        log(
          `${nextValue} of ${activeSuit} assumed in dead hand (time expired) — ${lastName} leads ${leadColorLabel(result.michigan.leadColor)}`,
          'info'
        )
      );
    }

    case 'ACTION_TIMER_EXPIRE': {
      const followUp = resolvePlayerActionTimeout(state);
      if (!followUp) return state;

      const player = state.players[state.currentPlayer];
      let timed = state;
      if (followUp.type === 'DISMISS_ANNOUNCEMENT') {
        timed = appendLog(state, log('Time expired — continuing', 'info'));
      } else if (followUp.type === 'START_NEW_ROUND') {
        timed = appendLog(state, log('Time expired — starting next round', 'info'));
      } else if (player) {
        timed = appendLog(
          state,
          log(`${logPlayerName(player)} — time expired`, 'info')
        );
      }
      return gameReducer(timed, followUp);
    }

    case 'MICHIGAN_PASS_LEAD': {
      if (state.phase !== 'michigan') return state;
      const player = state.players[state.currentPlayer];
      if (
        !player ||
        !canPassLead(player.cards, state.michigan, player.id, state.currentPlayer)
      ) {
        return state;
      }

      const hands = state.players.map((p) => p.cards);
      const passTurn = resolveLeadPassTurn(hands, state.michigan, player.id);
      const penalize =
        state.houseRules.michiganLeadPassPenalty &&
        player.chips >= MICHIGAN_KITTY_PENALTY;
      const players = state.players.map((p, i) =>
        i === player.id && penalize
          ? { ...p, chips: p.chips - MICHIGAN_KITTY_PENALTY }
          : p
      );
      const pot = clonePot(state.pot);
      if (penalize) pot.kitty += MICHIGAN_KITTY_PENALTY;

      const nextName = state.players[passTurn.currentPlayer]
        ? logPlayerName(state.players[passTurn.currentPlayer])
        : 'Player';
      const penaltyMsg = penalize
        ? `pays ${MICHIGAN_KITTY_PENALTY} to kitty; `
        : '';
      const flipMsg = passTurn.flippedLeadColor
        ? `nobody could lead ${leadColorLabel(state.michigan.leadColor)} — switch to ${leadColorLabel(passTurn.michigan.leadColor)}; `
        : '';
      let next = appendLog(
        {
          ...state,
          players,
          pot,
          currentPlayer: passTurn.currentPlayer,
          michigan: passTurn.michigan,
          achievementSession:
            player.isHuman && state.achievementSession
              ? {
                  ...state.achievementSession,
                  leadPassUsed: true,
                  humanLeadPasses: state.achievementSession.humanLeadPasses + 1,
                }
              : state.achievementSession,
        },
        log(
          passTurn.flippedLeadColor
            ? `${flipMsg}${nextName} must lead lowest ${leadColorLabel(passTurn.michigan.leadColor)}`
            : `${logPlayerName(player)} cannot lead ${leadColorLabel(state.michigan.leadColor)} — ${penaltyMsg}${nextName} to lead`,
          'info'
        )
      );
      if (penalize) {
        next = chipFromHumanOrPlayerToPot(next, player, 'kitty', 1);
      }
      return next;
    }

    case 'MICHIGAN_SYNC_TURN': {
      if (state.phase !== 'michigan') return state;
      const hands = state.players.map((p) => p.cards);
      const fixed = fixMichiganTurnIfStuck(hands, state.michigan, state.currentPlayer);

      if (!fixed) {
        const player = state.players[state.currentPlayer];
        if (
          player &&
          !player.isHuman &&
          canPassLead(player.cards, state.michigan, player.id, state.currentPlayer)
        ) {
          return gameReducer(state, { type: 'MICHIGAN_PASS_LEAD' });
        }
        return state;
      }

      if (
        fixed.currentPlayer === state.currentPlayer &&
        fixed.michigan.mode === state.michigan.mode &&
        fixed.michigan.leadColor === state.michigan.leadColor &&
        fixed.michigan.activeSuit === state.michigan.activeSuit &&
        fixed.michigan.nextValue === state.michigan.nextValue
      ) {
        const advanced = advanceMichiganWhenSequenceUnavailable(hands, state.michigan);
        if (advanced) {
          const name = state.players[advanced.currentPlayer]
            ? logPlayerName(state.players[advanced.currentPlayer])
            : 'Player';
          return appendLog(
            {
              ...state,
              currentPlayer: advanced.currentPlayer,
              michigan: advanced.michigan,
            },
            log(
              `${name} must lead lowest ${leadColorLabel(advanced.michigan.leadColor)}`,
              'info'
            )
          );
        }
        return state;
      }

      const name = state.players[fixed.currentPlayer]
        ? logPlayerName(state.players[fixed.currentPlayer])
        : 'Player';
      const msg =
        fixed.michigan.mode === 'lead'
          ? `${name} must lead lowest ${leadColorLabel(fixed.michigan.leadColor)}`
          : `${name} to play ${fixed.michigan.nextValue} of ${fixed.michigan.activeSuit}`;
      return appendLog(
        { ...state, currentPlayer: fixed.currentPlayer, michigan: fixed.michigan },
        log(msg, 'info')
      );
    }

    case 'MICHIGAN_PASS_TURN':
      return { ...state, currentPlayer: action.playerId };

    case 'DISMISS_ANNOUNCEMENT': {
      if (state.phase !== 'announcement' || !state.announcement) return state;
      return dismissAnnouncement(state);
    }

    case 'START_NEW_ROUND': {
      const playerCount = state.players.length;
      const active = inGamePlayers(state);
      if (active.length <= 1) return state;
      const transition = planRoundTransition(state);
      const newDealerId = nextInGameDealer(state);
      const activeSeatIds = active.map((p) => p.id);
      const { playerHands, deadHand } = dealHandsFiltered(
        playerCount,
        activeSeatIds,
        newDealerId
      );
      const players = state.players.map((p, i) => ({
        ...p,
        cards: isEliminated(p) ? [] : playerHands[i],
        originalHand: isEliminated(p) ? [] : [...playerHands[i]],
      }));
      let next: GameState = {
        ...state,
        players,
        dealerId: newDealerId,
        deadHand,
        pot: state.pot,
        phase: 'dealerBlindChoice',
        currentPlayer: newDealerId,
        roundNumber: state.roundNumber + 1,
        twoPlayerStreak: transition.twoPlayerStreak,
        suddenDeath: transition.suddenDeath,
        payCardClaims: [],
        michigan: createMichiganState(),
        poker: createInitialPokerState(playerCount),
        blindAuction: createInitialBlindAuction(),
        michiganPlayArea: [],
        michiganShownPlays: {},
        roundWinnerId: null,
        announcement: null,
        announcementContinue: null,
        achievementSession: state.achievementSession
          ? { sequenceTimedOut: false, leadPassUsed: false, humanLeadPasses: 0 }
          : undefined,
      };
      if (transition.suddenDeathActivated && transition.suddenDeathReason) {
        next = appendLog(
          next,
          log(suddenDeathTriggerMessage(transition.suddenDeathReason), 'success')
        );
      }
      next = collectAntesFromPlayers(next);
      next = dealAnimationsForRound(next);
      return appendLog(next, log(`Round ${next.roundNumber} — ${logPlayerName(players[newDealerId])} deals`, 'info'));
    }

    case 'CHANGE_PLAYER_NAME': {
      const name = sanitizePlayerName(action.name);
      if (action.playerId !== undefined) {
        return {
          ...state,
          players: state.players.map((p) =>
            p.id === action.playerId && p.isHuman ? { ...p, name } : p
          ),
        };
      }
      return {
        ...state,
        players: state.players.map((p) => (p.isHuman ? { ...p, name } : p)),
      };
    }

    case 'REORDER_CARDS': {
      const player = state.players.find((p) => p.id === action.playerId);
      if (!player || !player.isHuman) return state;
      if (action.cards.length !== player.cards.length) return state;
      const ids = new Set(player.cards.map((c) => c.id));
      if (!action.cards.every((c) => ids.has(c.id))) return state;
      return {
        ...state,
        players: state.players.map((p) =>
          p.id === action.playerId ? { ...p, cards: action.cards } : p
        ),
      };
    }

    case 'ADD_ANIMATION':
      return { ...state, animations: [...state.animations, action.animation] };

    case 'REMOVE_ANIMATION':
      return { ...state, animations: state.animations.filter((a) => a.id !== action.id) };

    case 'TOGGLE_SOUND':
      return { ...state, soundEnabled: !state.soundEnabled };

    case 'SHOW_FEEDBACK':
      return {
        ...state,
        feedback: { message: action.message, feedbackType: action.feedbackType },
      };

    default:
      return state;
  }
}

export function potBoardToDisplaySections(pot: GameState['pot']) {
  const mapping: { key: keyof GameState['pot']; label: SectionLabel; position: string }[] = [
    { key: 'tenHearts', label: 'Ten', position: 'top' },
    { key: 'jackHearts', label: 'Jack', position: 'topRight' },
    { key: 'queenHearts', label: 'Queen', position: 'right' },
    { key: 'kingHearts', label: 'King', position: 'bottomRight' },
    { key: 'aceHearts', label: 'Ace', position: 'bottom' },
    { key: 'eightNineTen', label: '8-9-10', position: 'bottomLeft' },
    { key: 'kingQueen', label: 'King-Queen', position: 'left' },
    { key: 'kitty', label: 'Kitty', position: 'topLeft' },
    { key: 'pot', label: 'POT', position: 'center' },
  ];
  return mapping.map(({ key, label, position }) => ({
    label,
    position,
    chips: pot[key],
    cards: [] as Card[],
  }));
}
