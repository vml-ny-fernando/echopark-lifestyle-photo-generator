import { randomBytes } from 'node:crypto';

let fallback: string | undefined;

/**
 * Key for signing session cookies and upload URLs. Set SESSION_SECRET in
 * production; without it a random key is used, so every restart signs
 * everyone out.
 */
export function sessionSecret(): string {
  const configured = process.env['SESSION_SECRET'];
  if (configured) return configured;
  if (!fallback) {
    fallback = randomBytes(32).toString('hex');
    if (process.env['NODE_ENV'] === 'production') {
      console.warn('[auth] SESSION_SECRET is not set: sessions end on every restart.');
    }
  }
  return fallback;
}
