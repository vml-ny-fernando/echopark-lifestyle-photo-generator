/**
 * Object storage for the self-hosted build. It replaces `@runway/bay/storage`
 * with the same function names, so the app code barely changed.
 *
 * Two backends:
 * - S3 (or any S3-compatible bucket) when a bucket is configured. Heroku's
 *   Bucketeer add-on sets BUCKETEER_* vars; plain S3_* / AWS_* vars work too.
 * - The local filesystem (LOCAL_STORAGE_DIR, default `.data/`) otherwise.
 *   That is for local development only: a Heroku dyno's disk is wiped on
 *   every restart.
 *
 * Browser uploads go through this server (`/api/upload`, signed URL) rather
 * than straight to S3, so the bucket needs no CORS setup.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { createReadStream, existsSync } from 'node:fs';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  NoSuchKey,
  NotFound,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type Koa from 'koa';

import { sessionSecret } from './secret.ts';
import { vehicleImageKey, vehicleThumbKey, VEHICLES } from '../shared/scene.ts';

const env = process.env;
const bucket = env['BUCKETEER_BUCKET_NAME'] ?? env['S3_BUCKET'];
// S3_* names are preferred (e.g. Supabase Storage's S3 keys); AWS_* and
// Bucketeer's names work too.
const accessKeyId =
  env['S3_ACCESS_KEY_ID'] ?? env['BUCKETEER_AWS_ACCESS_KEY_ID'] ?? env['AWS_ACCESS_KEY_ID'];
const secretAccessKey =
  env['S3_SECRET_ACCESS_KEY'] ??
  env['BUCKETEER_AWS_SECRET_ACCESS_KEY'] ??
  env['AWS_SECRET_ACCESS_KEY'];
const region =
  env['S3_REGION'] ?? env['BUCKETEER_AWS_REGION'] ?? env['AWS_REGION'] ?? 'us-east-1';
const endpoint = env['S3_ENDPOINT'] || undefined;
/** Everything this app writes lives under this prefix in the bucket. */
const prefix = (env['S3_PREFIX'] ?? 'echopark-scene-studio/').replace(/^\/+/, '');

const s3 = bucket
  ? new S3Client({
      region,
      endpoint,
      forcePathStyle: Boolean(endpoint),
      // Recent AWS SDKs add CRC checksums to every upload by default, which
      // S3-compatible services such as Supabase Storage reject. Only send
      // them where an operation requires one.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
      ...(accessKeyId && secretAccessKey
        ? { credentials: { accessKeyId, secretAccessKey } }
        : {}),
    })
  : null;

const localDir = path.resolve(env['LOCAL_STORAGE_DIR'] ?? '.data');

export const storageBackend = s3 ? 's3' : 'local';
if (!s3 && env['NODE_ENV'] === 'production') {
  console.warn(
    '[storage] No bucket configured: using the local disk, which Heroku wipes on every restart (cast and scenes reset; vehicle photos come from seed/). Add Bucketeer or set S3_BUCKET to keep them.'
  );
}

/**
 * Read-only files shipped in the repo under `seed/` (e.g.
 * `seed/vehicles/crossover-white.jpg`). A key missing from storage falls back
 * to its seed copy, so the approved vehicle photos survive even when storage
 * is the dyno's disk, which Heroku wipes on every restart.
 */
const seedDir = path.resolve(env['SEED_DIR'] ?? 'seed');

function seedPath(key: string): string | null {
  if (!key.startsWith('vehicles/')) return null;
  const file = path.join(seedDir, key);
  return existsSync(file) ? file : null;
}

/** Other names a vehicle photo may have been uploaded under (.jpeg, .png, .webp). */
function vehicleAliases(key: string): string[] {
  const m = /^(vehicles\/[^/]+)\.jpg$/.exec(key);
  return m ? ['jpeg', 'JPG', 'JPEG', 'png', 'webp'].map((e) => `${m[1]}.${e}`) : [];
}

export const STORAGE_UPLOAD_FAILURE_HINT =
  'The photo could not be stored. Try adding it again.';

