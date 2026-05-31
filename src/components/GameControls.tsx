import React, { useState } from 'react';
import styled from 'styled-components';
import { useGame } from '../context/GameContext';
import { PHASE_LABELS } from '../game/engine/constants';
import { displayPlayerName } from '../utils/playerName';
import { useGameEffects } from '../hooks/useGameEffects';
import { useAchievements } from '../context/AchievementContext';
import AchievementsPanel from './AchievementsPanel';
import RulesModal from './RulesModal';
import { useHudLayout } from '../context/HudLayoutContext';
import LeaveTableButton from './LeaveTableButton';

const Panel = styled.div`
  position: fixed;
  top: max(12px, env(safe-area-inset-top, 0px));
  left: max(12px, env(safe-area-inset-left, 0px));
  right: max(132px, calc(env(safe-area-inset-right, 0px) + 120px));
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  z-index: 100;
  pointer-events: none;

  & > * {
    pointer-events: auto;
  }

  @media (max-width: 768px) {
    gap: 6px;
  }
`;

const PhaseBadge = styled.div`
  background: rgba(0, 0, 0, 0.85);
  color: #ffd700;
  padding: 10px 16px;
  border-radius: 20px;
  border: 1px solid #ffd700;
  font-weight: 600;

  @media (max-width: 480px) {
    padding: 8px 12px;
    font-size: 0.88rem;
  }
`;

const TurnBadge = styled.div`
  background: rgba(0, 0, 0, 0.75);
  color: white;
  padding: 10px 16px;
  border-radius: 20px;

  @media (max-width: 480px) {
    padding: 8px 12px;
    font-size: 0.88rem;
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

const GameControls: React.FC = () => {
  const { state } = useGame();
  const { unlockedCount } = useAchievements();
  const { toggleSound, isSoundEnabled } = useGameEffects();
  const { layoutEditMode, toggleLayoutEditMode, resetLayout } = useHudLayout();
  const [showAchievements, setShowAchievements] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const current = state.players[state.currentPlayer];
  const isMyTurn = current?.isHuman;
  const isDealer = current?.id === state.dealerId;

  if (state.phase === 'setup' || state.players.length === 0) return null;

  return (
    <>
      <LeaveTableButton />
      <Panel>
        <PhaseBadge>{PHASE_LABELS[state.phase] || state.phase}</PhaseBadge>
        {current && (
          <TurnBadge>
            {isMyTurn ? 'Your turn' : `${displayPlayerName(current!)}'s turn`}
            {isDealer ? ' · Dealer' : ''}
          </TurnBadge>
        )}
        <RightCluster>
          <SoundBtn
            type="button"
            onClick={() => setShowRules(true)}
            title="How to play"
            aria-label="How to play — rules"
          >
            ?
          </SoundBtn>
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
            aria-label={
              layoutEditMode
                ? 'Done moving UI — resume game'
                : state.isSoloSession
                  ? 'Pause and move UI panels, pot labels, and opponent labels'
                  : 'Move UI panels, pot labels, and opponent labels'
            }
            title={
              layoutEditMode
                ? 'Done moving UI'
                : state.isSoloSession
                  ? 'Pause game and move UI panels, pot labels, and opponent labels'
                  : 'Move UI panels, pot labels, and opponent labels'
            }
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
        </RightCluster>
      </Panel>

      {showAchievements && (
        <AchievementsPanel onClose={() => setShowAchievements(false)} />
      )}
      {showRules && (
        <RulesModal
          onClose={() => setShowRules(false)}
          houseRules={state.houseRules}
          phase={state.phase}
        />
      )}
    </>
  );
};

export default GameControls;
