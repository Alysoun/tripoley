# Pot Wheel Rummy

Browser-based **Pot Wheel Rummy** — a pot-board rummy game with Pay Cards, poker, and Michigan Rummy phases. Solo vs AI, achievements, and draggable HUD.

**Play online:** [https://alysoun.github.io/tripoley/](https://alysoun.github.io/tripoley/) *(URL unchanged; display name is Pot Wheel Rummy)*

## Local development

```bash
npm install
npm run dev
```

Open the URL Vite prints (with `/tripoley/` path). Card SVGs are synced into `public/assets/cards` automatically before dev/build.

## Automated testing

You cannot manually play every combination (player counts × deals × actions is astronomical). The test suite instead:

- **Unit tests** — poker hands, pay-card claims, Michigan legality, blind auction, dealing
- **Simulation tests** — all-AI full rounds for **4–9 players** under **official** and **home table** rules
- **Invariants** — total chips conserved, no duplicate cards, no stuck phases
- **Seeded RNG** — reproducible runs (`mockRandom(seed)` in tests)

```bash
npm test              # full suite (~1s locally)
npm run test:watch    # re-run on file changes
npm run test:sim      # simulation / stress tests only
```

Tests live in `src/game/engine/__tests__/`. CI runs `npm test` before every GitHub Pages deploy.

To stress-test more seeds locally, duplicate the loop in `simulation.test.ts` or raise `maxRounds` in `simulateGame()`.

## Local debug overrides (dev only)

Copy the example file and edit freely — it stays on your machine:

```bash
copy src\debug.example.ts src\debug.ts
```

Set `enabled: true` and uncomment options in `src/debug.ts`. Reload the dev server after edits. In the browser console you can also tweak live via `__TRIPOLEY_DEBUG__` (e.g. `__TRIPOLEY_DEBUG__.startingChips = 999` before dealing).

`src/debug.ts` is gitignored; production builds ignore it unless the file exists locally.

## Production build

```bash
npm run build
npm run preview
```

## Deploy to GitHub Pages

Pushes to `main` run [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml), which builds and publishes `dist/`. A normal run finishes in under two minutes.

After the first successful run, enable **GitHub Pages → Source: GitHub Actions** in the repository settings if it is not already active.

If a workflow run shows **no logs for several minutes**, the job is usually **waiting for a GitHub runner** (not building yet). Use **Cancel workflow** once; if it stays stuck, ignore that run and open the **latest** run instead, or use **Actions → Deploy to GitHub Pages → Run workflow**. Check [GitHub Status](https://www.githubstatus.com/) if runs keep queueing.

If the live site shows a blank page or a console 404 for `/src/main.tsx`, Pages is serving the **source repo** instead of the built `dist/` folder. Open **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions** (not “Deploy from a branch”), then re-run the **Deploy to GitHub Pages** workflow from the Actions tab.

Manual deploy (optional):

```bash
npm run deploy
```

## Notes

- AI opponents run entirely in the browser (`src/game/engine/ai.ts`). No backend required.
- Game progress is saved in `localStorage` until you **Leave Table** or reach **Game Over**; layout prefs also use `localStorage`.