function safeKey(key: string): string {
  const clean = key.replace(/^\/+/, '');
  if (!clean || clean.split('/').some((p) => p === '..' || p === '')) {
    throw new Error(`Invalid storage key: ${key}`);
  }
  return clean;
}

function localPath(key: string): string {
  return path.join(localDir, safeKey(key));
}

function isMissing(err: unknown): boolean {
  return (
    err instanceof NoSuchKey ||
    err instanceof NotFound ||
    (err as { name?: string })?.name === 'NotFound' ||
    (err as { $metadata?: { httpStatusCode?: number } })?.$metadata
      ?.httpStatusCode === 404 ||
    (err as NodeJS.ErrnoException)?.code === 'ENOENT' ||
    // S3-compatible services word "missing" differently (Supabase Storage
    // can answer 400 with "Object not found").
    (err as { Code?: string })?.Code === 'NoSuchKey' ||
    /NoSuchKey|NotFound|object not found|key not found/i.test(
      `${(err as Error)?.name ?? ''} ${(err as Error)?.message ?? ''}`
    )
  );
}

function contentTypeFor(key: string): string {
  const ext = key.split('.').pop()?.toLowerCase();
  return (
    {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      json: 'application/json',
    }[ext ?? ''] ?? 'application/octet-stream'
  );
}

export async function getObject(key: string): Promise<Uint8Array | null> {
  try {
    if (s3) {
      const res = await s3.send(
        new GetObjectCommand({ Bucket: bucket, Key: prefix + safeKey(key) })
      );
      return res.Body ? await res.Body.transformToByteArray() : null;
    }
    return new Uint8Array(await fs.readFile(localPath(key)));
  } catch (err) {
    if (!isMissing(err)) throw err;
    for (const alias of vehicleAliases(safeKey(key))) {
      const bytes = await getObject(alias);
      if (bytes) return bytes;
    }
    const seed = seedPath(safeKey(key));
    return seed ? new Uint8Array(await fs.readFile(seed)) : null;
  }
}

export async function putObject(
  key: string,
  body: Uint8Array | string,
  opts: { contentType?: string | undefined } = {}
): Promise<void> {
  const contentType = opts.contentType ?? contentTypeFor(key);
  if (s3) {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: prefix + safeKey(key),
        Body: body,
        ContentType: contentType,
      })
    );
    return;
  }
  const file = localPath(key);
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, body);
  await fs.rename(tmp, file);
}

export async function deleteObject(key: string): Promise<void> {
  try {
    if (s3) {
      await s3.send(
        new DeleteObjectCommand({ Bucket: bucket, Key: prefix + safeKey(key) })
      );
      return;
    }
    await fs.unlink(localPath(key));
  } catch (err) {
    if (!isMissing(err)) throw err;
  }
}

export async function headObject(
  key: string
): Promise<{
  size: number;
  contentType?: string | undefined;
  /** Set when the object is the read-only copy in `seed/`. */
  seedFile?: string | undefined;
  /** Set when the object was found under another extension. */
  aliasKey?: string | undefined;
} | null> {
  try {
    if (s3) {
      const res = await s3.send(
        new HeadObjectCommand({ Bucket: bucket, Key: prefix + safeKey(key) })
      );
      return { size: res.ContentLength ?? 0, contentType: res.ContentType };
    }
    const st = await fs.stat(localPath(key));
    return { size: st.size, contentType: contentTypeFor(key) };
  } catch (err) {
    if (!isMissing(err)) throw err;
    for (const alias of vehicleAliases(safeKey(key))) {
      const head = await headObject(alias);
      if (head) return { ...head, aliasKey: head.aliasKey ?? alias };
    }
    const seed = seedPath(safeKey(key));
    if (!seed) return null;
    const st = await fs.stat(seed);
    return { size: st.size, contentType: contentTypeFor(key), seedFile: seed };
  }
}

