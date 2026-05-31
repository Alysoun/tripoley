import React, { useCallback, useRef } from 'react';
import styled from 'styled-components';
import Draggable, { DraggableData } from 'react-draggable';
import { useGame } from '../context/GameContext';
import { useHudLayout } from '../context/HudLayoutContext';
import {
  gameLogDragBounds,
  MAX_GAME_LOG_HEIGHT_DESKTOP,
  MIN_GAME_LOG_HEIGHT,
  MIN_GAME_LOG_WIDTH,
} from './hudPanelLayout';

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
  min-height: ${MIN_GAME_LOG_HEIGHT - 44}px;
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
  const { layoutEditMode, isEditingLayoutGroup, gameLogLayout, setGameLogLayout } =
    useHudLayout();
  const groupActive = isEditingLayoutGroup('log');
  const dimmed = layoutEditMode && !groupActive;
  const nodeRef = useRef<HTMLDivElement>(null);

  const onDrag = useCallback(
    (_: unknown, data: DraggableData) => {
      setGameLogLayout({ x: data.x, y: data.y });
    },
    [setGameLogLayout]
  );

  if (state.phase === 'setup') return null;

  const logBounds = groupActive ? gameLogDragBounds() : undefined;

  return (
    <Draggable
      nodeRef={nodeRef}
      handle=".log-drag-handle"
      disabled={!groupActive}
      bounds={logBounds}
      position={{ x: gameLogLayout.x, y: gameLogLayout.y }}
      onDrag={onDrag}
      onStop={onDrag}
    >
      <LogPanel
        ref={nodeRef}
        $width={gameLogLayout.width}
        $height={gameLogLayout.height}
        $collapsed={gameLogLayout.collapsed}
        $editMode={groupActive}
        $dimmed={dimmed}
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          zIndex: groupActive ? 140 : layoutEditMode ? 80 : 85,
          maxHeight: groupActive
            ? 'calc(100dvh - 64px)'
            : `min(${MAX_GAME_LOG_HEIGHT_DESKTOP}px, calc(100dvh - 120px))`,
        }}
      >
        <LogHeader className="log-drag-handle">
          <span>{groupActive ? '⠿ Game Log' : 'Game Log'}</span>
          <CollapseBtn
            type="button"
            onClick={() => setGameLogLayout({ collapsed: !gameLogLayout.collapsed })}
          >
            {gameLogLayout.collapsed ? '▸' : '▾'}
          </CollapseBtn>
        </LogHeader>
        {!gameLogLayout.collapsed && (
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
