import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
} from '../components/hudPanelLayout';
import { SectionLabel } from '../types/GameTypes';

type HudLayoutContextValue = {
  layout: HudLayout;
  handScale: number;
  gameLogLayout: GameLogLayout;
  potLabelOffsets: PotLabelOffsets;
  seatLabelScale: number;
  seatLabelOffsets: SeatLabelOffsets;
  layoutEditMode: boolean;
  layoutEditGroup: LayoutEditGroup;
  setLayoutEditMode: (enabled: boolean) => void;
  setLayoutEditGroup: (group: LayoutEditGroup) => void;
  isEditingLayoutGroup: (group: LayoutEditGroup) => boolean;
  toggleLayoutEditMode: () => void;
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
  const [layoutEditGroup, setLayoutEditGroup] = useState<LayoutEditGroup>(DEFAULT_LAYOUT_EDIT_GROUP);
  const [focusedPanel, setFocusedPanel] = useState<HudPanelId | null>(null);

  useEffect(() => {
    saveStoredHudLayout(stored);
  }, [stored]);

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
    setLayoutEditModeState(enabled);
    if (!enabled) {
      setLayoutEditGroup(DEFAULT_LAYOUT_EDIT_GROUP);
      setFocusedPanel(null);
    }
  }, []);

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
      if (prev) {
        setLayoutEditGroup(DEFAULT_LAYOUT_EDIT_GROUP);
        setFocusedPanel(null);
      }
      return !prev;
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
      layoutEditGroup,
      setLayoutEditMode,
      setLayoutEditGroup: setLayoutEditGroupWithPrep,
      isEditingLayoutGroup,
      toggleLayoutEditMode,
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
      layoutEditGroup,
      isEditingLayoutGroup,
      setLayoutEditGroupWithPrep,
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
