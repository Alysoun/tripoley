import type { GameState } from '../types/GameTypes';
import { GAME_NAME } from './branding';
import {
  summarizeHouseRules,
  sessionLogEntries,
  sessionLogByteSize,
} from '@playfield/core';

function formatTimestamp(ms: number | undefined): string {
  if (!ms) return new Date().toISOString();
  return new Date(ms).toISOString();
}

export function formatSessionLogText(state: GameState): string {
  const lines: string[] = [
    `${GAME_NAME} — full session log`,
    `Started: ${formatTimestamp(state.sessionStartedAt)}`,
    `Exported: ${new Date().toISOString()}`,
    `Players (${state.players.length}): ${state.players.map((p) => p.name).join(', ')}`,
    `House rules: ${summarizeHouseRules(state.houseRules)}`,
    ...(state.suddenDeath?.active
      ? [
          `Sudden Death: active since round ${state.suddenDeath.triggeredAtRound} (${state.suddenDeath.reason})`,
        ]
      : []),
    `Round: ${state.roundNumber}`,
    `Phase: ${state.phase}`,
  ];

  const entries = sessionLogEntries(state);
  const logBytes = sessionLogByteSize(entries);
  lines.push(`Session log: ${entries.length} lines (${Math.round(logBytes / 1024)}KB)`);

  lines.push('---');

  for (const entry of entries) {
    const tag =
      entry.type === 'error' ? '[!]' : entry.type === 'success' ? '[+]' : '   ';
    lines.push(`${tag} ${entry.message}`);
  }

  lines.push('---', 'Final chips:');
  for (const p of state.players) {
    lines.push(`  ${p.name}: ${p.chips}${p.chips <= 0 ? ' (OUT)' : ''}`);
  }

  const potTotal = Object.values(state.pot).reduce((a, b) => a + b, 0);
  if (potTotal > 0) {
    lines.push(`Pot board total: ${potTotal}`);
  }

  return lines.join('\n');
}

export function downloadSessionLog(state: GameState): void {
  const text = formatSessionLogText(state);
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  anchor.href = url;
  anchor.download = `tripoley-session-${stamp}.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function copySessionLogToClipboard(state: GameState): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(formatSessionLogText(state));
    return true;
  } catch {
    return false;
  }
}
