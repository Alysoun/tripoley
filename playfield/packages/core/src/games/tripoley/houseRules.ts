/** House-rule presets and toggles for Tripoley / Michigan Rummy variants. */

export type HouseRulesPreset = 'official' | 'homeTable' | 'custom';

export interface HouseRules {
  preset: HouseRulesPreset;
  /** Official: claim pay sections when held after deal. Home: claim when played in Michigan. */
  payCardsOnMichiganPlay: boolean;
  /** Cards in the dead hand prevent matching pay-card claims. */
  deadHandBlocksPayCards: boolean;
  /** Countdown on the next card in a suit sequence; expiry treats it as dead-hand. */
  michiganSequenceTimer: boolean;
  /** Cannot lead required color → pay 1 chip to POT and pass left. */
  michiganLeadPassPenalty: boolean;
  /** Losers pay 1 chip per card left when someone wins the Kitty. */
  michiganRemainingCardPenalty: boolean;
  /** Show explicit "Keep" on dealer blind choice (auction still implies keep on no sale). */
  dealerBlindKeepOption: boolean;
  /** Achievement unlock: inject dead-hand cards into Michigan hands at phase start. */
  blindSwapShuffle: boolean;
}

export const OFFICIAL_HOUSE_RULES: HouseRules = {
  preset: 'official',
  payCardsOnMichiganPlay: false,
  deadHandBlocksPayCards: true,
  michiganSequenceTimer: true,
  michiganLeadPassPenalty: true,
  michiganRemainingCardPenalty: true,
  dealerBlindKeepOption: false,
  blindSwapShuffle: false,
};

export const HOME_TABLE_HOUSE_RULES: HouseRules = {
  preset: 'homeTable',
  payCardsOnMichiganPlay: true,
  deadHandBlocksPayCards: true,
  michiganSequenceTimer: true,
  michiganLeadPassPenalty: true,
  michiganRemainingCardPenalty: true,
  dealerBlindKeepOption: false,
  blindSwapShuffle: false,
};

export const HOUSE_RULE_PRESETS: Record<
  Exclude<HouseRulesPreset, 'custom'>,
  { label: string; description: string; rules: HouseRules }
> = {
  official: {
    label: 'Standard (pay at deal)',
    description:
      'Pay cards when held after the blind deal. Michigan uses black/red lead with pass penalties.',
    rules: OFFICIAL_HOUSE_RULES,
  },
  homeTable: {
    label: 'Home table',
    description:
      'Pay-card pots collected when you play the card in Michigan — not just for holding it.',
    rules: HOME_TABLE_HOUSE_RULES,
  },
};

export const HOUSE_RULE_TOGGLES: {
  key: keyof Omit<HouseRules, 'preset'>;
  label: string;
  hint: string;
}[] = [
  {
    key: 'payCardsOnMichiganPlay',
    label: 'Pay cards on Michigan play',
    hint: 'Heart / 8-9-10 / K-Q pots pay out when the card is played, not at deal time.',
  },
  {
    key: 'deadHandBlocksPayCards',
    label: 'Dead hand blocks pay cards',
    hint: 'Matching cards in the blind hand prevent that section from paying out.',
  },
  {
    key: 'michiganSequenceTimer',
    label: 'Michigan sequence timer',
    hint: 'If the next sequence card is not played in 15 seconds, treat it as in the dead hand.',
  },
  {
    key: 'michiganLeadPassPenalty',
    label: 'Michigan lead pass penalty',
    hint: 'Pay 1 to the Kitty when you cannot lead the required black/red card.',
  },
  {
    key: 'michiganRemainingCardPenalty',
    label: 'Penalty for leftover cards',
    hint: 'Pay the Kitty winner 1 chip per card still in your hand.',
  },
  {
    key: 'dealerBlindKeepOption',
    label: 'Dealer "Keep" blind option',
    hint: 'Show an explicit Keep button (auction still keeps your hand if no one buys).',
  },
];

export function defaultHouseRules(): HouseRules {
  return { ...OFFICIAL_HOUSE_RULES };
}

export function rulesFromPreset(preset: Exclude<HouseRulesPreset, 'custom'>): HouseRules {
  return { ...HOUSE_RULE_PRESETS[preset].rules };
}

export function mergeHouseRules(base: HouseRules, patch: Partial<HouseRules>): HouseRules {
  return { ...base, ...patch, preset: patch.preset ?? (base.preset === 'custom' ? 'custom' : base.preset) };
}

export function summarizeHouseRules(rules: HouseRules): string {
  if (rules.preset === 'official') return HOUSE_RULE_PRESETS.official.label;
  if (rules.preset === 'homeTable') return HOUSE_RULE_PRESETS.homeTable.label;
  const bits: string[] = [];
  if (rules.payCardsOnMichiganPlay) bits.push('pay on play');
  if (!rules.deadHandBlocksPayCards) bits.push('dead hand ignored');
  if (!rules.michiganSequenceTimer) bits.push('no sequence timer');
  if (!rules.michiganLeadPassPenalty) bits.push('no lead penalty');
  if (!rules.michiganRemainingCardPenalty) bits.push('no leftover penalty');
  if (rules.dealerBlindKeepOption) bits.push('dealer keep');
  if (rules.blindSwapShuffle) bits.push('blind swap shuffle');
  return bits.length ? `Custom (${bits.join(', ')})` : 'Custom';
}
