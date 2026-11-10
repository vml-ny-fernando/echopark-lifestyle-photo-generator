import { randomUUID } from 'node:crypto';

import { documentStore, getObject, putObject } from './storage.ts';
import type { SceneConfig } from './shared/scene.ts';

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

export async function listCast(): Promise<Character[]> {
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
