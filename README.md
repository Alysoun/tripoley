# Tripoley

Browser-based Tripoley (Michigan Rummy / Tripoli) with solo vs AI, achievements, and draggable HUD.

**Play online:** [https://alysoun.github.io/tripoley/](https://alysoun.github.io/tripoley/)

## Local development

```bash
npm install
npm run dev
```

Open the URL Vite prints (with `/tripoley/` path). Card SVGs are synced into `public/assets/cards` automatically before dev/build.

## Production build

```bash
npm run build
npm run preview
```

## Deploy to GitHub Pages

Pushes to `main` run [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml), which builds and publishes `dist/`.

After the first successful run, enable **GitHub Pages → Source: GitHub Actions** in the repository settings if it is not already active.

Manual deploy (optional):

```bash
npm run deploy
```

## Notes

- AI opponents run entirely in the browser (`src/game/engine/ai.ts`). No backend required.
- Game progress is stored in `sessionStorage`; layout prefs use `localStorage`.
