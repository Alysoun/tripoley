export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 9;
export const STARTING_CHIPS = 200;
export const ANTE_PER_SECTION = 1;
export const MICHIGAN_POT_PENALTY = 1;
export const MICHIGAN_PENALTY_PER_CARD = 1;
/** Human decision window — blind auction, poker, Michigan, dealer blind, etc. */
export const PLAYER_ACTION_TURN_MS = 15_000;

/** Time to play the next card in a suit sequence before it is assumed in the dead hand */
export const MICHIGAN_SEQUENCE_TURN_MS = PLAYER_ACTION_TURN_MS;

/** Official Tripoley phase order: Pay Cards → Poker → Michigan Rummy */
export const POT_SECTION_KEYS = [
  'aceHearts',
  'kingHearts',
  'queenHearts',
  'jackHearts',
  'tenHearts',
  'kingQueen',
  'eightNineTen',
  'kitty',
  'pot',
] as const;

export type PotSectionKey = (typeof POT_SECTION_KEYS)[number];

export const POT_SECTION_LABELS: Record<PotSectionKey, string> = {
  aceHearts: 'Ace',
  kingHearts: 'King',
  queenHearts: 'Queen',
  jackHearts: 'Jack',
  tenHearts: 'Ten',
  kingQueen: 'King-Queen',
  eightNineTen: '8-9-10',
  kitty: 'Kitty',
  pot: 'POT',
};

export const PHASE_LABELS: Record<string, string> = {
  setup: 'Setup',
  dealerBlindChoice: 'Dealer Blind Choice',
  blindAuction: 'Blind Hand Auction',
  payCards: 'Pay Cards (Hearts)',
  poker: 'Poker',
  michigan: 'Michigan Rummy',
  announcement: 'Results',
  roundSummary: 'Round Summary',
  gameOver: 'Game Over',
};
