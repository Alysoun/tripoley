import { createContext, useContext, useReducer, ReactNode, useCallback, useRef, useEffect } from 'react';
import { GameState, GameAction, PokerAction } from '../types/GameTypes';
import { gameReducer, initialGameState } from '../game/engine/reducer';
import { finalizePlayerStatus } from '../game/engine/playerStatus';
import { getAIAction } from '../game/engine/ai';
import { clearGameSession, loadGameSession, saveGameSession } from '../game/sessionStorage';

function initGameState(): GameState {
  const loaded = loadGameSession();
  if (!loaded) return initialGameState;
  return finalizePlayerStatus(loaded, loaded);
}

const GameContext = createContext<{
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  dispatchAI: () => void;
} | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, undefined, initGameState);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (state.players.length === 0 || state.phase === 'setup') {
      clearGameSession();
      return;
    }
    saveGameSession(state);
  }, [state]);

  const dispatchAI = useCallback(() => {
    const action = getAIAction(stateRef.current);
    if (!action) return;

    switch (action.type) {
      case 'DEALER_BLIND_CHOICE':
        dispatch({
          type: 'DEALER_BLIND_CHOICE',
          choice: action.payload!.choice as 'swap' | 'auction' | 'keep',
        });
        break;
      case 'BLIND_AUCTION_BID':
        dispatch({ type: 'BLIND_AUCTION_BID', amount: action.payload!.amount as number });
        break;
      case 'BLIND_AUCTION_PASS':
        dispatch({ type: 'BLIND_AUCTION_PASS' });
        break;
      case 'BLIND_AUCTION_RESOLVE':
        dispatch({ type: 'BLIND_AUCTION_RESOLVE' });
        break;
      case 'ADVANCE_PHASE':
        dispatch({ type: 'ADVANCE_PHASE' });
        break;
      case 'POKER_ACTION':
        dispatch({
          type: 'POKER_ACTION',
          action: action.payload!.action as PokerAction,
          amount: action.payload!.amount as number,
        });
        break;
      case 'MICHIGAN_PLAY':
        dispatch({ type: 'MICHIGAN_PLAY', card: action.payload!.card as GameState['players'][0]['cards'][0] });
        break;
      case 'MICHIGAN_PASS_LEAD':
        dispatch({ type: 'MICHIGAN_PASS_LEAD' });
        break;
      case 'MICHIGAN_SYNC_TURN':
        dispatch({ type: 'MICHIGAN_SYNC_TURN' });
        break;
      case 'MICHIGAN_PASS_TURN':
        dispatch({ type: 'MICHIGAN_PASS_TURN', playerId: action.payload!.playerId as number });
        break;
      case 'START_NEW_ROUND':
        dispatch({ type: 'START_NEW_ROUND' });
        break;
      case 'POKER_SYNC_TURN':
        dispatch({ type: 'POKER_SYNC_TURN' });
        break;
    }
  }, [dispatch]);

  return (
    <GameContext.Provider value={{ state, dispatch, dispatchAI }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
