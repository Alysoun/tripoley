/**
 * @playfield/core — headless card-table engines and shared primitives.
 */

export type { Suit, Rank, Card } from './types/cards';
export * from './deck';

export {
  configurePlayfield,
  getPlayfieldConfig,
  playfieldStartingChips,
  playfieldPlayerActionTurnMs,
  playfieldPotPulse,
} from './config';
export type { PlayfieldConfig } from './config';

export * as tripoley from './games/tripoley';
export * from './games/tripoley';

export * from './testing/simulate';
