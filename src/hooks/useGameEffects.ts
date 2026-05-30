import { useCallback } from 'react';
import { useGame } from '../context/GameContext';
import { soundManager } from '../utils/SoundEffects';
import { Card } from '../types/GameTypes';

export function useGameEffects() {
  const { state, dispatch } = useGame();

  const showFeedback = useCallback(
    (message: string, type: 'success' | 'error' | 'info') => {
      dispatch({ type: 'SHOW_FEEDBACK', message, feedbackType: type });
    },
    [dispatch]
  );

  const toggleSound = useCallback(() => {
    void soundManager.unlock().then((ready) => {
      const next = !state.soundEnabled;
      soundManager.setEnabled(next);
      dispatch({ type: 'TOGGLE_SOUND' });
      if (next && ready) soundManager.play('buttonClick');
    });
  }, [dispatch, state.soundEnabled]);

  const playCard = useCallback(
    (_card: Card, _startPos: { x: number; y: number; rotation: number }, _endPos: { x: number; y: number; rotation: number }) => {
      soundManager.play('cardPlay');
    },
    []
  );

  return {
    playCard,
    showFeedback,
    toggleSound,
    isSoundEnabled: state.soundEnabled,
  };
}
