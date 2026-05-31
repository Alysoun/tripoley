import React, { useState } from 'react';
import styled from 'styled-components';
import { useGame } from '../context/GameContext';
import { PHASE_LABELS } from '../game/engine/constants';
import { displayPlayerName } from '../utils/playerName';
import { useGameEffects } from '../hooks/useGameEffects';
import { soundManager } from '../utils/SoundEffects';
import { useAchievements } from '../context/AchievementContext';
import AchievementsPanel from './AchievementsPanel';
import { useHudLayout } from '../context/HudLayoutContext';

const Panel = styled.div`
  position: fixed;
  top: 20px;
  left: 20px;
  right: 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  z-index: 100;
  pointer-events: none;

  & > * {
    pointer-events: auto;
  }
`;

const PhaseBadge = styled.div`
  background: rgba(0, 0, 0, 0.85);
  color: #ffd700;
  padding: 10px 16px;
  border-radius: 20px;
  border: 1px solid #ffd700;
  font-weight: 600;
`;

const TurnBadge = styled.div`
  background: rgba(0, 0, 0, 0.75);
  color: white;
  padding: 10px 16px;
  border-radius: 20px;
`;

const QuitBtn = styled.button`
  padding: 10px 16px;
  border-radius: 20px;
  border: 1px solid rgba(255, 120, 120, 0.55);
  background: rgba(80, 20, 20, 0.85);
  color: #ffb4b4;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: rgba(120, 30, 30, 0.95);
    color: #fff;
  }
`;

const RightCluster = styled.div`
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
`;

const SoundBtn = styled.button<{ $active?: boolean }>`
  padding: 10px 12px;
  border-radius: 20px;
  border: 1px solid
    ${(p) => (p.$active ? 'rgba(255, 215, 0, 0.65)' : 'rgba(255, 255, 255, 0.2)')};
  background: ${(p) => (p.$active ? 'rgba(40, 32, 0, 0.9)' : 'rgba(0, 0, 0, 0.75)')};
  color: ${(p) => (p.$active ? '#ffd700' : 'white')};
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;

  &:hover {
    background: ${(p) => (p.$active ? 'rgba(55, 44, 0, 0.95)' : 'rgba(0, 0, 0, 0.9)')};
  }
`;

const Modal = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.78);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2500;
  padding: 24px;
`;

const ModalBox = styled.div`
  background: #111;
  border: 2px solid rgba(255, 120, 120, 0.65);
  border-radius: 14px;
  padding: 28px 32px;
  color: white;
  max-width: 420px;
  text-align: center;
`;

const ModalActions = styled.div`
  display: flex;
  justify-content: center;
  gap: 10px;
  margin-top: 20px;
  flex-wrap: wrap;
`;

const ModalBtn = styled.button<{ $variant?: 'danger' | 'primary' }>`
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  background: ${(p) => (p.$variant === 'danger' ? '#a33' : '#444')};
  color: #fff;

  &:hover {
    opacity: 0.92;
  }
`;

const GameControls: React.FC = () => {
  const { state, dispatch } = useGame();
  const { unlockedCount, trackGameQuit } = useAchievements();
  const { toggleSound, isSoundEnabled } = useGameEffects();
  const { layoutEditMode, toggleLayoutEditMode, resetLayout } = useHudLayout();
  const [confirmQuit, setConfirmQuit] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const current = state.players[state.currentPlayer];
  const isMyTurn = current?.isHuman;
  const isDealer = current?.id === state.dealerId;

  if (state.phase === 'setup' || state.players.length === 0) return null;

  const handleQuit = () => {
    void soundManager.unlock().then(() => soundManager.play('buttonClick'));
    trackGameQuit(state);
    dispatch({ type: 'QUIT_GAME' });
    setConfirmQuit(false);
  };

  return (
    <>
      <Panel>
        <PhaseBadge>{PHASE_LABELS[state.phase] || state.phase}</PhaseBadge>
        {current && (
          <TurnBadge>
            {isMyTurn ? 'Your turn' : `${displayPlayerName(current!)}'s turn`}
            {isDealer ? ' · Dealer' : ''}
          </TurnBadge>
        )}
        <RightCluster>
          {state.isSoloSession && (
            <SoundBtn
              type="button"
              onClick={() => setShowAchievements(true)}
              title="Achievements & unlocks"
              aria-label="Achievements"
            >
              🏆 {unlockedCount}
            </SoundBtn>
          )}
          <SoundBtn
            type="button"
            $active={layoutEditMode}
            onClick={toggleLayoutEditMode}
            aria-label={layoutEditMode ? 'Done moving UI' : 'Move UI panels, pot labels, and opponent labels'}
            title={layoutEditMode ? 'Done moving UI' : 'Move UI panels, pot labels, and opponent labels'}
            aria-pressed={layoutEditMode}
          >
            ⠿
          </SoundBtn>
          {layoutEditMode && (
            <SoundBtn
              type="button"
              onClick={resetLayout}
              aria-label="Reset HUD layout, pot labels, and opponent labels"
              title="Reset HUD panel, pot label, and opponent label positions"
            >
              ⟲
            </SoundBtn>
          )}
          <SoundBtn
            type="button"
            onClick={toggleSound}
            aria-label={isSoundEnabled ? 'Mute sound' : 'Enable sound'}
            title={isSoundEnabled ? 'Mute sound' : 'Enable sound'}
          >
            {isSoundEnabled ? '🔊' : '🔇'}
          </SoundBtn>
          <QuitBtn type="button" onClick={() => setConfirmQuit(true)}>
            Leave Table
          </QuitBtn>
        </RightCluster>
      </Panel>

      {showAchievements && (
        <AchievementsPanel onClose={() => setShowAchievements(false)} />
      )}

      {confirmQuit && (
        <Modal role="dialog" aria-modal="true" aria-labelledby="quit-title">
          <ModalBox>
            <h3 id="quit-title" style={{ margin: '0 0 12px', color: '#ffb4b4' }}>
              Leave this game?
            </h3>
            <p style={{ margin: 0, lineHeight: 1.5, opacity: 0.9 }}>
              You&apos;ll return to the setup screen. Refreshing the page keeps your current table
              until you leave.
            </p>
            <ModalActions>
              <ModalBtn type="button" onClick={() => setConfirmQuit(false)}>
                Keep Playing
              </ModalBtn>
              <ModalBtn $variant="danger" type="button" onClick={handleQuit}>
                Leave Table
              </ModalBtn>
            </ModalActions>
          </ModalBox>
        </Modal>
      )}
    </>
  );
};

export default GameControls;
