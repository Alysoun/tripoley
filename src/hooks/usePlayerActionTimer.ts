import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useGame } from '../context/GameContext';
import { useAchievements } from '../context/AchievementContext';
import { useSoloGamePaused } from '../context/SoloPauseUiContext';
import {
  getActionTimerHint,
  getPlayerActionTimerKey,
  getPlayerActionTimerMs,
} from '../game/engine/playerActionTimer';
import { setAchievementTimerSnapshot } from '../game/achievements/timerSnapshot';

export interface PlayerActionTimerState {
  active: boolean;
  remainingMs: number | null;
  progress: number | null;
  totalMs: number;
  hint: string | null;
  isSequenceTimer: boolean;
}

const PlayerActionTimerContext = createContext<PlayerActionTimerState | null>(null);

const TICK_MS = 200;

function usePlayerActionTimerEngine(): PlayerActionTimerState {
  const { state, dispatch } = useGame();
  const { activeEffects, consumeAdrenalineFreeze } = useAchievements();
  const soloPaused = useSoloGamePaused();
  const [deadline, setDeadline] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const firedRef = useRef(false);

  const timerKey = useMemo(
    () => getPlayerActionTimerKey(state),
    [
      state.phase,
      state.currentPlayer,
      state.roundNumber,
      state.blindAuction,
      state.poker,
      state.michigan,
      state.announcement,
      state.announcementContinue,
      state.players,
    ]
  );

  const totalMs = useMemo(() => {
    const base = getPlayerActionTimerMs(state);
    return base + activeEffects.timerBonusMs + activeEffects.adrenalineFreezeMs;
  }, [state, activeEffects.timerBonusMs, activeEffects.adrenalineFreezeMs]);

  const isSequenceTimer = timerKey?.startsWith('michigan-seq:') ?? false;

  useEffect(() => {
    firedRef.current = false;
    if (!timerKey || soloPaused) {
      setDeadline(null);
      setAchievementTimerSnapshot(null);
      return;
    }
    const startDelay = activeEffects.graceIntervalMs;
    setDeadline(Date.now() + startDelay + totalMs);
    if (isSequenceTimer && activeEffects.adrenalineFreezeMs > 0) {
      consumeAdrenalineFreeze();
    }
  }, [
    timerKey,
    totalMs,
    activeEffects.graceIntervalMs,
    activeEffects.adrenalineFreezeMs,
    isSequenceTimer,
    consumeAdrenalineFreeze,
    soloPaused,
  ]);

  useEffect(() => {
    if (soloPaused || !deadline || !timerKey) return;

    const fire = () => {
      if (firedRef.current) return;
      firedRef.current = true;
      if (timerKey.startsWith('michigan-seq:')) {
        dispatch({ type: 'MICHIGAN_TIMER_EXPIRE' });
      } else {
        dispatch({ type: 'ACTION_TIMER_EXPIRE' });
      }
    };

    const tick = () => {
      const current = Date.now();
      setNow(current);
      if (current >= deadline) {
        fire();
      }
    };

    tick();

    const intervalId = window.setInterval(tick, TICK_MS);

    const resume = () => {
      if (document.visibilityState === 'visible') {
        tick();
      }
    };
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('focus', resume);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('focus', resume);
    };
  }, [deadline, dispatch, timerKey, soloPaused]);

  const remainingMs = deadline ? Math.max(0, deadline - now) : null;
  const progress = remainingMs !== null ? remainingMs / totalMs : null;
  const hint = timerKey ? getActionTimerHint(state) : null;

  useEffect(() => {
    setAchievementTimerSnapshot(remainingMs);
  }, [remainingMs]);

  return {
    active: timerKey !== null,
    remainingMs,
    progress,
    totalMs,
    hint,
    isSequenceTimer,
  };
}

export function PlayerActionTimerProvider({ children }: { children: ReactNode }) {
  const value = usePlayerActionTimerEngine();
  return createElement(PlayerActionTimerContext.Provider, { value }, children);
}

export function usePlayerActionTimer(): PlayerActionTimerState {
  const ctx = useContext(PlayerActionTimerContext);
  if (!ctx) {
    throw new Error('usePlayerActionTimer must be used within PlayerActionTimerProvider');
  }
  return ctx;
}
