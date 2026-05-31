import { useLayoutEffect, useState } from 'react';
import { SeatLabelOffsets } from '../components/hudPanelLayout';

export type ScreenPoint = { x: number; y: number };
export type SeatLabelScreenPositions = Partial<Record<number, ScreenPoint>>;

function readSeatLabelPositions(
  totalPlayers: number,
  offsets: SeatLabelOffsets
): SeatLabelScreenPositions {
  const next: SeatLabelScreenPositions = {};

  for (let seatIndex = 0; seatIndex < totalPlayers; seatIndex += 1) {
    const el = document.querySelector(`[data-seat-anchor="seat-${seatIndex}"]`);
    if (!el) continue;

    const rect = el.getBoundingClientRect();
    const offset = offsets[seatIndex] ?? { dx: 0, dy: 0 };
    next[seatIndex] = {
      x: rect.left + rect.width / 2 + offset.dx,
      y: rect.top + rect.height / 2 + offset.dy,
    };
  }

  return next;
}

function positionsChanged(
  totalPlayers: number,
  a: SeatLabelScreenPositions,
  b: SeatLabelScreenPositions
): boolean {
  for (let seatIndex = 0; seatIndex < totalPlayers; seatIndex += 1) {
    const pa = a[seatIndex];
    const pb = b[seatIndex];
    if (!pa || !pb) return pa !== pb;
    if (Math.abs(pa.x - pb.x) > 0.5 || Math.abs(pa.y - pb.y) > 0.5) return true;
  }
  return false;
}

/** Project on-table seat anchors to viewport coords for upright opponent labels. */
export function useSeatLabelPositions(
  active: boolean,
  totalPlayers: number,
  offsets: SeatLabelOffsets
): SeatLabelScreenPositions {
  const [positions, setPositions] = useState<SeatLabelScreenPositions>({});

  useLayoutEffect(() => {
    if (!active || totalPlayers <= 0) return;

    const sync = () => {
      const next = readSeatLabelPositions(totalPlayers, offsets);
      setPositions((prev) => (positionsChanged(totalPlayers, prev, next) ? next : prev));
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
  }, [active, totalPlayers, offsets]);

  return positions;
}

/** Anchor centers without user offset — used as drag origin in edit mode. */
export function useSeatLabelAnchorPositions(
  active: boolean,
  totalPlayers: number
): SeatLabelScreenPositions {
  const [positions, setPositions] = useState<SeatLabelScreenPositions>({});

  useLayoutEffect(() => {
    if (!active || totalPlayers <= 0) return;

    const zeroOffsets = Object.fromEntries(
      Array.from({ length: totalPlayers }, (_, seatIndex) => [seatIndex, { dx: 0, dy: 0 }])
    ) as SeatLabelOffsets;

    const sync = () => {
      const next = readSeatLabelPositions(totalPlayers, zeroOffsets);
      setPositions((prev) => (positionsChanged(totalPlayers, prev, next) ? next : prev));
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
  }, [active, totalPlayers]);

  return positions;
}