export async function list(dir = ''): Promise<string[]> {
  if (s3) {
    const keys: string[] = [];
    let token: string | undefined;
    do {
      const res = await s3.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: prefix + dir,
          ContinuationToken: token,
        })
      );
      for (const o of res.Contents ?? []) {
        if (o.Key) keys.push(o.Key.slice(prefix.length));
      }
      token = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (token);
    return keys;
  }
  const root = path.join(localDir, dir);
  if (!existsSync(root)) return [];
  const entries = await fs.readdir(root, { recursive: true, withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && !e.name.endsWith('.tmp'))
    .map((e) =>
      path.relative(localDir, path.join(e.parentPath, e.name)).split(path.sep).join('/')
    );
}

// ---------------------------------------------------------------------------
// Signed browser uploads: `presignUpload` hands out a same-origin URL that
// `uploadRoute` accepts once, before it expires, for exactly one key.

const UPLOAD_TTL_MS = 15 * 60 * 1000;

function sign(payload: string): string {
  return createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
}

export async function presignUpload(
  key: string,
  opts: { contentType: string; size: number }
): Promise<string> {
  const payload = Buffer.from(
    JSON.stringify({
      k: safeKey(key),
      t: opts.contentType,
      s: opts.size,
      e: Date.now() + UPLOAD_TTL_MS,
    })
  ).toString('base64url');
  return `/api/upload?u=${payload}.${sign(payload)}`;
}

/** `PUT /api/upload?u=…` — stores the request body under the signed key. */
export async function uploadRoute(ctx: Koa.Context): Promise<void> {
  const raw = String(ctx.query['u'] ?? '');
  const [payload, sig] = raw.split('.');
  const expected = payload ? sign(payload) : '';
  if (
    !payload ||
    !sig ||
    sig.length !== expected.length ||
    !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  ) {
    ctx.status = 403;
    ctx.body = { error: 'invalid_upload_url' };
    return;
  }
  const claim = JSON.parse(Buffer.from(payload, 'base64url').toString()) as {
    k: string;
    t: string;
    s: number;
    e: number;
  };
  if (Date.now() > claim.e) {
    ctx.status = 403;
    ctx.body = { error: 'upload_url_expired' };
    return;
  }
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of ctx.req) {
    total += (chunk as Buffer).length;
    if (total > claim.s) {
      ctx.status = 413;
      ctx.body = { error: 'too_large' };
      return;
    }
    chunks.push(chunk as Buffer);
  }
  await putObject(claim.k, new Uint8Array(Buffer.concat(chunks)), {
    contentType: claim.t,
  });
  ctx.status = 200;
  ctx.body = { ok: true };
}

// ---------------------------------------------------------------------------
// Media: one stable URL per object.

/**
 * `/media/<key>`: redirects to a short-lived presigned GET on S3, or streams
 * the file from local disk. `?download` asks the browser to save it.
 * A missing `vehicles/<id>-thumb.jpg` falls back to the full vehicle photo.
 */
export function mediaRedirect(keyOf: (ctx: Koa.ParameterizedContext & { params: Record<string, string | string[] | undefined> }) => string | undefined) {
  return async (ctx: Koa.ParameterizedContext & { params: Record<string, string | string[] | undefined> }) => {
    let key = keyOf(ctx);
    if (!key) {
      ctx.status = 404;
      return;
    }
    try {
      key = safeKey(key);
    } catch {
      ctx.status = 400;
      return;
    }
    let head = await headObject(key);
    if (!head && /^vehicles\/.+-thumb\.jpg$/.test(key)) {
      key = key.replace(/-thumb\.jpg$/, '.jpg');
      head = await headObject(key);
    }
    if (!head) {
      ctx.status = 404;
      ctx.body = '';
      return;
    }
    if (head.aliasKey) key = head.aliasKey;
    const download = 'download' in ctx.query;
    const filename = key.split('/').pop() ?? 'file';
    if (s3 && !head.seedFile) {
      const url = await getSignedUrl(
        s3,
        new GetObjectCommand({
          Bucket: bucket,
          Key: prefix + key,
          ...(download
            ? { ResponseContentDisposition: `attachment; filename="${filename}"` }
            : {}),
        }),
        { expiresIn: 3600 }
      );
      ctx.set('Cache-Control', 'private, max-age=600');
      ctx.redirect(url);
      return;
    }
    ctx.type = head.contentType ?? contentTypeFor(key);
    ctx.length = head.size;
    ctx.set('Cache-Control', 'private, max-age=600');
    if (download) ctx.attachment(filename);
    ctx.body = createReadStream(head.seedFile ?? localPath(key));
  };
}

