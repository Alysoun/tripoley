import { cpSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcCards = join(root, 'src/components/cards');
const destCards = join(root, 'public/assets/cards');

if (!existsSync(srcCards)) {
  console.error('Missing card source directory:', srcCards);
  process.exit(1);
}

mkdirSync(join(root, 'public/assets'), { recursive: true });
cpSync(srcCards, destCards, { recursive: true });
console.log('Synced card assets to public/assets/cards');
