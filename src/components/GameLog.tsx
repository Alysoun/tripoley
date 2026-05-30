import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import Draggable, { DraggableData } from 'react-draggable';
import { useGame } from '../context/GameContext';

const STORAGE_KEY = 'tripoley-game-log-layout';

type LogLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
  collapsed: boolean;
};

function defaultLayout(): LogLayout {
  return {
    x: 16,
    y: Math.max(100, window.innerHeight - 360),
    width: 220,
    height: 130,
    collapsed: false,
  };
}

function clampLayout(layout: LogLayout): LogLayout {
  const maxX = Math.max(0, window.innerWidth - Math.min(layout.width, 360) - 8);
  const maxY = Math.max(0, window.innerHeight - 48);
  return {
    ...layout,
    x: Math.min(Math.max(0, layout.x), maxX),
    y: Math.min(Math.max(0, layout.y), maxY),
    width: Math.min(Math.max(180, layout.width), 360),
    height: Math.min(Math.max(90, layout.height), 280),
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

const LogPanel = styled.div<{ $width: number; $height: number; $collapsed: boolean }>`
  width: ${(p) => p.$width}px;
  height: ${(p) => (p.$collapsed ? 'auto' : `${p.$height}px`)};
  min-width: 180px;
  max-width: 360px;
  min-height: ${(p) => (p.$collapsed ? 'auto' : '90px')};
  max-height: 280px;
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
  resize: ${(p) => (p.$collapsed ? 'none' : 'both')};
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
`;

const LogBody = styled.div`
  flex: 1;
  overflow-y: auto;
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

  const onDrag = useCallback(
    (_: unknown, data: DraggableData) => {
      persistLayout({ ...layoutRef.current, x: data.x, y: data.y });
    },
    [persistLayout]
  );

  const onResize = useCallback(() => {
    const el = nodeRef.current;
    if (!el || layoutRef.current.collapsed) return;
    const width = el.offsetWidth;
    const height = el.offsetHeight;
    if (
      width === layoutRef.current.width &&
      height === layoutRef.current.height
    ) {
      return;
    }
    persistLayout({ ...layoutRef.current, width, height });
  }, [persistLayout]);

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
      position={{ x: layout.x, y: layout.y }}
      onDrag={onDrag}
      onStop={onDrag}
    >
      <LogPanel
        ref={nodeRef}
        $width={layout.width}
        $height={layout.height}
        $collapsed={layout.collapsed}
        style={{ position: 'fixed', left: 0, top: 0 }}
      >
        <LogHeader className="log-drag-handle">
          <span>Game Log</span>
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
