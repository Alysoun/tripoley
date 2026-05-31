import type { GameState } from '../types/GameTypes';

/** Obfuscated session flag — not shown in UI. */
const STORAGE_KEY = 'pwr-s7k';

const KONAMI_CODES = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'KeyB',
  'KeyA',
] as const;

const KONAMI_LETTERS = 'uuddlrlrba';

export const SPECTATOR_AI_DELAY_MS = 40;
export const SPECTATOR_STEP_DELAY_MS = 60;

export function isSpectatorUnlocked(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function enableSpectatorUnlock(): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, '1');
  } catch {
    /* private mode */
  }
}

export function clearSpectatorUnlock(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** True when the table is running with zero human seats (AI-only auto-run). */
export function isSpectatorAutoPlay(state: GameState): boolean {
  return (
    isSpectatorUnlocked() &&
    state.players.length > 0 &&
    !state.players.some((p) => p.isHuman)
  );
}

export function shouldSpectatorSkipAnimations(state: GameState): boolean {
  return isSpectatorAutoPlay(state);
}

export function spectatorAiDelayMs(state: GameState): number | null {
  return isSpectatorAutoPlay(state) ? SPECTATOR_AI_DELAY_MS : null;
}

export function spectatorStepDelayMs(state: GameState): number | null {
  return isSpectatorAutoPlay(state) ? SPECTATOR_STEP_DELAY_MS : null;
}

/** Returns true when the Konami sequence just completed. */
export function advanceKonamiInput(code: string, key: string): boolean {
  return advanceKonamiCode(code) || advanceKonamiLetters(key);
}

let konamiCodeIndex = 0;
let konamiLetterIndex = 0;

function advanceKonamiCode(code: string): boolean {
  if (code === KONAMI_CODES[konamiCodeIndex]) {
    konamiCodeIndex += 1;
    if (konamiCodeIndex >= KONAMI_CODES.length) {
      konamiCodeIndex = 0;
      return true;
    }
    return false;
  }
  konamiCodeIndex = code === KONAMI_CODES[0] ? 1 : 0;
  return false;
}

function advanceKonamiLetters(key: string): boolean {
  const ch = key.length === 1 ? key.toLowerCase() : '';
  if (!ch) {
    konamiLetterIndex = 0;
    return false;
  }
  if (ch === KONAMI_LETTERS[konamiLetterIndex]) {
    konamiLetterIndex += 1;
    if (konamiLetterIndex >= KONAMI_LETTERS.length) {
      konamiLetterIndex = 0;
      return true;
    }
    return false;
  }
  konamiLetterIndex = ch === KONAMI_LETTERS[0] ? 1 : 0;
  return false;
}

export function resetKonamiProgress(): void {
  konamiCodeIndex = 0;
  konamiLetterIndex = 0;
}
