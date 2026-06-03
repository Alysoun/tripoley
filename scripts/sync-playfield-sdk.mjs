/**
 * Copies the Playfield SDK into tripoley/playfield so GitHub Actions and clones
 * do not depend on ../playfield beside the repo.
 *
 * Source order:
 *   1. --from <path>
 *   2. ../playfield (sibling of tripoley in Games/)
 *   3. ./playfield (already present — refresh)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tripoleyRoot = path.resolve(__dirname, '..');

function parseFromArg() {
  const idx = process.argv.indexOf('--from');
  if (idx >= 0 && process.argv[idx + 1]) {
    return path.resolve(process.argv[idx + 1]);
  }
  const sibling = path.resolve(tripoleyRoot, '..', 'playfield');
  if (fs.existsSync(path.join(sibling, 'package.json'))) return sibling;
  const embedded = path.join(tripoleyRoot, 'playfield');
  if (fs.existsSync(path.join(embedded, 'package.json'))) return embedded;
  return null;
}

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist']);

function copyTree(srcRoot, destRoot, rel = '') {
  const src = path.join(srcRoot, rel);
  const dest = path.join(destRoot, rel);
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    const base = path.basename(src);
    if (SKIP_DIRS.has(base)) return;
    fs.mkdirSync(dest, { recursive: true });
    for (const name of fs.readdirSync(src)) {
      copyTree(srcRoot, destRoot, path.join(rel, name));
    }
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

const from = parseFromArg();
if (!from) {
  console.error(
    'Playfield SDK not found. Place it at tripoley/playfield or Games/playfield, or run:\n' +
      '  node scripts/sync-playfield-sdk.mjs --from "C:/path/to/playfield"'
  );
  process.exit(1);
}

const dest = path.join(tripoleyRoot, 'playfield');
const copyRoots = [
  'package.json',
  'package-lock.json',
  'packages/core/package.json',
  'packages/core/tsconfig.json',
  'packages/core/vitest.config.ts',
  'packages/core/src',
];

console.log(`Syncing Playfield SDK\n  from: ${from}\n    to: ${dest}`);

for (const rel of copyRoots) {
  const src = path.join(from, rel);
  if (!fs.existsSync(src)) {
    console.error(`Missing: ${src}`);
    process.exit(1);
  }
  const target = path.join(dest, rel);
  fs.rmSync(target, { recursive: true, force: true });
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    copyTree(from, dest, rel);
  } else {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(src, target);
  }
}

console.log('Done. Run npm install in tripoley if package.json paths changed.');
