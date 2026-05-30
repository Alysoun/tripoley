import React from 'react';
import styled from 'styled-components';
import { useGame } from '../context/GameContext';
import { soundManager } from '../utils/SoundEffects';

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.82);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3200;
  padding: 24px;
`;

const Box = styled.div`
  background: #111;
  border: 2px solid rgba(255, 120, 120, 0.65);
  border-radius: 14px;
  padding: 28px 32px;
  color: white;
  max-width: 460px;
  width: 100%;
  text-align: center;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.55);
`;

const Title = styled.h2`
  margin: 0 0 12px;
  color: #ffb4b4;
  font-size: 1.35rem;
`;

const Message = styled.p`
  margin: 0 0 24px;
  line-height: 1.55;
  opacity: 0.92;
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

const GameOverModal: React.FC = () => {
  const { state, dispatch } = useGame();

  if (state.phase !== 'gameOver') return null;

  const lastLine = [...state.log].reverse().find((entry) => entry.type === 'error');
  const message = lastLine?.message ?? 'Your run at the table has ended.';

  return (
    <Overlay role="dialog" aria-modal="true" aria-labelledby="game-over-title">
      <Box>
        <Title id="game-over-title">Game Over</Title>
        <Message>{message}</Message>
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
      </Box>
    </Overlay>
  );
};

export default GameOverModal;
