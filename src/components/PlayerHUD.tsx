import React, { useRef, useState, useMemo, useEffect } from 'react';
import styled from 'styled-components';
import { useGame } from '../context/GameContext';
import { useAchievements } from '../context/AchievementContext';
import { Card, Rank } from '../types/GameTypes';
import { getCardFrontPath, getCardBackPath } from '../utils/cardAssets';
import {
  getLegalMichiganPlays,
  describeMichiganTurn,
} from '@playfield/core';
import {
  arrangeForPokerDisplay,
  sortForMichiganHand,
  sortByRank,
  bumpRedSuitsForward,
  sameCardOrder,
} from '../game/handDisplay';
import Chip from './Chip';
import PlayerActionBar from './PlayerActionBar';
import TurnTimerDisplay from './TurnTimerDisplay';
import {
  displayPlayerName,
  sanitizePlayerName,
  saveStoredPlayerName,
} from '../utils/playerName';
import DraggableHudPanel from './DraggableHudPanel';
import HandFanScaler from './HandFanScaler';
import { fanContainerSize } from './hudPanelLayout';
import { useHudLayout } from '../context/HudLayoutContext';
import {
  cardFanTransform,
  computeCardStackZ,
} from '../utils/cardFanStack';
import { useCardFanStackEnforcer } from '../hooks/useCardFanStackEnforcer';

const MICHIGAN_PLAY_DRAG = 'application/x-tripoley-michigan-play';

const CompactHeader = styled.div`
  position: relative;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 6px 10px;
  margin-bottom: 4px;
  font-size: 0.82rem;
  overflow: visible;
`;

const CAT_WALK_DISPLAY_W = 80;
const CAT_WALK_DISPLAY_H = 44;

const CatTrack = styled.div`
  position: absolute;
  left: 0;
  right: 0;
  top: -${CAT_WALK_DISPLAY_H}px;
  height: ${CAT_WALK_DISPLAY_H}px;
  pointer-events: none;
  opacity: 0.95;
  filter: drop-shadow(0 2px 3px rgba(0, 0, 0, 0.55));
`;

const CatWalkerImg = styled.img`
  position: absolute;
  left: 0;
  top: 0;
  width: ${CAT_WALK_DISPLAY_W}px;
  height: ${CAT_WALK_DISPLAY_H}px;
  object-fit: contain;
  pointer-events: none;

  transform: translate3d(0, 0, 0) scaleX(1);
  will-change: left, transform;

  animation: catwalk-bounce 12s linear infinite;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    left: 6px;
  }
`;

const catwalkKeyframes = `
@keyframes catwalk-bounce {
  /* Use left so 100% refers to the CatTrack width (HUD bar). */
  0% { left: 0; transform: translate3d(0, 0, 0) scaleX(1); }
  49.999% { left: calc(100% - ${CAT_WALK_DISPLAY_W}px); transform: translate3d(0, 0, 0) scaleX(1); }
  50% { left: calc(100% - ${CAT_WALK_DISPLAY_W}px); transform: translate3d(0, 0, 0) scaleX(-1); }
  100% { left: 0; transform: translate3d(0, 0, 0) scaleX(-1); }
}
`;

const HeaderMain = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
  min-width: 0;
`;

const HeaderStats = styled.div`
  opacity: 0.85;
  white-space: nowrap;
`;

const FanContainer = styled.div<{ $count: number }>`
  position: relative;
  width: ${(p) => fanContainerSize(p.$count).width}px;
  height: ${(p) => fanContainerSize(p.$count).height}px;
  margin: 0 auto;
  flex-shrink: 0;
  overflow: visible;
  transform-style: preserve-3d;
  perspective: 900px;
`;

const HandRankLabel = styled.div`
  width: fit-content;
  margin: 0 auto 8px;
  padding: 5px 14px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.82);
  border: 1px solid rgba(255, 215, 0, 0.5);
  color: #ffd700;
  font-size: 0.86rem;
  font-weight: 600;
  text-align: center;
  white-space: nowrap;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.45);
