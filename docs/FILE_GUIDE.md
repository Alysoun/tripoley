# Pot Wheel Rummy (Tripoley) — file guide

What each important file or folder does, and **why it exists**.  
The live app is branded **Pot Wheel Rummy**; the repo folder and GitHub Pages path stay **`tripoley`**.

**Not listed:** `node_modules/`, `dist/`, and individual card SVG filenames — those are tooling or art assets, not game logic.

---

## How the repo is split

| Layer | Path | Role |
|-------|------|------|
| **Game engine** | `playfield/packages/core/src/games/tripoley/` | Pure TypeScript rules, chips, phases, AI. No React. |
| **Browser app** | `src/` | React UI, achievements, layout, sounds, session save. Calls `@playfield/core`. |
| **Shared monorepo** | `playfield/packages/core/` (rest) | Deck utilities + **Euchre** engine in the same package. **Do not break Euchre** when editing Tripoley. |

Canonical SDK edits often start at `Games/playfield/`; this app **vendors** a copy under `tripoley/playfield/` for deploy. Run `npm run sync-playfield` after upstream changes.

---

## Round flow (engine phases)

Understanding phases helps you find the right file:

```
setup → dealerBlindChoice → [blindAuction] → payCards → poker → michigan
      → announcement / roundSummary → (next deal) → gameOver
```

Each phase has actions in `reducer.ts`; AI decisions in `ai.ts`; UI buttons in `PlayerActionBar.tsx` / modals.

---

## Root — config & entry

| File | What it does | Why it's here |
|------|----------------|---------------|
| `package.json` | Scripts: `dev`, `build`, `deploy`, `test`, `test:sim`, `smoke` | Orchestrates app + linked `@playfield/core` |
| `package-lock.json` | Locked dependency versions | Reproducible installs |
| `index.html` | Vite shell; loads `src/main.tsx` | SPA mount point |
| `vite.config.ts` | Base path `/tripoley/` for GitHub Pages; Vitest for `src/**/*.test.ts` | Local URL must match production |
| `tsconfig.json` | TypeScript for React app | Type-check `src/` |
| `README.md` | Setup, testing, debug overrides | First stop for humans |

---

## Docs

| File | What it does | Why it's here |
|------|----------------|---------------|
| `docs/FILE_GUIDE.md` | This file | Map of the codebase |
| `docs/PLAYFIELD.md` | Vendored SDK / sync notes | Monorepo relationship |
| `docs/STATUS.md` | Feature / issue snapshot | Project status |
| `docs/rummy_royal_notes.txt` | Design / rules notes | Reference material |

---

## Scripts (`scripts/`)

| File | What it does | Why it's here |
|------|----------------|---------------|
| `syncPublicAssets.mjs` | Copies `src/components/cards/` → `public/assets/cards/` | Vite serves static assets from `public/` |
| `sync-playfield-sdk.mjs` | Refresh vendored `playfield/` | Clones without bundled SDK |
| `generateNameData.ts` | Build opponent name JSON | Offline name generation |
| `downloadSSANames.ts` | Fetch SSA baby-name data | Optional name list refresh |
| `smoke.mjs` | Pre-push: sync, tests, production build | CI / deploy gate |
| `buildCatWalkStrip.py` | Build cat-walk animation strip asset | One-off / art pipeline helper |
| `tsconfig.json` | TS config for scripts | Run scripts with `ts-node` |

---

## Playfield core — shared (`playfield/packages/core/`)

| File | What it does | Why it's here |
|------|----------------|---------------|
| `package.json` | `@playfield/core` exports `./tripoley` and `./euchre` | Dual-game package |
| `tsconfig.json` / `vitest.config.ts` | Build + test both games | Shared test runner |
| `src/index.ts` | Re-exports deck, config, Tripoley, Euchre namespace | Package entry |
| `src/config.ts` | `configurePlayfield()` — starting chips, turn timer ms | App/debug overrides via `playfieldClient.ts` |
| `src/types/cards.ts` | Generic `Card`, `Suit`, `Rank` | Shared card types |
| `src/deck/standard52.ts` | Full 52-card deck, shuffle, ranks | Tripoley deals from full deck |
| `src/storage/browser.ts` | Browser storage helpers | Shared persistence utilities |
| `src/utils/nameGenerator.ts` | Random AI names from JSON | New table setup |
| `src/utils/playerName.ts` | Sanitize / display human name | Consistent naming |
| `src/data/names.json` | Name pool | AI player names |
| `src/testing/simulate.ts` | Generic simulation harness | Tripoley full-table sim tests |

