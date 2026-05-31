import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useGame } from './GameContext';
import { useHudLayout } from './HudLayoutContext';

type SoloPauseUiContextValue = {
  rulesModalOpen: boolean;
  setRulesModalOpen: (open: boolean) => void;
};

const SoloPauseUiContext = createContext<SoloPauseUiContextValue | null>(null);

export const SoloPauseUiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [rulesModalOpen, setRulesModalOpenState] = useState(false);

  const setRulesModalOpen = useCallback((open: boolean) => {
    setRulesModalOpenState(open);
  }, []);

  const value = useMemo(
    () => ({ rulesModalOpen, setRulesModalOpen }),
    [rulesModalOpen, setRulesModalOpen]
  );

  return <SoloPauseUiContext.Provider value={value}>{children}</SoloPauseUiContext.Provider>;
};

export function useSoloPauseUi(): SoloPauseUiContextValue {
  const ctx = useContext(SoloPauseUiContext);
  if (!ctx) {
    throw new Error('useSoloPauseUi must be used within SoloPauseUiProvider');
  }
  return ctx;
}

/** True when solo play should freeze AI turns and action timers (layout edit or rules modal). */
export function useSoloGamePaused(): boolean {
  const { state } = useGame();
  const { layoutEditMode } = useHudLayout();
  const { rulesModalOpen } = useSoloPauseUi();
  return !!state.isSoloSession && (layoutEditMode || rulesModalOpen);
}