`;

const CardFace = styled.div<{ $dimmed: boolean; $highlight: boolean; $pokerBest: boolean; $dragOver: boolean; $sequencePeek?: boolean }>`
  position: relative;
  background: #fff;
  border-radius: 6px;
  overflow: hidden;
  line-height: 0;
  isolation: isolate;
  backface-visibility: hidden;
  box-shadow: ${(p) =>
    p.$sequencePeek
      ? '0 0 14px rgba(255, 215, 0, 0.65), 0 6px 14px rgba(0, 0, 0, 0.55)'
      : '0 6px 14px rgba(0, 0, 0, 0.55)'};
  filter: ${(p) => (p.$dimmed ? 'brightness(0.72) saturate(0.85)' : 'none')};
  outline: ${(p) =>
    p.$highlight
      ? '3px solid #ffd700'
      : p.$pokerBest
        ? '3px solid #5dade2'
        : p.$sequencePeek
          ? '2px solid rgba(255, 215, 0, 0.55)'
          : 'none'};
  outline-offset: 1px;
  transform: ${(p) => (p.$dragOver ? 'scale(1.04)' : 'none')};
`;

const CardBtn = styled.button<{ $playable: boolean; $index: number; $total: number; $dragging: boolean; $fastFan?: boolean; $hovered?: boolean }>`
  position: absolute;
  left: 50%;
  bottom: 0;
  border: none;
  background: transparent;
  padding: 0;
  cursor: ${(p) => (p.$playable ? 'pointer' : 'grab')};
  transform-origin: center bottom;
  transform-style: preserve-3d;
  backface-visibility: hidden;
  transform: ${(p) => cardFanTransform(p.$index, p.$total, !!(p.$hovered && p.$playable))};
  transition: transform ${(p) => (p.$fastFan ? '0.1s' : '0.2s')} ease, opacity ${(p) => (p.$fastFan ? '0.1s' : '0.2s')} ease;
  opacity: ${(p) => (p.$dragging ? 0.85 : 1)};

  &:active {
    cursor: ${(p) => (p.$playable ? 'pointer' : 'grabbing')};
  }

  img {
    width: 76px;
    height: auto;
    display: block;
    background: #fff;
    pointer-events: none;
  }
`;

const MichiganHint = styled.div`
  margin-bottom: 6px;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.82);
  border: 1px solid rgba(255, 215, 0, 0.45);
  font-size: 0.86rem;
  text-align: center;
`;

const DeadHandBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(0, 0, 0, 0.55);
  border: 1px solid rgba(255, 215, 0, 0.35);
  border-radius: 8px;
  padding: 4px 8px;
  font-size: 0.78rem;

  img {
    width: 28px;
    display: block;
  }
`;

const ChipInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.08);
  padding: 6px 12px;
  border-radius: 8px;
`;

const NameRow = styled.div<{ $gilded?: boolean }>`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  ${(p) =>
    p.$gilded
      ? `
    padding: 4px 8px;
    border-radius: 8px;
    border: 1px solid rgba(255, 215, 0, 0.65);
    box-shadow: 0 0 12px rgba(255, 215, 0, 0.25);
  `
      : ''}
`;

const NameInput = styled.input`
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid rgba(255, 215, 0, 0.45);
  background: rgba(0, 0, 0, 0.55);
  color: white;
  font-size: 0.95rem;
  min-width: 120px;
  max-width: 180px;
`;

const NameBtn = styled.button`
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(255, 255, 255, 0.08);
  color: #eee;
  font-size: 0.78rem;
  cursor: pointer;

  &:hover {
    background: rgba(255, 255, 255, 0.14);
  }
