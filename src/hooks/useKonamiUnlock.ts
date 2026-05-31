import { useCallback, useEffect, useState } from 'react';
import {
  advanceKonamiInput,
  enableSpectatorUnlock,
  isSpectatorUnlocked,
  resetKonamiProgress,
} from '../game/spectatorMode';

/** Secret setup-screen unlock: ↑↑↓↓←→←→BA or type uuddlrlrba */
export function useKonamiUnlock(active: boolean) {
  const [unlocked, setUnlocked] = useState(() => isSpectatorUnlocked());
  const [flash, setFlash] = useState(false);

  const triggerUnlock = useCallback(() => {
    enableSpectatorUnlock();
    setUnlocked(true);
    setFlash(true);
    resetKonamiProgress();
    window.setTimeout(() => setFlash(false), 2200);
  }, []);

  useEffect(() => {
    if (!active) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.repeat) return;
      if (advanceKonamiInput(e.code, e.key)) {
        e.preventDefault();
        triggerUnlock();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active, triggerUnlock]);

  return { unlocked, flash };
}
