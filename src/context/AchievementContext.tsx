import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { GameState, SeatConfig, HouseRules } from '../types/GameTypes';
import type { AchievementPreferences, FeltColor, VictoryFanfareVariant } from '../game/achievements/types';
import { ACHIEVEMENT_DEFINITIONS } from '../game/achievements/definitions';
import {
  getAchievementDisplayProgress,
  recordGameStarted,
  recordPuristGame,
} from '../game/achievements/evaluate';
import { getActiveEffects, isFeltUnlocked, preferenceKeyForUnlock, setPreference } from '../game/achievements/effects';
import {
  isUnlocked,
  loadAchievementData,
  saveAchievementData,
  resetAchievementProgress,
} from '../game/achievements/storage';
import {
  AchievementId,
  AchievementSaveData,
  AchievementUnlockEvent,
  ActiveAchievementEffects,
  NO_ACTIVE_EFFECTS,
} from '../game/achievements/types';
import { readAchievementTimerSnapshot } from '../game/achievements/timerSnapshot';
import {
  applyAchievementTransition,
  createAchievementSessionTracking,
  emptyAchievementRoundFlags,
} from '../game/achievements/trackAchievements';

interface AchievementContextValue {
  data: AchievementSaveData;
  activeEffects: ActiveAchievementEffects;
  pendingUnlocks: AchievementUnlockEvent[];
  dismissUnlock: () => void;
  isSoloSeats: (seats: SeatConfig[]) => boolean;
  startGameAction: (
    seats: SeatConfig[],
    houseRules: HouseRules
  ) => { type: 'START_GAME'; seats: SeatConfig[]; houseRules: HouseRules };
  getProgress: (id: AchievementId) => ReturnType<typeof getAchievementDisplayProgress>;
  unlockedCount: number;
  trackStateTransition: (prev: GameState, next: GameState) => void;
  syncSessionFromState: (state: GameState) => void;
  setFeltColor: (color: FeltColor) => void;
  setVictoryFanfare: (variant: VictoryFanfareVariant) => void;
  togglePreference: (key: keyof AchievementPreferences) => void;
  isUnlockActive: (id: AchievementId) => boolean;
  consumeAdrenalineFreeze: () => void;
  trackGameQuit: (state: GameState) => void;
  resetAllProgress: () => void;
}

const AchievementContext = createContext<AchievementContextValue | null>(null);

function cloneSaveData(data: AchievementSaveData): AchievementSaveData {
  return JSON.parse(JSON.stringify(data)) as AchievementSaveData;
}

function isSoloSeats(seats: SeatConfig[]): boolean {
  return seats.filter((s) => s.isHuman).length === 1;
}