`;

const PlayerHUD: React.FC = () => {
  const { state, dispatch } = useGame();
  const { activeEffects } = useAchievements();
  const { handScale, isEditingLayoutGroup, setHandScale, layoutOnboardingActive } = useHudLayout();
  const hudGroupActive = isEditingLayoutGroup('hud');
  const [viewSeat, setViewSeat] = useState<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropTarget, setDropTarget] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState('');
  const didReorder = useRef(false);
  const clickStart = useRef<{ x: number; y: number } | null>(null);
  const prevPhase = useRef(state.phase);
  const fanRef = useRef<HTMLDivElement>(null);

  const activePlayer =
    state.players.length > 0 ? state.players[state.currentPlayer] : undefined;
  const humanPlayer = state.players.find((p) => p.isHuman);
  const displayPlayer = (() => {
    if (viewSeat !== null) {
      const viewed = state.players[viewSeat];
      if (viewed?.isHuman) return viewed;
    }
    if (activePlayer?.isHuman) return activePlayer;
    return humanPlayer ?? activePlayer;
  })();

  const pokerDisplay = useMemo(
    () =>
      displayPlayer && state.phase === 'poker'
        ? arrangeForPokerDisplay(displayPlayer.cards)
        : null,
    [state.phase, displayPlayer]
  );

  const fanCards = useMemo(() => {
    if (!displayPlayer) return [];
    if (state.phase === 'poker' && pokerDisplay) {
      const cards = pokerDisplay.cards;
      return activeEffects.redScan ? bumpRedSuitsForward(cards) : cards;
    }
    return displayPlayer.cards;
  }, [state.phase, displayPlayer, pokerDisplay, activeEffects.redScan]);

  useEffect(() => {
    if (
      displayPlayer &&
      state.phase === 'michigan' &&
      prevPhase.current !== 'michigan' &&
      displayPlayer.isHuman
    ) {
      const sorted = activeEffects.sortByRank
        ? sortByRank(displayPlayer.cards)
        : sortForMichiganHand(displayPlayer.cards);
      if (!sameCardOrder(sorted, displayPlayer.cards)) {
        dispatch({ type: 'REORDER_CARDS', playerId: displayPlayer.id, cards: sorted });
      }
    }
    prevPhase.current = state.phase;
  }, [state.phase, displayPlayer, dispatch, activeEffects.sortByRank]);

  const suitCounts = useMemo(() => {
    if (!displayPlayer || !activeEffects.suitPeekCues || state.phase !== 'michigan') {
      return null;
    }
    const counts: Record<string, number> = {};
    for (const c of displayPlayer.cards) {
      counts[c.suit] = (counts[c.suit] ?? 0) + 1;
    }
    return counts;
  }, [displayPlayer, activeEffects.suitPeekCues, state.phase]);

  const fanStackRevision = `${fanCards.map((c) => c.id).join(',')}|${dragIndex ?? 'n'}|${hoverIndex ?? 'n'}|${handScale}`;
  useCardFanStackEnforcer(fanRef, fanStackRevision);

  const fanSize = fanContainerSize(fanCards.length);
  const showPokerHandLabel = state.phase === 'poker' && !!pokerDisplay?.label;
  const handPanelHeight = fanSize.height + (showPokerHandLabel ? 38 : 0);

  const catWalkFrames = useMemo(
    () =>
      Array.from(
        { length: 12 },
        (_, i) =>
          `${import.meta.env.BASE_URL}assets/animation/cat_walk_512x512_12frames_spritesheet_v2_${i + 1}.png`
      ),
    []
  );
  const [catFrameIdx, setCatFrameIdx] = useState(0);
  useEffect(() => {
    if (!activeEffects.catWalk || !displayPlayer?.isHuman) return;
    const prefersReduced =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setCatFrameIdx(0);
      return;
    }
    const id = window.setInterval(() => {
      setCatFrameIdx((i) => (i + 1) % catWalkFrames.length);
    }, 75);
    return () => window.clearInterval(id);
  }, [activeEffects.catWalk, displayPlayer?.isHuman, catWalkFrames.length]);

  if (state.players.length === 0 || state.phase === 'setup' || !displayPlayer) return null;

  const isTheirTurn =
    state.currentPlayer === displayPlayer.id && displayPlayer.isHuman;
  const canPlayMichigan =
    state.phase === 'michigan' && isTheirTurn && displayPlayer.isHuman;

  const legalPlays =
    canPlayMichigan
      ? getLegalMichiganPlays(
          displayPlayer.cards,
          state.michigan,
          displayPlayer.id,
          state.currentPlayer
        )
      : [];

  const isPlayable = (card: Card) =>
    legalPlays.some((c) => c.id === card.id);

  const handlePlay = (card: Card) => {
    if (!isPlayable(card)) return;
    dispatch({ type: 'MICHIGAN_PLAY', card });
  };

  const tryPlayFromClick = (card: Card, clientX: number, clientY: number) => {
    if (didReorder.current) {
      didReorder.current = false;
      return;
    }
    if (clickStart.current) {
      const dx = clientX - clickStart.current.x;
      const dy = clientY - clickStart.current.y;
      if (Math.hypot(dx, dy) > 10) return;
    }
    handlePlay(card);
  };

  const reorderCards = (from: number, to: number) => {
    if (from === to) return;
    const cards = [...fanCards];
    const [moved] = cards.splice(from, 1);
    cards.splice(to, 0, moved);
    dispatch({ type: 'REORDER_CARDS', playerId: displayPlayer.id, cards });
  };

  const michiganHint =
    state.phase === 'michigan' && isTheirTurn
      ? describeMichiganTurn(
          state.michigan,
          displayPlayer.cards,
          displayPlayer.id,
          state.currentPlayer
        )
      : null;

  const lastLeadSuit =
    state.michiganPlayArea.length > 0
      ? state.michiganPlayArea[state.michiganPlayArea.length - 1].suit
      : null;

  const humanSeats = state.players.filter((p) => p.isHuman);
  const showDeadHand = state.deadHand.length > 0;
  const canRename =
    displayPlayer.isHuman && humanPlayer && displayPlayer.id === humanPlayer.id;

  const commitName = () => {
    const name = sanitizePlayerName(draftName);
    dispatch({ type: 'CHANGE_PLAYER_NAME', name, playerId: displayPlayer.id });
    saveStoredPlayerName(name);
    setEditingName(false);
  };

  return (
    <>
      <DraggableHudPanel id="info" title="Your seat">
        <CompactHeader>
          {activeEffects.catWalk && displayPlayer.isHuman && (
            <>
              <style>{catwalkKeyframes}</style>
              <CatTrack aria-hidden>
                <CatWalkerImg
                  src={catWalkFrames[catFrameIdx]}
                  alt=""
                  draggable={false}
                />
              </CatTrack>
            </>
          )}
          <HeaderMain>
            <NameRow $gilded={activeEffects.gildedBorders && displayPlayer.isHuman}>
              {editingName && canRename ? (
                <>
                  <NameInput
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitName();
                      if (e.key === 'Escape') setEditingName(false);
                    }}
                    maxLength={24}
                    autoFocus
                    aria-label="Your name"
                  />
                  <NameBtn type="button" onClick={commitName}>
                    Save
                  </NameBtn>
                  <NameBtn type="button" onClick={() => setEditingName(false)}>
                    Cancel
                  </NameBtn>
                </>
              ) : (
                <>
                  <strong>{displayPlayerName(displayPlayer)}</strong>
                  {canRename && (
                    <NameBtn
                      type="button"
                      onClick={() => {
                        setDraftName(displayPlayer.name);
                        setEditingName(true);
                      }}
                    >
                      Rename
                    </NameBtn>
                  )}
                </>
              )}
            </NameRow>
            <HeaderStats>
              {displayPlayer.id === state.dealerId && 'Dealer · '}
              {isTheirTurn && 'Your turn · '}
              {displayPlayer.cards.length} cards ·{' '}
              {displayPlayer.chips <= 0 ? 'OUT' : `${displayPlayer.chips} chips`}
              {state.phase === 'poker' && pokerDisplay?.label && (
                <> · {pokerDisplay.label}</>
              )}
            </HeaderStats>
          </HeaderMain>
          <HeaderMain>
            {showDeadHand && (
              <DeadHandBadge data-anim-anchor="dead-hand">
                <img src={getCardBackPath('red')} alt="" />
                <span>
                  Dead {state.deadHand.length}
                  {activeEffects.ghostCounter ? ` · ghost ${state.deadHand.length}` : ''}
                </span>
              </DeadHandBadge>
            )}
            <ChipInfo>
              <Chip value={25} size="small" sparkle={activeEffects.neonTracers} />
              <span>{displayPlayer.chips <= 0 ? 'OUT' : displayPlayer.chips}</span>
            </ChipInfo>
          </HeaderMain>
        </CompactHeader>

        {humanSeats.length > 1 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
            {humanSeats.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setViewSeat(p.id)}
                style={{
                  padding: '3px 8px',
                  borderRadius: 6,
                  border: 'none',
                  background: p.id === displayPlayer.id ? '#ffd700' : '#444',
                  color: p.id === displayPlayer.id ? '#000' : '#fff',
                  cursor: 'pointer',
                  fontSize: '0.78rem',
                }}
              >
                {displayPlayerName(p)}
              </button>
            ))}
          </div>
        )}
      </DraggableHudPanel>

      {displayPlayer.isHuman && (
        <DraggableHudPanel
          id="hand"
          title={
            hudGroupActive
              ? `Your hand · ${Math.round(handScale * 100)}%`
              : 'Your hand'
          }
          variant="minimal"
        >
          <HandFanScaler
            scale={handScale}
            baseWidth={fanSize.width}
            baseHeight={handPanelHeight}
            editMode={hudGroupActive}
            onScaleChange={setHandScale}
          >
            {showPokerHandLabel && (
              <HandRankLabel>{pokerDisplay!.label}</HandRankLabel>
            )}
            <FanContainer ref={fanRef} $count={fanCards.length} data-anim-anchor="human-hand">
            {fanCards.map((card, index) => {
              const playable = isPlayable(card);
              const dragging = dragIndex === index;
              const hovered = hoverIndex === index;
              const stackZ = computeCardStackZ({
                index,
                total: fanCards.length,
                dragging,
                playable,
                hovered,
              });

              return (
              <CardBtn
                key={card.id}
                $playable={playable}
                $index={index}
                $total={fanCards.length}
                $dragging={dragging}
                $hovered={hovered}
                $fastFan={activeEffects.instantFan}
                style={{ zIndex: stackZ }}
                data-fan-index={index}
                data-fan-dragging={dragging ? '1' : '0'}
                data-fan-playable={playable ? '1' : '0'}
                data-fan-hovered={hovered ? '1' : '0'}
                draggable={!hudGroupActive}
                onMouseEnter={() => !hudGroupActive && setHoverIndex(index)}
                onMouseLeave={() => !hudGroupActive && setHoverIndex((prev) => (prev === index ? null : prev))}
                onPointerDown={(e) => {
                  if (hudGroupActive) return;
                  clickStart.current = { x: e.clientX, y: e.clientY };
                }}
                onDragStart={(e) => {
                  if (hudGroupActive) {
                    e.preventDefault();
                    return;
                  }
                  didReorder.current = false;
                  setDragIndex(index);
                  if (canPlayMichigan && isPlayable(card)) {
                    e.dataTransfer.setData(MICHIGAN_PLAY_DRAG, card.id);
                  }
                  e.dataTransfer.setData('text/plain', card.id);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onDragEnd={() => {
                  setDragIndex(null);
                  setDropTarget(null);
                  clickStart.current = null;
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDropTarget(index);
                }}
                onDragLeave={() => {
                  if (dropTarget === index) setDropTarget(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragIndex !== null && dragIndex !== index) {
                    didReorder.current = true;
                    reorderCards(dragIndex, index);
                  }
                  setDragIndex(null);
                  setDropTarget(null);
                }}
                onClick={(e) => tryPlayFromClick(card, e.clientX, e.clientY)}
                type="button"
              >
                <CardFace
                  $dimmed={canPlayMichigan && !playable}
                  $highlight={canPlayMichigan && playable}
                  $pokerBest={
                    state.phase === 'poker' &&
                    (pokerDisplay?.bestFiveIds.has(card.id) ?? false)
                  }
                  $dragOver={dropTarget === index && dragIndex !== index}
                  $sequencePeek={
                    !!activeEffects.faintTrace &&
                    !!lastLeadSuit &&
                    card.suit === lastLeadSuit &&
                    !playable
                  }
                >
                  <img
                    src={getCardFrontPath(card.suit, card.value as Rank)}
                    alt={`${card.value} of ${card.suit}`}
                  />
                </CardFace>
              </CardBtn>
              );
            })}
            </FanContainer>
          </HandFanScaler>
        </DraggableHudPanel>
      )}

      {!displayPlayer.isHuman && isTheirTurn && (
        <DraggableHudPanel id="hand" title="Hand" variant="minimal">
          <div style={{ textAlign: 'center', opacity: 0.8, padding: '8px 16px' }}>
            AI is thinking…
          </div>
        </DraggableHudPanel>
      )}

      {displayPlayer.isHuman && (
        <DraggableHudPanel id="actions" title="Actions">
          {michiganHint && (
            <MichiganHint>
              <strong>Michigan:</strong> {michiganHint}
              {suitCounts && (
                <div style={{ marginTop: 4, fontSize: '0.76rem', opacity: 0.85 }}>
                  Suit peek:{' '}
                  {Object.entries(suitCounts)
                    .map(([suit, n]) => `${suit} ×${n}`)
                    .join(' · ')}
                </div>
              )}
              <TurnTimerDisplay slot="michigan" />
            </MichiganHint>
          )}
          <TurnTimerDisplay slot="general" />
          {!layoutOnboardingActive && <PlayerActionBar />}
        </DraggableHudPanel>
      )}
    </>
  );
};

export default PlayerHUD;
