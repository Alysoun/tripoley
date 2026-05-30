/** Latest human timer remaining ms — read by achievement tracking on Michigan plays. */
let snapshotMs: number | null = null;

export function setAchievementTimerSnapshot(ms: number | null): void {
  snapshotMs = ms;
}

export function readAchievementTimerSnapshot(): number | null {
  return snapshotMs;
}
