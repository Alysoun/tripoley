import { AnimationAnchor, PotSectionKey } from '../types/GameTypes';

export function anchorSelector(anchor: AnimationAnchor): string {
  switch (anchor.type) {
    case 'player':
      return `[data-anim-anchor="player-${anchor.id}"]`;
    case 'pot':
      return `[data-anim-anchor="pot-${anchor.section}"]`;
    case 'humanHand':
      return '[data-anim-anchor="human-hand"]';
    case 'tableCenter':
      return '[data-anim-anchor="table-center"]';
    case 'deadHand':
      return '[data-anim-anchor="dead-hand"]';
  }
}

export function anchorCenter(anchor: AnimationAnchor): { x: number; y: number } | null {
  const el = document.querySelector(anchorSelector(anchor));
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

export function potSectionFromAnchor(anchor: AnimationAnchor): PotSectionKey | null {
  return anchor.type === 'pot' ? anchor.section : null;
}
