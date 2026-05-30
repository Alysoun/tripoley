import {

  createContext,

  useCallback,

  useContext,

  useMemo,

  useRef,

  useState,

  type ReactNode,

} from 'react';

import { Card, GameState, SeatConfig, HouseRules } from '../types/GameTypes';

import type { AchievementPreferences, FeltColor, VictoryFanfareVariant } from '../game/achievements/types';

import { ACHIEVEMENT_DEFINITIONS } from '../game/achievements/definitions';

import {

  getAchievementDisplayProgress,

  recordAiBust,

  recordBlindAuctionWin,

  recordCalculatedRiskSwap,

  recordDeadEyeBuy,

  recordDownToTheWire,

  recordGameStarted,

  recordMichiganLoss,

  recordMichiganWin,

  recordPatiencePays,

  recordPayCardClaims,

  recordPerfectRunTurn,

  recordPokerWin,

  recordPuristGame,

  recordRoundCompleted,

  recordSwiftLead,

} from '../game/achievements/evaluate';

import { getActiveEffects, isFeltUnlocked, preferenceKeyForUnlock, setPreference } from '../game/achievements/effects';

import {

  isUnlocked,

  loadAchievementData,

  saveAchievementData,

} from '../game/achievements/storage';

import {

  AchievementId,

  AchievementSaveData,

  AchievementUnlockEvent,

  ActiveAchievementEffects,

  NO_ACTIVE_EFFECTS,

} from '../game/achievements/types';

import { readAchievementTimerSnapshot } from '../game/achievements/timerSnapshot';

import { rankValue } from '../game/engine/cards';

import { describePayCardsHeld } from '../game/engine/payCards';



interface RoundSessionFlags {

  sequenceTimedOut: boolean;

  leadPassCount: number;

  michiganCardsPlayed: number;

  michiganPhaseStartedAt: number | null;

  michiganCardsThisTurn: number;

  lastMichiganTurnPlayer: number | null;

  pokerHumanHandLabel: string | null;

  pokerHumanFolded: boolean;

  pokerHumanCalledBig: boolean;

}



interface AchievementContextValue {

  data: AchievementSaveData;

  activeEffects: ActiveAchievementEffects;

  pendingUnlocks: AchievementUnlockEvent[];

  dismissUnlock: () => void;

  isSoloSeats: (seats: SeatConfig[]) => boolean;

  startGameAction: (

    seats: SeatConfig[],

    houseRules: HouseRules

  ) => { type: 'START_GAME'; seats: SeatConfig[]; houseRules: HouseRules };

  getProgress: (id: AchievementId) => ReturnType<typeof getAchievementDisplayProgress>;

  unlockedCount: number;

  trackStateTransition: (prev: GameState, next: GameState) => void;

  setFeltColor: (color: FeltColor) => void;

  setVictoryFanfare: (variant: VictoryFanfareVariant) => void;

  togglePreference: (key: keyof AchievementPreferences) => void;

  isUnlockActive: (id: AchievementId) => boolean;

  consumeAdrenalineFreeze: () => void;

  trackGameQuit: (state: GameState) => void;

}



const AchievementContext = createContext<AchievementContextValue | null>(null);



function cloneSaveData(data: AchievementSaveData): AchievementSaveData {

  return JSON.parse(JSON.stringify(data)) as AchievementSaveData;

}



function isSoloSeats(seats: SeatConfig[]): boolean {

  return seats.filter((s) => s.isHuman).length === 1;

}



function humanId(state: GameState): number | null {

  return state.players.find((p) => p.isHuman)?.id ?? null;

}



function hasPairAcesOrBetter(cards: Card[]): boolean {

  const byRank = new Map<string, number>();

  for (const c of cards) {

    byRank.set(c.value, (byRank.get(c.value) ?? 0) + 1);

  }

  if ((byRank.get('A') ?? 0) >= 2) return true;

  for (const [rank, count] of byRank) {

    if (count >= 2 && rankValue(rank as Card['value']) >= rankValue('Q')) return true;

  }

  for (const count of byRank.values()) {

    if (count >= 3) return true;

  }

  return false;

}



