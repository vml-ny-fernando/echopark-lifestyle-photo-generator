import {
  describeRunwayFailure,
  RunwayAuthError,
  RunwayCreditError,
  RunwayTaskError,
  RunwayUploadRejectedError,
  type RunwayClient,
} from './platform/runway.ts';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import {
  type Character,
  listCast,
  listScenes,
  newId,
  newPhotoKey,
  type Scene,
  type SceneCheck,
  updateCast,
  updateScenes,
} from './library.ts';
import {
  buildPrompt,
  castGroup,
  type CastRef,
  isCurrentScenario,
  castTag,
  CUSTOM_SCENARIO,
  MAX_SCENARIO_CUSTOM,
  type FrameId,
  MAX_ACCENT_CUSTOM,
  MAX_CAST_PER_SCENE,
  MAX_PHOTOS_PER_CHARACTER,
  type QualityId,
  MAX_VEHICLE_ANGLES,
  vehicleAngleKey,
  vehicleAngleTag,
  vehicleImageKey,
  VEHICLES,
} from './shared/scene.ts';
import { headObject } from './platform/storage.ts';

import {
  deleteObject,
  getObject,
  presignUpload,
  putObject,
} from './storage.ts';
import { signedInProcedure } from './trpc.ts';

/** The model every scene is generated with (mapped to Gemini in src/platform/runway.ts). */
const SCENE_MODEL = 'gemini_3_pro';

/** Looks over every finished scene for badges, text and a drifted car. */
const CHECK_MODEL = 'gemini_api';

/** A check that never got its task id (its poll died mid-start) gives up after this. */
const CHECK_START_TIMEOUT_MS = 2 * 60 * 1000;

const CHECK_PROMPT = `You review AI-generated lifestyle photos for a car retailer before anyone uses them.
Image 1 is the generated scene. Image 2 is the approved reference photo of the car that should appear in it (it may be a multi-view design sheet with labels; ignore any text on image 2).

Inspect image 1 closely, including small details such as wheel centre caps, the grille, the tailgate, the steering wheel hub, key fobs and keychains, license plates, clothing, signs, packaging and screens.

Flag a problem when image 1 shows any of:
1. A vehicle maker's emblem, badge, logo or model lettering anywhere, on any vehicle, including the wheel centre caps and the steering wheel.
2. Any readable or garbled text, letters or numbers anywhere in the frame.
3. A car that is clearly a different body style, shape or paint colour from the car in image 2.

Do not name any brand. Describe each problem in under 12 words, in sentence case, saying where it is, for example "Maker emblem on the front wheel centre caps" or "Garbled lettering on the keychain".

Answer with JSON only, in exactly this shape:
{"badges": boolean, "text": boolean, "vehicleMismatch": boolean, "issues": string[]}
"issues" is empty when nothing is wrong.`;

/** Read the check's JSON answer; null when it can't be read. */
function parseCheck(text: string | undefined): SceneCheck | null {
  const json = text?.match(/\{[\s\S]*\}/)?.[0];
  if (!json) return null;
  try {
    const answer = z
      .object({
        badges: z.boolean(),
        text: z.boolean(),
        vehicleMismatch: z.boolean(),
        issues: z.array(z.string()).default([]),
      })
      .parse(JSON.parse(json));
    const flagged = answer.badges || answer.text || answer.vehicleMismatch;
    if (!flagged) return { status: 'clear' };
    const fallback = [
      answer.badges ? 'A maker badge or logo is visible' : null,
      answer.text ? 'Readable or garbled text is visible' : null,
      answer.vehicleMismatch ? "The car doesn't match the reference vehicle" : null,
    ].filter((x): x is string => x !== null);
    return {
      status: 'flagged',
      issues: answer.issues.length > 0 ? answer.issues.slice(0, 6) : fallback,
    };
  } catch {
    return null;
  }
}

