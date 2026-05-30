import React from 'react';
import styled from 'styled-components';
import { Card, Player, Rank } from '../types/GameTypes';
import { getCardFrontPath } from '../utils/cardAssets';
import { displayPlayerName } from '../utils/playerName';
import { useAchievements } from '../context/AchievementContext';
import { getSeatCoordinates, seatLabelTransform } from './seatLayout';

interface PlayerPositionProps {
  player: Player;
  isDealer: boolean;
  isHuman: boolean;
  isActiveTurn: boolean;
  totalPlayers: number;
  lastPlayed: Card | null;
}

const PlayerContainer = styled.div<{ $left: string; $top: string }>`
  position: absolute;
  left: ${(p) => p.$left};
  top: ${(p) => p.$top};
  transform: ${seatLabelTransform};
  z-index: 1;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const PlayerDisplay = styled.div<{ $isHuman: boolean; $isActive: boolean; $compact: boolean }>`
  position: relative;
  background: ${(p) =>
    p.$isActive
      ? 'linear-gradient(165deg, #4a3500 0%, #5c4a00 45%, #3d2a00 100%)'
      : p.$isHuman
        ? 'linear-gradient(165deg, #3d5a73 0%, #3498db 50%, #2c3e50 100%)'
        : 'linear-gradient(165deg, #2a2a2a 0%, #111 55%, #000 100%)'};
  border: 2px solid ${(p) => (p.$isActive ? '#ffec8b' : p.$isHuman ? '#ffd700' : 'rgba(255,255,255,0.2)')};
  padding: ${(p) => (p.$compact ? '6px 8px' : '8px 12px')};
  border-radius: 8px;
  color: white;
  text-align: center;
  min-width: ${(p) => (p.$compact ? '82px' : '100px')};
  box-shadow:
    ${(p) =>
      p.$isActive ? '0 0 16px rgba(255, 215, 0, 0.65),' : ''}
    0 6px 14px rgba(0, 0, 0, 0.45),
    0 1px 0 rgba(255, 255, 255, 0.08) inset;
`;

const PlayedCard = styled.div<{ $compact: boolean }>`
  margin-top: ${(p) => (p.$compact ? '4px' : '6px')};

  img {
    width: ${(p) => (p.$compact ? '32px' : '40px')};
    height: auto;
    border-radius: 4px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.5);
    background: #fff;
    display: block;
  }
`;

const DealerBadge = styled.div`
  position: absolute;
  top: -8px;
  right: -8px;
  background: #ffd700;
  color: #1a1a1a;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 11px;
  border: 2px solid #fff;
`;

const ActiveDot = styled.div`
  position: absolute;
  top: -5px;
  left: -5px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #6f6;
  box-shadow: 0 0 8px #6f6;
`;

const Name = styled.div<{ $compact: boolean }>`
  font-weight: 600;
  font-size: ${(p) => (p.$compact ? '0.78rem' : '0.88rem')};
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: ${(p) => (p.$compact ? '96px' : '130px')};
`;

const Stats = styled.div`
  font-size: 0.75rem;
  opacity: 0.9;
  line-height: 1.3;
`;

const PlayerPosition: React.FC<PlayerPositionProps> = ({
  player,
  isDealer,
  isHuman,
  isActiveTurn,
  totalPlayers,
  lastPlayed,
}) => {
  const { activeEffects } = useAchievements();
  const coords = getSeatCoordinates(player.id, totalPlayers);
  const compact = totalPlayers >= 8;

  return (
    <PlayerContainer
      $left={coords.left}
      $top={coords.top}
      data-anim-anchor={`player-${player.id}`}
    >
      <PlayerDisplay $isHuman={isHuman} $isActive={isActiveTurn} $compact={compact}>
        {isActiveTurn && <ActiveDot title="Active turn" />}
        {isDealer && <DealerBadge title="Dealer">D</DealerBadge>}
        <Name $compact={compact}>{displayPlayerName(player)}</Name>
        <Stats>
          {player.chips <= 0 ? 'OUT' : `${player.chips} chips`}
          {activeEffects.opponentCounts && !isHuman
            ? ` · ${player.cards.length} cards left`
            : ` · ${player.cards.length} cards`}
        </Stats>
      </PlayerDisplay>
      {lastPlayed && (
        <PlayedCard $compact={compact} title={`Played ${lastPlayed.value} of ${lastPlayed.suit}`}>
          <img
            src={getCardFrontPath(lastPlayed.suit, lastPlayed.value as Rank)}
            alt={`${lastPlayed.value} of ${lastPlayed.suit}`}
          />
        </PlayedCard>
      )}
    </PlayerContainer>
  );
};

export default PlayerPosition;
