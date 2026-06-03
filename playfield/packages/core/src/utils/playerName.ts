import type { Player } from '../games/tripoley/types';

export const DEFAULT_HUMAN_NAME = 'Player';
const MAX_NAME_LENGTH = 24;

export function formatPlayerNameInput(raw: string): string {
  return raw.replace(/\s*\(you\)\s*$/i, '').slice(0, MAX_NAME_LENGTH);
}

export function sanitizePlayerName(raw: string): string {
  const trimmed = formatPlayerNameInput(raw).trim();
  if (!trimmed) return DEFAULT_HUMAN_NAME;
  return trimmed;
}

export function displayPlayerName(player: Pick<Player, 'name' | 'isHuman'>): string {
  if (!player.isHuman) return player.name;
  return `${player.name} (You)`;
}
