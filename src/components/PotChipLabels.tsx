import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import styled, { css, keyframes } from 'styled-components';
import Draggable from 'react-draggable';
import { PotSection, SectionLabel } from '../types/GameTypes';
import { LABEL_TO_POT_SECTION } from '../game/engine/animations';
import { useAchievements } from '../context/AchievementContext';
import { useHudLayout } from '../context/HudLayoutContext';
import { POT_SECTION_POSITIONS } from './potLabelLayout';
import {
  MAX_POT_LABEL_OFFSET_PX,
  clampPotLabelOffset,
  PotLabelOffset,
} from './hudPanelLayout';
import {
  usePotLabelAnchorPositions,
  usePotLabelPositions,
} from '../hooks/usePotLabelPositions';

interface PotChipLabelsProps {
  sections: PotSection[];
}

const ChipCount = styled.div<{ $pulse?: boolean; $editMode?: boolean }>`
  background: linear-gradient(165deg, #1a1a1a 0%, #000 100%);
  color: white;
  padding: 5px 10px;
  border-radius: 6px;
  text-align: center;
  border: 2px solid #ffd700;
  font-size: clamp(0.68rem, 1.2vmin, 0.88rem);
  min-width: clamp(48px, 8vmin, 60px);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  box-shadow:
    0 6px 14px rgba(0, 0, 0, 0.5),
    0 1px 0 rgba(255, 255, 255, 0.08) inset;
  transform: ${(p) => (p.$pulse ? 'translate(-50%, -50%) scale(1.14)' : 'translate(-50%, -50%)')};
  transition: transform 0.2s ease;
  pointer-events: ${(p) => (p.$editMode ? 'auto' : 'none')};
  cursor: ${(p) => (p.$editMode ? 'grab' : 'default')};
  ${(p) =>
    p.$editMode
      ? `
    outline: 1px dashed rgba(255, 215, 0, 0.55);
    outline-offset: 3px;
  `
      : ''}

  &:active {
    cursor: ${(p) => (p.$editMode ? 'grabbing' : 'default')};
  }
`;

const chipSparkle = keyframes`
  from { box-shadow: 0 0 4px rgba(255, 215, 0, 0.4); }
  50% { box-shadow: 0 0 10px rgba(255, 215, 0, 0.95); }
  to { box-shadow: 0 0 4px rgba(255, 215, 0, 0.4); }
`;

const chipSparkleAnim = css`
  animation: ${chipSparkle} 1.8s ease-in-out infinite;
`;

const ChipIcon = styled.span<{ $sparkle?: boolean }>`
  width: clamp(9px, 1.4vmin, 12px);
  height: clamp(9px, 1.4vmin, 12px);
  background-color: #ffd700;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
  ${(p) => p.$sparkle && chipSparkleAnim}
`;

const AnchorRoot = styled.div<{ $x: number; $y: number; $ready: boolean; $editMode?: boolean; $dimmed?: boolean }>`
  position: fixed;
  left: ${(p) => p.$x}px;
  top: ${(p) => p.$y}px;
  z-index: ${(p) => (p.$editMode ? 140 : p.$dimmed ? 50 : 53)};
  opacity: ${(p) => (p.$ready ? (p.$dimmed ? 0.38 : 1) : 0)};
  pointer-events: ${(p) => (p.$editMode ? 'auto' : 'none')};
  transition: opacity 0.15s ease;
`;

const DragHandle = styled.div`
  pointer-events: auto;
  touch-action: none;
  user-select: none;
`;

const AnchorMarker = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  width: 10px;
  height: 10px;
  margin: -5px 0 0 -5px;
  border-radius: 50%;
  background: rgba(255, 215, 0, 0.85);
  border: 1px solid rgba(0, 0, 0, 0.65);
  box-shadow: 0 0 8px rgba(255, 215, 0, 0.55);
  pointer-events: none;
`;

const DragBounds = styled.div`
  position: absolute;
  left: ${-MAX_POT_LABEL_OFFSET_PX}px;
  top: ${-MAX_POT_LABEL_OFFSET_PX}px;
  width: ${MAX_POT_LABEL_OFFSET_PX * 2}px;
  height: ${MAX_POT_LABEL_OFFSET_PX * 2}px;
  border: 1px dashed rgba(255, 215, 0, 0.22);
  border-radius: 8px;
  pointer-events: none;
