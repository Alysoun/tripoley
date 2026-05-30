import React, { useState } from 'react';
import styled from 'styled-components';
import { useAchievements } from '../context/AchievementContext';
import { ACHIEVEMENT_DEFINITIONS } from '../game/achievements/definitions';
import { preferenceKeyForUnlock } from '../game/achievements/effects';
import type { AchievementCategory, AchievementId, FeltColor } from '../game/achievements/types';

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.78);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  padding: 24px;
`;

const Box = styled.div`
  background: #0f1a12;
  border: 2px solid #ffd700;
  border-radius: 14px;
  padding: 24px 28px;
  color: white;
  max-width: 560px;
  width: 100%;
  max-height: min(88vh, 720px);
  overflow-y: auto;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.55);
`;

const Header = styled.div`
  margin-bottom: 16px;

  h2 {
    margin: 0 0 6px;
    color: #ffd700;
  }

  p {
    margin: 0;
    font-size: 0.88rem;
    color: #aaa;
    line-height: 1.45;
  }
`;

const FeltSection = styled.div`
  margin-bottom: 18px;
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 215, 0, 0.2);

  h3 {
    margin: 0 0 10px;
    font-size: 0.92rem;
    color: #ffd700;
  }
`;

const FeltRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const FeltBtn = styled.button<{ $active: boolean; $swatch: string }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid ${(p) => (p.$active ? '#ffd700' : 'rgba(255, 255, 255, 0.2)')};
  background: ${(p) => (p.$active ? 'rgba(255, 215, 0, 0.15)' : 'rgba(0, 0, 0, 0.35)')};
  color: white;
  cursor: pointer;
  font-size: 0.82rem;

  &::before {
    content: '';
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: ${(p) => p.$swatch};
    border: 1px solid rgba(255, 255, 255, 0.25);
  }
`;

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const Item = styled.li<{ $unlocked: boolean }>`
  padding: 12px 14px;
  border-radius: 10px;
  background: ${(p) =>
    p.$unlocked ? 'rgba(26, 92, 58, 0.35)' : 'rgba(255, 255, 255, 0.04)'};
  border: 1px solid
    ${(p) => (p.$unlocked ? 'rgba(255, 215, 0, 0.35)' : 'rgba(255, 255, 255, 0.08)')};
  opacity: ${(p) => (p.$unlocked ? 1 : 0.72)};
`;

const ItemTitle = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;

  strong {
    color: #ffd700;
    font-size: 0.95rem;
  }
`;

const Category = styled.span`
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #8fd4a0;
  white-space: nowrap;
`;

const Desc = styled.p`
  margin: 6px 0 0;
  font-size: 0.84rem;
  color: #ccc;
  line-height: 1.4;
`;

const Perk = styled.p`
  margin: 6px 0 0;
  font-size: 0.8rem;
  color: #8fd4a0;
`;

const ProgressBar = styled.div`
  margin-top: 8px;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;

  div {
    height: 100%;
    background: #ffd700;
    border-radius: 2px;
  }
`;

const PrefToggle = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  font-size: 0.82rem;
  cursor: pointer;
  color: #eee;

  input {
    accent-color: #ffd700;
  }
`;

const CloseBtn = styled.button`
  margin-top: 18px;
  width: 100%;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  background: #ffd700;
  color: #000;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    opacity: 0.92;
  }
`;

const ResetSection = styled.div`
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const ResetHint = styled.p`
  margin: 0 0 10px;
  font-size: 0.82rem;
  color: #aaa;
  line-height: 1.45;
`;

const ResetBtn = styled.button`
  width: 100%;
  padding: 10px 16px;
  border: 1px solid rgba(255, 120, 120, 0.45);
  border-radius: 8px;
  background: rgba(120, 20, 20, 0.35);
  color: #ffb4b4;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: rgba(140, 30, 30, 0.5);
  }
`;

const ConfirmRow = styled.div`
  display: flex;
  gap: 8px;
`;

const ConfirmBtn = styled.button`
  flex: 1;
  padding: 10px 12px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
`;

const CancelConfirmBtn = styled(ConfirmBtn)`
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.06);
  color: #ddd;
`;

const YesResetBtn = styled(ConfirmBtn)`
  border: none;
  background: #c0392b;
  color: white;
