import { mkdir, rm, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const output = resolve(root, 'www');
const files = [
  'index.html',
  'style.css',
  'auth.js',
  'script.js',
  'manifest.webmanifest',
  'sw.js',
  'icon.svg',
  'privacidad.html',
  'terminos.html',
  'soporte.html'
];

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const file of files) {
  await copyFile(resolve(root, file), resolve(output, file));
}
console.log('PLAYFORJA web bundle copied to www/');
