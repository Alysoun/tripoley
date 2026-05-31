import { SectionLabel } from '../types/GameTypes';
import { POT_SECTION_POSITIONS } from './potLabelLayout';

export type HudPanelId = 'hand' | 'info' | 'actions';

export type PanelPosition = {
  x: number;
  y: number;
};

export type HudLayout = Record<HudPanelId, PanelPosition>;

export type SeatLabelOffset = { dx: number; dy: number };
export type SeatLabelOffsets = Record<number, SeatLabelOffset>;

export type StoredHudLayout = {
  panels: HudLayout;
  handScale: number;
  potLabelOffsets?: PotLabelOffsets;
  seatLabelScale?: number;
  seatLabelOffsets?: SeatLabelOffsets;
};

export type PotLabelOffset = { dx: number; dy: number };
export type PotLabelOffsets = Record<SectionLabel, PotLabelOffset>;

export const MAX_POT_LABEL_OFFSET_PX = 56;

export const DEFAULT_SEAT_LABEL_SCALE = 1.45;
export const DEFAULT_SEAT_LABEL_SCALE_TABLET = 1.25;
export const DEFAULT_SEAT_LABEL_SCALE_PHONE = 1.05;
export const MIN_SEAT_LABEL_SCALE = 1;
export const MAX_SEAT_LABEL_SCALE = 2.5;
export const MAX_SEAT_LABEL_OFFSET_PX = 80;
export const MAX_SEAT_INDEX = 8;

export function defaultSeatLabelOffsets(): SeatLabelOffsets {
  return Object.fromEntries(
    Array.from({ length: MAX_SEAT_INDEX + 1 }, (_, seatIndex) => [seatIndex, { dx: 0, dy: 0 }])
  ) as SeatLabelOffsets;
}

export function clampSeatLabelScale(scale: number): number {
  return Math.min(MAX_SEAT_LABEL_SCALE, Math.max(MIN_SEAT_LABEL_SCALE, scale));
}

export function clampSeatLabelOffset(dx: number, dy: number): SeatLabelOffset {
  const dist = Math.hypot(dx, dy);
  if (dist <= MAX_SEAT_LABEL_OFFSET_PX || dist === 0) return { dx, dy };
  const scale = MAX_SEAT_LABEL_OFFSET_PX / dist;
  return { dx: dx * scale, dy: dy * scale };
}

export function defaultPotLabelOffsets(): PotLabelOffsets {
  return Object.fromEntries(
    (Object.keys(POT_SECTION_POSITIONS) as SectionLabel[]).map((label) => [label, { dx: 0, dy: 0 }])
  ) as PotLabelOffsets;
}

export function clampPotLabelOffset(dx: number, dy: number): PotLabelOffset {
  const dist = Math.hypot(dx, dy);
  if (dist <= MAX_POT_LABEL_OFFSET_PX || dist === 0) return { dx, dy };
  const scale = MAX_POT_LABEL_OFFSET_PX / dist;
  return { dx: dx * scale, dy: dy * scale };
}

const STORAGE_KEY = 'tripoley-hud-layout';

export const HUD_PANEL_Z_BASE: Record<HudPanelId, number> = {
  info: 51,
  hand: 52,
  actions: 53,
};

export const DEFAULT_HAND_SCALE = 1;
export const MIN_HAND_SCALE = 0.75;
export const MAX_HAND_SCALE = 2.25;

export function clampHandScale(scale: number): number {
  return Math.min(MAX_HAND_SCALE, Math.max(MIN_HAND_SCALE, scale));
}

export function fanContainerSize(cardCount: number): { width: number; height: number } {
  return {
    width: Math.max(220, cardCount * 38 + 90),
    height: 112,
  };
}

export function viewportWidth(): number {
  return typeof window !== 'undefined' ? window.innerWidth : 1280;
}

