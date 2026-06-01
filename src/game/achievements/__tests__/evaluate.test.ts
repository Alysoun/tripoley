import { describe, expect, it } from 'vitest';
import { ACHIEVEMENT_DEFINITIONS } from '../definitions';
import {
  recordAiBust,
  recordBlindAuctionWin,
  recordCalculatedRiskSwap,
  recordDeadEyeBuy,
  recordDownToTheWire,
  recordMichiganWin,
  recordPatiencePays,
  recordPayCardClaims,
  recordPerfectRunTurn,
  recordPokerWin,
  recordPuristGame,
  recordRoundCompleted,
  recordSwiftLead,
} from '../evaluate';
import { defaultSaveData } from '../storage';
import type { AchievementId } from '../types';

function freshSave() {
  return defaultSaveData();
}

function unlockedIds(data: ReturnType<typeof freshSave>): AchievementId[] {
  return ACHIEVEMENT_DEFINITIONS.filter((def) => data.achievements[def.id].unlockedAt != null).map(
    (def) => def.id
  );
}

function unlockEvents(...calls: Array<(data: ReturnType<typeof freshSave>) => void>) {
  const data = freshSave();
  const events = calls.flatMap((call) => {
    call(data);
    return [];
  });
  return { data, events };
}

describe('achievement evaluate unlocks', () => {
  it('does not double-unlock the same achievement', () => {
    const data = freshSave();
    recordPayCardClaims(data, 15);
    expect(unlockedIds(data)).toContain('sound_machine');
    recordPayCardClaims(data, 5);
    expect(unlockedIds(data).filter((id) => id === 'sound_machine')).toHaveLength(1);
  });

  it('unlocks cumulative stat achievements at their targets', () => {
    const data = freshSave();
    for (let i = 0; i < 10; i += 1) {
      recordRoundCompleted(data, i + 1);
    }
    expect(unlockedIds(data)).toContain('table_regular');

    const veteran = freshSave();
    for (let i = 0; i < 40; i += 1) {
      recordRoundCompleted(veteran, 1);
    }
    expect(unlockedIds(veteran)).toContain('veteran');

    const auction = freshSave();
    for (let i = 0; i < 5; i += 1) {
      recordBlindAuctionWin(auction);
    }
    expect(unlockedIds(auction)).toContain('auction_master');

    const claims = freshSave();
    recordPayCardClaims(claims, 15);
    expect(unlockedIds(claims)).toEqual(
      expect.arrayContaining(['sound_machine', 'heart_hunter'])
    );
  });

  it('unlocks event-based achievements from direct stat recorders', () => {
    const data = freshSave();

    recordMichiganWin(data, { noSequenceTimeout: true, cardsPlayed: 8 });
    expect(unlockedIds(data)).toEqual(
      expect.arrayContaining(['kitty_cat', 'cool_head', 'grand_strategist'])
    );

    recordCalculatedRiskSwap(data);
    expect(unlockedIds(data)).toContain('calculated_risk');

    recordDownToTheWire(data);
    expect(unlockedIds(data)).toContain('down_to_the_wire');

    recordPatiencePays(data);
    expect(unlockedIds(data)).toContain('patience_pays');

    recordPerfectRunTurn(data);
    expect(unlockedIds(data)).toContain('perfect_run');

    recordPuristGame(data);
    expect(unlockedIds(data)).toContain('the_purist');

    recordSwiftLead(data);
    expect(unlockedIds(data)).toContain('swift_lead');

    recordDeadEyeBuy(data);
    expect(unlockedIds(data)).toContain('dead_eye');

    recordAiBust(data);
    expect(unlockedIds(data)).toContain('last_man_standing');
  });

  it('unlocks kitty whisperer after 50 kitty wins (profile-wide)', () => {
    const data = freshSave();
    for (let i = 0; i < 50; i += 1) {
      recordMichiganWin(data, { noSequenceTimeout: false, cardsPlayed: 1 });
    }
    expect(unlockedIds(data)).toContain('kitty_whisperer');
  });

  it('tracks poker wins separately for showdown vs fold pots', () => {
    const foldWin = freshSave();
    recordPokerWin(foldWin, 30, null, {
      allOpponentsFolded: true,
      ironWillCall: false,
      isShowdown: false,
    });
    expect(unlockedIds(foldWin)).toContain('clean_sweep');
    expect(unlockedIds(foldWin)).not.toContain('high_roller');
    expect(foldWin.stats.largestPokerPot).toBe(0);

    const showdown = freshSave();
    recordPokerWin(showdown, 24, 'Kings Full of Twos', {
      allOpponentsFolded: false,
      ironWillCall: true,
      isShowdown: true,
    });
    expect(unlockedIds(showdown)).toEqual(
      expect.arrayContaining(['high_roller', 'poker_face', 'iron_will'])
    );
    expect(unlockedIds(showdown)).not.toContain('clean_sweep');
    expect(showdown.stats.largestPokerPot).toBe(24);
  });

  it('requires full house or better for poker face', () => {
    const data = freshSave();
    recordPokerWin(data, 10, 'Two Pair, Kings and Nines', {
      allOpponentsFolded: false,
      ironWillCall: false,
      isShowdown: true,
    });
    expect(unlockedIds(data)).not.toContain('poker_face');

    recordPokerWin(data, 10, 'Kings Full of Twos', {
      allOpponentsFolded: false,
      ironWillCall: false,
      isShowdown: true,
    });
    expect(unlockedIds(data)).toContain('poker_face');
  });

  it('can unlock every achievement through deterministic recorders or targets', () => {
    const unlocked = new Set<AchievementId>();

    for (const def of ACHIEVEMENT_DEFINITIONS) {
      const data = freshSave();

      switch (def.id) {
        case 'table_regular':
          for (let i = 0; i < 10; i += 1) recordRoundCompleted(data, i + 1);
          break;
        case 'veteran':
          for (let i = 0; i < 40; i += 1) recordRoundCompleted(data, 1);
          break;
        case 'auction_master':
          for (let i = 0; i < 5; i += 1) recordBlindAuctionWin(data);
          break;
        case 'sound_machine':
        case 'heart_hunter':
          recordPayCardClaims(data, 15);
          break;
        case 'cool_head':
          recordMichiganWin(data, { noSequenceTimeout: true, cardsPlayed: 1 });
          break;
        case 'grand_strategist':
          recordMichiganWin(data, { noSequenceTimeout: false, cardsPlayed: 8 });
          break;
        case 'kitty_cat':
          recordMichiganWin(data, { noSequenceTimeout: false, cardsPlayed: 1 });
          break;
        case 'kitty_whisperer':
          for (let i = 0; i < 50; i += 1) {
            recordMichiganWin(data, { noSequenceTimeout: false, cardsPlayed: 1 });
          }
          break;
        case 'high_roller':
          recordPokerWin(data, 24, null, {
            allOpponentsFolded: false,
            ironWillCall: false,
            isShowdown: true,
          });
          break;
        case 'clean_sweep':
          recordPokerWin(data, 12, null, {
            allOpponentsFolded: true,
            ironWillCall: false,
            isShowdown: false,
          });
          break;
        case 'poker_face':
          recordPokerWin(data, 8, 'Four of a Kind', {
            allOpponentsFolded: false,
            ironWillCall: false,
            isShowdown: true,
          });
          break;
        case 'iron_will':
          recordPokerWin(data, 20, 'Pair of Kings', {
            allOpponentsFolded: false,
            ironWillCall: true,
            isShowdown: true,
          });
          break;
        default:
          ({
            calculated_risk: () => recordCalculatedRiskSwap(data),
            down_to_the_wire: () => recordDownToTheWire(data),
            patience_pays: () => recordPatiencePays(data),
            perfect_run: () => recordPerfectRunTurn(data),
            the_purist: () => recordPuristGame(data),
            dead_eye: () => recordDeadEyeBuy(data),
            swift_lead: () => recordSwiftLead(data),
            last_man_standing: () => recordAiBust(data),
          }[def.id]?.());
      }

      expect(data.achievements[def.id].unlockedAt, def.id).not.toBeNull();
      unlocked.add(def.id);
    }

    expect(unlocked.size).toBe(ACHIEVEMENT_DEFINITIONS.length);
  });
});

describe('achievement evaluate (noop helper)', () => {
  it('keeps unlockEvents helper usable for future expansion', () => {
    const { data } = unlockEvents((d) => recordSwiftLead(d));
    expect(unlockedIds(data)).toContain('swift_lead');
  });
});