`;

type PotLabelItemProps = {
  label: SectionLabel;
  chips: number;
  anchorX: number;
  anchorY: number;
  offset: PotLabelOffset;
  editMode: boolean;
  dimmed?: boolean;
  pulse: boolean;
  sparkle: boolean;
  onOffsetChange: (label: SectionLabel, offset: PotLabelOffset) => void;
};

const PotLabelItem: React.FC<PotLabelItemProps> = ({
  label,
  chips,
  anchorX,
  anchorY,
  offset,
  editMode,
  dimmed,
  pulse,
  sparkle,
  onOffsetChange,
}) => {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [liveOffset, setLiveOffset] = useState(offset);

  useEffect(() => {
    setLiveOffset(offset);
  }, [offset.dx, offset.dy]);

  const chipLabel = (
    <ChipCount title={label} $pulse={pulse} $editMode={editMode}>
      {chips}
      <ChipIcon $sparkle={sparkle} />
    </ChipCount>
  );

  return (
    <AnchorRoot $x={anchorX} $y={anchorY} $ready $editMode={editMode} $dimmed={dimmed}>
      {editMode && (
        <>
          <AnchorMarker aria-hidden />
          <DragBounds aria-hidden />
        </>
      )}
      {editMode ? (
        <Draggable
          nodeRef={nodeRef}
          position={{ x: liveOffset.dx, y: liveOffset.dy }}
          bounds={{
            left: -MAX_POT_LABEL_OFFSET_PX,
            top: -MAX_POT_LABEL_OFFSET_PX,
            right: MAX_POT_LABEL_OFFSET_PX,
            bottom: MAX_POT_LABEL_OFFSET_PX,
          }}
          onDrag={(_, data) =>
            setLiveOffset(clampPotLabelOffset(data.x, data.y))
          }
          onStop={(_, data) =>
            onOffsetChange(label, clampPotLabelOffset(data.x, data.y))
          }
        >
          <DragHandle ref={nodeRef}>{chipLabel}</DragHandle>
        </Draggable>
      ) : (
        <div style={{ transform: `translate(${offset.dx}px, ${offset.dy}px)` }}>{chipLabel}</div>
      )}
    </AnchorRoot>
  );
};

const PotChipLabels: React.FC<PotChipLabelsProps> = ({ sections }) => {
  const { activeEffects } = useAchievements();
  const { layoutEditMode, isEditingLayoutGroup, potLabelOffsets, setPotLabelOffset } = useHudLayout();
  const groupActive = isEditingLayoutGroup('pot');
  const dimmed = layoutEditMode && !groupActive;
  const [pulseSection, setPulseSection] = useState<string | null>(null);
  const anchorPositions = usePotLabelAnchorPositions(true);
  const screenPositions = usePotLabelPositions(true, potLabelOffsets);

  useEffect(() => {
    const handler = (e: Event) => {
      const section = (e as CustomEvent<{ section: string }>).detail?.section;
      if (section) {
        setPulseSection(section);
        window.setTimeout(() => setPulseSection(null), 350);
      }
    };
    window.addEventListener('tripoley-pot-pulse', handler);
    return () => window.removeEventListener('tripoley-pot-pulse', handler);
  }, []);

  const chipByLabel = new Map(sections.map((s) => [s.label, s.chips]));

  return createPortal(
    <>
      {(Object.keys(POT_SECTION_POSITIONS) as SectionLabel[]).map((label) => {
        const anchor = anchorPositions[label];
        const point = screenPositions[label];
        if (!anchor || !point) return null;

        const chips = chipByLabel.get(label) ?? 0;
        const potKey = LABEL_TO_POT_SECTION[label];

        return (
          <PotLabelItem
            key={label}
            label={label}
            chips={chips}
            anchorX={anchor.x}
            anchorY={anchor.y}
            offset={potLabelOffsets[label] ?? { dx: 0, dy: 0 }}
            editMode={groupActive}
            dimmed={dimmed}
            pulse={pulseSection === potKey}
            sparkle={!!activeEffects.neonTracers}
            onOffsetChange={setPotLabelOffset}
          />
        );
      })}
    </>,
    document.body
  );
};

export default PotChipLabels;