// ---------------------------------------------------------------------------
// Document store: one JSON object per name, with serialised updates.

/**
 * Durable JSON documents. Updates are serialised per document inside this
 * process, which is safe while the app runs on a single web dyno (the
 * Procfile and README say to keep it at one).
 */
export function documentStore<T>({ prefix: docPrefix }: { prefix: string }) {
  const queues = new Map<string, Promise<unknown>>();

  async function get(name: string): Promise<{ value: T } | null> {
    const bytes = await getObject(docPrefix + name);
    if (!bytes) return null;
    return { value: JSON.parse(Buffer.from(bytes).toString('utf8')) as T };
  }

  function update(name: string, mutate: (cur: T | undefined) => T): Promise<T> {
    const prev = queues.get(name) ?? Promise.resolve();
    const next = prev
      .catch(() => undefined)
      .then(async () => {
        const cur = await get(name);
        const value = mutate(cur?.value);
        await putObject(docPrefix + name, JSON.stringify(value), {
          contentType: 'application/json',
        });
        return value;
      });
    queues.set(name, next);
    return next;
  }

  return { get, update };
}

// ---------------------------------------------------------------------------
// Diagnostics: GET /api/storage-check (signed-in testers only).

function describe(err: unknown): string {
  const e = err as Error & { Code?: string; $metadata?: { httpStatusCode?: number } };
  return [e?.name, e?.Code, e?.$metadata?.httpStatusCode, e?.message]
    .filter((x) => x !== undefined && x !== '')
    .join(' · ');
}

/** Tries each storage operation once and reports what failed, without secrets. */
export async function storageCheckRoute(ctx: Koa.Context): Promise<void> {
  const steps: { step: string; ok: boolean; detail?: string }[] = [];
  const run = async (step: string, fn: () => Promise<string | void>) => {
    try {
      const detail = await fn();
      steps.push({ step, ok: true, ...(detail ? { detail } : {}) });
    } catch (err) {
      steps.push({ step, ok: false, detail: describe(err) });
    }
  };
  const probe = `diagnostics/check-${Date.now()}.txt`;
  await run('vehicle photos', async () => {
    const files = await list('vehicles/');
    const found = VEHICLES.filter((v) => [vehicleImageKey(v.id), ...vehicleAliases(vehicleImageKey(v.id))].some((k) => files.includes(k)) || seedPath(vehicleImageKey(v.id)));
    const missing = VEHICLES.filter((v) => !found.includes(v)).map((v) => vehicleImageKey(v.id));
    const extra = files.filter((f) => !VEHICLES.some((v) => [vehicleImageKey(v.id), vehicleThumbKey(v.id), ...vehicleAliases(vehicleImageKey(v.id))].includes(f)));
    return `${found.length}/${VEHICLES.length} found. Missing: ${missing.join(', ') || 'none'}. Unrecognised files in vehicles/: ${extra.join(', ') || 'none'}`;
  });
  await run('write test file', () => putObject(probe, 'ok', { contentType: 'text/plain' }));
  await run('read test file', async () => {
    const b = await getObject(probe);
    if (!b) throw new Error('written file not found');
  });
  await run('delete test file', () => deleteObject(probe));
  await run('read missing file', async () => {
    const b = await getObject('diagnostics/does-not-exist.txt');
    return b ? 'unexpectedly found' : 'correctly reported missing';
  });
  ctx.set('Cache-Control', 'no-store');
  ctx.body = {
    backend: storageBackend,
    bucket: bucket ?? null,
    endpoint: endpoint ?? '(AWS default)',
    region,
    prefix,
    accessKeySet: Boolean(accessKeyId),
    secretKeySet: Boolean(secretAccessKey),
    steps,
  };
}
