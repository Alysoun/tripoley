import { describe, expect, it } from 'vitest';
import { createCard } from '../cards';
import {
  createEmptyPot,
  resolvePayCardClaimOnPlay,
  resolvePayCardClaims,
  handHasPayCard,
} from '../payCards';
import { OFFICIAL_HOUSE_RULES, HOME_TABLE_HOUSE_RULES } from '../houseRules';

const h = (value: string) => createCard('hearts', value as 'K');
const rules = { deadHandBlocksPayCards: true };

describe('payCards', () => {
  it('detects pay cards in a hand', () => {
    expect(handHasPayCard([h('K')])).toBe(true);
    expect(handHasPayCard([createCard('spades', '2')])).toBe(false);
  });

  it('resolves official deal-time claims in Tripoley order', () => {
    const pot = createEmptyPot();
    pot.kingHearts = 5;
    pot.queenHearts = 7;
    pot.kingQueen = 9;

    const hands = [
      [createCard('spades', '2')],
      [h('K'), h('Q')],
    ];

    const { claims, playerChipDeltas, pot: nextPot } = resolvePayCardClaims(
      hands,
      [],
      pot,
      rules
    );

    expect(claims).toHaveLength(3);
    expect(playerChipDeltas[1]).toBe(5 + 7 + 9);
    expect(nextPot.kingHearts).toBe(0);
    expect(nextPot.queenHearts).toBe(0);
    expect(nextPot.kingQueen).toBe(0);
  });

  it('blocks claims when matching card is in the dead hand', () => {
    const pot = createEmptyPot();
    pot.aceHearts = 4;

    const { claims, pot: nextPot } = resolvePayCardClaims(
      [[h('A')]],
      [h('A')],
      pot,
      rules
    );

    expect(claims).toHaveLength(0);
    expect(nextPot.aceHearts).toBe(4);
  });

  it('awards King-Queen combo when playing K or Q with both held (home rule)', () => {
    const pot = createEmptyPot();
    pot.kingHearts = 9;
    pot.kingQueen = 12;
    const hand = [h('K'), h('Q')];

    const playingKing = resolvePayCardClaimOnPlay(
      h('K'),
      hand,
      [],
      pot,
      0,
      'Player 1',
      rules
    );

    expect(playingKing.claims).toHaveLength(2);
    expect(playingKing.claims.map((c) => c.section).sort()).toEqual(['kingHearts', 'kingQueen']);
    expect(playingKing.claims.reduce((s, c) => s + c.amount, 0)).toBe(21);
    expect(playingKing.pot.kingHearts).toBe(0);
    expect(playingKing.pot.kingQueen).toBe(0);
  });

  it('awards only queen section when Q played after K already played', () => {
    const pot = createEmptyPot();
    pot.queenHearts = 8;
    pot.kingQueen = 12;
    const handBeforeQ = [h('Q')];

    const result = resolvePayCardClaimOnPlay(
      h('Q'),
      handBeforeQ,
      [],
      pot,
      0,
      'Player 1',
      rules
    );

    expect(result.claims).toHaveLength(1);
    expect(result.claims[0].section).toBe('queenHearts');
    expect(result.pot.kingQueen).toBe(12);
  });

  it('does not use deal-time claims when pay-on-play home rule is enabled at phase start', () => {
    expect(HOME_TABLE_HOUSE_RULES.payCardsOnMichiganPlay).toBe(true);
    expect(OFFICIAL_HOUSE_RULES.payCardsOnMichiganPlay).toBe(false);
  });
});
