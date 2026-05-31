import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Draggable from 'react-draggable';
import styled from 'styled-components';
import { Card, Player, Rank } from '../types/GameTypes';
import { getCardFrontPath } from '../utils/cardAssets';
import { displayPlayerName } from '../utils/playerName';
import { useAchievements } from '../context/AchievementContext';
import { useHudLayout } from '../context/HudLayoutContext';
import {
  MAX_SEAT_LABEL_OFFSET_PX,
  MAX_SEAT_LABEL_SCALE,
  MIN_SEAT_LABEL_SCALE,
  SeatLabelOffset,
  clampSeatLabelOffset,
} from './hudPanelLayout';
import {
  useSeatLabelAnchorPositions,
  useSeatLabelPositions,
} from '../hooks/useSeatLabelPositions';

interface SeatLabelsProps {
  players: Player[];
  dealerId: number;
  currentPlayer: number;
  lastPlayedBySeat: Record<number, Card | null>;
}

const AnchorRoot = styled.div<{ $x: number; $y: number; $editMode?: boolean }>`
  position: fixed;
  left: ${(p) => p.$x}px;
  top: ${(p) => p.$y}px;
  z-index: ${(p) => (p.$editMode ? 130 : 56)};
  pointer-events: ${(p) => (p.$editMode ? 'auto' : 'none')};
`;

const DragSurface = styled.div<{ $scale: number; $editMode: boolean }>`
  position: absolute;
  left: 0;
  top: 0;
  /* Sized to cover the full scaled label + played card */
  width: ${(p) => 196 * p.$scale}px;
  height: ${(p) => 148 * p.$scale}px;
  margin-left: ${(p) => -98 * p.$scale}px;
  margin-top: ${(p) => -148 * p.$scale}px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  pointer-events: auto;
  touch-action: none;
  user-select: none;
  cursor: ${(p) => (p.$editMode ? 'grab' : 'default')};
  box-sizing: border-box;

  ${(p) =>
    p.$editMode
      ? `
    outline: 1px dashed rgba(120, 200, 255, 0.45);
    outline-offset: 2px;
  `
      : ''}

  &:active {
    cursor: ${(p) => (p.$editMode ? 'grabbing' : 'default')};
  }
`;

const LabelShell = styled.div<{ $scale: number }>`
  transform: scale(${(p) => p.$scale});
  transform-origin: center bottom;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: max-content;
  pointer-events: none;

  img {
    user-select: none;
    -webkit-user-drag: none;
  }
`;

const PlayerDisplay = styled.div<{ $isHuman: boolean; $isActive: boolean; $compact: boolean }>`
  position: relative;
  background: ${(p) =>
    p.$isActive
      ? 'linear-gradient(165deg, #4a3500 0%, #5c4a00 45%, #3d2a00 100%)'
      : p.$isHuman
        ? 'linear-gradient(165deg, #3d5a73 0%, #3498db 50%, #2c3e50 100%)'
        : 'linear-gradient(165deg, #2a2a2a 0%, #111 55%, #000 100%)'};
  border: 2px solid ${(p) => (p.$isActive ? '#ffec8b' : p.$isHuman ? '#ffd700' : 'rgba(255,255,255,0.2)')};
  padding: 8px 12px;
  border-radius: 8px;
  color: white;
  text-align: center;
  min-width: 108px;
  box-shadow:
    ${(p) =>
      p.$isActive ? '0 0 16px rgba(255, 215, 0, 0.65),' : ''}
    0 6px 14px rgba(0, 0, 0, 0.45),
    0 1px 0 rgba(255, 255, 255, 0.08) inset;
`;

const PlayedCard = styled.div`
  margin-top: 6px;

  img {
    width: 52px;
    height: auto;
    border-radius: 4px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5);
    background: #fff;
    display: block;
  }
`;

const DealerBadge = styled.div`
  position: absolute;
  top: -8px;
  right: -8px;
  background: #ffd700;
  color: #1a1a1a;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 11px;
  border: 2px solid #fff;
`;

const ActiveDot = styled.div`
  position: absolute;
  top: -5px;
  left: -5px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #6f6;
  box-shadow: 0 0 8px #6f6;
`;

const Name = styled.div<{ $compact: boolean }>`
  font-weight: 600;
  font-size: ${(p) => (p.$compact ? '0.82rem' : '0.92rem')};
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: ${(p) => (p.$compact ? '120px' : '168px')};
`;

const Stats = styled.div`
  font-size: 0.78rem;
  opacity: 0.9;
  line-height: 1.3;
`;

const AnchorMarker = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  width: 10px;
  height: 10px;
  margin: -5px 0 0 -5px;
  border-radius: 50%;
  background: rgba(120, 200, 255, 0.85);
  border: 1px solid rgba(0, 0, 0, 0.65);
  box-shadow: 0 0 8px rgba(120, 200, 255, 0.55);
  pointer-events: none;
`;

const DragBounds = styled.div`
  position: absolute;
  left: ${-MAX_SEAT_LABEL_OFFSET_PX}px;
  top: ${-MAX_SEAT_LABEL_OFFSET_PX}px;
  width: ${MAX_SEAT_LABEL_OFFSET_PX * 2}px;
  height: ${MAX_SEAT_LABEL_OFFSET_PX * 2}px;
  border: 1px dashed rgba(120, 200, 255, 0.28);
  border-radius: 8px;
  pointer-events: none;
`;

const EditToolbar = styled.div`
  position: fixed;
  left: 50%;
  top: 108px;
  transform: translateX(-50%);
  z-index: 122;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 12px 16px;
  max-width: min(96vw, 720px);
  background: rgba(0, 0, 0, 0.82);
  color: #ffd700;
  border: 1px solid rgba(255, 215, 0, 0.35);
  border-radius: 999px;
  padding: 8px 16px;
  font-size: 0.82rem;
  pointer-events: auto;
