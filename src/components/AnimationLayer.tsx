import React, { useLayoutEffect, useEffect, useMemo, useState } from 'react';
import { motion, type Transition } from 'framer-motion';
import styled from 'styled-components';
import { useGame } from '../context/GameContext';
import { useAchievements } from '../context/AchievementContext';
import { AnimationType, Rank } from '../types/GameTypes';
import { getCardFrontPath, getCardBackPath } from '../utils/cardAssets';
import { anchorCenter, potSectionFromAnchor } from '../utils/animationAnchors';
import { pulsePotSection } from '../game/engine/animations';
import { soundManager } from '../utils/SoundEffects';
import { debugSkipAnimations } from '../debugConfig';

const Layer = styled.div`
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 48;
  overflow: hidden;

  & > * {
    pointer-events: none;
  }
`;

const ChipToken = styled(motion.div)<{ $sparkle?: boolean; $firework?: boolean }>`
  position: fixed;
  pointer-events: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: radial-gradient(
    circle at 35% 35%,
    ${(p) => (p.$firework ? '#fff8e7' : '#fff6b3')},
    ${(p) => (p.$firework ? '#ff9f43 40%, #ff6b6b 70%, #c9a000' : '#ffd700 45%, #c9a000')}
  );
  border: 1px solid rgba(255, 255, 255, 0.55);
  box-shadow: ${(p) =>
    p.$firework
      ? '0 0 14px rgba(255, 159, 67, 0.95), 0 0 22px rgba(255, 107, 107, 0.55), 0 2px 6px rgba(0, 0, 0, 0.45)'
      : p.$sparkle
        ? '0 0 10px rgba(255, 215, 0, 0.85), 0 2px 6px rgba(0, 0, 0, 0.45)'
        : '0 2px 6px rgba(0, 0, 0, 0.45)'};
`;

const FlyingCard = styled(motion.img)`
  position: fixed;
  pointer-events: none;
  width: 58px;
  height: auto;
  border-radius: 5px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.55);
  background: #fff;
`;

const DealCard = styled(motion.img)`
  position: fixed;
  pointer-events: none;
  width: 44px;
  height: auto;
  border-radius: 4px;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.5);
`;

interface ResolvedAnim {
  fx: number;
  fy: number;
  tx: number;
  ty: number;
  cx: number;
  cy: number;
}

function resolveEndpoints(anim: AnimationType): ResolvedAnim | null {
  const from = anchorCenter(anim.from);
  const to = anchorCenter(anim.to);
  if (!from || !to) return null;
  const cx = (from.x + to.x) / 2;
  const cy = Math.min(from.y, to.y) - Math.min(120, Math.abs(from.y - to.y) * 0.35 + 40);
  return { fx: from.x, fy: from.y, tx: to.x, ty: to.y, cx, cy };
}

function arcTween(durationMs: number, delaySec: number): Transition {
  return {
    duration: durationMs / 1000,
    delay: delaySec,
    ease: [0.22, 0.85, 0.32, 1],
    times: [0, 0.48, 1],
  };
}

function arcSpring(durationMs: number, delaySec: number): Transition {
  return {
    type: 'spring',
    stiffness: 260,
    damping: 26,
    mass: 0.72,
    delay: delaySec,
    duration: durationMs / 1000,
  };
}

interface AnimItemProps {
  anim: AnimationType;
  onDone: () => void;
  neonTracers?: boolean;
  potFirework?: boolean;
}

