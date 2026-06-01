import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  clearLayoutOnboardingFlag,
  hasCompletedLayoutOnboarding,
  markLayoutOnboardingComplete,
} from '../layoutOnboarding';

describe('layoutOnboarding', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', {
      store: {} as Record<string, string>,
      getItem(key: string) {
        return this.store[key] ?? null;
      },
      setItem(key: string, value: string) {
        this.store[key] = value;
      },
      removeItem(key: string) {
        delete this.store[key];
      },
    });
    clearLayoutOnboardingFlag();
  });

  it('tracks first-time layout setup completion once', () => {
    expect(hasCompletedLayoutOnboarding()).toBe(false);
    markLayoutOnboardingComplete();
    expect(hasCompletedLayoutOnboarding()).toBe(true);
    clearLayoutOnboardingFlag();
    expect(hasCompletedLayoutOnboarding()).toBe(false);
  });
});
