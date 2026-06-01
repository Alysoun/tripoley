import React from 'react';
import styled from 'styled-components';
import { useGame } from '../context/GameContext';
import { downloadSessionLog } from '../game/sessionLogExport';
import { hasExportableSessionLog } from '../game/engine/gameLog';
import { soundManager } from '../utils/SoundEffects';

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.82);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3200;
  padding: max(16px, env(safe-area-inset-top, 0px)) max(16px, env(safe-area-inset-right, 0px))
    max(16px, env(safe-area-inset-bottom, 0px)) max(16px, env(safe-area-inset-left, 0px));
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
`;

const Box = styled.div`
  background: #111;
  border: 2px solid rgba(255, 120, 120, 0.65);
  border-radius: 14px;
  padding: 20px 24px;
  color: white;
  max-width: 460px;
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
  color: #ffb4b4;
  font-size: 1.35rem;
`;

const Message = styled.p`
  margin: 0;
  line-height: 1.55;
  opacity: 0.92;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
`;

const Actions = styled.div`
  flex-shrink: 0;
  margin-top: 20px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const Btn = styled.button`
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

const SecondaryBtn = styled(Btn)`
  background: transparent;
  color: #ffd700;
  border: 1px solid rgba(255, 215, 0, 0.45);
`;

const GameOverModal: React.FC = () => {
  const { state, dispatch } = useGame();

  if (state.phase !== 'gameOver') return null;

  const lastLine = [...state.log].reverse().find((entry) => entry.type === 'error');
  const message = lastLine?.message ?? 'Your run at the table has ended.';
  const canExportLog = hasExportableSessionLog(state);

  return (
    <Overlay role="dialog" aria-modal="true" aria-labelledby="game-over-title">
      <Box>
        <Title id="game-over-title">Game Over</Title>
        <Message>{message}</Message>
        <Actions>
          {canExportLog && (
            <SecondaryBtn
              type="button"
              onClick={() => {
                void soundManager.unlock().then(() => {
                  soundManager.play('buttonClick');
                  downloadSessionLog(state);
                });
              }}
            >
              Save session log
            </SecondaryBtn>
          )}
          <Btn
            type="button"
            onClick={() => {
              void soundManager.unlock().then(() => {
                soundManager.play('buttonClick');
                dispatch({ type: 'QUIT_GAME' });
              });
            }}
          >
            New Game
          </Btn>
        </Actions>
      </Box>
    </Overlay>
  );
};

export default GameOverModal;
