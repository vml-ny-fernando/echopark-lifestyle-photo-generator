/**
 * Stand-in for `@runway/bay/runway` in the self-hosted build.
 *
 * The app code was written against Runway's task API (`createTask`,
 * `taskSnapshot`, `uploadAsset`). This module keeps that shape but runs the
 * two models directly on the Google Gemini API:
 *
 *   gemini_3_pro (scene)        -> GEMINI_IMAGE_MODEL (default gemini-3-pro-image-preview)
 *   gemini_api   (brand check)  -> GEMINI_TEXT_MODEL  (default gemini-2.5-flash)
 *
 * Tasks run in this process and their results are held in memory until the
 * client's poll copies them into storage, so a dyno restart mid-generation
 * fails that one scene (the UI says so and the user can generate again).
 */
import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';

import { getSession } from './auth.ts';

export const SIGN_IN_REQUIRED = 'sign_in_required: Sign in to use EchoPark Scene Studio.';

// --- Errors (same names the app code already handles) ----------------------

export class RunwayCreditError extends Error {
  reason: string | undefined;
  constructor(message: string) {
    super(message);
    this.name = 'RunwayCreditError';
    this.reason = message;
  }
}
export class RunwayAuthError extends Error {
  permissionDenied: boolean;
  reason: string | undefined;
  constructor(message: string, permissionDenied = false) {
    super(message);
    this.name = 'RunwayAuthError';
    this.permissionDenied = permissionDenied;
    this.reason = message;
  }
}
export class RunwayTaskError extends Error {
  override name = 'RunwayTaskError';
}
export class RunwayUploadRejectedError extends Error {
  override name = 'RunwayUploadRejectedError';
}
/** Never thrown here; kept so the shared error formatter compiles unchanged. */
export class RunwayBrokerError extends Error {
  code = 'none';
  consentUrl: string | undefined = undefined;
}

export function describeRunwayFailure(err: unknown): { message: string } {
  return {
    message:
      err instanceof Error && err.message
        ? err.message
        : 'The image service did not answer. Try again in a moment.',
  };
}

export function runwayCreditsRequired(_err: unknown): undefined {
  return undefined;
}

export function runwayAuthGated(_req: IncomingMessage): boolean {
  return true;
}

export function getRunwaySignInUrl(_req: IncomingMessage): string {
  return '/sign-in';
}

export function getBayViewer(req: IncomingMessage) {
  return getSession(req) ?? null;
}

export function getRunwayToken(_req: IncomingMessage): string | undefined {
  return undefined;
}

export function decodeJwtPayload(_token: string): { email?: string } | undefined {
  return undefined;
}

export type RunwayProfile = {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  picture?: string | null;
};

// --- Gemini-backed task client ----------------------------------------------

type TaskState = {
  status: 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  startedAt: number;
  expectedMs: number;
  url?: string;
  filename?: string;
  text?: string;
  error?: string;
  finishedAt?: number;
};

const tasks = new Map<string, TaskState>();
const TASK_TTL_MS = 60 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [id, t] of tasks) {
    if (t.finishedAt && now - t.finishedAt > TASK_TTL_MS) tasks.delete(id);
  }
}, 5 * 60 * 1000).unref();

const API_BASE =
  process.env['GEMINI_API_BASE'] ?? 'https://generativelanguage.googleapis.com/v1beta';
const REQUEST_TIMEOUT_MS = 5 * 60 * 1000;

function apiKey(): string {
  const key = process.env['GEMINI_API_KEY'] ?? process.env['GOOGLE_API_KEY'];
  if (!key) {
    throw new RunwayTaskError(
      'Image generation is not set up on this server yet (GEMINI_API_KEY is missing).'
    );
  }
  return key;
}

type Part =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

function dataUrl(mime: string, b64: string): string {
  return `data:${mime};base64,${b64}`;
}

function sniffMime(bytes: Uint8Array, filename?: string): string {
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return 'image/png';
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'image/jpeg';
  if (bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50)
    return 'image/webp';
  const ext = filename?.split('.').pop()?.toLowerCase();
  return ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
}

function imagePart(url: string): Part {
  const m = /^data:([^;]+);base64,(.*)$/s.exec(url);
  if (!m) throw new RunwayTaskError('A reference image could not be read.');
  return { inline_data: { mime_type: m[1]!, data: m[2]! } };
}

type GeminiResponse = {
  candidates?: {
    content?: { parts?: { text?: string; thought?: boolean; inlineData?: { mimeType: string; data: string } }[] };
    finishReason?: string;
  }[];
  promptFeedback?: { blockReason?: string };
  error?: { message?: string; status?: string; code?: number };
};

