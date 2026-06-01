const STORAGE_KEY = 'tripoley-layout-onboarding-v1';

function storage(): Storage | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}

export function hasCompletedLayoutOnboarding(): boolean {
  return storage()?.getItem(STORAGE_KEY) === '1';
}

export function markLayoutOnboardingComplete(): void {
  try {
    storage()?.setItem(STORAGE_KEY, '1');
  } catch {
    /* private mode */
  }
}

/** Dev / support — re-show first-time layout setup on next deal. */
export function clearLayoutOnboardingFlag(): void {
  try {
    storage()?.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
