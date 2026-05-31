import { ANTE_PER_SECTION, POT_SECTION_KEYS, PotSectionKey } from './constants';
import type { Player } from '../../types/GameTypes';

export const ANTE_SECTION_COUNT = POT_SECTION_KEYS.length;
export const FULL_ANTE_TOTAL = ANTE_PER_SECTION * ANTE_SECTION_COUNT;

/** Place antes in board order until the player runs out of chips. */
export function distributePlayerAnte(
  availableChips: number,
  antePerSection: number = ANTE_PER_SECTION
): {
  sections: PotSectionKey[];
  chipsSpent: number;
} {
  const sections: PotSectionKey[] = [];
  let remaining = Math.max(0, availableChips);
  for (const key of POT_SECTION_KEYS) {
    if (remaining < antePerSection) break;
    sections.push(key);
    remaining -= antePerSection;
  }
  return { sections, chipsSpent: availableChips - remaining };
}

/** Undefined ante list = legacy save / full eligibility. */
export function playerEligibleForSection(
  anteSections: PotSectionKey[] | undefined,
  section: PotSectionKey
): boolean {
  if (!anteSections) return true;
  return anteSections.includes(section);
}

export function playerEligibleForSectionFromPlayer(
  player: Pick<Player, 'anteSections'>,
  section: PotSectionKey
): boolean {
  return playerEligibleForSection(player.anteSections, section);
}

export function applyAnteToPot(
  pot: Record<PotSectionKey, number>,
  sections: PotSectionKey[],
  antePerSection: number = ANTE_PER_SECTION
): void {
  for (const key of sections) {
    pot[key] += antePerSection;
  }
}