### Euchre (`src/games/euchre/`)

Separate game in the same package. Tripoley does not use it at runtime, but **core tests include both**. Only edit if working on Euchre.

---

## Tripoley engine (`playfield/packages/core/src/games/tripoley/`)

Headless rules, chip math, and AI. **Authoritative game logic lives here.**

| File | What it does | Why it's here |
|------|----------------|---------------|
| `index.ts` | Re-exports module surface | `@playfield/core` / `@playfield/core/tripoley` imports |
| `types.ts` | `GameState`, `GameAction`, phases, pot board, Michigan/Poker sub-state | Single state shape |
| `constants.ts` | 4–9 players, starting chips (200), ante sizes, pot section keys, timer ms | Avoid magic numbers |
| `cards.ts` | Deal hands, rank helpers; wraps `standard52` | Tripoley-specific dealing |
| `houseRules.ts` | Official vs home-table presets (`payCardsOnMichiganPlay`, timers, penalties) | Rule variants without forking reducer |
| `antes.ts` | Ante distribution when player is short on chips | Partial board eligibility |
| `payCards.ts` | Pot sections (Ace/King/…/Kitty/POT), claim resolution, dead-hand blocking | Pay Cards phase |
| `poker.ts` | Hand evaluation, compare hands, bet sizing helpers | Poker phase |
| `blindAuction.ts` | Bid order, pass logic, dealer close | Auction for dealer’s blind hand |
| `michigan.ts` | Sequence play, lead color, legal plays, lead-pass penalty, shown plays | Michigan Rummy phase |
| `michiganRecovery.ts` | Fallback actions when Michigan turn gets stuck | Prevents soft-lock in automation/sim |
| `playerStatus.ts` | Elimination (0 chips), next active seat, dealer rotation | Table shrinks as players bust |
| `suddenDeath.ts` | Long-game / heads-up stalemate → higher antes | Ends marathon tables |
| `playerActionTimer.ts` | Turn deadlines; AI/human timeout → auto-action | 15s default; solo vs multiplayer behavior |
| `animations.ts` | Chip/card animation queue on `GameState` | UI reads queue; reducer pushes events |
| `gameLog.ts` | Append log, UI cap (40), session export buffer (512KB) | In-game log + debug export |
| `ai.ts` | Poker/Michigan/blind decisions; bluff/value profiles by difficulty | **Bot brain** (`getAIAction`) |
| `aiDifficulty.ts` | `easy` / `medium` / `hard` / `cardShark` labels and seat settings | Per-seat AI skill in setup |
| `reducer.ts` | `gameReducer` — entire state machine (~1.4k lines) | **Deal → bust → game over**; chip conservation |

Helper exported from reducer: `potBoardToDisplaySections()` — maps pot board to UI labels.

### Tripoley engine tests (`__tests__/`)

| File | What it tests | Why it's here |
|------|----------------|---------------|
| `reducer.test.ts` | (if present) state transitions | Regressions |
| `poker.test.ts` | Hand ranks, tiebreakers | Poker phase correctness |
| `payCards.test.ts` | Section claims, dead hand | Pay card edge cases |
| `michigan.test.ts` | Legal plays, sequences, lead pass | Michigan rules |
| `blindAuction.test.ts` | Bidding order and resolution | Blind auction |
| `antes.test.ts` | Partial antes | Short-stack players |
| `dealerBlind.test.ts` | Swap / auction / keep | Dealer blind choice |
| `suddenDeath.test.ts` | Trigger conditions, multipliers | Endgame pressure |
| `cards.test.ts` | Dealing | No duplicate cards |
| `gameLog.test.ts` | Log order, session buffer | Log bugs |
| `aiDifficulty.test.ts` | Difficulty normalization | Setup persistence |
| `simulation.test.ts` | Full AI tables, 4–9 players, chip invariants | **Stress test** — run via `npm run test:sim` |
| `helpers/simulate.ts`, `helpers/rng.ts` | Seeded sim utilities | Reproducible simulations |

