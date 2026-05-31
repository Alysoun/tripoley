import React, { useState } from 'react';
import styled from 'styled-components';
import { SeatConfig, HouseRules, AIDifficulty } from '../types/GameTypes';
import { MIN_PLAYERS, MAX_PLAYERS } from '../game/engine/constants';
import {
  AI_DIFFICULTY_HINTS,
  AI_DIFFICULTY_LABELS,
  AI_DIFFICULTY_ORDER,
  AiPokerSkillMode,
  applyAiDifficultiesToSeats,
  loadStoredAiPokerSettings,
  saveStoredAiPokerSettings,
  StoredAiPokerSettings,
} from '../game/engine/aiDifficulty';
import { GAME_NAME, GAME_TAGLINE } from '../game/branding';
import {
  HOUSE_RULE_PRESETS,
  HOUSE_RULE_TOGGLES,
  HouseRulesPreset,
  loadStoredHouseRules,
  mergeHouseRules,
  rulesFromPreset,
  saveHouseRules,
  summarizeHouseRules,
} from '../game/engine/houseRules';
import {
  loadStoredPlayerName,
  saveStoredPlayerName,
  sanitizePlayerName,
  formatPlayerNameInput,
  DEFAULT_HUMAN_NAME,
  displayPlayerName,
} from '../utils/playerName';
import { useAchievements } from '../context/AchievementContext';
import { ACHIEVEMENT_DEFINITIONS } from '../game/achievements/definitions';
import AchievementsPanel from './AchievementsPanel';
import RulesModal from './RulesModal';

const SelectContainer = styled.div`
  background: rgba(0, 0, 0, 0.92);
  padding: 2rem;
  border-radius: 1rem;
  text-align: center;
  min-width: min(480px, calc(100vw - 24px));
  max-width: min(620px, calc(100vw - 16px));
  max-height: min(90vh, calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 24px));
  overflow-y: auto;
  border: 2px solid #ffd700;
  color: white;

  @media (max-width: 480px) {
    padding: 1.25rem;
    border-radius: 0.75rem;
  }
`;

const Title = styled.h2`
  margin: 0 0 0.5rem;
  color: #ffd700;
`;

const Subtitle = styled.p`
  color: #ccc;
  margin-bottom: 1rem;
  font-size: 0.95rem;
  line-height: 1.5;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
`;

const NameHint = styled.span`
  display: block;
  font-size: 0.78rem;
  color: #aaa;
  margin-top: 0.35rem;
`;

const NameInput = styled.input`
  flex: 1;
  max-width: 220px;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  border: 1px solid #ffd700;
  background: #1a3d28;
  color: white;
  font-size: 1rem;
`;

const Label = styled.label`
  font-weight: 600;
`;

const Select = styled.select`
  padding: 0.5rem 1rem;
  border-radius: 6px;
  border: 1px solid #ffd700;
  background: #1a3d28;
  color: white;
  font-size: 1rem;
`;

const SeatGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.5rem;
  max-height: 300px;
  overflow-y: auto;
  margin: 1rem 0;
  text-align: left;
`;

const SeatRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  flex-wrap: wrap;
`;

const SeatControls = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: flex-end;
`;

const DifficultySelect = styled(Select)`
  font-size: 0.82rem;
  padding: 0.35rem 0.55rem;
  max-width: 132px;
`;

const ModeRow = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  margin-bottom: 0.65rem;
  cursor: pointer;
  font-size: 0.88rem;
  line-height: 1.35;

  input {
    margin-top: 3px;
  }

  span small {
    display: block;
    color: #aaa;
    font-size: 0.78rem;
    margin-top: 2px;
  }
`;

const Toggle = styled.button<{ $active: boolean }>`
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-size: 0.85rem;
  background: ${(p) => (p.$active ? '#ffd700' : '#444')};
  color: ${(p) => (p.$active ? '#000' : '#fff')};
`;

