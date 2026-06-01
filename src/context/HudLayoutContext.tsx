import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  clearStoredHudLayout,
  clampGameLogLayout,
  clampHandScale,
  clampHudLayout,
  clampPanelPosition,
  clampPotLabelOffset,
  clampSeatLabelOffset,
  clampSeatLabelScale,
  DEFAULT_LAYOUT_EDIT_GROUP,
  defaultGameLogLayout,
  defaultPotLabelOffsets,
  defaultSeatLabelOffsets,
  defaultStoredHudLayout,
  DEFAULT_SEAT_LABEL_SCALE,
  GameLogLayout,
  HUD_PANEL_Z_BASE,
  HudLayout,
  HudPanelId,
  LayoutEditGroup,
  loadStoredHudLayout,
  PanelPosition,
  PotLabelOffset,
  PotLabelOffsets,
  prepareGameLogForEditing,
  saveStoredHudLayout,
  SeatLabelOffset,
  SeatLabelOffsets,
  StoredHudLayout,
} from '../components/hudPanelLayout';
import { SectionLabel } from '../types/GameTypes';
import {
  hasCompletedLayoutOnboarding,
  markLayoutOnboardingComplete,
} from '../utils/layoutOnboarding';

function reflowStoredLayout(stored: StoredHudLayout, editing: boolean): StoredHudLayout {
  return {
    ...stored,
    panels: clampHudLayout(stored.panels, {
      editing,
      handScale: stored.handScale,
    }),
    gameLog: clampGameLogLayout(stored.gameLog ?? defaultGameLogLayout(), editing),
  };
}

type HudLayoutContextValue = {
  layout: HudLayout;
  handScale: number;
  gameLogLayout: GameLogLayout;
  potLabelOffsets: PotLabelOffsets;
  seatLabelScale: number;
  seatLabelOffsets: SeatLabelOffsets;
  layoutEditMode: boolean;
  layoutOnboardingActive: boolean;
  layoutEditGroup: LayoutEditGroup;
  setLayoutEditMode: (enabled: boolean) => void;
  setLayoutEditGroup: (group: LayoutEditGroup) => void;
  isEditingLayoutGroup: (group: LayoutEditGroup) => boolean;
  toggleLayoutEditMode: () => void;
  beginLayoutOnboardingIfNeeded: () => void;
  setPanelPosition: (id: HudPanelId, position: PanelPosition) => void;
  setGameLogLayout: (patch: Partial<GameLogLayout>) => void;
  setPotLabelOffset: (label: SectionLabel, offset: PotLabelOffset) => void;
  setSeatLabelScale: (scale: number) => void;
  setSeatLabelOffset: (seatIndex: number, offset: SeatLabelOffset) => void;
  setHandScale: (scale: number) => void;
  resetLayout: () => void;
  focusPanel: (id: HudPanelId | null) => void;
  panelZIndex: (id: HudPanelId) => number;
};

const HudLayoutContext = createContext<HudLayoutContextValue | null>(null);

