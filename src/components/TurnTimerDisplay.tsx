import React from 'react';
import styled from 'styled-components';
import { useGame } from '../context/GameContext';
import { usePlayerActionTimer } from '../hooks/usePlayerActionTimer';

const TimerTrack = styled.div`
  margin-top: 8px;
  height: 5px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.12);
  overflow: hidden;
`;

const TimerFill = styled.div<{ $progress: number }>`
  height: 100%;
  width: ${(p) => Math.round(p.$progress * 100)}%;
  background: ${(p) => (p.$progress < 0.25 ? '#e74c3c' : '#ffd700')};
  transition: width 0.2s linear;
`;

const TimerCaption = styled.div`
  font-size: 0.78rem;
  opacity: 0.9;
  margin-top: 4px;
`;

interface TurnTimerDisplayProps {
  /** `michigan` = inside Michigan hint. `general` = above action buttons. `modal` = phase popup. */
  slot: 'michigan' | 'general' | 'modal';
}

const TurnTimerDisplay: React.FC<TurnTimerDisplayProps> = ({ slot }) => {
  const { state } = useGame();
  const { active, remainingMs, progress, hint, isSequenceTimer } = usePlayerActionTimer();

  if (!active || remainingMs === null || progress === null || !hint) return null;
  if (slot === 'michigan' && !isSequenceTimer) return null;
  if (slot === 'general' && (isSequenceTimer || state.phase === 'announcement')) return null;
  if (slot === 'modal' && state.phase !== 'announcement') return null;

  const seconds = Math.ceil(remainingMs / 1000);

  return (
    <div role="timer" aria-live="polite" style={{ maxWidth: 560, margin: '0 auto' }}>
      <TimerTrack>
        <TimerFill $progress={progress} />
      </TimerTrack>
      <TimerCaption>
        {seconds}s — {hint}
      </TimerCaption>
    </div>
  );
};

export default TurnTimerDisplay;
