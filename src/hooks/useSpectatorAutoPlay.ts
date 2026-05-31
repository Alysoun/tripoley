import { useEffect } from 'react';
import { useGame } from '../context/GameContext';
import {
  isSpectatorAutoPlay,
  spectatorStepDelayMs,
} from '../game/spectatorMode';

/** Advances non-AI phases when the table is all-AI after the secret unlock. */
export function useSpectatorAutoPlay() {
  const { state, dispatch } = useGame();

  useEffect(() => {
    if (!isSpectatorAutoPlay(state)) return;

    const delay = spectatorStepDelayMs(state) ?? 60;
    let action: { type: 'DISMISS_ANNOUNCEMENT' } | { type: 'START_NEW_ROUND' } | { type: 'ADVANCE_PHASE' } | null =
      null;

    if (state.phase === 'announcement' && state.announcement) {
      action = { type: 'DISMISS_ANNOUNCEMENT' };
    } else if (state.phase === 'roundSummary') {
      action = { type: 'START_NEW_ROUND' };
    } else if (state.phase === 'payCards') {
      action = { type: 'ADVANCE_PHASE' };
    }

    if (!action) return;

    const timer = window.setTimeout(() => {
      dispatch(action!);
    }, delay);

    return () => window.clearTimeout(timer);
  }, [
    state.phase,
    state.announcement,
    state.roundNumber,
    state.players,
    dispatch,
    state,
  ]);
}
