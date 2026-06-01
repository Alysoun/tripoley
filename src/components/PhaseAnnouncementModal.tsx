import React from 'react';
import styled from 'styled-components';
import { useGame } from '../context/GameContext';
import { useHudLayout } from '../context/HudLayoutContext';
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
  padding: max(16px, env(safe-area-inset-top, 0px)) max(16px, env(safe-area-inset-right, 0px))
    max(16px, env(safe-area-inset-bottom, 0px)) max(16px, env(safe-area-inset-left, 0px));
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
`;

const Box = styled.div<{ $variant: 'success' | 'info' }>`
  background: #111;
  border: 2px solid ${(p) => (p.$variant === 'success' ? '#ffd700' : 'rgba(255, 255, 255, 0.35)')};
  border-radius: 14px;
  padding: 20px 24px;
  color: white;
  max-width: 480px;
  width: 100%;
  max-height: min(90dvh, calc(100dvh - 32px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  text-align: center;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.55);
  flex-shrink: 0;
`;

const Title = styled.h2`
  margin: 0 0 12px;
  color: #ffd700;
  font-size: 1.35rem;
  flex-shrink: 0;
`;

const ScrollBody = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
  margin: 0 -4px;
  padding: 0 4px;
`;

const LineList = styled.ul`
  list-style: none;
  margin: 0;
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

const Actions = styled.div`
  flex-shrink: 0;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
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
  const { layoutOnboardingActive } = useHudLayout();
  const announcement = state.announcement;

  if (layoutOnboardingActive || state.phase !== 'announcement' || !announcement) return null;

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
        <ScrollBody>
          <LineList>
            {announcement.lines.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </LineList>
        </ScrollBody>
        <Actions>
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
        </Actions>
      </Box>
    </Overlay>
  );
};

export default PhaseAnnouncementModal;
