import React from 'react';
import styled from 'styled-components';
import { useGame } from '../context/GameContext';
import { useHudLayout } from '../context/HudLayoutContext';

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  z-index: 124;
  pointer-events: none;
  background: rgba(0, 16, 32, 0.32);
`;

const Banner = styled.div`
  position: fixed;
  top: max(52px, calc(env(safe-area-inset-top, 0px) + 44px));
  left: 50%;
  transform: translateX(-50%);
  z-index: 127;
  width: min(560px, calc(100vw - 24px));
  pointer-events: none;
  padding: 12px 16px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.88);
  border: 1px solid rgba(255, 215, 0, 0.45);
  color: #eee;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.45);
  text-align: center;
  line-height: 1.45;
  font-size: 0.86rem;

  strong {
    display: block;
    color: #ffd700;
    font-size: 0.98rem;
    margin-bottom: 4px;
  }

  ul {
    list-style: none;
    margin: 8px 0 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 6px 10px;
    color: #ccc;
    font-size: 0.8rem;
  }

  li {
    padding: 4px 10px;
    border-radius: 999px;
    background: rgba(255, 215, 0, 0.1);
    border: 1px dashed rgba(255, 215, 0, 0.35);
  }
`;

const LayoutEditOverlay: React.FC = () => {
  const { state } = useGame();
  const { layoutEditMode } = useHudLayout();

  if (!layoutEditMode || !state.isSoloSession) return null;

  return (
    <>
      <Backdrop aria-hidden />
      <Banner role="status" aria-live="polite">
        <strong>Layout mode — game paused</strong>
        Drag any highlighted item. Tap ⠿ again when finished.
        <ul>
          <li>Your seat</li>
          <li>Your hand</li>
          <li>Actions</li>
          <li>Game log</li>
          <li>Opponent labels</li>
          <li>Pot labels</li>
        </ul>
      </Banner>
    </>
  );
};

export default LayoutEditOverlay;
