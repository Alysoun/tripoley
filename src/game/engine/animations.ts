import {
  AnimationAnchor,
  AnimationType,
  Card,
  GameState,
  Player,
  PotSectionKey,
  SectionLabel,
} from '../../types/GameTypes';

let animCounter = 0;

export function createAnimation(partial: Omit<AnimationType, 'id'>): AnimationType {
  animCounter += 1;
  return { id: `anim-${animCounter}-${Date.now()}`, ...partial };
}

export function pushAnimation(
  state: GameState,
  partial: Omit<AnimationType, 'id'>
): GameState {
  const next = createAnimation(partial);
  const queue =
    state.animations.length >= 24
      ? [...state.animations.slice(-20), next]
      : [...state.animations, next];
  return { ...state, animations: queue };
}

export function playerAnchor(player: Player): AnimationAnchor {
  return player.isHuman ? { type: 'humanHand' } : { type: 'player', id: player.id };
}

export function dealerReceiveAnchor(state: GameState): AnimationAnchor {
  const dealer = state.players[state.dealerId];
  return dealer?.isHuman
    ? { type: 'humanHand' }
    : { type: 'player', id: state.dealerId };
}

export function chipFromPlayerToDealer(
  state: GameState,
  fromPlayerId: number,
  chipCount: number
): GameState {
  const fromPlayer = state.players[fromPlayerId];
  if (!fromPlayer) return state;
  return pushAnimation(state, {
    kind: 'chipTravel',
    from: playerAnchor(fromPlayer),
    to: dealerReceiveAnchor(state),
    duration: 640,
    count: Math.min(Math.max(chipCount, 2), 8),
  });
}

export function dealAnimationsForRound(state: GameState): GameState {
  let next = state;
  state.players.forEach((p, i) => {
    next = pushAnimation(next, {
      kind: 'cardDeal',
      from: { type: 'tableCenter' },
      to: playerAnchor(p),
      duration: 720,
      count: Math.min(Math.max(Math.ceil(p.cards.length / 3), 2), 5),
      delayIndex: i,
    });
  });
  if (state.deadHand.length > 0) {
    next = pushAnimation(next, {
      kind: 'cardDeal',
      from: { type: 'tableCenter' },
      to: { type: 'deadHand' },
      duration: 720,
      count: 2,
      delayIndex: state.players.length,
    });
  }
  return next;
}

export const LABEL_TO_POT_SECTION: Record<SectionLabel, PotSectionKey> = {
  Ten: 'tenHearts',
  Jack: 'jackHearts',
  Queen: 'queenHearts',
  King: 'kingHearts',
  Ace: 'aceHearts',
  '8-9-10': 'eightNineTen',
  'King-Queen': 'kingQueen',
  Kitty: 'kitty',
  POT: 'pot',
};

export function chipFromPlayerToPot(
  state: GameState,
  playerId: number,
  section: PotSectionKey = 'pot',
  count = 3
): GameState {
  return pushAnimation(state, {
    kind: 'chipTravel',
    from: { type: 'player', id: playerId },
    to: { type: 'pot', section },
    duration: 580,
    count: Math.min(Math.max(count, 1), 6),
  });
}

export function chipFromHumanOrPlayerToPot(
  state: GameState,
  player: Player,
  section: PotSectionKey = 'pot',
  count = 3
): GameState {
  return pushAnimation(state, {
    kind: 'chipTravel',
    from: playerAnchor(player),
    to: { type: 'pot', section },
    duration: 580,
    count: Math.min(Math.max(count, 1), 6),
  });
}

export function chipFromPotToPlayer(
  state: GameState,
  section: PotSectionKey,
  playerId: number,
  count = 5
): GameState {
  const player = state.players[playerId];
  const to: AnimationAnchor = player?.isHuman
    ? { type: 'humanHand' }
    : { type: 'player', id: playerId };
  return pushAnimation(state, {
    kind: 'potSweep',
    from: { type: 'pot', section },
    to,
    duration: 880,
    count: Math.min(Math.max(count, 2), 10),
  });
}

export function cardPlayAnimation(
  state: GameState,
  player: Player,
  card: Card
): GameState {
  return pushAnimation(state, {
    kind: 'cardPlay',
    from: playerAnchor(player),
    to: { type: 'tableCenter' },
    duration: 520,
    card,
  });
}

export function pulsePotSection(section: PotSectionKey): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('tripoley-pot-pulse', { detail: { section } })
  );
}
