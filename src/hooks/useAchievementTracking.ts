import { useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { useAchievements } from '../context/AchievementContext';

/** Observes game state and updates lifetime achievement progress (solo only). */
export function useAchievementTracking() {
  const { state } = useGame();
  const { trackStateTransition, syncSessionFromState } = useAchievements();
  const prevRef = useRef(state);

  useEffect(() => {
    syncSessionFromState(state);
  }, [state, syncSessionFromState]);

  useEffect(() => {
    if (prevRef.current !== state) {
      trackStateTransition(prevRef.current, state);
      prevRef.current = state;
    }
  }, [state, trackStateTransition]);
}