const AnimItem: React.FC<AnimItemProps> = ({
  anim,
  onDone,
  neonTracers = false,
  potFirework = false,
}) => {
  const [resolved, setResolved] = useState<ResolvedAnim | null>(null);
  const baseDelay = (anim.delayIndex ?? 0) * 0.11;
  const sparkler = potFirework && anim.kind === 'potSweep';
  const tokenCount =
    anim.count ??
    (anim.kind === 'potSweep' ? (sparkler ? 10 : 6) : anim.kind === 'cardDeal' ? 3 : 3);
  const cardRot = useMemo(() => (anim.id.charCodeAt(anim.id.length - 1) % 15) - 7, [anim.id]);

  useLayoutEffect(() => {
    const tryResolve = () => resolveEndpoints(anim);
    let r = tryResolve();
    if (!r) {
      const retry = requestAnimationFrame(() => {
        r = tryResolve();
        if (r) setResolved(r);
        else onDone();
      });
      return () => cancelAnimationFrame(retry);
    }
    setResolved(r);

    if (anim.kind === 'cardDeal' && (anim.delayIndex ?? 0) === 0) {
      soundManager.play('shuffle');
    }

    const fallbackMs =
      anim.duration + baseDelay * 1000 + tokenCount * 55 + (anim.kind === 'potSweep' ? 120 : 0) + 250;
    const fallback = window.setTimeout(onDone, fallbackMs);
    return () => window.clearTimeout(fallback);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anim.id]);

  const handleImpact = () => {
    if (anim.kind === 'chipTravel' || anim.kind === 'potSweep') {
      soundManager.play('chipMove');
      const section = potSectionFromAnchor(anim.to);
      if (section) pulsePotSection(section);
    }
    if (anim.kind === 'cardPlay') soundManager.play('cardPlay');
    if (anim.kind === 'cardDeal') soundManager.play('cardDraw');
  };

  if (!resolved) return null;

  const { fx, fy, tx, ty, cx, cy } = resolved;
  const useSpring = anim.kind === 'chipTravel' || anim.kind === 'potSweep' || anim.kind === 'cardDeal';

  if (anim.kind === 'cardPlay' && anim.card) {
    return (
      <FlyingCard
        src={getCardFrontPath(anim.card.suit, anim.card.value as Rank)}
        alt=""
        style={{ left: fx, top: fy, x: '-50%', y: '-50%' }}
        initial={{ opacity: 0.2, scale: 0.75, rotate: cardRot - 8 }}
        animate={{
          x: ['-50%', '-50%', '-50%'],
          y: ['-50%', '-50%', '-50%'],
          left: [fx, fx, tx],
          top: [fy, fy, ty],
          opacity: 1,
          scale: [0.75, 1.04, 1],
          rotate: [cardRot - 8, 2, cardRot],
        }}
        transition={{
          duration: anim.duration / 1000,
          ease: [0.22, 0.9, 0.28, 1],
        }}
        onAnimationComplete={() => {
          handleImpact();
          onDone();
        }}
      />
    );
  }

  if (anim.kind === 'cardDeal') {
    return (
      <>
        {Array.from({ length: tokenCount }).map((_, i) => {
          const spread = (i - (tokenCount - 1) / 2) * 6;
          const startX = fx + spread;
          const endX = tx + spread * 0.2;
          const delay = baseDelay + i * 0.07;
          const isLast = i === tokenCount - 1;
          return (
            <DealCard
              key={i}
              src={getCardBackPath('red')}
              alt=""
              style={{ left: startX, top: fy, x: '-50%', y: '-50%' }}
              initial={{ opacity: 0, scale: 0.5, rotate: -14 + spread * 0.4 }}
              animate={{
                left: [startX, cx + spread * 0.35, endX],
                top: [fy, cy, ty],
                opacity: [0, 1, 1],
                scale: [0.5, 1.05, 0.94],
                rotate: [-14 + spread, 6, 0],
              }}
              transition={useSpring ? arcSpring(anim.duration, delay) : arcTween(anim.duration, delay)}
              onAnimationComplete={() => {
                if (i === 0 || isLast) handleImpact();
                if (isLast) onDone();
              }}
            />
          );
        })}
      </>
    );
  }

  return (
    <>
      {Array.from({ length: tokenCount }).map((_, i) => {
        const spread = (i - (tokenCount - 1) / 2) * 8;
        const startX = fx + spread;
        const endX = tx + spread * 0.25;
        const delay = baseDelay + i * 0.045;
        const isLast = i === tokenCount - 1;
        return (
          <ChipToken
            key={i}
            $sparkle={neonTracers && !sparkler}
            $firework={sparkler}
            style={{ left: startX, top: fy, x: '-50%', y: '-50%' }}
            initial={{ opacity: 0, scale: 0.45 }}
            animate={{
              left: [startX, cx + spread * 0.45, endX],
              top: [fy, cy, ty],
              opacity: [0, 1, 0.95],
              scale: [0.45, 1.1, 0.92],
            }}
            transition={
              useSpring ? arcSpring(anim.duration, delay) : arcTween(anim.duration, delay)
            }
            onAnimationComplete={() => {
              if (isLast) {
                handleImpact();
                onDone();
              }
            }}
          />
        );
      })}
    </>
  );
};

const AnimationLayer: React.FC = () => {
  const { state, dispatch } = useGame();
  const { activeEffects } = useAchievements();
  const skipAnimations = debugSkipAnimations(state);

  useEffect(() => {
    if (!skipAnimations) return;
    for (const anim of state.animations) {
      dispatch({ type: 'REMOVE_ANIMATION', id: anim.id });
    }
  }, [skipAnimations, state.animations, dispatch]);

  if (skipAnimations) return null;

  return (
    <Layer aria-hidden>
      {state.animations.map((anim) => (
        <AnimItem
          key={anim.id}
          anim={anim}
          neonTracers={activeEffects.neonTracers}
          potFirework={activeEffects.potFirework}
          onDone={() => dispatch({ type: 'REMOVE_ANIMATION', id: anim.id })}
        />
      ))}
    </Layer>
  );
};

export default AnimationLayer;
