# Tripoley ↔ Playfield

Tripoley is a **consumer** of the headless SDK [`@playfield/core`](./playfield/packages/core). The React app should not duplicate engine logic.

## Layout

| Path | Role |
|------|------|
| `playfield/` | Vendored copy of the Playfield monorepo (committed for GitHub Pages CI) |
| `src/types/GameTypes.ts` | Re-exports core types only — no duplicate `GameState` |
| `src/playfieldClient.ts` | Maps `debugConfig` → `configurePlayfield()` |
| `src/game/handDisplay.ts` | UI-only card layout (not in core) |
| `@playfield/core/storage` | `localStorage` for house rules + AI poker prefs |

## Local development (Games folder)

If you edit the canonical SDK at `Games/playfield/`, refresh the vendored copy:

```bash
node scripts/sync-playfield-sdk.mjs
npm install
```

`npm run dev` / `npm test` / `npm run build` rebuild core automatically via `predev` / `pretest` / `prebuild`.

## Before pushing to GitHub

1. Sync SDK: `node scripts/sync-playfield-sdk.mjs`
2. `npm test` (Tripoley + embedded Playfield build)
3. Commit changes under `playfield/` when engine code changed

CI builds `playfield/` then Tripoley; it does **not** use `../playfield`.

## Engine tests

Full reducer / simulation suite: `npm run test:sim` (runs Playfield’s Vitest).

Tripoley tests: achievements, session storage, and `playfieldIntegration.test.ts`.
