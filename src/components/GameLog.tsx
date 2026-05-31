import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import Draggable, { DraggableData } from 'react-draggable';
import { useGame } from '../context/GameContext';
import { useHudLayout } from '../context/HudLayoutContext';
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

const STORAGE_KEY = 'tripoley-game-log-layout';

type LogLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
  collapsed: boolean;
};

function defaultLayout(): LogLayout {
  const w = viewportWidth();
  const h = viewportHeight();
  const tablet = w <= 768;
  const height = tablet ? 112 : 130;

  return {
    x: tablet ? Math.max(8, w - 228) : 16,
    y: tablet ? Math.max(56, 72) : Math.max(100, h - 360),
    width: tablet ? 208 : 220,
    height,
    collapsed: false,
  };
}

function maxLogHeight(editing: boolean, top = layoutEditLogTopInset()): number {
  const h = viewportHeight();
  if (editing) return Math.min(Math.floor(h * 0.82), h - top - 16);
  return Math.min(MAX_GAME_LOG_HEIGHT_DESKTOP, h - 120);
}

function maxLogWidth(editing: boolean): number {
  const w = viewportWidth();
  return editing ? Math.min(MAX_GAME_LOG_WIDTH, w - 16) : 360;
}

function clampLayout(layout: LogLayout, editing = false): LogLayout {
  const w = viewportWidth();
  const h = viewportHeight();
  const top = layoutEditLogTopInset();
  const width = Math.min(Math.max(MIN_GAME_LOG_WIDTH, layout.width), maxLogWidth(editing));
  const height = layout.collapsed
    ? 40
    : Math.min(Math.max(MIN_GAME_LOG_HEIGHT, layout.height), maxLogHeight(editing, top));
  const maxX = Math.max(0, w - width - 8);
  const maxY = editing
    ? Math.max(top, h - layoutEditBottomInset() - (layout.collapsed ? 28 : 32))
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

function loadLayout(): LogLayout {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return clampLayout(defaultLayout());
    const parsed = JSON.parse(raw) as Partial<LogLayout>;
    return clampLayout({
      x: typeof parsed.x === 'number' ? parsed.x : 16,
      y: typeof parsed.y === 'number' ? parsed.y : defaultLayout().y,
      width: typeof parsed.width === 'number' ? parsed.width : 220,
      height: typeof parsed.height === 'number' ? parsed.height : 130,
      collapsed: Boolean(parsed.collapsed),
    });
  } catch {
    return clampLayout(defaultLayout());
  }
}

function saveLayout(layout: LogLayout): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  } catch {
    /* private mode / quota */
  }
}

const LogPanel = styled.div<{
  $width: number;
  $height: number;
  $collapsed: boolean;
  $editMode?: boolean;
  $dimmed?: boolean;
}>`
  width: ${(p) => p.$width}px;
  height: ${(p) => (p.$collapsed ? 'auto' : `${p.$height}px`)};
  min-width: ${MIN_GAME_LOG_WIDTH}px;
  max-width: ${(p) => (p.$editMode ? 'calc(100vw - 16px)' : '360px')};
  min-height: ${(p) => (p.$collapsed ? 'auto' : `${MIN_GAME_LOG_HEIGHT}px`)};
  max-height: ${(p) =>
    p.$editMode ? 'calc(100dvh - 64px)' : `min(${MAX_GAME_LOG_HEIGHT_DESKTOP}px, calc(100dvh - 120px))`};
  display: flex;
  flex-direction: column;
  background: rgba(0, 0, 0, 0.88);
  border: 1px solid rgba(255, 215, 0, 0.35);
  border-radius: 10px;
  z-index: 85;
  font-size: 0.78rem;
  color: #eee;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
  overflow: ${(p) => (p.$editMode && !p.$collapsed ? 'auto' : 'hidden')};
  opacity: ${(p) => (p.$dimmed ? 0.38 : 1)};
  pointer-events: ${(p) => (p.$dimmed ? 'none' : 'auto')};
  transition: opacity 0.15s ease;
  resize: ${(p) => (p.$collapsed || !p.$editMode ? 'none' : 'both')};
  ${(p) =>
    p.$editMode
      ? `
    outline: 1px dashed rgba(120, 200, 255, 0.55);
    outline-offset: 2px;
  `
      : ''}
`;

const LogHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  padding: 8px 10px;
  border-bottom: 1px solid rgba(255, 215, 0, 0.18);
  background: rgba(0, 0, 0, 0.35);
  color: #ffd700;
  font-weight: 600;
  font-size: 0.8rem;
  cursor: grab;
  user-select: none;
  touch-action: none;

  &:active {
    cursor: grabbing;
  }
`;

const SizeControls = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  padding: 8px 10px 10px;
  border-bottom: 1px solid rgba(255, 215, 0, 0.12);
  background: rgba(0, 0, 0, 0.25);
  touch-action: auto;
  pointer-events: auto;
`;

const SizeLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #ccc;
  font-size: 0.72rem;
  font-weight: 500;
  min-width: 0;

  input[type='range'] {
    width: min(120px, 28vw);
    accent-color: #ffd700;
  }