/** Submit the brand check for a finished scene; never throws. */
async function startCheck(
  runway: RunwayClient,
  scene: Scene,
  imageUrl: string
): Promise<SceneCheck> {
  try {
    const vehicle = await uploadVehicle(runway, scene.config.vehicle);
    const task = await runway.createTask(
      CHECK_MODEL,
      {
        name: 'echopark-brand-check',
        prompt: CHECK_PROMPT,
        images: [{ url: imageUrl }, { url: vehicle[0]!.url }],
        output_format: 'json',
        max_output_tokens: 4000,
      },
      { internal: true, taskLabel: 'echopark-brand-check' }
    );
    return { status: 'pending', taskId: task.id };
  } catch (err) {
    return {
      status: 'unavailable',
      issues: [
        err instanceof TRPCError
          ? err.message
          : describeRunwayFailure(err).message,
      ],
    };
  }
}

/** One poll of a running brand check. */
async function pollCheck(runway: RunwayClient, scene: Scene): Promise<Scene> {
  const check = scene.check;
  if (!check || check.status !== 'pending') return scene;
  if (!check.taskId) {
    const started = Date.parse(check.startedAt ?? scene.createdAt);
    if (Date.now() - started < CHECK_START_TIMEOUT_MS) return scene;
    return patchCheck(scene, {
      status: 'unavailable',
      issues: ["The brand check didn't start. Look the scene over by eye."],
    });
  }
  let snap;
  try {
    snap = await runway.taskSnapshot(check.taskId, { includeText: true });
  } catch (err) {
    // A stale session or broker refusal: stop polling the check, keep the scene.
    return patchCheck(scene, {
      status: 'unavailable',
      issues: [describeRunwayFailure(err).message],
    });
  }
  if (!snap.done) return scene;
  if (snap.status !== 'SUCCEEDED') {
    return patchCheck(scene, {
      status: 'unavailable',
      issues: [
        [snap.error, snap.hint].filter(Boolean).join(' ') ||
          "The brand check didn't finish. Look the scene over by eye.",
      ],
    });
  }
  return patchCheck(
    scene,
    parseCheck(snap.text) ?? {
      status: 'unavailable',
      issues: ["The brand check's answer couldn't be read. Look the scene over by eye."],
    }
  );
}

async function patchCheck(scene: Scene, check: SceneCheck): Promise<Scene> {
  const all = await patchScene(scene.id, { check });
  return all.find((s) => s.id === scene.id) ?? { ...scene, check };
}

/** Runway refuses reference images over 16 MB. */
const MAX_PHOTO_BYTES = 15 * 1024 * 1024;

/**
 * Map a Runway failure onto the tRPC codes the client knows how to render —
 * the same split as the starter's example procedure: a billing refusal is
 * FORBIDDEN with the error as `cause` (the client shows `<OutOfCreditsPrompt>`),
 * a plan/permission refusal is a terminal FORBIDDEN, a stale session is
 * UNAUTHORIZED (the client shows `<SignInPrompt>`), a failed task or rejected
 * upload is BAD_REQUEST with readable copy. Anything else (a broker consent
 * refusal included) is rethrown untouched so `errorFormatter` sees it.
 */
function runwayFailure(err: unknown): never {
  if (err instanceof RunwayCreditError) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: err.reason ?? err.message,
      cause: err,
    });
  }
  if (err instanceof RunwayAuthError) {
    throw err.permissionDenied
      ? new TRPCError({
          code: 'FORBIDDEN',
          message: describeRunwayFailure(err).message,
        })
      : new TRPCError({
          code: 'UNAUTHORIZED',
          message: err.reason ?? err.message,
        });
  }
  if (err instanceof RunwayTaskError || err instanceof RunwayUploadRejectedError) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: describeRunwayFailure(err).message,
    });
  }
  throw err;
}

