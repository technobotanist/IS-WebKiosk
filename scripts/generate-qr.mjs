// One-off asset generator: writes scannable QR code SVGs for each collection
// entry's destinationUrl into public/ using the path in entry.qrImageUrl.
//
// This is a build-time tool, not part of the app bundle. It requires the
// `qrcode` package, which is not kept as a project dependency. To run:
//   npm install -D qrcode
//   node scripts/generate-qr.mjs
//   npm uninstall qrcode
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import QRCode from 'qrcode';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = join(root, 'public');
const collectionPath = join(publicDir, 'data', 'collection.json');

const collection = JSON.parse(readFileSync(collectionPath, 'utf8'));
const entries = Array.isArray(collection.entries) ? collection.entries : [];

let generated = 0;

for (const entry of entries) {
  const target = String(entry.qrImageUrl ?? '').trim();
  const url = String(entry.destinationUrl ?? '').trim();

  if (!target || !url) {
    continue;
  }

  const outPath = join(publicDir, target);
  mkdirSync(dirname(outPath), { recursive: true });

  const svg = await QRCode.toString(url, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 4,
    width: 640,
    color: { dark: '#151515', light: '#ffffff' }
  });

  writeFileSync(outPath, svg, 'utf8');
  generated += 1;
  console.log(`QR -> ${target}  (${url})`);
}

console.log(`Generated ${generated} QR code${generated === 1 ? '' : 's'}.`);