`;

const CollapseBtn = styled.button`
  border: none;
  background: transparent;
  color: #ffd700;
  cursor: pointer;
  padding: 2px 6px;
  font-size: 0.85rem;
  min-height: 32px;
  min-width: 32px;
`;

const LogBody = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
  padding: 6px 10px 10px;
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 215, 0, 0.35) transparent;

  &::-webkit-scrollbar {
    width: 5px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 215, 0, 0.35);
    border-radius: 3px;
  }
`;

const Entry = styled.div<{ $type: string }>`
  padding: 3px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  color: ${(p) =>
    p.$type === 'success' ? '#8f8' : p.$type === 'error' ? '#f88' : '#ddd'};
  line-height: 1.3;
`;

const GameLog: React.FC = () => {
  const { state } = useGame();
  const { layoutEditMode, isEditingLayoutGroup } = useHudLayout();
  const groupActive = isEditingLayoutGroup('log');
  const dimmed = layoutEditMode && !groupActive;
  const nodeRef = useRef<HTMLDivElement>(null);
  const layoutRef = useRef<LogLayout>(loadLayout());
  const saveTimerRef = useRef<number | null>(null);
  const [layout, setLayout] = useState<LogLayout>(() => layoutRef.current);

  const persistLayout = useCallback(
    (next: LogLayout) => {
      const clamped = clampLayout(next, groupActive);
      layoutRef.current = clamped;
      setLayout(clamped);
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = window.setTimeout(() => {
        saveLayout(clamped);
        saveTimerRef.current = null;
      }, 120);
    },
    [groupActive]
  );

  useEffect(() => {
    return () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
        saveLayout(layoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const onResize = () => persistLayout(layoutRef.current);
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, [persistLayout]);

  const onDrag = useCallback(
    (_: unknown, data: DraggableData) => {
      persistLayout({ ...layoutRef.current, x: data.x, y: data.y });
    },
    [persistLayout]
  );

  const onResizePanel = useCallback(() => {
    const el = nodeRef.current;
    if (!el || layoutRef.current.collapsed || !groupActive) return;
    const width = el.offsetWidth;
    const height = el.offsetHeight;
    if (
      width === layoutRef.current.width &&
      height === layoutRef.current.height
    ) {
      return;
    }
    persistLayout({ ...layoutRef.current, width, height });
  }, [persistLayout, groupActive]);

  useEffect(() => {
    const el = nodeRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(onResizePanel);
    observer.observe(el);
    return () => observer.disconnect();
  }, [onResizePanel]);

  if (state.phase === 'setup') return null;

  const logBounds = groupActive
    ? {
        left: 8,
        top: layoutEditLogTopInset(),
        right: Math.max(8, viewportWidth() - 48),
        bottom: Math.max(layoutEditLogTopInset(), viewportHeight() - layoutEditBottomInset()),
      }
    : undefined;

  const maxWidth = maxLogWidth(groupActive);
  const maxHeight = maxLogHeight(groupActive);

  return (
    <Draggable
      nodeRef={nodeRef}
      handle=".log-drag-handle"
      disabled={!groupActive}
      bounds={logBounds}
      position={{ x: layout.x, y: layout.y }}
      onDrag={onDrag}
      onStop={onDrag}
    >
      <LogPanel
        ref={nodeRef}
        $width={layout.width}
        $height={layout.height}
        $collapsed={layout.collapsed}
        $editMode={groupActive}
        $dimmed={dimmed}
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          zIndex: groupActive ? 140 : layoutEditMode ? 80 : 85,
        }}
      >
        <LogHeader className="log-drag-handle">
          <span>{groupActive ? '⠿ Game Log' : 'Game Log'}</span>
          <CollapseBtn
            type="button"
            onClick={() =>
              persistLayout({
                ...layoutRef.current,
                collapsed: !layoutRef.current.collapsed,
              })
            }
          >
            {layout.collapsed ? '▸' : '▾'}
          </CollapseBtn>
        </LogHeader>
        {groupActive && !layout.collapsed && (
          <SizeControls>
            <SizeLabel>
              Width
              <input
                type="range"
                min={MIN_GAME_LOG_WIDTH}
                max={maxWidth}
                step={4}
                value={layout.width}
                onChange={(e) =>
                  persistLayout({ ...layoutRef.current, width: Number(e.target.value) })
                }
                aria-label="Game log width"
              />
              {layout.width}px
            </SizeLabel>
            <SizeLabel>
              Height
              <input
                type="range"
                min={MIN_GAME_LOG_HEIGHT}
                max={maxHeight}
                step={4}
                value={layout.height}
                onChange={(e) =>
                  persistLayout({ ...layoutRef.current, height: Number(e.target.value) })
                }
                aria-label="Game log height"
              />
              {layout.height}px
            </SizeLabel>
          </SizeControls>
        )}
        {!layout.collapsed && (
          <LogBody>
            {[...state.log].reverse().map((entry) => (
              <Entry key={entry.id} $type={entry.type}>
                {entry.message}
              </Entry>
            ))}
          </LogBody>
        )}
      </LogPanel>
    </Draggable>
  );
};

export default GameLog;
