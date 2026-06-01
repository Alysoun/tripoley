import {
  MAX_GAME_LOG_HEIGHT_DESKTOP,
  MAX_GAME_LOG_WIDTH,
  MIN_GAME_LOG_HEIGHT,
  MIN_GAME_LOG_WIDTH,
  hudSafeAreaBottom,
  layoutEditBottomInset,
  layoutEditLogTopInset,
  viewportHeight,
  viewportWidth,
} from './hudPanelLayout';

const LEGACY_STORAGE_KEY = 'tripoley-game-log-layout';

export type GameLogLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
  collapsed: boolean;
};

export function defaultGameLogLayout(): GameLogLayout {
  const w = viewportWidth();
  const h = viewportHeight();
  const tablet = w <= 768;
  const narrow = w <= 480;
  const width = tablet ? 220 : 240;
  const height = tablet ? 160 : 180;
  /** Keep the log off the bottom-left HUD stack — top-right on roomier screens. */
  const x = narrow
    ? 8
    : tablet
      ? Math.max(8, w - width - 8)
      : Math.max(16, w - width - 16);
  const y = narrow
    ? Math.max(56, 72)
    : tablet
      ? Math.max(56, 72)
      : Math.max(72, Math.min(120, h - height - 200));

  return {
    x,
    y,
    width,
    height,
    collapsed: false,
  };
}

export function maxGameLogHeight(editing: boolean): number {
  const h = viewportHeight();
  const top = layoutEditLogTopInset();
  if (editing) return Math.min(Math.floor(h * 0.85), h - top - 12);
  return Math.min(MAX_GAME_LOG_HEIGHT_DESKTOP, h - 120);
}

export function maxGameLogWidth(editing: boolean): number {
  const w = viewportWidth();
  return editing ? Math.min(MAX_GAME_LOG_WIDTH, w - 16) : 360;
}

export function minGameLogHeight(editing: boolean, collapsed: boolean): number {
  if (collapsed) return 40;
  if (editing) return 140;
  return MIN_GAME_LOG_HEIGHT;
}

export function clampGameLogLayout(
  layout: GameLogLayout,
  editing = false
): GameLogLayout {
  const w = viewportWidth();
  const h = viewportHeight();
  const top = layoutEditLogTopInset();
  const width = Math.min(
    Math.max(MIN_GAME_LOG_WIDTH, layout.width),
    maxGameLogWidth(editing)
  );
  const height = layout.collapsed
    ? 40
    : Math.min(
        Math.max(minGameLogHeight(editing, false), layout.height),
        maxGameLogHeight(editing)
      );
  const maxX = Math.max(0, w - width - 8);
  const maxY = editing
    ? Math.max(top, h - layoutEditBottomInset() - 24)
    : Math.max(top, h - hudSafeAreaBottom() - height);

  return {
    ...layout,
    x: Math.min(Math.max(0, layout.x), maxX),
    y: Math.min(Math.max(top, layout.y), maxY),
    width,
    height,
    collapsed: layout.collapsed,
  };
}

export function gameLogDragBounds(): {
  left: number;
  top: number;
  right: number;
  bottom: number;
} {
  return {
    left: 8,
    top: layoutEditLogTopInset(),
    right: Math.max(8, viewportWidth() - 48),
    bottom: Math.max(layoutEditLogTopInset(), viewportHeight() - layoutEditBottomInset()),
  };
}

export function prepareGameLogForEditing(layout: GameLogLayout): GameLogLayout {
  return clampGameLogLayout(
    {
      ...layout,
      collapsed: false,
      height: Math.max(layout.height, minGameLogHeight(true, false)),
    },
    true
  );
}

export function loadLegacyGameLogLayout(): GameLogLayout | null {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GameLogLayout>;
    return clampGameLogLayout({
      x: typeof parsed.x === 'number' ? parsed.x : 16,
      y: typeof parsed.y === 'number' ? parsed.y : defaultGameLogLayout().y,
      width: typeof parsed.width === 'number' ? parsed.width : 240,
      height: typeof parsed.height === 'number' ? parsed.height : 160,
      collapsed: Boolean(parsed.collapsed),
    });
  } catch {
    return null;
  }
}

export function clearLegacyGameLogLayout(): void {
  localStorage.removeItem(LEGACY_STORAGE_KEY);
}
