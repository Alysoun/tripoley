import { useEffect, useCallback } from 'react';
import { useGame } from '../context/GameContext';
import { soundManager } from '../utils/SoundEffects';
import { Card, Position } from '../types/GameTypes';

export function useGameEffects() {
    const { state, dispatch } = useGame();

    const playCard = useCallback((card: Card, startPos: Position, endPos: Position) => {
        const animationId = Math.random().toString(36);
        
        // Play sound
        soundManager.play('cardPlay');

        // Add animation
        dispatch({
            type: 'ADD_ANIMATION',
            animation: {
                id: animationId,
                card,
                startPos,
                endPos,
                duration: 500,
                onComplete: () => {
                    dispatch({ type: 'REMOVE_ANIMATION', id: animationId });
                }
            }
        });
    }, [dispatch]);

    const showFeedback = useCallback((message: string, type: 'success' | 'error' | 'info') => {
        dispatch({ type: 'SHOW_FEEDBACK', message, type });
    }, [dispatch]);

    const toggleSound = useCallback(() => {
        dispatch({ type: 'TOGGLE_SOUND' });
    }, [dispatch]);

    return {
        playCard,
        showFeedback,
        toggleSound,
        isSoundEnabled: state.soundEnabled
    };
} 