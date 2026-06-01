import { describe, expect, it } from 'vitest';
import { clampGameLogLayout, maxGameLogHeight } from '../gameLogLayout';

describe('gameLogLayout', () => {
  it('preserves width and height when collapsing and re-expanding', () => {
    const custom = {
      x: 120,
      y: 80,
      width: 240,
      height: 140,
      collapsed: false,
    };

    const collapsed = clampGameLogLayout({ ...custom, collapsed: true });
    expect(collapsed.collapsed).toBe(true);
    expect(collapsed.width).toBe(240);
    expect(collapsed.height).toBe(140);

    const expanded = clampGameLogLayout({ ...collapsed, collapsed: false });
    expect(expanded.collapsed).toBe(false);
    expect(expanded.width).toBe(240);
    expect(expanded.height).toBe(140);
  });

  it('keeps tall custom heights outside layout edit mode', () => {
    const cap = maxGameLogHeight(false);
    const target = Math.min(500, cap);
    const tall = clampGameLogLayout(
      { x: 0, y: 72, width: 308, height: target, collapsed: false },
      false
    );
    expect(tall.height).toBe(target);
    expect(tall.height).toBeLessThanOrEqual(cap);
  });
});
