// Renders public/icon.svg into the PNG sizes iPhone and the PWA manifest need.
// Run: node scripts/make-icons.mjs
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';

const svg = await readFile(new URL('../public/icon.svg', import.meta.url));
const out = (name) => new URL(`../public/${name}`, import.meta.url).pathname.replace(/^\/(\w:)/, '$1');

for (const [name, size] of [
  ['apple-touch-icon.png', 180],
  ['pwa-192.png', 192],
  ['pwa-512.png', 512],
]) {
  await sharp(svg, { density: 300 }).resize(size, size).png().toFile(out(name));
  console.log('wrote', name);
}
