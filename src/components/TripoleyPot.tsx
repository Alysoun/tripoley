import React from 'react';
import styled from 'styled-components';
import { PotSection, SectionLabel } from '../types/GameTypes';
import { LABEL_TO_POT_SECTION } from '../game/engine/animations';
import { POT_DISPLAY_SIZE, potSectionAnchorPercent } from './potLabelLayout';
import { publicAsset } from '../utils/publicAsset';

interface TripoleyPotProps {
  sections: PotSection[];
  onSectionClick?: (section: PotSection) => void;
  showAnchorMarkers?: boolean;
}

const PotContainer = styled.div`
  position: relative;
  width: ${POT_DISPLAY_SIZE};
  height: ${POT_DISPLAY_SIZE};
  flex-shrink: 0;
  margin: 0 auto;
  transform: translateZ(1px);
  transform-style: preserve-3d;
`;

const PotImage = styled.img`
  width: 100%;
  height: 100%;
  position: absolute;
  inset: 0;
  z-index: 1;
  object-fit: contain;
  pointer-events: none;
`;

const PotSectionEl = styled.div<{ $left: number; $top: number }>`
  position: absolute;
  left: ${(p) => p.$left}%;
  top: ${(p) => p.$top}%;
  width: 0;
  height: 0;
  transform-style: preserve-3d;
  z-index: 2;
`;

const PotAnchor = styled.div<{ $visible?: boolean }>`
  position: absolute;
  left: 0;
  top: 0;
  width: ${(p) => (p.$visible ? '8px' : '1px')};
  height: ${(p) => (p.$visible ? '8px' : '1px')};
  margin: ${(p) => (p.$visible ? '-4px 0 0 -4px' : '0')};
  transform: translateZ(6px);
  opacity: ${(p) => (p.$visible ? 0.75 : 0)};
  pointer-events: none;
  border-radius: 50%;
  background: ${(p) => (p.$visible ? 'rgba(255, 215, 0, 0.9)' : 'transparent')};
  border: ${(p) => (p.$visible ? '1px solid rgba(0, 0, 0, 0.55)' : 'none')};
  box-shadow: ${(p) => (p.$visible ? '0 0 6px rgba(255, 215, 0, 0.65)' : 'none')};
`;

const TripoleyPot: React.FC<TripoleyPotProps> = ({
  sections,
  onSectionClick,
  showAnchorMarkers = false,
}) => {
  const chipByLabel = new Map(sections.map((s) => [s.label, s.chips]));

  return (
    <PotContainer>
      <PotImage src={publicAsset('assets/pot/Pot3.png')} alt="Pot board" />
      {sections.map(({ label }) => {
        const anchor = potSectionAnchorPercent(label as SectionLabel);
        const chips = chipByLabel.get(label) ?? 0;
        const potKey = LABEL_TO_POT_SECTION[label as SectionLabel];

        return (
          <PotSectionEl key={label} $left={anchor.left} $top={anchor.top}>
            <PotAnchor
              $visible={showAnchorMarkers}
              data-pot-anchor={`pot-${potKey}`}
              data-anim-anchor={`pot-${potKey}`}
              data-pot-section={label}
              onClick={() =>
                onSectionClick?.({ label, chips, position: label, cards: [] })
              }
            />
          </PotSectionEl>
        );
      })}
    </PotContainer>
  );
};

export default TripoleyPot;
