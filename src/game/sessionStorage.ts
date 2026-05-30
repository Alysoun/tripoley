import type { GameState } from '../types/GameTypes';
import { initialGameState } from './engine/reducer';

const STORAGE_KEY = 'tripoley-active-session';

type PersistedGameState = Omit<GameState, 'animations' | 'feedback'>;

function isPersistedGameState(value: unknown): value is PersistedGameState {
  if (!value || typeof value !== 'object') return false;
  const s = value as PersistedGameState;
  return (
    Array.isArray(s.players) &&
    s.players.length > 0 &&
    typeof s.phase === 'string' &&
    s.phase !== 'setup'
  );
}

export function loadGameSession(): GameState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isPersistedGameState(parsed)) return null;
    return {
      ...initialGameState,
      ...parsed,
      animations: [],
      feedback: undefined,
    };
  } catch {
    return null;
  }
}

export function saveGameSession(state: GameState): void {
  if (state.players.length === 0 || state.phase === 'setup') {
    clearGameSession();
    return;
  }
  const { animations: _animations, feedback: _feedback, ...rest } = state;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
  } catch {
    /* quota or private mode — ignore */
  }
}

export function clearGameSession(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
