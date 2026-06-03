import React, { useState, useCallback, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { useGame } from '../context/GameContext';
import { validateMichiganPlay } from '@playfield/core';
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
import { useSpectatorAutoPlay } from '../hooks/useSpectatorAutoPlay';
import { useAchievementTracking } from '../hooks/useAchievementTracking';
import { potBoardToDisplaySections } from '@playfield/core';
import SeatAnchors from './SeatAnchors';
import SeatLabels from './SeatLabels';
import { TABLE_BOTTOM_INSET, TABLE_BOTTOM_INSET_PHONE, TABLE_BOTTOM_INSET_TABLET } from './hudLayout';
import LayoutEditOverlay from './LayoutEditOverlay';
import { HudLayoutProvider, useHudLayout } from '../context/HudLayoutContext';
import { SoloPauseUiProvider } from '../context/SoloPauseUiContext';
import { DEBUG, isDebugActive } from '../debugConfig';
import { rulesFromPreset, defaultHouseRules } from '@playfield/core';
import { syncPlayfieldFromDebug } from '../playfieldClient';

import type { FeltColor } from '../game/achievements/types';

/** 3D tilt — tuned so circular felt matches top-down Pot3.png after rotateX. */
const TABLE_TILT = '64deg';
const TABLE_PERSPECTIVE = '1400px';
const TABLE_PERSPECTIVE_ORIGIN = '50% 40%';
/** Square table diameter — circle on the felt before perspective. */
const TABLE_SIZE = 'min(96vmin, calc(100dvh - 140px), 960px)';
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
  width: 100dvw;
  height: 100vh;
  height: 100dvh;
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(ellipse 80% 50% at 50% 100%, rgba(0, 0, 0, 0.55) 0%, transparent 55%),
    radial-gradient(ellipse 120% 80% at 50% 40%, #1f3d28 0%, #0f1a12 55%, #080d09 100%);

  @media (max-width: 768px) {
    --table-bottom: ${TABLE_BOTTOM_INSET_TABLET};
  }

  @media (max-width: 480px) {
    --table-bottom: ${TABLE_BOTTOM_INSET_PHONE};
  }
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
  perspective: ${TABLE_PERSPECTIVE};
  perspective-origin: ${TABLE_PERSPECTIVE_ORIGIN};
  pointer-events: none;

  & > * {
    pointer-events: auto;
  }
`;

const TableShadow = styled.div`
  position: absolute;
  width: ${TABLE_SIZE};
  height: 72px;
  bottom: 12%;
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
  width: ${TABLE_SIZE};
  aspect-ratio: 1;
  transform: translateY(-1vh);
  transform-style: preserve-3d;

  @media (max-width: 768px) {
    transform: translateY(-2vh);
  }

  @media (max-width: 480px) {
    transform: translateY(0);
  }
`;

const TableSurface = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  transform: rotateX(var(--table-tilt));
  transform-style: preserve-3d;
`;

const TableRail = styled.div`
  position: absolute;
  inset: -3.6%;
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
  transform-style: preserve-3d;
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
  const { isEditingLayoutGroup, beginLayoutOnboardingIfNeeded } = useHudLayout();
  useGameSounds();
  useAITurn();
  useSpectatorAutoPlay();
  useAchievementTracking();
  const [playDropActive, setPlayDropActive] = useState(false);
  const debugAutoStarted = useRef(false);

  useEffect(() => {
    const resetPlayDrop = () => setPlayDropActive(false);
    window.addEventListener('dragend', resetPlayDrop);
    return () => window.removeEventListener('dragend', resetPlayDrop);
  }, []);

  const isGameStarted = state.players.length > 0;
  const hasHuman = state.players.some((p) => p.isHuman);

  useEffect(() => {
    if (!isGameStarted || !hasHuman || state.phase === 'setup' || state.phase === 'gameOver') {
      return;
    }
    beginLayoutOnboardingIfNeeded();
  }, [isGameStarted, hasHuman, state.phase, beginLayoutOnboardingIfNeeded]);

  useEffect(() => {
    if (debugAutoStarted.current || isGameStarted) return;
    const auto = isDebugActive() ? DEBUG.autoStart : null;
    if (!auto?.enabled) return;

    debugAutoStarted.current = true;
    syncPlayfieldFromDebug();
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
    syncPlayfieldFromDebug();
    dispatch(startGameAction(seats, houseRules));
  };

  const potSections = potBoardToDisplaySections(state.pot);
  return (
    <TableContainer>
      <GameControls />
      <GameLog />
      <LayoutEditOverlay />
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
                  <SeatAnchors
                    totalPlayers={state.players.length}
                    showAnchorMarkers={isEditingLayoutGroup('opponents')}
                  />
                  <TripoleyPot
                    sections={potSections as Parameters<typeof TripoleyPot>[0]['sections']}
                    showAnchorMarkers={isEditingLayoutGroup('pot')}
                  />
                  <PotChipLabels sections={potSections as Parameters<typeof PotChipLabels>[0]['sections']} />
                </>
              )}
            </TableFelt>
          </TableSurface>
        </TableStack>
      </TableScene>

      {isGameStarted && (
        <SeatLabels
          players={state.players}
          dealerId={state.dealerId}
          currentPlayer={state.currentPlayer}
          lastPlayedBySeat={state.michiganShownPlays}
        />
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
  <HudLayoutProvider>
    <SoloPauseUiProvider>
      <PlayerActionTimerProvider>
        <GameTableContent />
      </PlayerActionTimerProvider>
    </SoloPauseUiProvider>
  </HudLayoutProvider>
);

export default GameTable;
