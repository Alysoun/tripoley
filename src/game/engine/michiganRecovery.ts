import { GameAction, GameState } from '../../types/GameTypes';
import { resolvePlayerActionTimeout } from './playerActionTimer';

/** Fallback actions when Michigan automation hits a no-op. */
export function michiganRecoveryActions(state: GameState): GameAction[] {
  const actions: GameAction[] = [{ type: 'MICHIGAN_SYNC_TURN' }];
  if (state.houseRules.michiganSequenceTimer) {
    actions.push({ type: 'MICHIGAN_TIMER_EXPIRE' });
  }
  const timed = resolvePlayerActionTimeout(state);
  if (timed) actions.push(timed);
  return actions;
}