`;

const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  time: 'Time',
  cosmetic: 'Cosmetic',
  qol: 'QoL',
};

const FELT_OPTIONS: { id: FeltColor; label: string; swatch: string; unlockId: AchievementId | null }[] = [
  { id: 'classic', label: 'Classic green', swatch: '#327a4a', unlockId: null },
  { id: 'tabby', label: 'Tabby orange', swatch: '#c4651a', unlockId: 'kitty_cat' },
  { id: 'royal', label: 'Midnight royal', swatch: '#121f38', unlockId: 'high_roller' },
  { id: 'vaporwave', label: 'Vaporwave', swatch: '#5b2a7a', unlockId: 'the_purist' },
];

interface AchievementsPanelProps {
  onClose: () => void;
}

const AchievementsPanel: React.FC<AchievementsPanelProps> = ({ onClose }) => {
  const {
    data,
    unlockedCount,
    getProgress,
    isUnlockActive,
    setFeltColor,
    setVictoryFanfare,
    togglePreference,
    resetAllProgress,
  } = useAchievements();

  const [confirmReset, setConfirmReset] = useState(false);
  const allUnlocked = unlockedCount === ACHIEVEMENT_DEFINITIONS.length;

  const feltUnlocked = FELT_OPTIONS.some(
    (opt) => !opt.unlockId || data.achievements[opt.unlockId]?.unlockedAt != null
  );
  const fanfareUnlocked = data.achievements.last_man_standing?.unlockedAt != null;

  return (
    <Overlay role="dialog" aria-modal="true" aria-labelledby="achievements-title" onClick={onClose}>
      <Box onClick={(e) => e.stopPropagation()}>
        <Header>
          <h2 id="achievements-title">Achievements</h2>
          <p>
            {unlockedCount} of {ACHIEVEMENT_DEFINITIONS.length} unlocked — timer buffers, visuals,
            and QoL toggles only. No extra chips or pot changes.
          </p>
        </Header>

        {feltUnlocked && (
          <FeltSection>
            <h3>Table felt</h3>
            <FeltRow>
              {FELT_OPTIONS.filter(
                (opt) => !opt.unlockId || data.achievements[opt.unlockId]?.unlockedAt != null
              ).map((opt) => (
                <FeltBtn
                  key={opt.id}
                  type="button"
                  $active={data.preferences.feltColor === opt.id}
                  $swatch={opt.swatch}
                  onClick={() => setFeltColor(opt.id)}
                >
                  {opt.label}
                </FeltBtn>
              ))}
            </FeltRow>
          </FeltSection>
        )}

        {fanfareUnlocked && (
          <FeltSection>
            <h3>Victory fanfare</h3>
            <FeltRow>
              {(['classic', 'warm', 'triumph'] as const).map((variant) => (
                <FeltBtn
                  key={variant}
                  type="button"
                  $active={data.preferences.victoryFanfare === variant}
                  $swatch={variant === 'classic' ? '#ffd700' : variant === 'warm' ? '#ff8c42' : '#9b59b6'}
                  onClick={() => setVictoryFanfare(variant)}
                >
                  {variant.charAt(0).toUpperCase() + variant.slice(1)}
                </FeltBtn>
              ))}
            </FeltRow>
          </FeltSection>
        )}

        <List>
          {ACHIEVEMENT_DEFINITIONS.map((def) => {
            const progress = getProgress(def.id);
            const unlocked = progress.unlocked;
            const prefKey = preferenceKeyForUnlock(def.unlock);
            const pct =
              def.target && def.target > 0
                ? Math.min(100, Math.round((progress.current / def.target) * 100))
                : unlocked
                  ? 100
                  : 0;

            return (
              <Item key={def.id} $unlocked={unlocked}>
                <ItemTitle>
                  <strong>{def.title}</strong>
                  <Category>{CATEGORY_LABELS[def.category]}</Category>
                </ItemTitle>
                <Desc>{def.description}</Desc>
                <Perk>
                  {unlocked ? `Unlocked: ${def.perkLabel}` : `Unlocks: ${def.perkLabel}`}
                </Perk>
                {!unlocked && def.target && (
                  <>
                    <Desc style={{ marginTop: 4, fontSize: '0.78rem' }}>
                      Progress: {progress.current} / {def.target}
                    </Desc>
                    <ProgressBar>
                      <div style={{ width: `${pct}%` }} />
                    </ProgressBar>
                  </>
                )}
                {unlocked &&
                  prefKey &&
                  !def.unlock.startsWith('felt_') &&
                  def.unlock !== 'fanfare_picker' &&
                  typeof data.preferences[prefKey] === 'boolean' && (
                  <PrefToggle>
                    <input
                      type="checkbox"
                      checked={data.preferences[prefKey] as boolean}
                      onChange={() => togglePreference(prefKey)}
                    />
                    <span>
                      {isUnlockActive(def.id) ? 'Enabled' : 'Disabled'} — {def.perkLabel}
                    </span>
                  </PrefToggle>
                )}
              </Item>
            );
          })}
        </List>

        <ResetSection>
          {allUnlocked ? (
            <ResetHint>
              You have unlocked everything. Reset progress to earn achievements again from scratch.
            </ResetHint>
          ) : (
            <ResetHint>
              Reset clears all achievement progress, stats, and cosmetic unlocks.
            </ResetHint>
          )}
          {confirmReset ? (
            <ConfirmRow>
              <CancelConfirmBtn type="button" onClick={() => setConfirmReset(false)}>
                Cancel
              </CancelConfirmBtn>
              <YesResetBtn
                type="button"
                onClick={() => {
                  resetAllProgress();
                  setConfirmReset(false);
                }}
              >
                Yes, reset all
              </YesResetBtn>
            </ConfirmRow>
          ) : (
            <ResetBtn type="button" onClick={() => setConfirmReset(true)}>
              Reset achievements
            </ResetBtn>
          )}
        </ResetSection>

        <CloseBtn type="button" onClick={onClose}>
          Close
        </CloseBtn>
      </Box>
    </Overlay>
  );
};

export default AchievementsPanel;