async function callGemini(model: string, body: unknown): Promise<GeminiResponse> {
  const res = await fetch(`${API_BASE}/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey() },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const json = (await res.json().catch(() => ({}))) as GeminiResponse;
  if (!res.ok) {
    const msg = json.error?.message ?? `HTTP ${res.status}`;
    console.error(`[gemini] ${model} failed: ${res.status} ${msg}`);
    if (res.status === 429) {
      throw new RunwayTaskError(
        'The image service is busy or this key is over its quota. Wait a minute and try again.'
      );
    }
    if (res.status === 401 || res.status === 403) {
      throw new RunwayTaskError('The server’s Gemini API key was refused. Ask the admin to check it.');
    }
    throw new RunwayTaskError(`The image service refused the request: ${msg}`);
  }
  return json;
}

function blockedMessage(json: GeminiResponse): string | undefined {
  const block = json.promptFeedback?.blockReason;
  if (block) return `The request was blocked by the model’s safety filter (${block}). Adjust the direction notes and try again.`;
  const finish = json.candidates?.[0]?.finishReason;
  if (finish && !['STOP', 'MAX_TOKENS', 'FINISH_REASON_UNSPECIFIED'].includes(finish)) {
    return `The model stopped without an image (${finish}). Adjust the direction notes and try again.`;
  }
  return undefined;
}

type SceneParams = {
  text_prompt: string;
  image_size?: string;
  aspect_ratio?: string;
  reference_images?: { tag: string; url: string }[];
};

type CheckParams = {
  prompt: string;
  images?: { url: string }[];
  output_format?: string;
  max_output_tokens?: number;
};

async function runScene(p: SceneParams): Promise<Pick<TaskState, 'url' | 'filename'>> {
  const model = process.env['GEMINI_IMAGE_MODEL'] ?? 'gemini-3-pro-image-preview';
  const parts: Part[] = [];
  for (const ref of p.reference_images ?? []) {
    parts.push({ text: `Reference image @${ref.tag}:` });
    parts.push(imagePart(ref.url));
  }
  parts.push({ text: p.text_prompt });
  const json = await callGemini(model, {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
      imageConfig: {
        ...(p.aspect_ratio ? { aspectRatio: p.aspect_ratio } : {}),
        ...(p.image_size ? { imageSize: p.image_size } : {}),
      },
    },
  });
  const img = json.candidates?.[0]?.content?.parts?.find((x) => x.inlineData && !x.thought)
    ?.inlineData;
  if (!img) {
    throw new RunwayTaskError(
      blockedMessage(json) ??
        "The generation didn't produce an image. Try again, or adjust the direction notes."
    );
  }
  const ext = img.mimeType === 'image/jpeg' ? 'jpg' : img.mimeType === 'image/webp' ? 'webp' : 'png';
  return { url: dataUrl(img.mimeType, img.data), filename: `scene.${ext}` };
}

async function runCheck(p: CheckParams): Promise<Pick<TaskState, 'text'>> {
  const model = process.env['GEMINI_TEXT_MODEL'] ?? 'gemini-2.5-flash';
  const parts: Part[] = [];
  (p.images ?? []).forEach((img, i) => {
    parts.push({ text: `Image ${i + 1}:` });
    parts.push(imagePart(img.url));
  });
  parts.push({ text: p.prompt });
  const json = await callGemini(model, {
    contents: [{ role: 'user', parts }],
    generationConfig: {
      ...(p.output_format === 'json' ? { responseMimeType: 'application/json' } : {}),
      ...(p.max_output_tokens ? { maxOutputTokens: p.max_output_tokens } : {}),
    },
  });
  const text = json.candidates?.[0]?.content?.parts
    ?.filter((x) => typeof x.text === 'string' && !x.thought)
    .map((x) => x.text)
    .join('');
  if (!text) throw new RunwayTaskError(blockedMessage(json) ?? 'The brand check gave no answer.');
  return { text };
}

export type TaskSnapshot = {
  done: boolean;
  status: 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
  progress?: number | null;
  url?: string | undefined;
  filename?: string | undefined;
  text?: string | undefined;
  error?: string | undefined;
  hint?: string | undefined;
};

export class RunwayClient {
  constructor(private readonly session: { id: string; name: string }) {}

  async getProfile(): Promise<RunwayProfile> {
    return { email: '', firstName: this.session.name };
  }

  /** "Upload" a reference: kept inline as a data URL for the next Gemini call. */
  async uploadAsset(bytes: Uint8Array, opts: { filename?: string } = {}): Promise<{ url: string }> {
    const mime = sniffMime(bytes, opts.filename);
    return { url: dataUrl(mime, Buffer.from(bytes).toString('base64')) };
  }

  async createTask(model: string, params: Record<string, unknown>, _opts?: unknown): Promise<{ id: string }> {
    apiKey(); // fail fast, before the scene is recorded, when the key is missing
    const id = randomUUID();
    const isScene = model === 'gemini_3_pro';
    const size = String(params['image_size'] ?? '2K');
    const state: TaskState = {
      status: 'RUNNING',
      startedAt: Date.now(),
      expectedMs: isScene ? (size === '4K' ? 90_000 : size === '1K' ? 35_000 : 50_000) : 15_000,
    };
    tasks.set(id, state);
    const job = isScene
      ? runScene(params as unknown as SceneParams)
      : model === 'gemini_api'
        ? runCheck(params as unknown as CheckParams)
        : Promise.reject(new RunwayTaskError(`Unknown model ${model}.`));
    job.then(
      (result) => Object.assign(state, result, { status: 'SUCCEEDED', finishedAt: Date.now() }),
      (err: unknown) => {
        console.error(`[task ${id}] ${model} failed:`, err);
        Object.assign(state, {
          status: 'FAILED',
          error: describeRunwayFailure(err).message,
          finishedAt: Date.now(),
        });
      }
    );
    return { id };
  }

  async taskSnapshot(id: string, _opts?: { includeText?: boolean }): Promise<TaskSnapshot> {
    const t = tasks.get(id);
    if (!t) {
      return {
        done: true,
        status: 'FAILED',
        error: 'The server restarted while this was running. Generate it again.',
      };
    }
    if (t.status === 'RUNNING') {
      const elapsed = Date.now() - t.startedAt;
      return { done: false, status: 'RUNNING', progress: Math.min(0.95, elapsed / t.expectedMs) };
    }
    return {
      done: true,
      status: t.status,
      url: t.url,
      filename: t.filename,
      text: t.text,
      error: t.error,
    };
  }
}

/** A task client for a signed-in tester, or undefined when signed out. */
export function getRunwayClient(req: IncomingMessage): RunwayClient | undefined {
  const session = getSession(req);
  return session ? new RunwayClient(session) : undefined;
}