export function AchievementProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AchievementSaveData>(() => loadAchievementData());
  const [pendingUnlocks, setPendingUnlocks] = useState<AchievementUnlockEvent[]>([]);
  const [soloSessionActive, setSoloSessionActive] = useState(false);
  const [effectTick, setEffectTick] = useState(0);

  const sessionTracking = useRef(createAchievementSessionTracking());
  const adrenalineFreezeMs = useRef(0);

  const persist = useCallback((next: AchievementSaveData, unlocks: AchievementUnlockEvent[]) => {
    saveAchievementData(next);
    setData(next);
    if (unlocks.length > 0) {
      setPendingUnlocks((queue) => [...queue, ...unlocks]);
    }
  }, []);

  const activeEffects = useMemo(
    () =>
      soloSessionActive
        ? getActiveEffects(data, adrenalineFreezeMs.current)
        : NO_ACTIVE_EFFECTS,
    [data, soloSessionActive, effectTick]
  );

  const unlockedCount = useMemo(
    () => ACHIEVEMENT_DEFINITIONS.filter((def) => isUnlocked(data, def.id)).length,
    [data]
  );

  const resetSession = useCallback(() => {
    sessionTracking.current = createAchievementSessionTracking();
    adrenalineFreezeMs.current = 0;
  }, []);

  const syncSessionFromState = useCallback((state: GameState) => {
    setSoloSessionActive(!!state.isSoloSession);
    if (state.players.length > 0 && state.phase !== 'setup') {
      sessionTracking.current.sequenceTimerOffForGame = !state.houseRules.michiganSequenceTimer;
    }
  }, []);

  const consumeAdrenalineFreeze = useCallback(() => {
    if (adrenalineFreezeMs.current > 0) {
      adrenalineFreezeMs.current = 0;
      setEffectTick((t) => t + 1);
    }
  }, []);

  const startGameAction = useCallback(
    (seats: SeatConfig[], houseRules: HouseRules) => {
      resetSession();
      const solo = isSoloSeats(seats);
      setSoloSessionActive(solo);
      sessionTracking.current.sequenceTimerOffForGame = !houseRules.michiganSequenceTimer;

      if (solo) {
        const draft = cloneSaveData(data);
        const unlocks = recordGameStarted(draft);
        persist(draft, unlocks);
      } else {
        setSoloSessionActive(false);
      }

      return { type: 'START_GAME' as const, seats, houseRules };
    },
    [data, persist, resetSession]
  );

  const setFeltColor = useCallback(
    (color: FeltColor) => {
      if (!isFeltUnlocked(data, color)) return;
      const draft = cloneSaveData(data);
      setPreference(draft, 'feltColor', color);
      persist(draft, []);
    },
    [data, persist]
  );

  const setVictoryFanfare = useCallback(
    (variant: VictoryFanfareVariant) => {
      if (!isUnlocked(data, 'last_man_standing')) return;
      const draft = cloneSaveData(data);
      setPreference(draft, 'victoryFanfare', variant);
      persist(draft, []);
    },
    [data, persist]
  );

  const togglePreference = useCallback(
    (key: keyof AchievementPreferences) => {
      const draft = cloneSaveData(data);
      const pref = draft.preferences[key];
      if (typeof pref === 'boolean') {
        setPreference(draft, key, !pref);
        persist(draft, []);
      }
    },
    [data, persist]
  );

  const isUnlockActive = useCallback(
    (id: AchievementId) => {
      if (!isUnlocked(data, id)) return false;
      const def = ACHIEVEMENT_DEFINITIONS.find((d) => d.id === id);
      if (!def) return false;
      const prefKey = preferenceKeyForUnlock(def.unlock);
      if (def.unlock === 'fanfare_picker') {
        return data.preferences.victoryFanfare !== 'classic';
      }
      if (prefKey && typeof data.preferences[prefKey] === 'boolean') {
        return data.preferences[prefKey] as boolean;
      }
      if (def.unlock.startsWith('felt_')) {
        const color =
          def.unlock === 'felt_tabby'
            ? 'tabby'
            : def.unlock === 'felt_royal'
              ? 'royal'
              : 'vaporwave';
        return data.preferences.feltColor === color;
      }
      return true;
    },
    [data]
  );

  const trackGameQuit = useCallback(
    (state: GameState) => {
      if (!state.isSoloSession || !sessionTracking.current.sequenceTimerOffForGame) return;
      const draft = cloneSaveData(data);
      persist(draft, recordPuristGame(draft));
    },
    [data, persist]
  );

  const resetAllProgress = useCallback(() => {
    const fresh = resetAchievementProgress();
    setData(fresh);
    setPendingUnlocks([]);
  }, []);

  const trackStateTransition = useCallback(
    (prev: GameState, next: GameState) => {
      const result = applyAchievementTransition(prev, next, {
        data,
        session: sessionTracking.current,
        timerSnapshotMs: readAchievementTimerSnapshot(),
      });
      if (!result) return;

      sessionTracking.current = result.session;
      if (result.adrenalineFreezeMs > 0) {
        adrenalineFreezeMs.current = result.adrenalineFreezeMs;
        setEffectTick((t) => t + 1);
      }
      if (result.unlocks.length > 0) {
        persist(result.data, result.unlocks);
      }
    },
    [data, persist]
  );

  const value: AchievementContextValue = {
    data,
    activeEffects,
    pendingUnlocks,
    dismissUnlock: () => setPendingUnlocks((q) => q.slice(1)),
    isSoloSeats,
    startGameAction,
    getProgress: (id) => getAchievementDisplayProgress(data, id),
    unlockedCount,
    trackStateTransition,
    syncSessionFromState,
    setFeltColor,
    setVictoryFanfare,
    togglePreference,
    isUnlockActive,
    consumeAdrenalineFreeze,
    trackGameQuit,
    resetAllProgress,
  };

  return <AchievementContext.Provider value={value}>{children}</AchievementContext.Provider>;
}

export function useAchievements(): AchievementContextValue {
  const ctx = useContext(AchievementContext);
  if (!ctx) {
    throw new Error('useAchievements must be used within AchievementProvider');
  }
  return ctx;
}

export { emptyAchievementRoundFlags };
