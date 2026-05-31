import { SectionLabel } from '../types/GameTypes';

export type PotSectionPoint = { x: number; y: number };

/** Chip label anchor positions within the pot board (tuned to Pot3.png at 500×500). */
export const POT_SECTION_POSITIONS: Record<SectionLabel, PotSectionPoint> = {
  Ten: { x: 457, y: 317 },
  Jack: { x: 321, y: 456 },
  Queen: { x: 100, y: 448 },
  King: { x: -17, y: 332 },
  Ace: { x: -14, y: 141 },
  '8-9-10': { x: 95, y: 21 },
  'King-Queen': { x: 337, y: 21 },
  Kitty: { x: 451, y: 143 },
  POT: { x: 216, y: 279 },
};

export const POT_BOARD_SIZE = 500;

/** Fixed on-screen size — decoupled from table felt so the board can grow around the pot. */
export const POT_DISPLAY_SIZE = `min(48vmin, ${POT_BOARD_SIZE}px)`;

export function potSectionAnchorPercent(label: SectionLabel): { left: number; top: number } {
  const { x, y } = POT_SECTION_POSITIONS[label];
  return {
    left: (x / POT_BOARD_SIZE) * 100,
    top: (y / POT_BOARD_SIZE) * 100,
  };
}