export const HudLayoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stored, setStored] = useState(loadStoredHudLayout);
  const [layoutEditMode, setLayoutEditModeState] = useState(false);
  const [layoutOnboardingActive, setLayoutOnboardingActive] = useState(false);
  const [layoutEditGroup, setLayoutEditGroup] = useState<LayoutEditGroup>(DEFAULT_LAYOUT_EDIT_GROUP);
  const [focusedPanel, setFocusedPanel] = useState<HudPanelId | null>(null);
  const onboardingRequestedRef = useRef(false);
  const layoutOnboardingActiveRef = useRef(false);

  useEffect(() => {
    layoutOnboardingActiveRef.current = layoutOnboardingActive;
  }, [layoutOnboardingActive]);

  useEffect(() => {
    saveStoredHudLayout(stored);
  }, [stored]);

  useEffect(() => {
    let frame = 0;
    const syncViewport = () => {
      setStored((prev) => reflowStoredLayout(prev, layoutEditMode));
    };
    syncViewport();
    frame = requestAnimationFrame(() => {
      syncViewport();
      requestAnimationFrame(syncViewport);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const finishLayoutEdit = useCallback((enabled: boolean) => {
    if (!enabled && layoutOnboardingActiveRef.current) {
      markLayoutOnboardingComplete();
      setLayoutOnboardingActive(false);
    }
    setLayoutEditModeState(enabled);
    if (!enabled) {
      setLayoutEditGroup(DEFAULT_LAYOUT_EDIT_GROUP);
      setFocusedPanel(null);
    }
  }, []);

  const layout = stored.panels;
  const handScale = stored.handScale;
  const gameLogLayout = stored.gameLog ?? defaultGameLogLayout();
  const potLabelOffsets = stored.potLabelOffsets ?? defaultPotLabelOffsets();
  const seatLabelScale = stored.seatLabelScale ?? DEFAULT_SEAT_LABEL_SCALE;
  const seatLabelOffsets = stored.seatLabelOffsets ?? defaultSeatLabelOffsets();

  const isEditingLayoutGroup = useCallback(
    (group: LayoutEditGroup) => layoutEditMode && layoutEditGroup === group,
    [layoutEditMode, layoutEditGroup]
  );

  const setLayoutEditGroupWithPrep = useCallback((group: LayoutEditGroup) => {
    setLayoutEditGroup(group);
    if (group === 'log') {
      setStored((prev) => ({
        ...prev,
        gameLog: prepareGameLogForEditing(prev.gameLog ?? defaultGameLogLayout()),
      }));
    }
  }, []);

  const setLayoutEditMode = useCallback((enabled: boolean) => {
    finishLayoutEdit(enabled);
  }, [finishLayoutEdit]);

  const beginLayoutOnboardingIfNeeded = useCallback(() => {
    if (hasCompletedLayoutOnboarding() || onboardingRequestedRef.current || layoutEditMode) {
      return;
    }
    onboardingRequestedRef.current = true;
    const start = () => {
      setStored((prev) => reflowStoredLayout(prev, true));
      setLayoutOnboardingActive(true);
      layoutOnboardingActiveRef.current = true;
      setLayoutEditModeState(true);
      setLayoutEditGroup(DEFAULT_LAYOUT_EDIT_GROUP);
    };
    requestAnimationFrame(() => requestAnimationFrame(start));
  }, [layoutEditMode]);

  const setPanelPosition = useCallback(
    (id: HudPanelId, position: PanelPosition) => {
      setStored((prev) => ({
        ...prev,
        panels: {
          ...prev.panels,
          [id]: clampPanelPosition(id, position, {
            editing: layoutEditMode,
            handScale: prev.handScale,
          }),
        },
      }));
    },
    [layoutEditMode]
  );

  useEffect(() => {
    const onResize = () => {
      setStored((prev) => ({
        ...prev,
        panels: clampHudLayout(prev.panels, {
          editing: layoutEditMode,
          handScale: prev.handScale,
        }),
        gameLog: clampGameLogLayout(
          prev.gameLog ?? defaultGameLogLayout(),
          layoutEditMode && layoutEditGroup === 'log'
        ),
      }));
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };
  }, [layoutEditMode, layoutEditGroup]);

  const setGameLogLayout = useCallback(
    (patch: Partial<GameLogLayout>) => {
      setStored((prev) => ({
        ...prev,
        gameLog: clampGameLogLayout(
          { ...(prev.gameLog ?? defaultGameLogLayout()), ...patch },
          layoutEditMode && layoutEditGroup === 'log'
        ),
      }));
    },
    [layoutEditMode, layoutEditGroup]
  );

  const setPotLabelOffset = useCallback((label: SectionLabel, offset: PotLabelOffset) => {
    setStored((prev) => ({
      ...prev,
      potLabelOffsets: {
        ...(prev.potLabelOffsets ?? defaultPotLabelOffsets()),
        [label]: clampPotLabelOffset(offset.dx, offset.dy),
      },
    }));
  }, []);

  const setSeatLabelScale = useCallback((scale: number) => {
    setStored((prev) => ({ ...prev, seatLabelScale: clampSeatLabelScale(scale) }));
  }, []);

  const setSeatLabelOffset = useCallback((seatIndex: number, offset: SeatLabelOffset) => {
    setStored((prev) => ({
      ...prev,
      seatLabelOffsets: {
        ...(prev.seatLabelOffsets ?? defaultSeatLabelOffsets()),
        [seatIndex]: clampSeatLabelOffset(offset.dx, offset.dy),
      },
    }));
  }, []);

  const setHandScale = useCallback((scale: number) => {
    setStored((prev) => ({ ...prev, handScale: clampHandScale(scale) }));
  }, []);

  const resetLayout = useCallback(() => {
    clearStoredHudLayout();
    setStored(defaultStoredHudLayout());
    setFocusedPanel(null);
  }, []);

  const toggleLayoutEditMode = useCallback(() => {
    setLayoutEditModeState((prev) => {
      const next = !prev;
      if (!next) {
        if (layoutOnboardingActiveRef.current) {
          markLayoutOnboardingComplete();
          setLayoutOnboardingActive(false);
        }
        setLayoutEditGroup(DEFAULT_LAYOUT_EDIT_GROUP);
        setFocusedPanel(null);
      }
      return next;
    });
  }, []);

  const panelZIndex = useCallback(
    (id: HudPanelId) => {
      const base = HUD_PANEL_Z_BASE[id] + (focusedPanel === id ? 10 : 0);
      return isEditingLayoutGroup('hud') ? base + 90 : base;
    },
    [focusedPanel, isEditingLayoutGroup]
  );

  const value = useMemo(
    () => ({
      layout,
      handScale,
      gameLogLayout,
      potLabelOffsets,
      seatLabelScale,
      seatLabelOffsets,
      layoutEditMode,
      layoutOnboardingActive,
      layoutEditGroup,
      setLayoutEditMode,
      setLayoutEditGroup: setLayoutEditGroupWithPrep,
      isEditingLayoutGroup,
      toggleLayoutEditMode,
      beginLayoutOnboardingIfNeeded,
      setPanelPosition,
      setGameLogLayout,
      setPotLabelOffset,
      setSeatLabelScale,
      setSeatLabelOffset,
      setHandScale,
      resetLayout,
      focusPanel: setFocusedPanel,
      panelZIndex,
    }),
    [
      layout,
      handScale,
      gameLogLayout,
      potLabelOffsets,
      seatLabelScale,
      seatLabelOffsets,
      layoutEditMode,
      layoutOnboardingActive,
      layoutEditGroup,
      isEditingLayoutGroup,
      setLayoutEditGroupWithPrep,
      beginLayoutOnboardingIfNeeded,
      setPanelPosition,
      setGameLogLayout,
      setPotLabelOffset,
      setSeatLabelScale,
      setSeatLabelOffset,
      setHandScale,
      resetLayout,
      toggleLayoutEditMode,
      panelZIndex,
    ]
  );

  return <HudLayoutContext.Provider value={value}>{children}</HudLayoutContext.Provider>;
};

export function useHudLayout(): HudLayoutContextValue {
  const ctx = useContext(HudLayoutContext);
  if (!ctx) {
    throw new Error('useHudLayout must be used within HudLayoutProvider');
  }
  return ctx;
}