`;

const ScaleControl = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #ddd;
  white-space: nowrap;

  input[type='range'] {
    width: 120px;
    accent-color: #ffd700;
  }
`;

type SeatLabelItemProps = {
  player: Player;
  isDealer: boolean;
  isHuman: boolean;
  isActiveTurn: boolean;
  compact: boolean;
  scale: number;
  lastPlayed: Card | null;
  anchorX: number;
  anchorY: number;
  offset: SeatLabelOffset;
  editMode: boolean;
  onOffsetChange: (seatIndex: number, offset: SeatLabelOffset) => void;
};

const SeatLabelItem: React.FC<SeatLabelItemProps> = ({
  player,
  isDealer,
  isHuman,
  isActiveTurn,
  compact,
  scale,
  lastPlayed,
  anchorX,
  anchorY,
  offset,
  editMode,
  onOffsetChange,
}) => {
  const { activeEffects } = useAchievements();
  const nodeRef = useRef<HTMLDivElement>(null);
  const [liveOffset, setLiveOffset] = useState(offset);

  useEffect(() => {
    setLiveOffset(offset);
  }, [offset.dx, offset.dy]);

  const labelBody = (
    <>
      <PlayerDisplay $isHuman={isHuman} $isActive={isActiveTurn} $compact={compact}>
        {isActiveTurn && <ActiveDot title="Active turn" />}
        {isDealer && <DealerBadge title="Dealer">D</DealerBadge>}
        <Name $compact={compact}>{displayPlayerName(player)}</Name>
        <Stats>
          {player.chips <= 0 ? 'OUT' : `${player.chips} chips`}
          {activeEffects.opponentCounts && !isHuman
            ? ` · ${player.cards.length} cards left`
            : ` · ${player.cards.length} cards`}
        </Stats>
      </PlayerDisplay>
      {lastPlayed && (
        <PlayedCard title={`Played ${lastPlayed.value} of ${lastPlayed.suit}`}>
          <img
            src={getCardFrontPath(lastPlayed.suit, lastPlayed.value as Rank)}
            alt={`${lastPlayed.value} of ${lastPlayed.suit}`}
          />
        </PlayedCard>
      )}
    </>
  );

  const label = (
    <DragSurface $scale={scale} $editMode={editMode}>
      <LabelShell $scale={scale}>{labelBody}</LabelShell>
    </DragSurface>
  );

  return (
    <AnchorRoot $x={anchorX} $y={anchorY} $editMode={editMode}>
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
            left: -MAX_SEAT_LABEL_OFFSET_PX,
            top: -MAX_SEAT_LABEL_OFFSET_PX,
            right: MAX_SEAT_LABEL_OFFSET_PX,
            bottom: MAX_SEAT_LABEL_OFFSET_PX,
          }}
          onDrag={(_, data) => setLiveOffset(clampSeatLabelOffset(data.x, data.y))}
          onStop={(_, data) =>
            onOffsetChange(player.id, clampSeatLabelOffset(data.x, data.y))
          }
        >
          <div ref={nodeRef}>{label}</div>
        </Draggable>
      ) : (
        <div style={{ transform: `translate(${offset.dx}px, ${offset.dy}px)` }}>{label}</div>
      )}
    </AnchorRoot>
  );
};

const SeatLabels: React.FC<SeatLabelsProps> = ({
  players,
  dealerId,
  currentPlayer,
  lastPlayedBySeat,
}) => {
  const {
    layoutEditMode,
    seatLabelScale,
    seatLabelOffsets,
    setSeatLabelScale,
    setSeatLabelOffset,
  } = useHudLayout();

  const visiblePlayers = players.filter((p) => {
    if (!p.isHuman) return true;
    const humanCount = players.filter((h) => h.isHuman).length;
    return humanCount > 1 && currentPlayer !== p.id;
  });

  const totalPlayers = players.length;
  const compact = totalPlayers >= 8;
  const anchorPositions = useSeatLabelAnchorPositions(true, totalPlayers);
  const screenPositions = useSeatLabelPositions(true, totalPlayers, seatLabelOffsets);
  const hasPositions = visiblePlayers.some((p) => screenPositions[p.id]);

  return createPortal(
    <>
      {layoutEditMode && hasPositions && (
        <EditToolbar>
          <span>Grab anywhere on an opponent label (dashed outline) and drag within the blue box</span>
          <ScaleControl>
            Opponent label size
            <input
              type="range"
              min={MIN_SEAT_LABEL_SCALE}
              max={MAX_SEAT_LABEL_SCALE}
              step={0.05}
              value={seatLabelScale}
              onChange={(e) => setSeatLabelScale(Number(e.target.value))}
              aria-label="Opponent label size"
            />
            {Math.round(seatLabelScale * 100)}%
          </ScaleControl>
        </EditToolbar>
      )}
      {visiblePlayers.map((player) => {
        const anchor = anchorPositions[player.id];
        const point = screenPositions[player.id];
        if (!anchor || !point) return null;

        return (
          <SeatLabelItem
            key={player.id}
            player={player}
            isDealer={player.id === dealerId}
            isHuman={player.isHuman}
            isActiveTurn={currentPlayer === player.id}
            compact={compact}
            scale={seatLabelScale}
            lastPlayed={lastPlayedBySeat[player.id] ?? null}
            anchorX={anchor.x}
            anchorY={anchor.y}
            offset={seatLabelOffsets[player.id] ?? { dx: 0, dy: 0 }}
            editMode={layoutEditMode}
            onOffsetChange={setSeatLabelOffset}
          />
        );
      })}
    </>,
    document.body
  );
};

export default SeatLabels;
