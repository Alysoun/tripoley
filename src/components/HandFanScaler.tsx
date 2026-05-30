import React, { useCallback, useRef } from 'react';
import styled from 'styled-components';
import { clampHandScale } from './hudPanelLayout';

type HandFanScalerProps = {
  scale: number;
  baseWidth: number;
  baseHeight: number;
  editMode: boolean;
  onScaleChange: (scale: number) => void;
  children: React.ReactNode;
};

const Wrap = styled.div<{ $width: number; $height: number }>`
  position: relative;
  width: ${(p) => p.$width}px;
  height: ${(p) => p.$height}px;
  margin: 0 auto;
`;

const ScaledInner = styled.div<{ $scale: number }>`
  position: absolute;
  left: 0;
  bottom: 0;
  transform: scale(${(p) => p.$scale});
  transform-origin: left bottom;
  transform-style: preserve-3d;
`;

const ResizeGrip = styled.button`
  position: absolute;
  right: -2px;
  bottom: -2px;
  width: 20px;
  height: 20px;
  padding: 0;
  border: 1px solid rgba(255, 215, 0, 0.65);
  border-radius: 0 0 8px 0;
  background: rgba(0, 0, 0, 0.82);
  color: rgba(255, 215, 0, 0.95);
  cursor: nwse-resize;
  touch-action: none;
  font-size: 0.72rem;
  line-height: 1;
  z-index: 5;

  &:hover {
    background: rgba(40, 32, 0, 0.95);
  }
`;

const ScaleHint = styled.div`
  position: absolute;
  right: 0;
  top: -22px;
  font-size: 0.68rem;
  color: rgba(255, 215, 0, 0.85);
  white-space: nowrap;
  pointer-events: none;
`;

const SCALE_DRAG_SENSITIVITY = 0.0045;

const HandFanScaler: React.FC<HandFanScalerProps> = ({
  scale,
  baseWidth,
  baseHeight,
  editMode,
  onScaleChange,
  children,
}) => {
  const dragRef = useRef<{ startX: number; startY: number; startScale: number } | null>(null);

  const onResizePointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      event.stopPropagation();
      dragRef.current = {
        startX: event.clientX,
        startY: event.clientY,
        startScale: scale,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [scale]
  );

  const onResizePointerMove = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (!dragRef.current) return;
      const { startX, startY, startScale } = dragRef.current;
      const deltaX = event.clientX - startX;
      const deltaY = event.clientY - startY;
      const next = clampHandScale(startScale + (deltaX - deltaY) * SCALE_DRAG_SENSITIVITY);
      onScaleChange(next);
    },
    [onScaleChange]
  );

  const onResizePointerUp = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    dragRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  }, []);

  const visualWidth = baseWidth * scale;
  const visualHeight = baseHeight * scale;

  return (
    <Wrap $width={visualWidth} $height={visualHeight}>
      <ScaledInner $scale={scale}>{children}</ScaledInner>
      {editMode && (
        <>
          <ScaleHint>{Math.round(scale * 100)}%</ScaleHint>
          <ResizeGrip
            type="button"
            aria-label="Resize hand"
            title="Drag to resize hand"
            onPointerDown={onResizePointerDown}
            onPointerMove={onResizePointerMove}
            onPointerUp={onResizePointerUp}
            onPointerCancel={onResizePointerUp}
          >
            ⤡
          </ResizeGrip>
        </>
      )}
    </Wrap>
  );
};

export default HandFanScaler;
