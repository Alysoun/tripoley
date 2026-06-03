import React, { useEffect } from 'react';
import styled from 'styled-components';
import {
  activeHouseRulesSummary,
  phaseHint,
  phaseLabel,
  RULES_OVERVIEW,
  RULES_SECTIONS,
} from '../content/rulesContent';
import type { HouseRules } from '@playfield/core';
import type { GamePhase } from '../types/GameTypes';

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.78);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3050;
  padding: max(16px, env(safe-area-inset-top, 0px)) max(16px, env(safe-area-inset-right, 0px))
    max(16px, env(safe-area-inset-bottom, 0px)) max(16px, env(safe-area-inset-left, 0px));
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
`;

const Box = styled.div`
  background: #0f1a12;
  border: 2px solid #ffd700;
  border-radius: 14px;
  padding: 20px 24px;
  color: white;
  max-width: 520px;
  width: 100%;
  max-height: min(90dvh, calc(100dvh - 32px));
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.55);
  flex-shrink: 0;
  text-align: left;
`;

const Header = styled.div`
  flex-shrink: 0;
  margin-bottom: 12px;

  h2 {
    margin: 0 0 4px;
    color: #ffd700;
    font-size: 1.35rem;
    text-align: center;
  }

  p {
    margin: 0;
    font-size: 0.84rem;
    color: #aaa;
    text-align: center;
    line-height: 1.45;
  }
`;

const PausedBanner = styled.p`
  margin: 0 0 10px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(255, 215, 0, 0.14);
  border: 1px solid rgba(255, 215, 0, 0.35);
  color: #ffd700;
  font-size: 0.82rem;
  font-weight: 600;
  text-align: center;
  line-height: 1.4;
`;

const PhaseCallout = styled.div`
  flex-shrink: 0;
  margin-bottom: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255, 215, 0, 0.12);
  border: 1px solid rgba(255, 215, 0, 0.35);

  strong {
    display: block;
    color: #ffd700;
    font-size: 0.88rem;
    margin-bottom: 4px;
  }

  p {
    margin: 0;
    font-size: 0.86rem;
    line-height: 1.45;
    color: #eee;
  }
`;

const ScrollBody = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
  padding-right: 4px;
`;

const Section = styled.section`
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }

  h3 {
    margin: 0 0 8px;
    color: #ffd700;
    font-size: 0.95rem;
  }

  ul {
    margin: 0;
    padding-left: 1.1rem;
    line-height: 1.5;
    font-size: 0.88rem;
    color: #ddd;
  }

  li + li {
    margin-top: 6px;
  }
`;

const HouseRulesBlock = styled(Section)`
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);

  .preset-name {
    font-size: 0.82rem;
    color: #bbb;
    margin: 0 0 8px;
  }
`;

const Actions = styled.div`
  flex-shrink: 0;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  text-align: center;
`;

const CreditsNote = styled.p`
  margin: 10px 0 0;
  font-size: 0.78rem;
  line-height: 1.4;
  color: #9aa0a6;

  a {
    color: #c9d1d9;
    text-decoration: underline;
  }
`;

const CloseBtn = styled.button`
  padding: 12px 28px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 700;
  font-size: 1rem;
  background: #ffd700;
  color: #000;
  min-width: 120px;

  &:hover {
    opacity: 0.92;
  }
`;

type RulesModalProps = {
  onClose: () => void;
  houseRules?: HouseRules;
  phase?: GamePhase;
  /** Show solo pause notice and freeze AI/timers via SoloPauseUiContext. */
  gamePaused?: boolean;
};

const RulesModal: React.FC<RulesModalProps> = ({
  onClose,
  houseRules,
  phase,
  gamePaused = false,
}) => {
  const hint = phase && phase !== 'setup' ? phaseHint(phase) : null;
  const houseSummary = houseRules ? activeHouseRulesSummary(houseRules) : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <Overlay
      role="dialog"
      aria-modal="true"
      aria-labelledby="rules-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Box onClick={(e) => e.stopPropagation()}>
        <Header>
          <h2 id="rules-modal-title">How to Play</h2>
          <p>Pay Cards → Poker → Michigan Rummy</p>
          {gamePaused && (
            <PausedBanner role="status">Game paused — close to resume</PausedBanner>
          )}
        </Header>

        {hint && phase && (
          <PhaseCallout>
            <strong>Right now — {phaseLabel(phase)}</strong>
            <p>{hint}</p>
          </PhaseCallout>
        )}

        <ScrollBody>
          <Section>
            <h3>{RULES_OVERVIEW.title}</h3>
            <ul>
              {RULES_OVERVIEW.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </Section>

          {RULES_SECTIONS.map((section) => (
            <Section key={section.title}>
              <h3>{section.title}</h3>
              <ul>
                {section.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </Section>
          ))}

          {houseSummary && (
            <HouseRulesBlock>
              <h3>Active house rules</h3>
              <p className="preset-name">{houseSummary.heading}</p>
              <ul>
                {houseSummary.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </HouseRulesBlock>
          )}
        </ScrollBody>

        <Actions>
          <CloseBtn type="button" onClick={onClose}>
            Close
          </CloseBtn>
          <CreditsNote>
            Cat walk animation used by the “Kitty Whisperer” achievement is from FrolicForge:{' '}
            <a
              href="https://frolicforge.itch.io/cat-animation-high-res"
              target="_blank"
              rel="noreferrer"
            >
              frolicforge.itch.io/cat-animation-high-res
            </a>
          </CreditsNote>
        </Actions>
      </Box>
    </Overlay>
  );
};

export default RulesModal;