---

## React app — entry & shell

| File | What it does | Why it's here |
|------|----------------|---------------|
| `src/main.tsx` | **Active** React bootstrap; loads debug + playfield config | Entry in `index.html` |
| `src/index.tsx` | Legacy alternate entry (GlobalStyle only) | Older CRA-style bootstrap — not used by Vite |
| `src/App.tsx` | Providers + `GameTable` + achievement toast | Minimal shell |
| `src/App.test.tsx` | Smoke render test | Basic app health |
| `src/vite-env.d.ts` | Vite type refs | TS module declarations |
| `src/styled.d.ts` | styled-components theme types | TS support |
| `src/setupTests.ts` | Vitest setup (if used) | Test environment |
| `src/types/GameTypes.ts` | Re-exports core types for UI | Shorter import paths |
| `src/styles/GlobalStyle.ts` | Global CSS baseline | Fonts, reset, table background |
| `src/playfieldClient.ts` | `configurePlayfield()` from debug (chips, timer ms) | Bridge debug overrides into engine config |
| `src/constants/gameConstants.ts` | Re-exports player name helpers | Convenience barrel |

---

## Context (global React state)

| File | What it does | Why it's here |
|------|----------------|---------------|
| `src/context/GameContext.tsx` | `useReducer(gameReducer)`, AI dispatch, session autosave | **UI ↔ engine bridge** |
| `src/context/AchievementContext.tsx` | Loaded achievements, unlock events, perk effects | Achievement persistence |
| `src/context/HudLayoutContext.tsx` | Draggable HUD layout, edit mode, localStorage | Custom table layout |
| `src/context/SoloPauseUiContext.tsx` | Solo-mode pause UI flags | Single-human UX |

---

## Game layer (`src/game/`)

App-specific behavior around the engine — not duplicate rules.

| File | What it does | Why it's here |
|------|----------------|---------------|
| `sessionStorage.ts` | Save/load `GameState` to `localStorage` | Resume after refresh |
| `sessionLogExport.ts` | Download full session log as `.txt` | Debug / share hands |
| `handDisplay.ts` | Sort hands for Michigan; highlight best poker five | UI-only card ordering |
| `spectatorMode.ts` | Konami-unlock fast-forward AI-only table | Hidden stress / demo mode |
| `branding.ts` | `GAME_NAME` and display strings | Export headers |

### Achievements (`src/game/achievements/`)

**UI-only meta-game** — not in core reducer.

| File | What it does | Why it's here |
|------|----------------|---------------|
| `definitions.ts` | Achievement list, titles, perks (timer bonus, felt colors, etc.) | Content catalog |
| `types.ts` | Achievement IDs, save shape, unlock types | Type safety |
| `evaluate.ts` | Increment counters (poker wins, Michigan wins, etc.) | Unlock conditions |
| `trackAchievements.ts` | Watch `GameState` transitions, fire evaluate hooks | Wired from `useAchievementTracking` |
| `effects.ts` | Apply perks (extra timer seconds, house-rule toggles) | Rewards change gameplay/UI |
| `storage.ts` | `localStorage` persistence for achievement save | Cross-session unlocks |
| `timerSnapshot.ts` | Timer-related achievement helpers | Perk stacking |
| `__tests__/` | evaluate, effects, storage, track tests | Achievement regressions |

### Game tests (`src/game/__tests__/`)

Integration: session storage, spectator mode, log export, playfield wiring, smoke.

---

## Hooks

