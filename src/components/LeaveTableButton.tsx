import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import styled from 'styled-components';
import { useGame } from '../context/GameContext';
import { useAchievements } from '../context/AchievementContext';
import { soundManager } from '../utils/SoundEffects';

const LEAVE_Z_INDEX = 99999;

const FixedLeaveBtn = styled.button`
  position: fixed;
  top: max(12px, env(safe-area-inset-top, 0px));
  right: max(12px, env(safe-area-inset-right, 0px));
  z-index: ${LEAVE_Z_INDEX};
  padding: 10px 16px;
  border-radius: 20px;
  border: 1px solid rgba(255, 120, 120, 0.75);
  background: rgba(80, 20, 20, 0.94);
  color: #ffb4b4;
  font-weight: 700;
  font-size: 0.88rem;
  cursor: pointer;
  min-height: 44px;
  min-width: 44px;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.55);
  pointer-events: auto;

  &:hover {
    background: rgba(120, 30, 30, 0.98);
    color: #fff;
  }
`;

const Modal = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.78);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: ${LEAVE_Z_INDEX - 1};
  padding: 24px;
  pointer-events: auto;
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
  min-height: 44px;
  background: ${(p) => (p.$variant === 'danger' ? '#a33' : '#444')};
  color: #fff;

  &:hover {
    opacity: 0.92;
  }
`;

/** Always-on-top exit control — never covered by layout mode, modals, or HUD. */
const LeaveTableButton: React.FC = () => {
  const { state, dispatch } = useGame();
  const { trackGameQuit } = useAchievements();
  const [confirmQuit, setConfirmQuit] = useState(false);

  if (state.phase === 'setup' || state.players.length === 0) return null;

  const handleQuit = () => {
    void soundManager.unlock().then(() => soundManager.play('buttonClick'));
    trackGameQuit(state);
    dispatch({ type: 'QUIT_GAME' });
    setConfirmQuit(false);
  };

  return createPortal(
    <>
      <FixedLeaveBtn type="button" onClick={() => setConfirmQuit(true)} aria-label="Leave table">
        Leave Table
      </FixedLeaveBtn>

      {confirmQuit && (
        <Modal role="dialog" aria-modal="true" aria-labelledby="leave-table-title">
          <ModalBox>
            <h3 id="leave-table-title" style={{ margin: '0 0 12px', color: '#ffb4b4' }}>
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
    </>,
    document.body
  );
};

export default LeaveTableButton;