const RulesSection = styled.div`
  text-align: left;
  margin: 1rem 0;
  padding: 1rem;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 215, 0, 0.25);
`;

const RulesHeading = styled.div`
  font-weight: 700;
  color: #ffd700;
  margin-bottom: 0.75rem;
`;

const RuleRow = styled.label`
  display: flex;
  align-items: flex-start;
  gap: 0.6rem;
  margin-bottom: 0.65rem;
  cursor: pointer;
  font-size: 0.88rem;
  line-height: 1.35;

  input {
    margin-top: 3px;
  }

  span small {
    display: block;
    color: #aaa;
    font-size: 0.78rem;
    margin-top: 2px;
  }
`;

const StartButton = styled.button`
  margin-top: 1rem;
  padding: 0.85rem 2rem;
  font-size: 1.1rem;
  border: none;
  border-radius: 8px;
  background: #ffd700;
  color: #000;
  font-weight: 700;
  cursor: pointer;
  width: 100%;

  &:hover {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SecondaryBtn = styled.button`
  margin-top: 0.75rem;
  padding: 0.65rem 1.25rem;
  font-size: 0.95rem;
  border: 1px solid rgba(255, 215, 0, 0.55);
  border-radius: 8px;
  background: rgba(255, 215, 0, 0.1);
  color: #ffd700;
  font-weight: 600;
  cursor: pointer;
  width: 100%;

  &:hover {
    background: rgba(255, 215, 0, 0.18);
  }
