import { Card, GameState, Player } from '../types/GameTypes';
import { getLegalMichiganPlays, validateMichiganPlay } from './engine/michigan';

interface PlayableCard {
  card: Card;
  isPlayable: boolean;
  reason?: string;
}

/** UI helper — delegates to the rules engine. */
export class CardPlayLogic {
  static isCardPlayable(card: Card, player: Player, gameState: GameState): PlayableCard {
    if (gameState.phase !== 'michigan') {
      return { card, isPlayable: false, reason: 'Not Michigan phase' };
    }
    const legal = getLegalMichiganPlays(
      player.cards,
      gameState.michigan,
      player.id,
      gameState.currentPlayer
    );
    const ok = legal.some((c) => c.id === card.id);
    return {
      card,
      isPlayable: ok,
      reason: ok ? undefined : 'Illegal Michigan play',
    };
  }

  static evaluatePlay(card: Card, player: Player, gameState: GameState) {
    const valid = validateMichiganPlay(
      player.cards,
      card,
      gameState.michigan,
      player.id,
      gameState.currentPlayer
    );
    return { isValid: valid, points: 0, message: valid ? undefined : 'Invalid play' };
  }
}