const sceneConfig = z.object({
  characterIds: z
    .array(z.string())
    .max(
      MAX_CAST_PER_SCENE,
      `Pick up to ${MAX_CAST_PER_SCENE} characters for one scene.`
    ),
  scenario: z
    .string()
    .refine(isCurrentScenario, 'Pick one of the current scenarios.'),
  scenarioCustom: z.string().trim().max(MAX_SCENARIO_CUSTOM).optional(),
  accent: z.string(),
  accentCustom: z.string().trim().max(MAX_ACCENT_CUSTOM).optional(),
  vehicle: z.enum(
    VEHICLES.map((v) => v.id) as [string, ...string[]],
    'Pick a vehicle from the approved line-up.'
  ),
  depth: z.string(),
  light: z.string(),
  lens: z.string(),
  frame: z.enum(['16:9', '3:2', '4:5'] satisfies FrameId[]),
  quality: z.enum(['1K', '2K', '4K'] satisfies QualityId[]),
  notes: z.string().max(600, 'Keep direction notes under 600 characters.'),
}).refine((c) => c.scenario !== CUSTOM_SCENARIO || Boolean(c.scenarioCustom?.trim()), {
  message: 'Describe your scenario, or pick one of the presets.',
  path: ['scenarioCustom'],
}).refine((c) => c.accent !== 'other' || Boolean(c.accentCustom?.trim()), {
  message: 'Say what should be Echo Green, or pick another accent.',
  path: ['accentCustom'],
});

/** The cast members a scene names, in the order picked, as prompt refs. */
function castForScene(cast: Character[], ids: string[]) {
  const picked = ids
    .map((id) => cast.find((c) => c.id === id))
    .filter((c): c is Character => c !== undefined);
  if (picked.length !== ids.length) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message:
        'One of the picked characters was removed from the cast. Pick again, then generate.',
    });
  }
  return picked.map((c, i) => {
    const tag = castTag(c.name, i);
    const photos = c.photoKeys.slice(0, MAX_PHOTOS_PER_CHARACTER);
    const ref: CastRef = {
      name: c.name,
      description: c.description,
      tag,
      pet: castGroup(c.name) === 'pet',
      extraTags: photos.slice(1).map((_, j) => `${tag}x${j + 1}`),
    };
    return { character: c, ref, photos };
  });
}

/** Fresh Runway reference URLs for each cast photo (they expire in a day or two). */
async function uploadReferences(
  runway: RunwayClient,
  picked: ReturnType<typeof castForScene>
) {
  const jobs = picked.flatMap(({ ref, photos }) =>
    photos.map(async (key, j) => {
      const bytes = await getObject(key);
      if (!bytes) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `A reference photo for ${ref.name} is missing. Open the cast, replace the photo, then generate.`,
        });
      }
      const filename = key.split('/').pop() ?? 'reference.jpg';
      const { url } = await runway.uploadAsset(bytes, { filename });
      const label =
        j === 0
          ? `identity photo of ${ref.name}; match this ${ref.pet ? 'animal' : 'face'} exactly`
          : `character sheet of ${ref.name}, the same ${ref.pet ? 'animal' : 'person'} as @${ref.tag}`;
      return { tag: j === 0 ? ref.tag : ref.extraTags![j - 1]!, url, label };
    })
  );
  return Promise.all(jobs);
}

/**
 * Reference URLs for the scene's approved vehicle: the main photo plus any
 * extra angles stored as vehicles/<id>-2.jpg, -3.jpg, -4.jpg.
 */
async function uploadVehicle(runway: RunwayClient, id: string) {
  const bytes = await getObject(vehicleImageKey(id));
  if (!bytes) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message:
        "This vehicle's reference photo is missing from the library. Pick another vehicle, or ask the brand team to restore it.",
    });
  }
  const extras = await Promise.all(
    Array.from({ length: MAX_VEHICLE_ANGLES - 1 }, (_, i) => getObject(vehicleAngleKey(id, i + 2)))
  );
  const all = [bytes, ...extras.filter((b): b is Uint8Array => b !== null)];
  return Promise.all(
    all.map(async (b, i) => {
      const { url } = await runway.uploadAsset(b, { filename: `${id}-${i + 1}.jpg` });
      return {
        tag: vehicleAngleTag(i + 1),
        url,
        label: i === 0 ? 'the approved vehicle' : 'the same vehicle, another angle',
      };
    })
  );
}

