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
  clampHandScale,
  clampPotLabelOffset,
  clampSeatLabelOffset,
  clampSeatLabelScale,
  defaultPotLabelOffsets,
  defaultSeatLabelOffsets,
  defaultStoredHudLayout,
  DEFAULT_SEAT_LABEL_SCALE,
  HUD_PANEL_Z_BASE,
  HudLayout,
  HudPanelId,
  loadStoredHudLayout,
  PanelPosition,
  PotLabelOffset,
  PotLabelOffsets,
  saveStoredHudLayout,
  SeatLabelOffset,
  SeatLabelOffsets,
} from '../components/hudPanelLayout';
import { SectionLabel } from '../types/GameTypes';

type HudLayoutContextValue = {
  layout: HudLayout;
  handScale: number;
  potLabelOffsets: PotLabelOffsets;
  seatLabelScale: number;
  seatLabelOffsets: SeatLabelOffsets;
  layoutEditMode: boolean;
  setLayoutEditMode: (enabled: boolean) => void;
  toggleLayoutEditMode: () => void;
  setPanelPosition: (id: HudPanelId, position: PanelPosition) => void;
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
  const [layoutEditMode, setLayoutEditMode] = useState(false);
  const [focusedPanel, setFocusedPanel] = useState<HudPanelId | null>(null);

  useEffect(() => {
    saveStoredHudLayout(stored);
  }, [stored]);

  const layout = stored.panels;
  const handScale = stored.handScale;
  const potLabelOffsets = stored.potLabelOffsets ?? defaultPotLabelOffsets();
  const seatLabelScale = stored.seatLabelScale ?? DEFAULT_SEAT_LABEL_SCALE;
  const seatLabelOffsets = stored.seatLabelOffsets ?? defaultSeatLabelOffsets();

  const setPanelPosition = useCallback((id: HudPanelId, position: PanelPosition) => {
    setStored((prev) => ({
      ...prev,
      panels: { ...prev.panels, [id]: position },
    }));
  }, []);

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
    setLayoutEditMode((prev) => !prev);
    setFocusedPanel(null);
  }, []);

  const panelZIndex = useCallback(
    (id: HudPanelId) => HUD_PANEL_Z_BASE[id] + (focusedPanel === id ? 10 : 0),
    [focusedPanel]
  );

  const value = useMemo(
    () => ({
      layout,
      handScale,
      potLabelOffsets,
      seatLabelScale,
      seatLabelOffsets,
      layoutEditMode,
      setLayoutEditMode,
      toggleLayoutEditMode,
      setPanelPosition,
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
      potLabelOffsets,
      seatLabelScale,
      seatLabelOffsets,
      layoutEditMode,
      setPanelPosition,
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
