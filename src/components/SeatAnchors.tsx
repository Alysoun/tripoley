import React from 'react';
import styled from 'styled-components';
import { getSeatAnchorPercent } from './seatLayout';

const SeatAnchorEl = styled.div<{ $left: number; $top: number }>`
  position: absolute;
  left: ${(p) => p.$left}%;
  top: ${(p) => p.$top}%;
  width: 0;
  height: 0;
  transform-style: preserve-3d;
  z-index: 2;
  pointer-events: none;
`;

const SeatAnchor = styled.div<{ $visible?: boolean }>`
  position: absolute;
  left: 0;
  top: 0;
  width: ${(p) => (p.$visible ? '8px' : '1px')};
  height: ${(p) => (p.$visible ? '8px' : '1px')};
  margin: ${(p) => (p.$visible ? '-4px 0 0 -4px' : '0')};
  transform: translateZ(6px);
  opacity: ${(p) => (p.$visible ? 0.75 : 0)};
  border-radius: 50%;
  background: ${(p) => (p.$visible ? 'rgba(120, 200, 255, 0.9)' : 'transparent')};
  border: ${(p) => (p.$visible ? '1px solid rgba(0, 0, 0, 0.55)' : 'none')};
  box-shadow: ${(p) => (p.$visible ? '0 0 6px rgba(120, 200, 255, 0.65)' : 'none')};
`;

interface SeatAnchorsProps {
  totalPlayers: number;
  showAnchorMarkers?: boolean;
}

const SeatAnchors: React.FC<SeatAnchorsProps> = ({ totalPlayers, showAnchorMarkers = false }) => (
  <>
    {Array.from({ length: totalPlayers }, (_, seatIndex) => {
      const anchor = getSeatAnchorPercent(seatIndex, totalPlayers);
      return (
        <SeatAnchorEl key={seatIndex} $left={anchor.left} $top={anchor.top}>
          <SeatAnchor
            $visible={showAnchorMarkers}
            data-seat-anchor={`seat-${seatIndex}`}
            data-anim-anchor={`player-${seatIndex}`}
          />
        </SeatAnchorEl>
      );
    })}
  </>
);

export default SeatAnchors;
