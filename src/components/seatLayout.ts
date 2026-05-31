/** Seat ring geometry — % of the seat overlay box (aligned to the table stack). */

export interface SeatPoint {
  left: string;
  top: string;
}

/** Seat 0 = bottom of table; ids advance counter-clockwise around the felt. */
function seatAngle(seatIndex: number, totalPlayers: number): number {
  return Math.PI / 2 + (2 * Math.PI * seatIndex) / totalPlayers;
}

function tableRadii(totalPlayers: number): { rx: number; ry: number } {
  return {
    rx: 41 + Math.min(Math.max(totalPlayers - 4, 0), 4),
    ry: 33 + Math.min(Math.max(totalPlayers - 6, 0), 3),
  };
}

function pointOnRing(seatIndex: number, totalPlayers: number): { left: number; top: number } {
  const { rx, ry } = tableRadii(totalPlayers);
  const sinA = Math.sin(seatAngle(seatIndex, totalPlayers));
  const cosA = Math.cos(seatAngle(seatIndex, totalPlayers));

  const left = 50 + rx * cosA;
  let top = 50 + ry * sinA;

  const sideFactor = Math.abs(cosA);
  top -= sideFactor > 0.55 ? 4 : sinA < -0.12 ? 3 : 2;

  return { left, top };
}

let layoutCacheKey = '';
let layoutCache: SeatPoint[] = [];

export function getAllSeatCoordinates(totalPlayers: number): SeatPoint[] {
  const key = String(totalPlayers);
  if (key === layoutCacheKey && layoutCache.length === totalPlayers) {
    return layoutCache;
  }

  layoutCache = Array.from({ length: totalPlayers }, (_, seatIndex) => {
    const { left, top } = pointOnRing(seatIndex, totalPlayers);
    return { left: `${left.toFixed(2)}%`, top: `${top.toFixed(2)}%` };
  });
  layoutCacheKey = key;
  return layoutCache;
}

export function getSeatCoordinates(seatIndex: number, totalPlayers: number): SeatPoint {
  return getAllSeatCoordinates(totalPlayers)[seatIndex];
}

/** Anchor point on the felt (% of table felt box) — matches seat ring geometry. */
export function getSeatAnchorPercent(
  seatIndex: number,
  totalPlayers: number
): { left: number; top: number } {
  const { left, top } = pointOnRing(seatIndex, totalPlayers);
  return { left, top };
}

/** Plaque sits just above the anchor point on the felt rail. */
export const seatLabelTransform = 'translate(-50%, calc(-100% - clamp(6px, 1vh, 12px)))';
