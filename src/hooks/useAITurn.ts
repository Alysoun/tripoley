import { useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { useSoloGamePaused } from '../context/SoloPauseUiContext';
import { debugAiTurnDelayMs } from '../debugConfig';
import { getLegalMichiganPlays, canPassLead } from '@playfield/core';
import { GameState } from '../types/GameTypes';

function shouldRunAITurn(state: GameState): boolean {
  const current = state.players[state.currentPlayer];
  if (!current || current.isHuman) return false;
  if (state.phase === 'setup' || state.phase === 'gameOver' || state.phase === 'announcement') {
    return false;
  }
  if (state.phase === 'roundSummary') return false;
  return true;
}

function runAITurnSync(
  state: GameState,
  dispatch: ReturnType<typeof useGame>['dispatch'],
  dispatchAI: ReturnType<typeof useGame>['dispatchAI']
): void {
  const current = state.players[state.currentPlayer];
  if (!current) return;

  if (state.phase === 'michigan') {
    const legal = getLegalMichiganPlays(
      current.cards,
      state.michigan,
      current.id,
      state.currentPlayer
    );
    if (legal.length === 0) {
      if (
        !current.isHuman &&
        canPassLead(current.cards, state.michigan, current.id, state.currentPlayer)
      ) {
        dispatch({ type: 'MICHIGAN_PASS_LEAD' });
      } else {
        dispatch({ type: 'MICHIGAN_SYNC_TURN' });
      }
      return;
    }
  }

  if (state.phase === 'poker' && state.poker.folded[current.id]) {
    dispatch({ type: 'POKER_SYNC_TURN' });
    return;
  }

  if (current.isHuman) return;

  dispatchAI();
}

/** Automatically executes AI player turns with a short delay. */
export function useAITurn() {
  const { state, dispatch, dispatchAI } = useGame();
  const stateRef = useRef(state);
  stateRef.current = state;
  const soloPaused = useSoloGamePaused();

  useEffect(() => {
    if (soloPaused) return;
    const current = state.players[state.currentPlayer];
    if (!current) return;
    if (state.phase === 'setup' || state.phase === 'gameOver' || state.phase === 'announcement') {
      return;
    }
    if (state.phase === 'roundSummary') return;

    if (state.phase === 'michigan') {
      const legal = getLegalMichiganPlays(
        current.cards,
        state.michigan,
        current.id,
        state.currentPlayer
      );
      if (legal.length === 0) {
        if (
          !current.isHuman &&
          canPassLead(current.cards, state.michigan, current.id, state.currentPlayer)
        ) {
          dispatch({ type: 'MICHIGAN_PASS_LEAD' });
          return;
        }
        dispatch({ type: 'MICHIGAN_SYNC_TURN' });
        return;
      }
    }

    if (state.phase === 'poker' && state.poker.folded[current.id]) {
      dispatch({ type: 'POKER_SYNC_TURN' });
      return;
    }

    if (current.isHuman) return;

    const timer = window.setTimeout(() => {
      dispatchAI();
    }, debugAiTurnDelayMs(700, state));

    return () => window.clearTimeout(timer);
  }, [
    state.phase,
    state.currentPlayer,
    state.poker,
    state.michigan,
    state.blindAuction,
    state.players,
    dispatch,
    dispatchAI,
    soloPaused,
  ]);

  useEffect(() => {
    if (soloPaused) return;

    let wasHidden = false;

    const resume = () => {
      if (document.visibilityState === 'hidden') {
        wasHidden = true;
        return;
      }
      if (!wasHidden) return;
      wasHidden = false;

      const s = stateRef.current;
      if (!shouldRunAITurn(s)) return;
      runAITurnSync(s, dispatch, dispatchAI);
    };

    document.addEventListener('visibilitychange', resume);
    return () => document.removeEventListener('visibilitychange', resume);
  }, [dispatch, dispatchAI, soloPaused]);
}
