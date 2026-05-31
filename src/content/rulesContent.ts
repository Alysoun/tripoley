import { PHASE_LABELS } from '../game/engine/constants';
import {
  HOUSE_RULE_PRESETS,
  HOUSE_RULE_TOGGLES,
  HouseRules,
  summarizeHouseRules,
} from '../game/engine/houseRules';
import type { GamePhase } from '../types/GameTypes';

export type RulesSection = {
  title: string;
  lines: string[];
};

export const RULES_OVERVIEW: RulesSection = {
  title: 'Round overview',
  lines: [
    'Each player antes 1 chip on every board section (Hearts Ace–Ten, King-Queen pair, 8-9-10, Kitty, and POT).',
    'All 52 cards are dealt to players plus one face-down dead (blind) hand. Extra cards go to players left of the dealer.',
    'Phases run in order: dealer blind choice → Pay Cards → Poker → Michigan Rummy. Dealer rotates left each round.',
    'Each player starts with 200 chips.',
  ],
};

export const RULES_SECTIONS: RulesSection[] = [
  {
    title: 'Dealer blind choice',
    lines: [
      'The dealer chooses Swap (trade with the blind), Auction (others bid to buy the blind), or Keep (optional house rule).',
      'If no one wins the auction, the dealer keeps their hand and the blind stays face down.',
      'Passing in the blind auction is permanent for that round — you cannot bid again after passing.',
      'If you hold any pay card (Hearts Ace–Ten, K-Q of Hearts, or an 8-9-10 run), you cannot swap as dealer or bid in the auction.',
    ],
  },
  {
    title: 'Pay Cards (Hearts)',
    lines: [
      'Official rules: matching sections pay out automatically if you hold the card(s) after the deal.',
      'Hearts Ace–Ten pay individually; King-Queen needs both in one hand; 8-9-10 needs all three of the same suit.',
      'Unclaimed sections roll over to the next round.',
      'Home table rules: nothing pays here — pots pay when you play the matching card(s) during Michigan instead.',
    ],
  },
  {
    title: 'Poker',
    lines: [
      'Each player’s best 5-card hand is evaluated from their dealt cards.',
      'Betting starts left of the dealer: check, bet, call, raise, or fold.',
      'All bets go to the POT section. Best hand wins (split on ties).',
    ],
  },
  {
    title: 'Michigan Rummy',
    lines: [
      'Players pick up their full original hand again.',
      'Player left of dealer opens with their lowest black card (clubs or spades).',
      'Whoever holds the next consecutive card in that suit plays next — not necessarily clockwise.',
      'When the sequence stops, the last player leads their lowest red card (hearts or diamonds). Colors alternate on each break.',
      'If you cannot lead the required color (when lead pass penalty is on), pay 1 chip to the Kitty and pass left.',
      'First player to empty their hand wins the Kitty. Losers may pay 1 chip per card left (house rule).',
      'With the sequence timer on, you have 15 seconds to play the next card in a suit or it is treated as in the dead hand.',
    ],
  },
  {
    title: 'Turn timer',
    lines: [
      'Human players have 15 seconds per decision (blind choice, auction, poker, Michigan, etc.).',
      'If time runs out, the game picks a safe default so the table cannot stall.',
      'Solo play: no timer on round-end summary screens — take your time before Continue.',
    ],
  },
];

const PHASE_HINTS: Partial<Record<GamePhase, string>> = {
  dealerBlindChoice:
    'Dealer: choose Swap, Auction, or Keep (if enabled). You cannot swap if you hold a pay card.',
  blindAuction:
    'Bid to swap with the blind hand and pay the dealer, or pass. Passing is permanent this round. No bidding if you hold a pay card.',
  payCards:
    'Pay-card sections are claimed automatically (official rules) or skipped until Michigan (home table rules). Review the log, then continue.',
  poker:
    'Use the action bar to check, bet, call, raise, or fold. All bets go to the POT; best 5-card hand wins.',
  michigan:
    'Play the next card in the suit sequence when it is your turn, or lead lowest black/red when a sequence ends. Empty your hand first to win the Kitty.',
  announcement:
    'Review payouts and chip transfers, then tap Continue.',
  roundSummary:
    'See who won each section this round, then continue to the next deal.',
  gameOver:
    'Your run at the table has ended. Start a new game when ready.',
};

export function phaseHint(phase: GamePhase): string | null {
  return PHASE_HINTS[phase] ?? null;
}

export function phaseLabel(phase: GamePhase): string {
  return PHASE_LABELS[phase] ?? phase;
}

export function activeHouseRulesSummary(rules: HouseRules): { heading: string; lines: string[] } {
  const heading = summarizeHouseRules(rules);
  const presetDesc =
    rules.preset === 'official'
      ? HOUSE_RULE_PRESETS.official.description
      : rules.preset === 'homeTable'
        ? HOUSE_RULE_PRESETS.homeTable.description
        : 'Custom mix of toggles below.';

  const lines = [presetDesc];
  for (const { key, label, hint } of HOUSE_RULE_TOGGLES) {
    lines.push(`${rules[key] ? 'On' : 'Off'} — ${label}: ${hint}`);
  }
  return { heading, lines };
}
