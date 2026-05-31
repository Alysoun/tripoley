import type { GameState } from '../types/GameTypes';
import { initialGameState } from './engine/reducer';

/** Persists in-progress games across browser restarts (localStorage). */
const STORAGE_KEY = 'tripoley-active-session';
/** Previous tab-only storage — migrated once on load. */
const LEGACY_SESSION_KEY = STORAGE_KEY;

type PersistedGameState = Omit<GameState, 'animations' | 'feedback'>;

function storage(): Storage | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}

function isPersistedGameState(value: unknown): value is PersistedGameState {
  if (!value || typeof value !== 'object') return false;
  const s = value as PersistedGameState;
  return (
    Array.isArray(s.players) &&
    s.players.length > 0 &&
    typeof s.phase === 'string' &&
    s.phase !== 'setup' &&
    s.phase !== 'gameOver'
  );
}

function readRaw(key: string): string | null {
  const store = storage();
  if (!store) return null;
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}

function parseStored(raw: string | null): GameState | null {
  if (!raw) return null;
  try {
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

function migrateLegacySession(): GameState | null {
  try {
    const legacy = sessionStorage.getItem(LEGACY_SESSION_KEY);
    if (!legacy) return null;
    sessionStorage.removeItem(LEGACY_SESSION_KEY);
    const loaded = parseStored(legacy);
    if (loaded) saveGameSession(loaded);
    return loaded;
  } catch {
    return null;
  }
}

export function loadGameSession(): GameState | null {
  const fromLocal = parseStored(readRaw(STORAGE_KEY));
  if (fromLocal) return fromLocal;
  return migrateLegacySession();
}

export function saveGameSession(state: GameState): void {
  if (
    state.players.length === 0 ||
    state.phase === 'setup' ||
    state.phase === 'gameOver'
  ) {
    clearGameSession();
    return;
  }
  const { animations: _animations, feedback: _feedback, ...rest } = state;
  const store = storage();
  if (!store) return;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(rest));
  } catch {
    /* quota or private mode — ignore */
  }
}

export function clearGameSession(): void {
  const store = storage();
  try {
    store?.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(LEGACY_SESSION_KEY);
  } catch {
    /* ignore */
  }
}