export function defaultSeatLabelScaleForViewport(width = viewportWidth()): number {
  if (width <= 480) return DEFAULT_SEAT_LABEL_SCALE_PHONE;
  if (width <= 768) return DEFAULT_SEAT_LABEL_SCALE_TABLET;
  return DEFAULT_SEAT_LABEL_SCALE;
}

export function defaultHudLayout(): HudLayout {
  const w = viewportWidth();
  const h = typeof window !== 'undefined' ? window.innerHeight : 800;
  const narrow = w <= 480;
  const tablet = w <= 768;

  const bottomHandY = narrow
    ? Math.max(96, h - 132)
    : tablet
      ? Math.max(108, h - 148)
      : Math.max(120, h - 156);
  const bottomInfoY = narrow
    ? Math.max(88, h - 124)
    : tablet
      ? Math.max(96, h - 136)
      : Math.max(96, h - 148);
  const bottomActionsY = narrow
    ? Math.max(88, h - 300)
    : tablet
      ? Math.max(96, h - 320)
      : Math.max(96, h - 340);

  return {
    info: { x: narrow ? 8 : 16, y: bottomInfoY },
    hand: { x: Math.round(w / 2 - (narrow ? 120 : 160)), y: bottomHandY },
    actions: { x: Math.round(w / 2 - (narrow ? 150 : 280)), y: bottomActionsY },
  };
}

export function defaultStoredHudLayout(): StoredHudLayout {
  return {
    panels: defaultHudLayout(),
    handScale: DEFAULT_HAND_SCALE,
    potLabelOffsets: defaultPotLabelOffsets(),
    seatLabelScale: defaultSeatLabelScaleForViewport(),
    seatLabelOffsets: defaultSeatLabelOffsets(),
  };
}

function isPanelPosition(value: unknown): value is PanelPosition {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as PanelPosition).x === 'number' &&
    typeof (value as PanelPosition).y === 'number'
  );
}

function isLegacyHudLayout(value: unknown): value is Partial<HudLayout> {
  return isPanelPosition((value as HudLayout)?.hand);
}

export function loadStoredHudLayout(): StoredHudLayout {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultStoredHudLayout();

    const parsed = JSON.parse(raw) as Partial<StoredHudLayout> & Partial<HudLayout>;

    if (parsed.panels && isPanelPosition(parsed.panels.hand)) {
      return {
        panels: { ...defaultHudLayout(), ...parsed.panels },
        handScale: clampHandScale(
          typeof parsed.handScale === 'number' ? parsed.handScale : DEFAULT_HAND_SCALE
        ),
        potLabelOffsets: {
          ...defaultPotLabelOffsets(),
          ...(parsed.potLabelOffsets ?? {}),
        },
        seatLabelScale: clampSeatLabelScale(
          typeof parsed.seatLabelScale === 'number'
            ? parsed.seatLabelScale
            : defaultSeatLabelScaleForViewport()
        ),
        seatLabelOffsets: {
          ...defaultSeatLabelOffsets(),
          ...(parsed.seatLabelOffsets ?? {}),
        },
      };
    }

    if (isLegacyHudLayout(parsed)) {
      return {
        panels: { ...defaultHudLayout(), ...parsed },
        handScale: DEFAULT_HAND_SCALE,
        potLabelOffsets: defaultPotLabelOffsets(),
        seatLabelScale: DEFAULT_SEAT_LABEL_SCALE,
        seatLabelOffsets: defaultSeatLabelOffsets(),
      };
    }

    return defaultStoredHudLayout();
  } catch {
    return defaultStoredHudLayout();
  }
}

export function saveStoredHudLayout(stored: StoredHudLayout): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
}

export function clearStoredHudLayout(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** @deprecated Use loadStoredHudLayout */
export function loadHudLayout(): HudLayout {
  return loadStoredHudLayout().panels;
}

/** @deprecated Use saveStoredHudLayout */
export function saveHudLayout(layout: HudLayout): void {
  saveStoredHudLayout({ panels: layout, handScale: DEFAULT_HAND_SCALE });
}