const emptyRound = (): RoundSessionFlags => ({

  sequenceTimedOut: false,

  leadPassCount: 0,

  michiganCardsPlayed: 0,

  michiganPhaseStartedAt: null,

  michiganCardsThisTurn: 0,

  lastMichiganTurnPlayer: null,

  pokerHumanHandLabel: null,

  pokerHumanFolded: false,

  pokerHumanCalledBig: false,

});



export function AchievementProvider({ children }: { children: ReactNode }) {

  const [data, setData] = useState<AchievementSaveData>(() => loadAchievementData());

  const [pendingUnlocks, setPendingUnlocks] = useState<AchievementUnlockEvent[]>([]);

  const [soloSessionActive, setSoloSessionActive] = useState(false);

  const [effectTick, setEffectTick] = useState(0);



  const lastRoundNumber = useRef(0);

  const sessionRoundCount = useRef(0);

  const roundFlags = useRef<RoundSessionFlags>(emptyRound());

  const adrenalineFreezeMs = useRef(0);

  const sequenceTimerOffForGame = useRef(false);



  const persist = useCallback((next: AchievementSaveData, unlocks: AchievementUnlockEvent[]) => {

    saveAchievementData(next);

    setData(next);

    if (unlocks.length > 0) {

      setPendingUnlocks((queue) => [...queue, ...unlocks]);

    }

  }, []);



  const activeEffects = useMemo(

    () =>

      soloSessionActive

        ? getActiveEffects(data, adrenalineFreezeMs.current)

        : NO_ACTIVE_EFFECTS,

    [data, soloSessionActive, effectTick]

  );



  const unlockedCount = useMemo(

    () => ACHIEVEMENT_DEFINITIONS.filter((def) => isUnlocked(data, def.id)).length,

    [data]

  );



  const resetSession = useCallback(() => {

    lastRoundNumber.current = 0;

    sessionRoundCount.current = 0;

    roundFlags.current = emptyRound();

    adrenalineFreezeMs.current = 0;

    sequenceTimerOffForGame.current = false;

  }, []);



  const consumeAdrenalineFreeze = useCallback(() => {

    if (adrenalineFreezeMs.current > 0) {

      adrenalineFreezeMs.current = 0;

      setEffectTick((t) => t + 1);

    }

  }, []);



  const startGameAction = useCallback(

    (seats: SeatConfig[], houseRules: HouseRules) => {

      resetSession();

      const solo = isSoloSeats(seats);

      setSoloSessionActive(solo);

      sequenceTimerOffForGame.current = !houseRules.michiganSequenceTimer;

      if (solo) {

        const draft = cloneSaveData(data);

        const unlocks = recordGameStarted(draft);

        persist(draft, unlocks);

      } else {

        setSoloSessionActive(false);

      }

      return { type: 'START_GAME' as const, seats, houseRules };

    },

    [data, persist, resetSession]

  );



  const setFeltColor = useCallback(

    (color: FeltColor) => {

      if (!isFeltUnlocked(data, color)) return;

      const draft = cloneSaveData(data);

      setPreference(draft, 'feltColor', color);

      persist(draft, []);

    },

    [data, persist]

  );



  const setVictoryFanfare = useCallback(

    (variant: VictoryFanfareVariant) => {

      if (!isUnlocked(data, 'last_man_standing')) return;

      const draft = cloneSaveData(data);

      setPreference(draft, 'victoryFanfare', variant);

      persist(draft, []);

    },

    [data, persist]

  );



  const togglePreference = useCallback(

    (key: keyof AchievementPreferences) => {

      const draft = cloneSaveData(data);

      const pref = draft.preferences[key];

      if (typeof pref === 'boolean') {

        setPreference(draft, key, !pref);

        persist(draft, []);

      }

    },

    [data, persist]

  );



  const isUnlockActive = useCallback(

    (id: AchievementId) => {

      if (!isUnlocked(data, id)) return false;

      const def = ACHIEVEMENT_DEFINITIONS.find((d) => d.id === id);

      if (!def) return false;

      const prefKey = preferenceKeyForUnlock(def.unlock);

      if (def.unlock === 'fanfare_picker') {

        return data.preferences.victoryFanfare !== 'classic';

      }

      if (prefKey && typeof data.preferences[prefKey] === 'boolean') {

        return data.preferences[prefKey] as boolean;

      }

      if (def.unlock.startsWith('felt_')) {

        const color =

          def.unlock === 'felt_tabby'

            ? 'tabby'

            : def.unlock === 'felt_royal'

              ? 'royal'

              : 'vaporwave';

        return data.preferences.feltColor === color;

      }

      return true;

    },

    [data]

  );



  const trackGameQuit = useCallback(

    (state: GameState) => {

      if (!state.isSoloSession || !sequenceTimerOffForGame.current) return;

      const draft = cloneSaveData(data);

      persist(draft, recordPuristGame(draft));

    },

    [data, persist]

  );



  const trackStateTransition = useCallback(

    (prev: GameState, next: GameState) => {

      if (!next.isSoloSession) return;

      const hid = humanId(next);

      if (hid === null) return;



      const flags = roundFlags.current;

      let draft = cloneSaveData(data);

      let unlocks: AchievementUnlockEvent[] = [];



      if (next.phase === 'gameOver') {

        for (const p of next.players) {

          if (!p.isHuman && p.chips <= 0) {

            unlocks.push(...recordAiBust(draft));

          }

        }

        if (sequenceTimerOffForGame.current) {

          unlocks.push(...recordPuristGame(draft));

        }

        persist(draft, unlocks);

        return;

      }



      if (next.roundNumber > lastRoundNumber.current && next.roundNumber > 1) {

        lastRoundNumber.current = next.roundNumber;

        sessionRoundCount.current += 1;

        unlocks.push(...recordRoundCompleted(draft, sessionRoundCount.current));

        roundFlags.current = emptyRound();

        persist(draft, unlocks);

        draft = cloneSaveData(data);

        unlocks = [];

      }

      if (next.roundNumber === 1 && lastRoundNumber.current === 0) {

        lastRoundNumber.current = 1;

        sessionRoundCount.current = 1;

      }



      if (next.achievementSession?.sequenceTimedOut) {

        flags.sequenceTimedOut = true;

      }



      if (next.phase === 'michigan' && prev.phase !== 'michigan') {

        flags.michiganPhaseStartedAt = Date.now();

        flags.michiganCardsPlayed = 0;

        flags.michiganCardsThisTurn = 0;

        flags.lastMichiganTurnPlayer = null;

      }



      if (next.phase === 'michigan' && prev.phase === 'poker') {

        flags.pokerHumanFolded = prev.poker.folded[hid] ?? false;

        flags.pokerHumanHandLabel = prev.poker.lastHandLabel || null;

      }



      if (prev.phase === 'blindAuction' && next.phase === 'payCards') {

        if (prev.blindAuction.highBidder === hid) {

          unlocks.push(...recordBlindAuctionWin(draft));

          if (describePayCardsHeld(prev.deadHand).length >= 3) {

            unlocks.push(...recordDeadEyeBuy(draft));

          }

        }

      }



      if (prev.phase === 'dealerBlindChoice' && next.phase !== 'dealerBlindChoice') {

        const before = prev.players[hid]?.cards ?? [];

        if (

          prev.dealerId === hid &&

          hasPairAcesOrBetter(before) &&

          before.length > 0

        ) {

          const after = next.players[hid]?.cards ?? [];

          const swapped = after.some((c, i) => c.id !== before[i]?.id);

          if (swapped) unlocks.push(...recordCalculatedRiskSwap(draft));

        }

      }



      const newClaims = next.payCardClaims.length - prev.payCardClaims.length;

      if (newClaims > 0) {

        const humanNew = next.payCardClaims

          .slice(prev.payCardClaims.length)

          .filter((c) => c.playerId === hid).length;

        if (humanNew > 0) {

          unlocks.push(...recordPayCardClaims(draft, humanNew));

        }

      }



      if (!prev.poker.roundComplete && next.poker.roundComplete && next.poker.winners.includes(hid)) {

        const allFolded = next.players.every(

          (p) => p.id === hid || next.poker.folded[p.id]

        );

        unlocks.push(

          ...recordPokerWin(draft, prev.pot.pot, flags.pokerHumanHandLabel, {

            allOpponentsFolded: allFolded,

            ironWillCall: flags.pokerHumanCalledBig,

          })

        );

      }



      if (

        prev.phase === 'michigan' &&

        next.phase === 'announcement' &&

        next.announcement?.title === 'Michigan Rummy — Winner'

      ) {

        if (next.roundWinnerId === hid) {

          unlocks.push(

            ...recordMichiganWin(draft, {

              noSequenceTimeout: !flags.sequenceTimedOut,

              cardsPlayed: flags.michiganCardsPlayed,

            })

          );

        } else {

          unlocks.push(...recordMichiganLoss(draft));

        }

      }



      if (prev.phase === 'michigan' && next.phase === 'michigan') {

        const played =

          next.michiganShownPlays[hid]?.id &&

          next.michiganShownPlays[hid]?.id !== prev.michiganShownPlays[hid]?.id;



        if (played) {

          flags.michiganCardsPlayed += 1;



          if (flags.lastMichiganTurnPlayer !== hid) {

            flags.michiganCardsThisTurn = 1;

            flags.lastMichiganTurnPlayer = hid;

          } else {

            flags.michiganCardsThisTurn += 1;

          }



          if (flags.michiganCardsThisTurn >= 4) {

            unlocks.push(...recordPerfectRunTurn(draft));

          }



          if (

            flags.michiganPhaseStartedAt &&

            flags.michiganCardsPlayed === 1 &&

            Date.now() - flags.michiganPhaseStartedAt <= 500

          ) {

            unlocks.push(...recordSwiftLead(draft));

          }



          const remaining = readAchievementTimerSnapshot();

          if (remaining !== null && remaining < 1000) {

            unlocks.push(...recordDownToTheWire(draft));

            adrenalineFreezeMs.current = 2000;

            setEffectTick((t) => t + 1);

          }

        }



        const leadPasses = next.achievementSession?.humanLeadPasses ?? 0;
        const prevLeadPasses = prev.achievementSession?.humanLeadPasses ?? 0;
        if (leadPasses > prevLeadPasses) {
          const human = next.players[hid];
          if (human && human.chips >= 50 && leadPasses >= 3) {
            unlocks.push(...recordPatiencePays(draft));
          }
        }
      }



      if (prev.phase === 'poker' && next.phase === 'poker') {

        const prevBet = prev.poker.playerBets[hid] ?? 0;

        const nextBet = next.poker.playerBets[hid] ?? 0;

        if (next.poker.currentBet >= 15 && nextBet > prevBet && nextBet >= next.poker.currentBet) {

          flags.pokerHumanCalledBig = true;

        }

      }



      for (const p of next.players) {

        if (!p.isHuman && p.chips <= 0 && (prev.players[p.id]?.chips ?? 0) > 0) {

          unlocks.push(...recordAiBust(draft));

        }

      }



      if (unlocks.length > 0) persist(draft, unlocks);

    },

    [data, persist]

  );



  const value: AchievementContextValue = {

    data,

    activeEffects,

    pendingUnlocks,

    dismissUnlock: () => setPendingUnlocks((q) => q.slice(1)),

    isSoloSeats,

    startGameAction,

    getProgress: (id) => getAchievementDisplayProgress(data, id),

    unlockedCount,

    trackStateTransition,

    setFeltColor,

    setVictoryFanfare,

    togglePreference,

    isUnlockActive,

    consumeAdrenalineFreeze,

    trackGameQuit,

  };



  return (

    <AchievementContext.Provider value={value}>{children}</AchievementContext.Provider>

  );

}



export function useAchievements(): AchievementContextValue {

  const ctx = useContext(AchievementContext);

  if (!ctx) {

    throw new Error('useAchievements must be used within AchievementProvider');

  }

  return ctx;

}


