import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import Draggable, { DraggableData } from 'react-draggable';
import { HudPanelId, clampPanelPosition, hudPanelDragBounds, viewportHeight, viewportWidth } from './hudPanelLayout';
import { useHudLayout } from '../context/HudLayoutContext';

type DraggableHudPanelProps = {
  id: HudPanelId;
  title: string;
  children: React.ReactNode;
  variant?: 'glass' | 'minimal';
  className?: string;
};

const PanelShell = styled.div<{
  $zIndex: number;
  $variant: 'glass' | 'minimal';
  $editMode: boolean;
  $dimmed?: boolean;
}>`
  position: fixed;
  left: 0;
  top: 0;
  z-index: ${(p) => p.$zIndex};
  max-width: calc(100vw - 16px);
  color: white;
  opacity: ${(p) => (p.$dimmed ? 0.38 : 1)};
  pointer-events: ${(p) => (p.$dimmed ? 'none' : 'auto')};
  transition: opacity 0.15s ease;
  overflow: visible;
  ${(p) =>
    p.$variant === 'glass'
      ? `
    background: rgba(0, 0, 0, 0.88);
    border: 1px solid rgba(255, 215, 0, 0.35);
    border-radius: 10px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
  `
      : `
    background: transparent;
  `}
  ${(p) =>
    p.$editMode
      ? `
    outline: 1px dashed rgba(255, 215, 0, 0.45);
    outline-offset: 2px;
  `
      : ''}
`;

const DragHandle = styled.div<{ $variant: 'glass' | 'minimal' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: ${(p) => (p.$variant === 'minimal' ? '8px 12px' : '8px 12px')};
  min-height: 44px;
  border-radius: ${(p) => (p.$variant === 'minimal' ? '8px' : '10px 10px 0 0')};
  background: rgba(0, 0, 0, 0.72);
  border: 1px solid rgba(255, 215, 0, 0.28);
  color: rgba(255, 215, 0, 0.9);
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  cursor: grab;
  user-select: none;
  touch-action: none;

  &:active {
    cursor: grabbing;
  }
`;

const PanelBody = styled.div<{ $variant: 'glass' | 'minimal'; $editMode: boolean; $scrollable?: boolean }>`
  padding: ${(p) => {
    if (p.$variant === 'minimal') return p.$editMode ? '4px 0 0' : '0';
    return p.$editMode ? '8px 12px 10px' : '10px 12px';
  }};
  overflow: visible;
  ${(p) =>
    p.$scrollable
      ? `
    max-height: min(260px, calc(100dvh - 140px));
    overflow-y: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
    touch-action: pan-y;
  `
      : ''}
  ${(p) =>
    p.$variant === 'minimal'
      ? `
    transform-style: preserve-3d;
  `
      : ''}
`;

const DraggableHudPanel: React.FC<DraggableHudPanelProps> = ({
  id,
  title,
  children,
  variant = 'glass',
  className,
}) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const {
    layout,
    handScale,
    layoutEditMode,
    isEditingLayoutGroup,
    setPanelPosition,
    focusPanel,
    panelZIndex,
  } = useHudLayout();
  const position = layout[id];
  const groupActive = isEditingLayoutGroup('hud');
  const dimmed = layoutEditMode && !groupActive;
  const [viewport, setViewport] = useState(() => ({
    w: viewportWidth(),
    h: viewportHeight(),
  }));

  useEffect(() => {
    const update = () => setViewport({ w: viewportWidth(), h: viewportHeight() });
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  const dragBounds = useMemo(
    () => (groupActive ? hudPanelDragBounds({ editing: true, handScale }) : undefined),
    [groupActive, handScale, viewport.w, viewport.h]
  );

  const commitPosition = useCallback(
    (data: DraggableData) => {
      setPanelPosition(
        id,
        clampPanelPosition(
          id,
          { x: data.x, y: data.y },
          { editing: true, handScale }
        )
      );
    },
    [handScale, id, setPanelPosition]
  );

  return (
    <Draggable
      nodeRef={nodeRef}
      handle=".hud-drag-handle"
      disabled={!groupActive}
      bounds={dragBounds}
      position={position}
      onStart={() => focusPanel(id)}
      onStop={(_, data) => {
        commitPosition(data);
        focusPanel(null);
      }}
    >
      <PanelShell
        ref={nodeRef}
        className={className}
        $zIndex={panelZIndex(id)}
        $variant={variant}
        $editMode={groupActive}
        $dimmed={dimmed}
      >
        {groupActive && (
          <DragHandle className="hud-drag-handle" $variant={variant}>
            <span aria-hidden="true">⠿</span>
            <span>{title}</span>
          </DragHandle>
        )}
        <PanelBody
          $variant={variant}
          $editMode={groupActive}
          $scrollable={id === 'actions' && !layoutEditMode}
        >
          {children}
        </PanelBody>
      </PanelShell>
    </Draggable>
  );
};

export default DraggableHudPanel;
