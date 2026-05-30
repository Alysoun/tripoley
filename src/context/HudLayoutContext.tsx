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
  defaultPotLabelOffsets,
  defaultStoredHudLayout,
  HUD_PANEL_Z_BASE,
  HudLayout,
  HudPanelId,
  loadStoredHudLayout,
  PanelPosition,
  PotLabelOffset,
  PotLabelOffsets,
  saveStoredHudLayout,
} from '../components/hudPanelLayout';
import { SectionLabel } from '../types/GameTypes';

type HudLayoutContextValue = {
  layout: HudLayout;
  handScale: number;
  potLabelOffsets: PotLabelOffsets;
  layoutEditMode: boolean;
  setLayoutEditMode: (enabled: boolean) => void;
  toggleLayoutEditMode: () => void;
  setPanelPosition: (id: HudPanelId, position: PanelPosition) => void;
  setPotLabelOffset: (label: SectionLabel, offset: PotLabelOffset) => void;
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
      layoutEditMode,
      setLayoutEditMode,
      toggleLayoutEditMode,
      setPanelPosition,
      setPotLabelOffset,
      setHandScale,
      resetLayout,
      focusPanel: setFocusedPanel,
      panelZIndex,
    }),
    [
      layout,
      handScale,
      potLabelOffsets,
      layoutEditMode,
      setPanelPosition,
      setPotLabelOffset,
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
