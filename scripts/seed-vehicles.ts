/**
 * Upload the approved vehicle reference photos into storage.
 *
 * The App Studio export did not include them (they lived in Runway's storage),
 * so the self-hosted app needs them loaded once:
 *
 *   pnpm seed:vehicles ./vehicles
 *
 * The folder holds one image per vehicle id, named `<id>.jpg` (or .jpeg /
 * .png / .webp), e.g. `crossover-white.jpg`. An optional `<id>-thumb.jpg`
 * becomes the picker thumbnail; without one the picker shows the full photo.
 * Run it with the same storage env vars as the app (Bucketeer / S3_*), e.g.
 * on Heroku: `heroku run pnpm seed:vehicles ./vehicles` after committing the
 * folder, or locally with the bucket's env vars exported.
 */
import { readdir, readFile } from 'node:fs/promises';
import * as path from 'node:path';

import { putObject, storageBackend } from '../src/platform/storage.ts';
import { vehicleImageKey, vehicleThumbKey, VEHICLES } from '../src/shared/scene.ts';

const dir = process.argv[2];
if (!dir) {
  console.error('Usage: pnpm seed:vehicles <folder>');
  process.exit(1);
}

const files = await readdir(dir);
const find = (base: string) =>
  files.find((f) => /\.(jpe?g|png|webp)$/i.test(f) && f.replace(/\.[^.]+$/, '') === base);

let missing = 0;
for (const v of VEHICLES) {
  for (const [base, key] of [
    [v.id, vehicleImageKey(v.id)],
    [`${v.id}-thumb`, vehicleThumbKey(v.id)],
  ] as const) {
    const file = find(base);
    if (!file) {
      if (base === v.id) {
        console.warn(`missing  ${v.id}  (${v.hint} ${v.label})`);
        missing++;
      }
      continue;
    }
    const bytes = new Uint8Array(await readFile(path.join(dir, file)));
    const ext = file.split('.').pop()!.toLowerCase();
    await putObject(key, bytes, {
      contentType: ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg',
    });
    console.log(`uploaded ${key}  <- ${file}`);
  }
}
console.log(`Done (${storageBackend} storage). ${missing} vehicle(s) still missing.`);
