export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export type { HouseRules, HouseRulesPreset } from '../game/engine/houseRules';
import type { HouseRules } from '../game/engine/houseRules';

export interface Card {
  suit: Suit;
  value: Rank;
  id: string;
}

export type AIDifficulty = 'easy' | 'medium' | 'hard' | 'cardShark';

export interface Player {
  id: number;
  name: string;
  isHuman: boolean;
  chips: number;
  cards: Card[];
  aiDifficulty?: AIDifficulty;
  /** Original dealt hand — restored before Michigan */
  originalHand: Card[];
  /** Board sections this player anted into for the current round (short pot if broke). */
  anteSections?: PotSectionKey[];
}

export type GamePhase =
  | 'setup'
  | 'dealerBlindChoice'
  | 'blindAuction'
  | 'payCards'
  | 'poker'
  | 'michigan'
  | 'announcement'
  | 'roundSummary'
  | 'gameOver';

export type PotSectionKey =
  | 'aceHearts'
  | 'kingHearts'
  | 'queenHearts'
  | 'jackHearts'
  | 'tenHearts'
  | 'kingQueen'
  | 'eightNineTen'
  | 'kitty'
  | 'pot';

export type PotBoard = Record<PotSectionKey, number>;

export interface MichiganState {
  mode: 'lead' | 'follow';
  leadColor: 'black' | 'red';
  activeSuit: Suit | null;
  nextValue: Rank | null;
  lastPlayerId: number | null;
  leadPassOrigin: number | null;
}

export interface PokerState {
  currentBet: number;
  playerBets: Record<number, number>;
  folded: Record<number, boolean>;
  acted: Record<number, boolean>;
  roundComplete: boolean;
  winners: number[];
  lastHandLabel: string;
}

export interface BlindAuctionState {
  highBid: number;
  highBidder: number | null;
  passed: Record<number, boolean>;
  complete: boolean;
  /** All bidders passed — dealer confirms sale or no-sale */
  awaitingDealerClose: boolean;
}

export interface PayCardClaim {
  playerId: number;
  section: PotSectionKey;
  amount: number;
  description: string;
}

export interface PhaseAnnouncement {
  title: string;
  lines: string[];
  variant: 'success' | 'info';
}

export type AnnouncementContinue = 'michigan' | 'poker' | 'roundSummary';

export interface GameLogEntry {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

export interface GameState {
  players: Player[];
  currentPlayer: number;
  dealerId: number;
  deadHand: Card[];
  pot: PotBoard;
  phase: GamePhase;
  michigan: MichiganState;
  poker: PokerState;
  blindAuction: BlindAuctionState;
  payCardClaims: PayCardClaim[];
  houseRules: HouseRules;
  roundNumber: number;
  log: GameLogEntry[];
  soundEnabled: boolean;
  michiganPlayArea: Card[];
  /** Last card each player played this Michigan phase (shown at their seat) */
  michiganShownPlays: Record<number, Card | null>;
  roundWinnerId: number | null;
  announcement: PhaseAnnouncement | null;
  announcementContinue: AnnouncementContinue | null;
  animations: AnimationType[];
  feedback?: { message: string; feedbackType: 'success' | 'error' | 'info' };
  /** Solo vs AI — achievements track only when true. */
  isSoloSession?: boolean;
  /** Tracks solo achievement conditions during the current round. */
  achievementSession?: {
    sequenceTimedOut: boolean;
    leadPassUsed: boolean;
    humanLeadPasses: number;
  };
}

export type AnimationKind = 'chipTravel' | 'cardPlay' | 'potSweep' | 'cardDeal';

export type AnimationAnchor =
  | { type: 'player'; id: number }
  | { type: 'pot'; section: PotSectionKey }
  | { type: 'humanHand' }
  | { type: 'tableCenter' }
  | { type: 'deadHand' };

export interface AnimationType {
  id: string;
  kind: AnimationKind;
  from: AnimationAnchor;
  to: AnimationAnchor;
  duration: number;
  card?: Card;
  /** Number of chip tokens to render (visual only) */
  count?: number;
  /** Stagger index for batch deals / sweeps */
  delayIndex?: number;
}

export interface SeatConfig {
  isHuman: boolean;
  name?: string;
  /** Poker-phase AI skill; ignored for human seats. */
  aiDifficulty?: AIDifficulty;
}

export type PokerAction = 'check' | 'bet' | 'call' | 'raise' | 'fold';

export type GameAction =
  | { type: 'START_GAME'; seats: SeatConfig[]; houseRules?: HouseRules }
  | { type: 'QUIT_GAME' }
  | { type: 'DEALER_BLIND_CHOICE'; choice: 'swap' | 'auction' | 'keep' }
  | { type: 'BLIND_AUCTION_BID'; amount: number }
  | { type: 'BLIND_AUCTION_PASS' }
  | { type: 'BLIND_AUCTION_RESOLVE' }
  | { type: 'ADVANCE_PHASE' }
  | { type: 'POKER_ACTION'; action: PokerAction; amount?: number }
  | { type: 'POKER_SYNC_TURN' }
  | { type: 'MICHIGAN_PLAY'; card: Card }
  | { type: 'MICHIGAN_PASS_LEAD' }
  | { type: 'MICHIGAN_TIMER_EXPIRE' }
  | { type: 'ACTION_TIMER_EXPIRE' }
  | { type: 'MICHIGAN_SYNC_TURN' }
  | { type: 'MICHIGAN_PASS_TURN'; playerId: number }
  | { type: 'START_NEW_ROUND' }
  | { type: 'DISMISS_ANNOUNCEMENT' }
  | { type: 'CHANGE_PLAYER_NAME'; name: string; playerId?: number }
  | { type: 'REORDER_CARDS'; playerId: number; cards: Card[] }
  | { type: 'ADD_ANIMATION'; animation: AnimationType }
  | { type: 'REMOVE_ANIMATION'; id: string }
  | { type: 'TOGGLE_SOUND' }
  | { type: 'SHOW_FEEDBACK'; message: string; feedbackType: 'success' | 'error' | 'info' };

/** Legacy pot display type for TripoleyPot component */
export type SectionLabel =
  | 'Ten'
  | 'Jack'
  | 'Queen'
  | 'King'
  | 'Ace'
  | '8-9-10'
  | 'King-Queen'
  | 'Kitty'
  | 'POT';

export interface PotSection {
  label: SectionLabel;
  chips: number;
  position: string;
  cards: Card[];
}

export type FeedbackType = 'success' | 'error' | 'info';
