/**
 * Optional browser persistence helpers for Tripoley apps.
 * Not imported by core reducers — use from React clients only.
 */
import type { HouseRules } from '../games/tripoley/houseRules';
import { defaultHouseRules } from '../games/tripoley/houseRules';
import {
  AI_DIFFICULTY_ORDER,
  defaultAiPokerSettings,
  type StoredAiPokerSettings,
} from '../games/tripoley/aiDifficulty';
import type { AIDifficulty } from '../games/tripoley/types';

const HOUSE_RULES_KEY = 'tripoley-house-rules';
const AI_POKER_KEY = 'tripoley-ai-poker-skill';

export function loadStoredHouseRules(): HouseRules {
  try {
    const raw = localStorage.getItem(HOUSE_RULES_KEY);
    if (!raw) return defaultHouseRules();
    const parsed = JSON.parse(raw) as HouseRules;
    return { ...defaultHouseRules(), ...parsed };
  } catch {
    return defaultHouseRules();
  }
}

export function saveHouseRules(rules: HouseRules): void {
  localStorage.setItem(HOUSE_RULES_KEY, JSON.stringify(rules));
}

export function loadStoredAiPokerSettings(): StoredAiPokerSettings {
  try {
    const raw = localStorage.getItem(AI_POKER_KEY);
    if (!raw) return defaultAiPokerSettings();
    const parsed = JSON.parse(raw) as Partial<StoredAiPokerSettings>;
    const bySeat: Partial<Record<number, AIDifficulty>> = {};
    if (parsed.bySeat && typeof parsed.bySeat === 'object') {
      for (const [key, value] of Object.entries(parsed.bySeat)) {
        const seatIndex = Number(key);
        if (
          Number.isInteger(seatIndex) &&
          AI_DIFFICULTY_ORDER.includes(value as AIDifficulty)
        ) {
          bySeat[seatIndex] = value as AIDifficulty;
        }
      }
    }
    return {
      mode: parsed.mode === 'manual' ? 'manual' : 'automatic',
      bySeat,
    };
  } catch {
    return defaultAiPokerSettings();
  }
}

export function saveStoredAiPokerSettings(settings: StoredAiPokerSettings): void {
  localStorage.setItem(AI_POKER_KEY, JSON.stringify(settings));
}
