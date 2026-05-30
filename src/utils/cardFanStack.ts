export type CardStackState = {
  index: number;
  total: number;
  dragging?: boolean;
  playable?: boolean;
  hovered?: boolean;
};

/** Higher index = further right in the fan = painted on top. */
export function computeCardStackZ({
  index,
  total,
  dragging,
  playable,
  hovered,
}: CardStackState): number {
  let z = 10 + index;
  if (playable) z += total + 5;
  if (hovered) z += total * 2 + 10;
  if (dragging) z += total * 3 + 20;
  return z;
}

export function cardFanTransform(
  index: number,
  total: number,
  lifted: boolean
): string {
  const mid = (total - 1) / 2;
  const offset = index - mid;
  const angle = offset * 15;
  const arcY = -Math.abs(offset) * 5;
  const spreadX = offset * 26;
  const lift = lifted ? -18 : 0;
  const depth = index * 4;
  return `translateX(calc(-50% + ${spreadX}px)) rotate(${angle}deg) translateY(${arcY + lift}px) translateZ(${depth}px)`;
}

export function applyCardFanStack(root: ParentNode | null | undefined): void {
  if (!root) return;
  const cards = root.querySelectorAll<HTMLElement>('[data-fan-index]');
  const total = cards.length;
  cards.forEach((el) => {
    const index = Number(el.dataset.fanIndex);
    if (Number.isNaN(index)) return;
    const z = computeCardStackZ({
      index,
      total,
      dragging: el.dataset.fanDragging === '1',
      playable: el.dataset.fanPlayable === '1',
      hovered: el.dataset.fanHovered === '1',
    });
    if (el.style.zIndex !== String(z)) {
      el.style.zIndex = String(z);
    }
  });
}
