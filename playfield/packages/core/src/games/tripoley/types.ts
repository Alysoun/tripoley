import type { Card, Rank, Suit } from '../../types/cards';
import type { HouseRules } from './houseRules';
import type { PokerHandRank } from './poker';
import type { SuddenDeathState } from './suddenDeath';

export type { Card, Rank, Suit } from '../../types/cards';
export type { HouseRules, HouseRulesPreset } from './houseRules';
export type { PokerHandRank, PokerHandResult } from './poker';
export type { SuddenDeathReason, SuddenDeathState } from './suddenDeath';

export type AIDifficulty = 'easy' | 'medium' | 'hard' | 'cardShark';

export interface Player {
  id: number;
  name: string;
  isHuman: boolean;
  chips: number;
  cards: Card[];
  aiDifficulty?: AIDifficulty;
  originalHand: Card[];
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

export type { PotSectionKey } from './constants';
import type { PotSectionKey } from './constants';

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
  lastHandRank: PokerHandRank | null;
}

export interface BlindAuctionState {
  highBid: number;
  highBidder: number | null;
  passed: Record<number, boolean>;
  complete: boolean;
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
  sessionLog?: GameLogEntry[];
  sessionLogDroppedCount?: number;
  recordFullSessionLog?: boolean;
  sessionStartedAt?: number;
  soundEnabled: boolean;
  michiganPlayArea: Card[];
  michiganShownPlays: Record<number, Card | null>;
  roundWinnerId: number | null;
  announcement: PhaseAnnouncement | null;
  announcementContinue: AnnouncementContinue | null;
  animations: AnimationType[];
  feedback?: { message: string; feedbackType: 'success' | 'error' | 'info' };
  isSoloSession?: boolean;
  achievementSession?: {
    sequenceTimedOut: boolean;
    leadPassUsed: boolean;
    humanLeadPasses: number;
  };
  twoPlayerStreak?: number;
  suddenDeath?: SuddenDeathState;
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
  count?: number;
  delayIndex?: number;
}

export interface SeatConfig {
  isHuman: boolean;
  name?: string;
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