| File | What it does | Why it's here |
|------|----------------|---------------|
| `useAITurn.ts` | Delay then `dispatchAI()` on bot turns | Separates timing from render |
| `useSpectatorAutoPlay.ts` | Rapid AI stepping when spectator mode on | Fast-forward table |
| `usePlayerActionTimer.ts` | Countdown UI + timeout dispatch to engine | Human turn clock |
| `useGameSounds.ts` | Audio on deal, chips, wins | Feedback |
| `useGameEffects.ts` | React to state for one-shot UI effects | Polish |
| `useAchievementTracking.ts` | Calls `trackAchievements` on state changes | Achievement pipeline |
| `useKonamiUnlock.ts` | Listens for Konami code → spectator flag | Easter egg |
| `usePotLabelPositions.ts` | Positions chip labels on pot wheel | Pot layout |
| `useSeatLabelPositions.ts` | Seat name positions | Table labels |
| `useCardFanStackEnforcer.ts` | Keeps hand fan layout stable | Hand UI consistency |

---

## Components — table & play

| File | What it does | Why it's here |
|------|----------------|---------------|
| `GameTable.tsx` | Main screen: setup vs table, all hooks wired | Central composition |
| `PlayerSelect.tsx` | Name, player count, house rules, AI difficulty, start | Pre-table setup |
| `TripoleyPot.tsx` | Center pot wheel graphic + section amounts | Signature board UI |
| `PotChipLabels.tsx` | Draggable labels on pot sections | Shows Ace/King/…/Kitty/POT |
| `PlayerHUD.tsx` | Hands, chips, drag-to-play Michigan | Per-seat play surface |
| `PlayerActionBar.tsx` | Phase buttons: bid, fold, call, lead pass, continue | Human actions |
| `BettingInterface.tsx` | Poker bet controls | Raise/call UI |
| `BlindAuctionModal.tsx` | Blind auction bidding UI | Dealer blind sale |
| `GameControls.tsx` | Rules, achievements, layout edit, export log | Table utilities |
| `GameLog.tsx` | Scrollable log panel | Recent `state.log` lines |
| `GameOverModal.tsx` | Winner when one player has all chips | End of match |
| `PhaseAnnouncementModal.tsx` | Between-phase announcements (pay card wins, etc.) | Explains what just happened |
| `RulesModal.tsx` | In-app rules text | Player help |
| `AnimationLayer.tsx` | Flying chips/cards from `state.animations` | Visual feedback |
| `CardAnimation.tsx` | Single card motion helper | Animation building block |
| `Chip.tsx` | Chip graphic | Pot / bet visuals |
| `DeadHand.tsx` / `DeadHandIndicator.tsx` | Face-down dead hand display | Dealer blind / blocked pay cards |
| `HandFanScaler.tsx` | Scale hand to fit viewport | Mobile |
| `TurnTimerDisplay.tsx` | Turn countdown ring/text | Human deadline |
| `LeaveTableButton.tsx` | Exit to setup | Clear session |
| `SeatLabels.tsx` / `SeatAnchors.tsx` | Names + animation anchor points | Layout / motion |
| `LayoutEditOverlay.tsx` | Drag HUD panels in edit mode | Power-user layout |
| `DraggableHudPanel.tsx` | Wrapper for movable panels | HUD drag behavior |
| `AchievementsPanel.tsx` | List unlocked achievements | Meta-game UI |
| `AchievementToast.tsx` | Pop-up on unlock | Immediate feedback |
| `GameFeedback.tsx` | Transient messages | User feedback |

### Layout math (`components/` + `__tests__/`)

| File | What it does | Why it's here |
|------|----------------|---------------|
| `hudLayout.ts` | Default HUD positions, table insets | Starting layout |
| `hudPanelLayout.ts` | Panel sizes, breakpoints | Responsive HUD |
| `gameLogLayout.ts` | Log panel dimensions | Log readability |
| `potLabelLayout.ts` | Pot label positions on wheel | Pot wheel alignment |
| `seatLayout.ts` | Seat positions around table | Player HUD placement |

### Dev-only UI

| File | What it does | Why it's here |
|------|----------------|---------------|
| `dev/PlayerPositionEditor.tsx` | Debug seat positioning | Development tool |

---

## Content & utils

