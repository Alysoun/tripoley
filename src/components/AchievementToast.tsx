import React from 'react';
import styled, { keyframes } from 'styled-components';
import { useAchievements } from '../context/AchievementContext';

const slideIn = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to { opacity: 1; transform: translateY(0); }
`;

const Toast = styled.div`
  position: fixed;
  bottom: 28px;
  right: 28px;
  z-index: 5000;
  min-width: 280px;
  max-width: 360px;
  padding: 16px 18px;
  border-radius: 12px;
  background: linear-gradient(135deg, #1a3d28, #0f1a12);
  border: 2px solid #ffd700;
  color: white;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45);
  animation: ${slideIn} 0.35s ease-out;
`;

const Label = styled.div`
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #ffd700;
  margin-bottom: 6px;
`;

const Title = styled.div`
  font-weight: 700;
  font-size: 1.05rem;
`;

const Perk = styled.div`
  margin-top: 6px;
  font-size: 0.85rem;
  color: #8fd4a0;
`;

const AchievementToast: React.FC = () => {
  const { pendingUnlocks, dismissUnlock } = useAchievements();
  const current = pendingUnlocks[0];
  if (!current) return null;

  return (
    <Toast role="status" aria-live="polite">
      <Label>Achievement unlocked</Label>
      <Title>{current.title}</Title>
      <Perk>Unlock: {current.perkLabel}</Perk>
      <button
        type="button"
        onClick={dismissUnlock}
        style={{
          marginTop: 12,
          padding: '6px 12px',
          border: 'none',
          borderRadius: 6,
          background: '#ffd700',
          color: '#000',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Nice!
      </button>
    </Toast>
  );
};

export default AchievementToast;
