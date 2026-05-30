import { RefObject, useEffect } from 'react';
import { applyCardFanStack } from '../utils/cardFanStack';

const ENFORCE_MS = 48;

/** Re-applies fan z-order on an interval to defeat transform/compositor glitches. */
export function useCardFanStackEnforcer(
  containerRef: RefObject<HTMLElement | null>,
  revision: string
): void {
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    applyCardFanStack(root);

    const id = window.setInterval(() => applyCardFanStack(root), ENFORCE_MS);
    return () => window.clearInterval(id);
  }, [containerRef, revision]);
}
