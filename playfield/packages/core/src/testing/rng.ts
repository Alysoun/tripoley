import { vi } from 'vitest';

/** Mulberry32 — fast deterministic PRNG for tests and simulations. */
export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export function mockRandom(seed: number): () => void {
  const random = mulberry32(seed);
  const spy = vi.spyOn(Math, 'random').mockImplementation(random);
  return () => spy.mockRestore();
}
