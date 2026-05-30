import React, { useState, useCallback, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { useGame } from '../context/GameContext';
import { validateMichiganPlay } from '../game/engine/michigan';
import { useAchievements } from '../context/AchievementContext';
import { SeatConfig, HouseRules } from '../types/GameTypes';
import TripoleyPot from './TripoleyPot';
import PotChipLabels from './PotChipLabels';
import PlayerHUD from './PlayerHUD';
import PlayerSelect from './PlayerSelect';
import GameControls from './GameControls';
import GameLog from './GameLog';
import GameOverModal from './GameOverModal';
import PhaseAnnouncementModal from './PhaseAnnouncementModal';
import AnimationLayer from './AnimationLayer';
import { PlayerActionTimerProvider } from '../hooks/usePlayerActionTimer';
import { useGameSounds } from '../hooks/useGameSounds';
import { useAITurn } from '../hooks/useAITurn';
import { useAchievementTracking } from '../hooks/useAchievementTracking';
import { potBoardToDisplaySections } from '../game/engine/reducer';
import PlayerPosition from './PlayerPosition';
import { TABLE_BOTTOM_INSET } from './hudLayout';
import { HudLayoutProvider, useHudLayout } from '../context/HudLayoutContext';
import { DEBUG, isDebugActive } from '../debugConfig';
import { rulesFromPreset, defaultHouseRules } from '../game/engine/houseRules';

import type { FeltColor } from '../game/achievements/types';

const TABLE_TILT = '56deg';
const MICHIGAN_PLAY_DRAG = 'application/x-tripoley-michigan-play';

const FELT_BACKGROUNDS: Record<FeltColor, string> = {
  classic: `
    radial-gradient(ellipse 70% 55% at 50% 42%, rgba(255, 255, 255, 0.07) 0%, transparent 55%),
    radial-gradient(ellipse 100% 100% at 50% 50%, #327a4a 0%, #2a653d 42%, #1e4a2c 100%)`,
  tabby: `
    radial-gradient(ellipse 70% 55% at 50% 42%, rgba(255, 255, 255, 0.08) 0%, transparent 55%),
    radial-gradient(ellipse 100% 100% at 50% 50%, #c4651a 0%, #a85212 42%, #7a3a0c 100%)`,
  royal: `
    radial-gradient(ellipse 70% 55% at 50% 42%, rgba(255, 255, 255, 0.08) 0%, transparent 55%),
    radial-gradient(ellipse 100% 100% at 50% 50%, #1a2848 0%, #121f38 42%, #0a1224 100%)`,
  vaporwave: `
    radial-gradient(ellipse 70% 55% at 50% 42%, rgba(255, 120, 220, 0.12) 0%, transparent 55%),
    radial-gradient(ellipse 100% 100% at 50% 50%, #5b2a7a 0%, #3d1a52 42%, #2a1038 100%)`,
};

const TABLE_BOTTOM = TABLE_BOTTOM_INSET;

const TableContainer = styled.div`
  --table-tilt: ${TABLE_TILT};
  --table-bottom: ${TABLE_BOTTOM};
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(ellipse 80% 50% at 50% 100%, rgba(0, 0, 0, 0.55) 0%, transparent 55%),
    radial-gradient(ellipse 120% 80% at 50% 40%, #1f3d28 0%, #0f1a12 55%, #080d09 100%);
`;

const TableScene = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: var(--table-bottom);
  display: flex;
  align-items: center;
  justify-content: center;
  transform-style: preserve-3d;
  perspective: 1200px;
  perspective-origin: 50% 38%;
  pointer-events: none;

  & > * {
    pointer-events: auto;
  }
`;

const TableShadow = styled.div`
  position: absolute;
  width: min(72vw, 920px);
  height: 140px;
  bottom: 14%;
  left: 50%;
  transform: translateX(-50%) translateZ(-120px) rotateX(90deg);
  background: radial-gradient(
    ellipse at center,
    rgba(0, 0, 0, 0.55) 0%,
    rgba(0, 0, 0, 0.2) 45%,
    transparent 72%
  );
  filter: blur(8px);
  opacity: 0.85;
`;

const TableStack = styled.div`
  position: relative;
  width: min(88vw, 980px);
  height: min(100%, 680px);
  max-height: min(72vh, 680px);
  transform: translateY(-2vh);
  transform-style: preserve-3d;
`;

const TableSurface = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  transform: rotateX(var(--table-tilt));
  transform-style: preserve-3d;
`;

/** Screen-space overlay aligned to the table stack — above the hand HUD (z-index 50). */
const SeatLabelOverlay = styled.div`
  position: fixed;
  left: 50%;
  top: calc(50% - 24px);
  width: min(88vw, 980px);
  height: min(calc(100vh - 96px), 680px);
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 55;
`;

const TableRail = styled.div`
  position: absolute;
  inset: -18px;
  border-radius: 50%;
  background: linear-gradient(165deg, #5c3d1e 0%, #3d2812 35%, #2a1a0c 70%, #1a1008 100%);
  box-shadow:
    0 28px 50px rgba(0, 0, 0, 0.65),
    inset 0 2px 4px rgba(255, 220, 160, 0.15),
    inset 0 -8px 16px rgba(0, 0, 0, 0.45);
  transform: translateZ(-14px);
`;

const TableFelt = styled.div<{ $felt: FeltColor; $playDropActive?: boolean }>`
  position: relative;
  width: 100%;
  height: 100%;
  background: ${(p) => FELT_BACKGROUNDS[p.$felt]};
  border-radius: 50%;
  box-shadow:
    inset 0 0 80px rgba(0, 0, 0, 0.35),
    inset 0 12px 24px rgba(255, 255, 255, 0.04),
    inset 0 -20px 40px rgba(0, 0, 0, 0.25);
  border: 3px solid
    ${(p) =>
      p.$playDropActive ? 'rgba(255, 215, 0, 0.95)' : 'rgba(90, 55, 25, 0.85)'};
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translateZ(0);
  backface-visibility: visible;
  overflow: visible;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  ${(p) =>
    p.$playDropActive
      ? `
    box-shadow:
      inset 0 0 80px rgba(255, 215, 0, 0.12),
      inset 0 12px 24px rgba(255, 255, 255, 0.06),
      inset 0 -20px 40px rgba(0, 0, 0, 0.25),
      0 0 28px rgba(255, 215, 0, 0.35);
  `
      : ''}
`;

const SetupOverlay = styled.div`
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 150;
  background: rgba(0, 0, 0, 0.45);
  pointer-events: auto;
`;

const GameTableContent: React.FC = () => {
  const { state, dispatch } = useGame();
  const { startGameAction, activeEffects } = useAchievements();
  const { layoutEditMode } = useHudLayout();
  useGameSounds();
  useAITurn();
  useAchievementTracking();
  const [playDropActive, setPlayDropActive] = useState(false);
  const debugAutoStarted = useRef(false);

  useEffect(() => {
    const resetPlayDrop = () => setPlayDropActive(false);
    window.addEventListener('dragend', resetPlayDrop);
    return () => window.removeEventListener('dragend', resetPlayDrop);
  }, []);

  const isGameStarted = state.players.length > 0;

  useEffect(() => {
    if (debugAutoStarted.current || isGameStarted) return;
    const auto = isDebugActive() ? DEBUG.autoStart : null;
    if (!auto?.enabled) return;

    debugAutoStarted.current = true;
    const seats: SeatConfig[] = Array.from({ length: auto.playerCount }, (_, i) => ({
      isHuman: auto.humanSeats.includes(i),
    }));
    const houseRules = auto.houseRulesPreset
      ? rulesFromPreset(auto.houseRulesPreset)
      : defaultHouseRules();
    dispatch(startGameAction(seats, houseRules));
  }, [dispatch, isGameStarted, startGameAction]);

  const handleTableDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!e.dataTransfer.types.includes(MICHIGAN_PLAY_DRAG)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setPlayDropActive(true);
    },
    []
  );

  const handleTableDragLeave = useCallback((e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setPlayDropActive(false);
  }, []);

  const handleTableDrop = useCallback(
    (e: React.DragEvent) => {
      setPlayDropActive(false);
      const cardId = e.dataTransfer.getData(MICHIGAN_PLAY_DRAG);
      if (!cardId || state.phase !== 'michigan') return;
      e.preventDefault();

      const player = state.players[state.currentPlayer];
      if (!player?.isHuman) return;

      const card = player.cards.find((c) => c.id === cardId);
      if (
        !card ||
        !validateMichiganPlay(
          player.cards,
          card,
          state.michigan,
          player.id,
          state.currentPlayer
        )
      ) {
        return;
      }

      dispatch({ type: 'MICHIGAN_PLAY', card });
    },
    [state, dispatch]
  );

  const handleStartGame = (seats: SeatConfig[], houseRules: HouseRules) => {
    dispatch(startGameAction(seats, houseRules));
  };

  const potSections = potBoardToDisplaySections(state.pot);
  return (
    <TableContainer>
      <GameControls />
      <GameLog />
      <GameOverModal />
      <PhaseAnnouncementModal />
      <AnimationLayer />

      <TableScene>
        <TableShadow aria-hidden />
        <TableStack>
          <TableSurface>
            <TableRail aria-hidden />
            <TableFelt
              data-anim-anchor="table-center"
              $felt={activeEffects.feltColor}
              $playDropActive={playDropActive}
              onDragOver={handleTableDragOver}
              onDragLeave={handleTableDragLeave}
              onDrop={handleTableDrop}
            >
              {isGameStarted && (
                <>
                  <TripoleyPot
                    sections={potSections as Parameters<typeof TripoleyPot>[0]['sections']}
                    showAnchorMarkers={layoutEditMode}
                  />
                  <PotChipLabels sections={potSections as Parameters<typeof PotChipLabels>[0]['sections']} />
                </>
              )}
            </TableFelt>
          </TableSurface>
        </TableStack>
      </TableScene>

      {isGameStarted && (
        <SeatLabelOverlay>
          {state.players
            .filter((p) => {
              if (!p.isHuman) return true;
              const humanCount = state.players.filter((h) => h.isHuman).length;
              return humanCount > 1 && state.currentPlayer !== p.id;
            })
            .map((player) => (
              <PlayerPosition
                key={player.id}
                player={player}
                isDealer={player.id === state.dealerId}
                isHuman={player.isHuman}
                isActiveTurn={state.currentPlayer === player.id}
                totalPlayers={state.players.length}
                lastPlayed={state.michiganShownPlays[player.id] ?? null}
              />
            ))}
        </SeatLabelOverlay>
      )}

      {!isGameStarted && (
        <SetupOverlay>
          <PlayerSelect onStart={handleStartGame} />
        </SetupOverlay>
      )}

      <PlayerHUD />
    </TableContainer>
  );
};

const GameTable: React.FC = () => (
  <PlayerActionTimerProvider>
    <HudLayoutProvider>
      <GameTableContent />
    </HudLayoutProvider>
  </PlayerActionTimerProvider>
);

export default GameTable;
