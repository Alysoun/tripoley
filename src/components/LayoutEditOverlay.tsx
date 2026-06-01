import React from 'react';
import styled from 'styled-components';
import { useGame } from '../context/GameContext';
import { useHudLayout } from '../context/HudLayoutContext';
import {
  LAYOUT_EDIT_GROUP_HINTS,
  LAYOUT_EDIT_GROUP_LABELS,
  LAYOUT_EDIT_GROUP_ORDER,
  MAX_GAME_LOG_WIDTH,
  MAX_HAND_SCALE,
  MAX_SEAT_LABEL_SCALE,
  MIN_GAME_LOG_WIDTH,
  MIN_HAND_SCALE,
  MIN_SEAT_LABEL_SCALE,
  maxGameLogHeight,
  maxGameLogWidth,
  minGameLogHeight,
} from './hudPanelLayout';

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
  width: min(620px, calc(100vw - 24px));
  pointer-events: auto;
  padding: 12px 16px 14px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.92);
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
`;

const GroupRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin: 10px 0 8px;
`;

const GroupBtn = styled.button<{ $active?: boolean }>`
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid ${(p) => (p.$active ? '#ffd700' : 'rgba(255, 255, 255, 0.25)')};
  background: ${(p) => (p.$active ? 'rgba(255, 215, 0, 0.18)' : 'rgba(255, 255, 255, 0.06)')};
  color: ${(p) => (p.$active ? '#ffd700' : '#ddd')};
  font-size: 0.82rem;
  font-weight: ${(p) => (p.$active ? 700 : 500)};
  cursor: pointer;
  min-height: 40px;
`;

const Hint = styled.p`
  margin: 0;
  color: #bbb;
  font-size: 0.8rem;
`;

const ScaleControl = styled.label`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px 12px;
  margin-top: 10px;
  color: #ffd700;
  font-size: 0.8rem;

  input[type='range'] {
    width: min(180px, 40vw);
  }
`;

const LayoutEditOverlay: React.FC = () => {
  const { state } = useGame();
  const {
    layoutEditMode,
    layoutOnboardingActive,
    layoutEditGroup,
    setLayoutEditGroup,
    seatLabelScale,
    setSeatLabelScale,
    handScale,
    setHandScale,
    gameLogLayout,
    setGameLogLayout,
  } = useHudLayout();

  const showOverlay =
    layoutEditMode && (layoutOnboardingActive || !!state.isSoloSession);

  if (!showOverlay) return null;

  return (
    <>
      <Backdrop aria-hidden />
      <Banner role="status" aria-live="polite">
        {layoutOnboardingActive ? (
          <>
            <strong>Welcome — fit the table to your screen</strong>
            Panels often sit wrong on first load. Drag the gold handles, use the tabs below,
            then tap ⠿ (top right) when it looks right. The game is paused until then.
          </>
        ) : (
          <>
            <strong>Layout mode — game paused</strong>
            Choose one group to adjust at a time. Tap ⠿ when finished.
          </>
        )}
        <GroupRow role="tablist" aria-label="Layout groups">
          {LAYOUT_EDIT_GROUP_ORDER.map((group) => (
            <GroupBtn
              key={group}
              type="button"
              role="tab"
              aria-selected={layoutEditGroup === group}
              $active={layoutEditGroup === group}
              onClick={() => setLayoutEditGroup(group)}
            >
              {LAYOUT_EDIT_GROUP_LABELS[group]}
            </GroupBtn>
          ))}
        </GroupRow>
        <Hint>{LAYOUT_EDIT_GROUP_HINTS[layoutEditGroup]}</Hint>
        {layoutEditGroup === 'hud' && (
          <ScaleControl>
            Hand size
            <input
              type="range"
              min={MIN_HAND_SCALE}
              max={MAX_HAND_SCALE}
              step={0.05}
              value={handScale}
              onChange={(e) => setHandScale(Number(e.target.value))}
              aria-label="Hand size"
            />
            {Math.round(handScale * 100)}%
          </ScaleControl>
        )}
        {layoutEditGroup === 'opponents' && (
          <ScaleControl>
            Opponent label size
            <input
              type="range"
              min={MIN_SEAT_LABEL_SCALE}
              max={MAX_SEAT_LABEL_SCALE}
              step={0.05}
              value={seatLabelScale}
              onChange={(e) => setSeatLabelScale(Number(e.target.value))}
              aria-label="Opponent label size"
            />
            {Math.round(seatLabelScale * 100)}%
          </ScaleControl>
        )}
        {layoutEditGroup === 'log' && (
          <>
            <ScaleControl>
              Log width
              <input
                type="range"
                min={MIN_GAME_LOG_WIDTH}
                max={maxGameLogWidth(true)}
                step={4}
                value={gameLogLayout.width}
                onChange={(e) => setGameLogLayout({ width: Number(e.target.value) })}
                aria-label="Game log width"
              />
              {gameLogLayout.width}px
            </ScaleControl>
            <ScaleControl>
              Log height
              <input
                type="range"
                min={minGameLogHeight(true, false)}
                max={maxGameLogHeight(true)}
                step={4}
                value={gameLogLayout.height}
                onChange={(e) => setGameLogLayout({ height: Number(e.target.value) })}
                aria-label="Game log height"
              />
              {gameLogLayout.height}px
            </ScaleControl>
          </>
        )}
      </Banner>
    </>
  );
};

export default LayoutEditOverlay;
