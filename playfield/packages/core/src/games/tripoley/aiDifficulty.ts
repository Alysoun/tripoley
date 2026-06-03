import { AIDifficulty, SeatConfig } from './types';

export const AI_DIFFICULTY_ORDER: AIDifficulty[] = ['easy', 'medium', 'hard', 'cardShark'];

export const AI_DIFFICULTY_LABELS: Record<AIDifficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  cardShark: 'Card Shark',
};

export const AI_DIFFICULTY_HINTS: Record<AIDifficulty, string> = {
  easy: 'Loose poker — folds more, bluffs rarely',
  medium: 'Balanced table play',
  hard: 'Tighter value bets and more pressure',
  cardShark: 'Aggressive bluffs and strong fold discipline',
};

export type AiPokerSkillMode = 'automatic' | 'manual';

export type StoredAiPokerSettings = {
  mode: AiPokerSkillMode;
  /** Per seat index (0-based) when mode is manual. */
  bySeat: Partial<Record<number, AIDifficulty>>;
};

export function defaultAiPokerSettings(): StoredAiPokerSettings {
  return { mode: 'automatic', bySeat: {} };
}

function shuffleInPlace<T>(items: T[]): void {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
}

/** Mixed poker tiers for AI seats — reshuffled each new game when mode is automatic. */
export function assignAutomaticDifficulties(aiCount: number): AIDifficulty[] {
  if (aiCount <= 0) return [];
  const pool: AIDifficulty[] = [];
  while (pool.length < aiCount) {
    pool.push(...AI_DIFFICULTY_ORDER);
  }
  const picked = pool.slice(0, aiCount);
  shuffleInPlace(picked);
  return picked;
}

export function applyAiDifficultiesToSeats(
  seats: SeatConfig[],
  settings: StoredAiPokerSettings
): SeatConfig[] {
  const aiSeatIndexes = seats.flatMap((seat, index) => (seat.isHuman ? [] : [index]));
  const automatic = assignAutomaticDifficulties(aiSeatIndexes.length);
  let autoIndex = 0;

  return seats.map((seat, index) => {
    if (seat.isHuman) {
      return { isHuman: true as const, name: seat.name };
    }
    const aiDifficulty =
      settings.mode === 'manual'
        ? settings.bySeat[index] ?? 'medium'
        : automatic[autoIndex++] ?? 'medium';
    return { ...seat, aiDifficulty };
  });
}
