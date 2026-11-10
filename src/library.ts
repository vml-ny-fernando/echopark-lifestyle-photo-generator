import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import * as path from 'node:path';

import { documentStore, getObject, putObject } from './storage.ts';
import { MAX_PHOTOS_PER_CHARACTER, type SceneConfig } from './shared/scene.ts';

/**
 * The brand library, shared by everyone who can open the app: the approved
 * cast and every generated scene. Each collection is one JSON index document
 * (written with compare-and-set, so two editors never drop each other's
 * change) plus the image objects it points at.
 *
 *   library/cast.json    Character[]
 *   library/scenes.json  Scene[]
 *   cast/<uuid>.<ext>    reference photos
 *   scenes/<taskId>.png  generated images
 */

export type Character = {
  id: string;
  name: string;
  /** Short look/personality note fed into the prompt, e.g. "early 30s, warm smile". */
  description: string;
  /** Storage keys of the reference photos, the first one is the portrait. */
  photoKeys: string[];
  createdAt: string;
  updatedAt: string;
};

export type Scene = {
  /** The Runway task id — also the scene id. */
  id: string;
  status: 'pending' | 'succeeded' | 'failed';
  config: SceneConfig;
  /** Names at generation time, so a later cast edit doesn't rewrite history. */
  castNames: string[];
  prompt: string;
  /** Storage key of the saved image, once it succeeded. */
  imageKey?: string | undefined;
  error?: string | undefined;
  /** The automatic brand check run on the finished image. */
  check?: SceneCheck | undefined;
  createdAt: string;
};

/**
 * A vision pass over a finished scene that looks for what the brief forbids:
 * maker badges or logos, readable text, and a car that drifted from the
 * reference. `unavailable` means the check itself couldn't run.
 */
export type SceneCheck = {
  status: 'pending' | 'clear' | 'flagged' | 'unavailable';
  /** The Runway task id of the check, while it runs. */
  taskId?: string | undefined;
  /** What was found (flagged) or why it couldn't run (unavailable). */
  issues?: string[] | undefined;
  startedAt?: string | undefined;
};

const store = documentStore<unknown>({ prefix: 'library/' });

let seeding: Promise<void> | undefined;

/**
 * First run only: when storage has no cast list at all, build it from the
 * character sheets shipped in `seed/cast/<Name>.jpg` (one character per file,
 * named by its label). A cast someone has edited, even down to empty, is never
 * reseeded.
 */
function seedCastOnce(): Promise<void> {
  seeding ??= (async () => {
    if (await store.get('cast.json')) return;
    const dir = path.resolve(process.env['SEED_DIR'] ?? 'seed', 'cast');
    if (!existsSync(dir)) return;
    const files = (await readdir(dir)).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort();
    // `<Label>.jpg` is the character sheet; `<Label>-headshot.jpg` (optional)
    // becomes the first, portrait photo. Any other `<Label>-<x>.jpg` is extra.
    const byLabel = new Map<string, string[]>();
    for (const file of files) {
      const label = file.replace(/\.[^.]+$/, '').replace(/-[^-]+$/, '');
      byLabel.set(label, [...(byLabel.get(label) ?? []), file]);
    }
    const rank = (f: string) => (/-headshot\./i.test(f) ? 0 : /-/.test(f) ? 2 : 1);
    const now = new Date().toISOString();
    // Upload in parallel so the first load stays well inside Heroku's 30 s
    // request limit.
    const characters: Character[] = await Promise.all(
      [...byLabel]
        .sort(([x], [y]) => x.localeCompare(y))
        .map(async ([label, group]) => {
          const ordered = group
            .sort((x, y) => rank(x) - rank(y))
            .slice(0, MAX_PHOTOS_PER_CHARACTER);
          const photoKeys = await Promise.all(
            ordered.map(async (file) => {
              const ext = file.split('.').pop()!.toLowerCase();
              const type =
                ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
              const key = newPhotoKey(type)!;
              await putObject(key, new Uint8Array(await readFile(path.join(dir, file))), {
                contentType: type,
              });
              return key;
            })
          );
          return {
            id: newId(),
            name: label,
            description: '',
            photoKeys,
            createdAt: now,
            updatedAt: now,
          };
        })
    );
    await store.update('cast.json', (cur) => cur ?? characters);
    console.log(`[library] seeded ${characters.length} characters from seed/cast`);
  })().catch((err) => {
    seeding = undefined;
    throw err;
  });
  return seeding;
}

export async function listCast(): Promise<Character[]> {
  await seedCastOnce();
  const doc = await store.get('cast.json');
  return (doc?.value as Character[] | undefined) ?? [];
}

export async function updateCast(
  mutate: (cast: Character[]) => Character[]
): Promise<Character[]> {
  return (await store.update('cast.json', (cur) =>
    mutate((cur as Character[] | undefined) ?? [])
  )) as Character[];
}

export async function listScenes(): Promise<Scene[]> {
  const doc = await store.get('scenes.json');
  return (doc?.value as Scene[] | undefined) ?? [];
}

export async function updateScenes(
  mutate: (scenes: Scene[]) => Scene[]
): Promise<Scene[]> {
  return (await store.update('scenes.json', (cur) =>
    mutate((cur as Scene[] | undefined) ?? [])
  )) as Scene[];
}

const PHOTO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export function newPhotoKey(contentType: string): string | null {
  const ext = PHOTO_EXT[contentType];
  return ext ? `cast/${randomUUID()}.${ext}` : null;
}

export function newId(): string {
  return randomUUID();
}

export { getObject, putObject };