/** Download a finished image into the library, once. */
async function saveResult(scene: Scene, url: string, filename?: string) {
  const ext = filename?.match(/\.(png|jpe?g|webp)$/i)?.[1]?.toLowerCase() ?? 'png';
  const key = `scenes/${scene.id}.${ext === 'jpeg' ? 'jpg' : ext}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Couldn't download the finished image (HTTP ${res.status}).`);
  }
  const bytes = new Uint8Array(await res.arrayBuffer());
  await putObject(key, bytes, {
    contentType: ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg',
  });
  return key;
}

function patchScene(id: string, patch: Partial<Scene>) {
  return updateScenes((all) =>
    all.map((s) => (s.id === id ? { ...s, ...patch } : s))
  );
}

export const libraryProcedures = {
  /** The approved cast, oldest first. */
  cast: signedInProcedure.query(() => listCast()),

  /** A browser upload URL for one reference photo. */
  castPhotoUpload: signedInProcedure
    .input(
      z.object({
        contentType: z.string(),
        size: z
          .number()
          .int()
          .positive()
          .max(MAX_PHOTO_BYTES, 'Pick a photo under 15 MB.'),
      })
    )
    .mutation(async ({ input }) => {
      const key = newPhotoKey(input.contentType);
      if (!key) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Pick a JPEG, PNG or WebP photo.',
        });
      }
      const url = await presignUpload(key, {
        contentType: input.contentType,
        size: input.size,
      });
      return { key, url, contentType: input.contentType };
    }),

  /** Create (no `id`) or edit a character. */
  saveCharacter: signedInProcedure
    .input(
      z.object({
        id: z.string().optional(),
        name: z
          .string()
          .trim()
          .min(1, 'Give the character a label, e.g. Female30A.')
          .max(40, 'Keep the name under 40 characters.'),
        description: z
          .string()
          .trim()
          .max(240, 'Keep the description under 240 characters.'),
        photoKeys: z
          .array(z.string().regex(/^cast\/[\w-]+\.(jpg|png|webp)$/))
          .min(1, 'Add at least one reference photo.')
          .max(
            MAX_PHOTOS_PER_CHARACTER,
            `Use up to ${MAX_PHOTOS_PER_CHARACTER} reference photos.`
          ),
      })
    )
    .mutation(async ({ input }) => {
      const heads = await Promise.all(input.photoKeys.map((k) => headObject(k)));
      if (heads.some((h) => !h)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: "A photo didn't finish uploading. Remove it and add it again.",
        });
      }
      const now = new Date().toISOString();
      let removed: string[] = [];
      let saved: Character | undefined;
      await updateCast((cast) => {
        if (!input.id) {
          saved = {
            id: newId(),
            name: input.name,
            description: input.description,
            photoKeys: input.photoKeys,
            createdAt: now,
            updatedAt: now,
          };
          return [...cast, saved];
        }
        const existing = cast.find((c) => c.id === input.id);
        if (!existing) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'This character was removed by someone else.',
          });
        }
        removed = existing.photoKeys.filter((k) => !input.photoKeys.includes(k));
        saved = { ...existing, ...input, id: existing.id, updatedAt: now };
        return cast.map((c) => (c.id === input.id ? saved! : c));
      });
      await Promise.all(removed.map((k) => deleteObject(k)));
      return saved!;
    }),

  deleteCharacter: signedInProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      let gone: Character | undefined;
      await updateCast((cast) => {
        gone = cast.find((c) => c.id === input.id);
        return cast.filter((c) => c.id !== input.id);
      });
      if (gone) await Promise.all(gone.photoKeys.map((k) => deleteObject(k)));
      return { ok: true };
    }),

  /** Every generated scene, newest first. */
  scenes: signedInProcedure.query(async () =>
    (await listScenes()).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  ),

  /**
   * Submit a scene and answer at once with its id — the client polls
   * `sceneStatus`, so no request stays open for the whole generation.
   */
  generateScene: signedInProcedure
    .input(sceneConfig)
    .mutation(async ({ ctx, input }) => {
      const picked = castForScene(await listCast(), input.characterIds);
      let taskId: string;
      let prompt: string;
      try {
        const [cast, vehicle] = await Promise.all([
          uploadReferences(ctx.runway, picked),
          uploadVehicle(ctx.runway, input.vehicle),
        ]);
        prompt = buildPrompt(
          input,
          picked.map((p) => p.ref),
          vehicle.length
        );
        const references = [...cast, ...vehicle];
        const task = await ctx.runway.createTask(SCENE_MODEL, {
          name: 'echopark-scene',
          text_prompt: prompt,
          image_size: input.quality,
          aspect_ratio: input.frame,
          num_images: 1,
          reference_images: references,
        });
        taskId = task.id;
      } catch (err) {
        runwayFailure(err);
      }
      const scene: Scene = {
        id: taskId,
        status: 'pending',
        config: input,
        castNames: picked.map((p) => p.character.name),
        prompt,
        createdAt: new Date().toISOString(),
      };
      await updateScenes((all) => [scene, ...all]);
      return scene;
    }),

  /**
   * One poll of a scene's task. On success the image is copied into the
   * library (so it outlives Runway's short-lived download URL) and the
   * record flips to `succeeded`; on failure it records the reason.
   */
  sceneStatus: signedInProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const scene = (await listScenes()).find((s) => s.id === input.id);
      if (!scene) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'This scene was deleted.',
        });
      }
      if (scene.status !== 'pending') {
        return { scene: await pollCheck(ctx.runway, scene), progress: 1 };
      }

      let snap;
      try {
        snap = await ctx.runway.taskSnapshot(input.id);
      } catch (err) {
        runwayFailure(err);
      }
      if (!snap.done) return { scene, progress: snap.progress ?? null };

      if (snap.status === 'SUCCEEDED' && snap.url) {
        const imageKey = await saveResult(scene, snap.url, snap.filename);
        // Only the poll that flips the scene starts its check, so two open
        // tabs never pay for it twice.
        let claimed = false;
        const all = await updateScenes((list) => {
          claimed = false;
          return list.map((s) => {
            if (s.id !== scene.id || s.status !== 'pending') return s;
            claimed = true;
            return {
              ...s,
              status: 'succeeded',
              imageKey,
              check: { status: 'pending', startedAt: new Date().toISOString() },
            };
          });
        });
        const done = all.find((s) => s.id === scene.id) ?? scene;
        if (!claimed) return { scene: done, progress: 1 };
        const check = await startCheck(ctx.runway, done, snap.url);
        return { scene: await patchCheck(done, check), progress: 1 };
      }
      const error =
        [snap.error, snap.hint].filter(Boolean).join(' ') ||
        (snap.status === 'CANCELLED'
          ? 'The generation was cancelled.'
          : "The generation didn't produce an image. Try again, or adjust the direction notes.");
      const all = await patchScene(scene.id, { status: 'failed', error });
      return { scene: all.find((s) => s.id === scene.id) ?? scene, progress: 1 };
    }),

  deleteScene: signedInProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      let gone: Scene | undefined;
      await updateScenes((all) => {
        gone = all.find((s) => s.id === input.id);
        return all.filter((s) => s.id !== input.id);
      });
      if (gone?.imageKey) await deleteObject(gone.imageKey);
      return { ok: true };
    }),
};
