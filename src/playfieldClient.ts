import { configurePlayfield } from '@playfield/core';
import { isDebugActive, DEBUG } from './debugConfig';

/** Sync Tripoley debug overrides into the headless Playfield config before a session starts. */
export function syncPlayfieldFromDebug(): void {
  configurePlayfield({
    startingChips:
      isDebugActive() && DEBUG.startingChips != null ? DEBUG.startingChips : undefined,
    playerActionTurnMs:
      isDebugActive() && DEBUG.playerActionTurnMs != null
        ? DEBUG.playerActionTurnMs
        : undefined,
  });
}

syncPlayfieldFromDebug();
