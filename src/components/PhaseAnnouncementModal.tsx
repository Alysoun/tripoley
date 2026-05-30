import React from 'react';
import styled from 'styled-components';
import { useGame } from '../context/GameContext';
import { soundManager } from '../utils/SoundEffects';
import TurnTimerDisplay from './TurnTimerDisplay';

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.78);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  padding: 24px;
`;

const Box = styled.div<{ $variant: 'success' | 'info' }>`
  background: #111;
  border: 2px solid ${(p) => (p.$variant === 'success' ? '#ffd700' : 'rgba(255, 255, 255, 0.35)')};
  border-radius: 14px;
  padding: 28px 32px;
  color: white;
  max-width: 480px;
  width: 100%;
  text-align: center;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.55);
`;

const Title = styled.h2`
  margin: 0 0 16px;
  color: #ffd700;
  font-size: 1.35rem;
`;

const LineList = styled.ul`
  list-style: none;
  margin: 0 0 24px;
  padding: 0;
  text-align: left;
  line-height: 1.55;
  font-size: 1rem;

  li {
    padding: 8px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);

    &:last-child {
      border-bottom: none;
    }
  }
`;

const ContinueBtn = styled.button`
  padding: 12px 28px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 700;
  font-size: 1rem;
  background: #ffd700;
  color: #000;

  &:hover {
    opacity: 0.92;
  }
`;

const PhaseAnnouncementModal: React.FC = () => {
  const { state, dispatch } = useGame();
  const announcement = state.announcement;

  if (state.phase !== 'announcement' || !announcement) return null;

  const continueLabel =
    state.announcementContinue === 'michigan'
      ? 'Continue to Michigan Rummy'
      : state.announcementContinue === 'poker'
        ? 'Continue to Poker'
        : state.announcementContinue === 'roundSummary'
          ? 'Continue to Round Summary'
          : 'Continue';

  return (
    <Overlay role="dialog" aria-modal="true" aria-labelledby="phase-announcement-title">
      <Box $variant={announcement.variant}>
        <Title id="phase-announcement-title">{announcement.title}</Title>
        <LineList>
          {announcement.lines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </LineList>
        <TurnTimerDisplay slot="modal" />
        <ContinueBtn
          type="button"
          onClick={() => {
            void soundManager.unlock().then(() => {
              soundManager.play('buttonClick');
              dispatch({ type: 'DISMISS_ANNOUNCEMENT' });
            });
          }}
        >
          {continueLabel}
        </ContinueBtn>
      </Box>
    </Overlay>
  );
};

export default PhaseAnnouncementModal;
