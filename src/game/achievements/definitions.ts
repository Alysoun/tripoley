import { AchievementDef } from './types';



export const ACHIEVEMENT_DEFINITIONS: AchievementDef[] = [

  {

    id: 'cool_head',

    title: 'Cool Head',

    description: 'Win a Michigan round without a single sequence timeout.',

    perkLabel: '+3s turn timer buffer',

    unlock: 'timer_bonus_3s',

    category: 'time',

  },

  {

    id: 'table_regular',

    title: 'Table Regular',

    description: 'Complete 10 full rounds in a single session.',

    perkLabel: '+4s turn timer buffer',

    unlock: 'timer_bonus_4s',

    target: 10,

    category: 'time',

  },

  {

    id: 'calculated_risk',

    title: 'Calculated Risk',

    description: 'Swap with the blind hand when your original hand held a pair of Aces or better.',

    perkLabel: 'Faint trace on last suit played',

    unlock: 'faint_trace',

    category: 'time',

  },

  {

    id: 'down_to_the_wire',

    title: 'Down to the Wire',

    description: 'Play a valid Michigan card with less than 1 second on the timer.',

    perkLabel: '+2s freeze on your next sequence card',

    unlock: 'adrenaline_buffer',

    category: 'time',

  },

  {

    id: 'patience_pays',

    title: 'Patience Pays',

    description: 'Pass the lead 3 times in one game while staying above 50 chips.',

    perkLabel: '1s grace before countdown starts',

    unlock: 'grace_interval',

    category: 'time',

  },

  {

    id: 'grand_strategist',

    title: 'Grand Strategist',

    description: 'Win Michigan after personally playing 8 or more cards.',

    perkLabel: 'Toggle suit-length peek cues',

    unlock: 'suit_peek_cues',

    category: 'time',

  },

  {

    id: 'kitty_cat',

    title: 'Kitty Cat',

    description: 'Win the Michigan Kitty once.',

    perkLabel: 'Tabby orange felt',

    unlock: 'felt_tabby',

    category: 'cosmetic',

  },

  {

    id: 'high_roller',

    title: 'High Roller',

    description: 'Win a poker showdown pot of 24 chips or more.',

    perkLabel: 'Midnight royal blue felt',

    unlock: 'felt_royal',

    category: 'cosmetic',

  },

  {

    id: 'perfect_run',

    title: 'Perfect Run',

    description: 'Play 4 or more cards in a single Michigan turn.',

    perkLabel: 'Neon chip tracers',

    unlock: 'neon_tracers',

    category: 'cosmetic',

  },

  {

    id: 'auction_master',

    title: 'Auction Master',

    description: 'Win 5 blind hand auctions across your profile.',

    perkLabel: 'Gilded HUD nameplate trim',

    unlock: 'gilded_borders',

    target: 5,

    category: 'cosmetic',

  },

  {

    id: 'the_purist',

    title: 'The Purist',

    description: 'Complete a full game with the sequence timer turned off.',

    perkLabel: 'Vaporwave felt preset',

    unlock: 'felt_vaporwave',

    category: 'cosmetic',

  },

  {

    id: 'sound_machine',

    title: 'Sound Machine',

    description: 'Trigger 15 pay-card claims across solo play.',

    perkLabel: '8-bit synth sound pack',

    unlock: 'retro_sounds',

    target: 15,

    category: 'cosmetic',

  },

  {

    id: 'clean_sweep',

    title: 'Clean Sweep',

    description: 'Win a poker pot where every opponent folded before showdown.',

    perkLabel: 'POT sparkler on poker wins',

    unlock: 'pot_firework',

    category: 'cosmetic',

  },

  {

    id: 'poker_face',

    title: 'Poker Face',

    description: 'Win poker with a full house or better.',

    perkLabel: 'Toggle sort hand by rank',

    unlock: 'sort_by_rank',

    category: 'qol',

  },

  {

    id: 'heart_hunter',

    title: 'Heart Hunter',

    description: 'Claim 15 pay-card bonuses across your profile.',

    perkLabel: 'Red scan — bump hearts/diamonds forward in poker',

    unlock: 'red_scan',

    target: 15,

    category: 'qol',

  },

  {

    id: 'iron_will',

    title: 'Iron Will',

    description: 'Call a 15+ chip bet and win the showdown.',

    perkLabel: 'Opponent hand-size tracker',

    unlock: 'opponent_counts',

    category: 'qol',

  },

  {

    id: 'dead_eye',

    title: 'Dead Eye',

    description: 'Buy a blind auction where the dead hand held 3+ pay cards.',

    perkLabel: 'Ghost counter on dead hand stack',

    unlock: 'ghost_counter',

    category: 'qol',

  },

  {

    id: 'veteran',

    title: 'Veteran',

    description: 'Complete 40 rounds across your save profile.',

    perkLabel: 'Enlarged action buttons on your turn',

    unlock: 'action_focus',

    target: 40,

    category: 'qol',

  },

  {

    id: 'swift_lead',

    title: 'Swift Lead',

    description: 'Play the opening Michigan card within 500ms of the phase starting.',

    perkLabel: '50% faster hand fan animations',

    unlock: 'instant_fan',

    category: 'qol',

  },

  {

    id: 'last_man_standing',

    title: 'Last Man Standing',

    description: 'Bust an AI opponent down to exactly 0 chips.',

    perkLabel: 'Victory fanfare style picker',

    unlock: 'fanfare_picker',

    category: 'qol',

  },

];



export const ACHIEVEMENT_BY_ID = Object.fromEntries(

  ACHIEVEMENT_DEFINITIONS.map((def) => [def.id, def])

) as Record<(typeof ACHIEVEMENT_DEFINITIONS)[number]['id'], AchievementDef>;



export const UNLOCK_FOR_ACHIEVEMENT = Object.fromEntries(

  ACHIEVEMENT_DEFINITIONS.map((def) => [def.id, def.unlock])

) as Record<AchievementDef['id'], AchievementDef['unlock']>;


