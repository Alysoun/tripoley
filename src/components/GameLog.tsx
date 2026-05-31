import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import Draggable, { DraggableData } from 'react-draggable';
import { useGame } from '../context/GameContext';
import { useHudLayout } from '../context/HudLayoutContext';
import { hudSafeAreaBottom, viewportHeight, viewportWidth } from './hudPanelLayout';

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

function clampLayout(layout: LogLayout): LogLayout {
  const w = viewportWidth();
  const h = viewportHeight();
  const width = Math.min(Math.max(180, layout.width), 360);
  const height = layout.collapsed
    ? 40
    : Math.min(Math.max(90, layout.height), Math.min(280, h - 120));
  const maxX = Math.max(0, w - width - 8);
  const maxY = Math.max(56, h - hudSafeAreaBottom() - height);

  return {
    ...layout,
    x: Math.min(Math.max(0, layout.x), maxX),
    y: Math.min(Math.max(56, layout.y), maxY),
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
  min-width: 180px;
  max-width: 360px;
  min-height: ${(p) => (p.$collapsed ? 'auto' : '90px')};
  max-height: min(280px, calc(100dvh - 120px));
  display: flex;
  flex-direction: column;
  background: rgba(0, 0, 0, 0.88);
  border: 1px solid rgba(255, 215, 0, 0.35);
  border-radius: 10px;
  z-index: 85;
  font-size: 0.78rem;
  color: #eee;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
  overflow: hidden;
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

  const persistLayout = useCallback((next: LogLayout) => {
    const clamped = clampLayout(next);
    layoutRef.current = clamped;
    setLayout(clamped);
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(() => {
      saveLayout(clamped);
      saveTimerRef.current = null;
    }, 120);
  }, []);

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

  const onResize = useCallback(() => {
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
    const observer = new ResizeObserver(onResize);
    observer.observe(el);
    return () => observer.disconnect();
  }, [onResize]);

  if (state.phase === 'setup') return null;

  return (
    <Draggable
      nodeRef={nodeRef}
      handle=".log-drag-handle"
      disabled={!groupActive}
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