| File | What it does | Why it's here |
|------|----------------|---------------|
| `src/content/rulesContent.ts` | Rules modal copy (official vs home) | Single source for help text |
| `src/utils/cardAssets.ts` | Card back paths | Theming |
| `src/utils/cardFanStack.ts` | Fan geometry | Hand appearance |
| `src/utils/animationAnchors.ts` | Anchor id → coordinates | AnimationLayer targets |
| `src/utils/publicAsset.ts` | `/tripoley/` URL prefix | GitHub Pages paths |
| `src/utils/SoundEffects.ts` | Sound manager | Central audio |
| `src/utils/nameGenerator.ts` | App-side name helper | UI name generation |
| `src/utils/playerName.ts` | Display / sanitize names | Human player label |
| `src/utils/layoutOnboarding.ts` | First-run layout edit hints | UX for draggable HUD |
| `src/data/names.json` / `first-names.json` | Name lists | Opponent names |

---

## Debug (local only)

| File | What it does | Why it's here |
|------|----------------|---------------|
| `src/debug.example.ts` | Template for local overrides | Copy to `debug.ts` (gitignored) |
| `src/debug.types.ts` | Debug config types | Type-safe overrides |
| `src/debugConfig.ts` | Optional `debug.ts`, `__TRIPOLEY_DEBUG__` console hook | Dev tuning without committing |

---

## Legacy / unused

| File | What it does | Why it's here |
|------|----------------|---------------|
| `src/ai/AILogic.ts` | Old pre-Playfield AI (personalities, bet heuristics) | **Not imported anywhere** — superseded by `playfield/.../ai.ts`. Safe to ignore or delete in a cleanup pass. |

---

## Card artwork

| Path | What it does | Why it's here |
|------|----------------|---------------|
| `src/components/cards/fronts/*.svg` | Face cards | **Source** artwork |
| `src/components/cards/backs/*.svg` | Card backs | Selectable backs |
| `src/components/cards/other/*.svg` | Alt art, blanks | Optional assets |
| `public/assets/cards/` | Synced copy | **Served at runtime** — `npm run sync-assets` after SVG edits |
| `public/assets/pot/Pot.svg` | Pot wheel image | Center board graphic |

---

## Public static files

| File | What it does | Why it's here |
|------|----------------|---------------|
| `public/manifest.json` | PWA manifest | Install / icons |
| `public/robots.txt` | Crawler hints | SEO |

---

## Where to change what

| Goal | Start here |
|------|------------|
| Fix illegal play / chip loss / phase stuck | `reducer.ts`, then phase module (`michigan.ts`, `poker.ts`, …) |
| House rule variant | `houseRules.ts`, then reducer branches |
| AI poker / Michigan / blind behavior | `ai.ts` |
| Pay card claim timing | `payCards.ts` + `houseRules.payCardsOnMichiganPlay` |
| Turn timer length | `constants.ts` / `config.ts`; UI in `usePlayerActionTimer.ts` |
| Achievement unlock or perk | `definitions.ts`, `evaluate.ts`, `effects.ts` |
| Log message text | `reducer.ts` + `gameLog.ts` |
| Pot wheel layout | `TripoleyPot.tsx`, `potLabelLayout.ts` |
| Save game across refresh | `sessionStorage.ts` |
| Export debug session | `sessionLogExport.ts` |
| Stress-test full tables | `simulation.test.ts` — `npm run test:sim` |
| Sync engine from monorepo | `npm run sync-playfield` from `Games/playfield/` |
| Deploy live | `npm run deploy` — see `README.md` |

---

## AI difficulty reminder

| Level | Behavior (poker-focused) |
|-------|---------------------------|
| **Easy** | Loose — folds more, bluffs rarely |
| **Medium** | Balanced |
| **Hard** | Tighter value bets, more pressure |
| **Card Shark** | Aggressive bluffs, strong fold discipline |

Profiles live in `ai.ts` (`POKER_PROFILE`). Michigan and blind choices use separate heuristics in the same file. AI is strong but uses random rolls for bluff/value timing — not perfect play.
