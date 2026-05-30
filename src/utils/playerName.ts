import { Player } from '../types/GameTypes';

export const PLAYER_NAME_KEY = 'tripoley_player_name';
export const DEFAULT_HUMAN_NAME = 'Player';
const MAX_NAME_LENGTH = 24;

/** While typing in setup — allow empty; strip (You) suffix and cap length. */
export function formatPlayerNameInput(raw: string): string {
  return raw.replace(/\s*\(you\)\s*$/i, '').slice(0, MAX_NAME_LENGTH);
}

/** Strip suffix and whitespace; fall back to default. */
export function sanitizePlayerName(raw: string): string {
  const trimmed = formatPlayerNameInput(raw).trim();
  if (!trimmed) return DEFAULT_HUMAN_NAME;
  return trimmed;
}

export function displayPlayerName(player: Pick<Player, 'name' | 'isHuman'>): string {
  if (!player.isHuman) return player.name;
  return `${player.name} (You)`;
}

export function loadStoredPlayerName(): string {
  try {
    const raw = localStorage.getItem(PLAYER_NAME_KEY);
    if (raw) return sanitizePlayerName(raw);
  } catch {
    /* ignore */
  }
  return DEFAULT_HUMAN_NAME;
}

export function saveStoredPlayerName(name: string): void {
  try {
    localStorage.setItem(PLAYER_NAME_KEY, sanitizePlayerName(name));
  } catch {
    /* ignore */
  }
}
