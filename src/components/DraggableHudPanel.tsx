import React, { useRef } from 'react';
import styled from 'styled-components';
import Draggable from 'react-draggable';
import { HudPanelId, clampPanelPosition } from './hudPanelLayout';
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
  padding: ${(p) => (p.$variant === 'minimal' ? '4px 10px' : '6px 10px')};
  border-radius: ${(p) => (p.$variant === 'minimal' ? '8px' : '10px 10px 0 0')};
  background: rgba(0, 0, 0, 0.72);
  border: 1px solid rgba(255, 215, 0, 0.28);
  color: rgba(255, 215, 0, 0.9);
  font-size: 0.72rem;
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
  const { layout, layoutEditMode, isEditingLayoutGroup, setPanelPosition, focusPanel, panelZIndex } =
    useHudLayout();
  const position = layout[id];
  const groupActive = isEditingLayoutGroup('hud');
  const dimmed = layoutEditMode && !groupActive;

  return (
    <Draggable
      nodeRef={nodeRef}
      handle=".hud-drag-handle"
      disabled={!groupActive}
      position={position}
      onStart={() => focusPanel(id)}
      onStop={(_, data) => {
        setPanelPosition(id, clampPanelPosition(id, { x: data.x, y: data.y }));
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
