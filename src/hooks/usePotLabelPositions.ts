import { useLayoutEffect, useState } from 'react';
import { SectionLabel } from '../types/GameTypes';
import { LABEL_TO_POT_SECTION } from '@playfield/core';
import { POT_SECTION_POSITIONS } from '../components/potLabelLayout';
import { PotLabelOffsets } from '../components/hudPanelLayout';

export type ScreenPoint = { x: number; y: number };

export type PotLabelScreenPositions = Partial<Record<SectionLabel, ScreenPoint>>;

function readPotLabelPositions(offsets: PotLabelOffsets): PotLabelScreenPositions {
  const next: PotLabelScreenPositions = {};

  for (const label of Object.keys(POT_SECTION_POSITIONS) as SectionLabel[]) {
    const potKey = LABEL_TO_POT_SECTION[label];
    const el = document.querySelector(`[data-pot-anchor="pot-${potKey}"]`);
    if (!el) continue;

    const rect = el.getBoundingClientRect();
    const offset = offsets[label] ?? { dx: 0, dy: 0 };
    next[label] = {
      x: rect.left + rect.width / 2 + offset.dx,
      y: rect.top + rect.height / 2 + offset.dy,
    };
  }

  return next;
}

function positionsChanged(a: PotLabelScreenPositions, b: PotLabelScreenPositions): boolean {
  for (const label of Object.keys(POT_SECTION_POSITIONS) as SectionLabel[]) {
    const pa = a[label];
    const pb = b[label];
    if (!pa || !pb) return pa !== pb;
    if (Math.abs(pa.x - pb.x) > 0.5 || Math.abs(pa.y - pb.y) > 0.5) return true;
  }
  return false;
}

/** Project on-table anchor points to viewport coords for upright billboards. */
export function usePotLabelPositions(
  active: boolean,
  offsets: PotLabelOffsets
): PotLabelScreenPositions {
  const [positions, setPositions] = useState<PotLabelScreenPositions>({});

  useLayoutEffect(() => {
    if (!active) return;

    const sync = () => {
      const next = readPotLabelPositions(offsets);
      setPositions((prev) => (positionsChanged(prev, next) ? next : prev));
    };

    sync();

    let rafId = 0;
    const tick = () => {
      sync();
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    window.addEventListener('resize', sync);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', sync);
    };
  }, [active, offsets]);

  return positions;
}

/** Anchor centers without user offset — used as drag origin in edit mode. */
export function usePotLabelAnchorPositions(active: boolean): PotLabelScreenPositions {
  const [positions, setPositions] = useState<PotLabelScreenPositions>({});

  useLayoutEffect(() => {
    if (!active) return;

    const sync = () => {
      const next = readPotLabelPositions(
        Object.fromEntries(
          (Object.keys(POT_SECTION_POSITIONS) as SectionLabel[]).map((label) => [
            label,
            { dx: 0, dy: 0 },
          ])
        ) as PotLabelOffsets
      );
      setPositions((prev) => (positionsChanged(prev, next) ? next : prev));
    };

    sync();

    let rafId = 0;
    const tick = () => {
      sync();
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    window.addEventListener('resize', sync);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', sync);
    };
  }, [active]);

  return positions;
}
