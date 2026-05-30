import { SectionLabel } from '../types/GameTypes';
import { POT_SECTION_POSITIONS } from './potLabelLayout';

export type HudPanelId = 'hand' | 'info' | 'actions';

export type PanelPosition = {
  x: number;
  y: number;
};

export type HudLayout = Record<HudPanelId, PanelPosition>;

export type StoredHudLayout = {
  panels: HudLayout;
  handScale: number;
  potLabelOffsets?: PotLabelOffsets;
};

export type PotLabelOffset = { dx: number; dy: number };
export type PotLabelOffsets = Record<SectionLabel, PotLabelOffset>;

export const MAX_POT_LABEL_OFFSET_PX = 56;

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

export function defaultHudLayout(): HudLayout {
  const w = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const h = typeof window !== 'undefined' ? window.innerHeight : 800;

  return {
    info: { x: 16, y: Math.max(96, h - 148) },
    hand: { x: Math.round(w / 2 - 160), y: Math.max(120, h - 156) },
    actions: { x: Math.round(w / 2 - 280), y: Math.max(96, h - 340) },
  };
}

export function defaultStoredHudLayout(): StoredHudLayout {
  return {
    panels: defaultHudLayout(),
    handScale: DEFAULT_HAND_SCALE,
    potLabelOffsets: defaultPotLabelOffsets(),
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
      };
    }

    if (isLegacyHudLayout(parsed)) {
      return {
        panels: { ...defaultHudLayout(), ...parsed },
        handScale: DEFAULT_HAND_SCALE,
        potLabelOffsets: defaultPotLabelOffsets(),
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