`;

interface PlayerSelectProps {
  onStart: (seats: SeatConfig[], houseRules: HouseRules) => void;
}

const PlayerSelect: React.FC<PlayerSelectProps> = ({ onStart }) => {
  const [showAchievements, setShowAchievements] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const { unlockedCount } = useAchievements();
  const [playerCount, setPlayerCount] = useState(4);
  const [humanName, setHumanName] = useState(() => loadStoredPlayerName());
  const [seats, setSeats] = useState<SeatConfig[]>(() =>
    Array.from({ length: 4 }, (_, i) => ({
      isHuman: i === 0,
      name: i === 0 ? loadStoredPlayerName() : undefined,
    }))
  );
  const [houseRules, setHouseRules] = useState<HouseRules>(() => loadStoredHouseRules());
  const [aiSettings, setAiSettings] = useState<StoredAiPokerSettings>(() =>
    loadStoredAiPokerSettings()
  );

  const setAiMode = (mode: AiPokerSkillMode) => {
    setAiSettings((prev) => ({ ...prev, mode }));
  };

  const setSeatDifficulty = (seatIndex: number, difficulty: AIDifficulty) => {
    setAiSettings((prev) => ({
      ...prev,
      bySeat: { ...prev.bySeat, [seatIndex]: difficulty },
    }));
  };

  const updateCount = (count: number) => {
    setPlayerCount(count);
    setSeats((prev) => {
      const next = Array.from({ length: count }, (_, i) => ({
        isHuman: prev[i]?.isHuman ?? i === 0,
        name: (prev[i]?.isHuman ?? i === 0) ? sanitizePlayerName(humanName) : prev[i]?.name,
      }));
      if (!next.some((s) => s.isHuman)) next[0].isHuman = true;
      if (next[0].isHuman) next[0].name = sanitizePlayerName(humanName);
      return next;
    });
  };

  const toggleSeat = (index: number) => {
    setSeats((prev) => {
      const next = prev.map((s, i) => {
        if (i !== index) return s;
        const isHuman = !s.isHuman;
        return {
          ...s,
          isHuman,
          name: isHuman ? sanitizePlayerName(humanName) : undefined,
        };
      });
      if (!next.some((s) => s.isHuman)) next[index].isHuman = true;
      if (!next[index].isHuman) {
        setAiSettings((prev) => ({
          ...prev,
          bySeat: { ...prev.bySeat, [index]: prev.bySeat[index] ?? 'medium' },
        }));
      }
      return next;
    });
  };

  const setPreset = (preset: HouseRulesPreset) => {
    if (preset === 'custom') {
      setHouseRules((prev) => ({ ...prev, preset: 'custom' }));
      return;
    }
    setHouseRules(rulesFromPreset(preset));
  };

  const toggleRule = (key: (typeof HOUSE_RULE_TOGGLES)[number]['key'], value: boolean) => {
    setHouseRules((prev) =>
      mergeHouseRules(prev, { [key]: value, preset: 'custom' })
    );
  };

  const handleStart = () => {
    saveHouseRules(houseRules);
    saveStoredAiPokerSettings(aiSettings);
    const name = sanitizePlayerName(humanName);
    saveStoredPlayerName(name);
    const namedSeats = seats.map((s) => (s.isHuman ? { ...s, name } : s));
    onStart(applyAiDifficultiesToSeats(namedSeats, aiSettings), houseRules);
  };

  const humanCount = seats.filter((s) => s.isHuman).length;
  const aiCount = playerCount - humanCount;
  const presetValue =
    houseRules.preset === 'custom' ? 'custom' : houseRules.preset;

  return (
    <SelectContainer>
      <Title>{GAME_NAME}</Title>
      <Subtitle>
        {GAME_TAGLINE}. Pick a rules preset or customize house rules below.
      </Subtitle>

      <Row>
        <Label htmlFor="player-count">Players at table</Label>
        <Select
          id="player-count"
          value={playerCount}
          onChange={(e) => updateCount(Number(e.target.value))}
        >
          {Array.from({ length: MAX_PLAYERS - MIN_PLAYERS + 1 }, (_, i) => i + MIN_PLAYERS).map(
            (n) => (
              <option key={n} value={n}>
                {n} players
              </option>
            )
          )}
        </Select>
      </Row>

      {humanCount >= 1 && (
        <Row style={{ alignItems: 'flex-start' }}>
          <div style={{ textAlign: 'left' }}>
            <Label htmlFor="player-name">Your name</Label>
            <NameHint>
              Shown at the table as{' '}
              {displayPlayerName({
                name: humanName.trim() || DEFAULT_HUMAN_NAME,
                isHuman: true,
              })}
            </NameHint>
          </div>
          <NameInput
            id="player-name"
            value={humanName}
            onChange={(e) => {
              const next = formatPlayerNameInput(e.target.value);
              setHumanName(next);
              setSeats((prev) =>
                prev.map((s) => (s.isHuman ? { ...s, name: next } : s))
              );
            }}
            onBlur={() => {
              const final = sanitizePlayerName(humanName);
              setHumanName(final);
              setSeats((prev) =>
                prev.map((s) => (s.isHuman ? { ...s, name: final } : s))
              );
            }}
            placeholder="Enter your name"
            maxLength={24}
            autoComplete="nickname"
          />
        </Row>
      )}

      <SeatGrid>
        {seats.map((seat, i) => (
          <SeatRow key={i}>
            <span>
              Seat {i + 1}
              {i === 0 ? ' (starts as dealer)' : ''}
            </span>
            <SeatControls>
              {!seat.isHuman && aiSettings.mode === 'manual' && (
                <DifficultySelect
                  aria-label={`Seat ${i + 1} poker skill`}
                  value={aiSettings.bySeat[i] ?? 'medium'}
                  onChange={(e) => setSeatDifficulty(i, e.target.value as AIDifficulty)}
                >
                  {AI_DIFFICULTY_ORDER.map((tier) => (
                    <option key={tier} value={tier}>
                      {AI_DIFFICULTY_LABELS[tier]}
                    </option>
                  ))}
                </DifficultySelect>
              )}
              <Toggle $active={seat.isHuman} onClick={() => toggleSeat(i)} type="button">
                {seat.isHuman ? 'Human' : 'AI'}
              </Toggle>
            </SeatControls>
          </SeatRow>
        ))}
      </SeatGrid>

      <RulesSection>
        <RulesHeading>AI poker skill</RulesHeading>
        <Subtitle style={{ margin: '0 0 0.75rem', fontSize: '0.85rem' }}>
          Affects betting and bluffing during the poker phase only.
        </Subtitle>
        <ModeRow>
          <input
            type="radio"
            name="ai-poker-skill"
            checked={aiSettings.mode === 'automatic'}
            onChange={() => setAiMode('automatic')}
          />
          <span>
            Automatic mix
            <small>Each new game assigns Easy through Card Shark across AI seats.</small>
          </span>
        </ModeRow>
        <ModeRow>
          <input
            type="radio"
            name="ai-poker-skill"
            checked={aiSettings.mode === 'manual'}
            onChange={() => setAiMode('manual')}
          />
          <span>
            Choose each AI
            <small>Pick a skill level per AI seat in the list above.</small>
          </span>
        </ModeRow>
        {aiSettings.mode === 'manual' && (
          <Subtitle style={{ margin: '0.5rem 0 0', fontSize: '0.78rem', color: '#aaa' }}>
            {AI_DIFFICULTY_ORDER.map((tier) => AI_DIFFICULTY_HINTS[tier]).join(' · ')}
          </Subtitle>
        )}
      </RulesSection>

      <RulesSection>
        <RulesHeading>House rules</RulesHeading>
        <Row style={{ marginBottom: '0.75rem' }}>
          <Label htmlFor="rules-preset">Preset</Label>
          <Select
            id="rules-preset"
            value={presetValue}
            onChange={(e) => setPreset(e.target.value as HouseRulesPreset)}
          >
            <option value="official">{HOUSE_RULE_PRESETS.official.label}</option>
            <option value="homeTable">{HOUSE_RULE_PRESETS.homeTable.label}</option>
            <option value="custom">Custom</option>
          </Select>
        </Row>
        <Subtitle style={{ margin: '0 0 0.75rem', fontSize: '0.85rem' }}>
          {presetValue === 'custom'
            ? summarizeHouseRules(houseRules)
            : HOUSE_RULE_PRESETS[presetValue as Exclude<HouseRulesPreset, 'custom'>]
                .description}
        </Subtitle>
        {HOUSE_RULE_TOGGLES.map(({ key, label, hint }) => (
          <RuleRow key={key}>
            <input
              type="checkbox"
              checked={houseRules[key]}
              onChange={(e) => toggleRule(key, e.target.checked)}
            />
            <span>
              {label}
              <small>{hint}</small>
            </span>
          </RuleRow>
        ))}
      </RulesSection>

      <Subtitle style={{ marginBottom: 0 }}>
        {humanCount} human{humanCount !== 1 ? 's' : ''} · {aiCount} AI
        {humanCount > 1 ? ' · pass the device for each human turn' : ''}
        {humanCount === 1 && aiCount > 0
          ? ' · solo mode — achievements unlock timers, visuals & QoL'
          : ''}
      </Subtitle>

      <SecondaryBtn type="button" onClick={() => setShowRules(true)}>
        How to Play
      </SecondaryBtn>

      {humanCount === 1 && (
        <SecondaryBtn type="button" onClick={() => setShowAchievements(true)}>
          Achievements ({unlockedCount}/{ACHIEVEMENT_DEFINITIONS.length})
        </SecondaryBtn>
      )}

      <StartButton
        onClick={handleStart}
        disabled={humanCount < 1 || playerCount < MIN_PLAYERS}
      >
        Deal Round 1
      </StartButton>

      {showAchievements && <AchievementsPanel onClose={() => setShowAchievements(false)} />}
      {showRules && (
        <RulesModal onClose={() => setShowRules(false)} houseRules={houseRules} phase="setup" />
      )}
    </SelectContainer>
  );
};

export default PlayerSelect;
