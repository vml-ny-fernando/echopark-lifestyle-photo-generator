/**
 * Tester access for the self-hosted build: one shared password (APP_PASSWORD)
 * plus the tester's name, kept in a signed cookie. It replaces Runway
 * sign-in. With APP_PASSWORD unset the app is open, which is only meant for
 * local development.
 */
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import type Koa from 'koa';

import { sessionSecret } from './secret.ts';

export const SESSION_COOKIE = 'ep_session';
const SESSION_DAYS = 14;

export type Session = { id: string; name: string };

export const SessionSymbol = Symbol('echopark.session');

declare module 'node:http' {
  interface IncomingMessage {
    [SessionSymbol]?: Session | undefined;
  }
}

function password(): string | undefined {
  return process.env['APP_PASSWORD'] || undefined;
}

export function authRequired(): boolean {
  return password() !== undefined;
}

function sign(payload: string): string {
  return createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

function encodeSession(s: Session): string {
  const payload = Buffer.from(
    JSON.stringify({ ...s, e: Date.now() + SESSION_DAYS * 864e5 })
  ).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function decodeSession(raw: string | undefined): Session | undefined {
  if (!raw) return undefined;
  const [payload, sig] = raw.split('.');
  if (!payload || !sig || !safeEqual(sig, sign(payload))) return undefined;
  try {
    const v = JSON.parse(Buffer.from(payload, 'base64url').toString()) as Session & {
      e: number;
    };
    if (typeof v.e !== 'number' || Date.now() > v.e) return undefined;
    return { id: String(v.id), name: String(v.name) };
  } catch {
    return undefined;
  }
}

/** The signed-in tester for this request, or a local "Tester" when auth is off. */
export function getSession(req: IncomingMessage): Session | undefined {
  if (!authRequired()) return { id: 'local', name: 'Tester' };
  return req[SessionSymbol];
}

// --- Sign-in page -----------------------------------------------------------

const attempts = new Map<string, { n: number; reset: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const a = attempts.get(ip);
  if (!a || now > a.reset) {
    attempts.set(ip, { n: 1, reset: now + 60_000 });
    return false;
  }
  a.n += 1;
  return a.n > 10;
}

function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function safeNext(next: unknown): string {
  const n = typeof next === 'string' ? next : '/';
  return n.startsWith('/') && !n.startsWith('//') ? n : '/';
}

function signInPage(opts: { next: string; error?: string; name?: string }): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Sign in · EchoPark Scene Studio</title>
<style>
  :root { --park:#313d47; --echo:#62a60a; --tint:#eaeced; }
  * { box-sizing: border-box; }
  body { margin:0; min-height:100vh; display:grid; place-items:center; background:var(--tint);
    font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, sans-serif; color:var(--park); }
  main { width:min(400px, calc(100% - 32px)); background:#fff; border:2px solid var(--park); padding:32px; }
  img { display:block; width:200px; height:auto; margin-bottom:24px; }
  h1 { font-size:20px; margin:0 0 8px; }
  p { margin:0 0 20px; color:#46525c; font-size:14px; line-height:1.5; }
  label { display:block; font-size:13px; font-weight:600; margin:0 0 6px; }
  input { width:100%; font:inherit; font-size:15px; padding:10px 12px; border:2px solid var(--park); border-radius:0; margin-bottom:16px; }
  input:focus { outline:3px solid var(--echo); outline-offset:0; }
  button { width:100%; font:inherit; font-weight:700; font-size:15px; padding:12px; border:0; background:var(--echo); color:#fff; cursor:pointer; }
  button:hover { background:#4f8708; }
  .error { background:#fdecea; border-left:4px solid #c62828; padding:10px 12px; margin-bottom:16px; font-size:14px; color:#7f1d1d; }
</style>
</head>
<body>
<main>
  <img src="/echopark-logo.svg" alt="EchoPark Automotive" width="200" height="66" />
  <h1>EchoPark Scene Studio</h1>
  <p>Enter your name and the tester password you were given.</p>
  ${opts.error ? `<div class="error" role="alert">${escapeHtml(opts.error)}</div>` : ''}
  <form method="post" action="/sign-in">
    <input type="hidden" name="next" value="${escapeHtml(opts.next)}" />
    <label for="name">Your name</label>
    <input id="name" name="name" autocomplete="name" required maxlength="60" value="${escapeHtml(opts.name ?? '')}" />
    <label for="password">Password</label>
    <input id="password" name="password" type="password" autocomplete="current-password" required />
    <button type="submit">Sign in</button>
  </form>
</main>
</body>
</html>`;
}

async function readForm(ctx: Koa.Context): Promise<URLSearchParams> {
  let body = '';
  for await (const chunk of ctx.req) {
    body += chunk;
    if (body.length > 10_000) break;
  }
  return new URLSearchParams(body);
}

/** Paths a signed-out visitor may reach. */
function isPublicPath(p: string): boolean {
  return (
    p === '/sign-in' ||
    p === '/sign-out' ||
    p === '/__bay/health' ||
    p === '/healthz' ||
    p === '/echopark-logo.svg' ||
    p === '/favicon.ico' ||
    p.startsWith('/assets/') ||
    // tRPC answers signed-out calls itself: `profile` returns null and the
    // rest refuse with UNAUTHORIZED, which the client turns into a prompt.
    p.startsWith('/trpc')
  );
}

/**
 * Mounts /sign-in and /sign-out, reads the session cookie, and keeps
 * signed-out visitors away from everything else.
 */
export function testerAuth(): Koa.Middleware {
  return async (ctx, next) => {
    const cookie = ctx.cookies.get(SESSION_COOKIE);
    ctx.req[SessionSymbol] = decodeSession(cookie);

    if (ctx.path === '/sign-in') {
      if (ctx.method === 'GET') {
        if (!authRequired() || ctx.req[SessionSymbol]) {
          ctx.redirect(safeNext(ctx.query['next']));
          return;
        }
        ctx.type = 'html';
        ctx.set('Cache-Control', 'no-store');
        ctx.body = signInPage({ next: safeNext(ctx.query['next']) });
        return;
      }
      if (ctx.method === 'POST') {
        const form = await readForm(ctx);
        const nextPath = safeNext(form.get('next'));
        const name = (form.get('name') ?? '').trim().slice(0, 60);
        const given = form.get('password') ?? '';
        const expected = password();
        if (rateLimited(ctx.ip)) {
          ctx.status = 429;
          ctx.type = 'html';
          ctx.body = signInPage({ next: nextPath, name, error: 'Too many attempts. Wait a minute and try again.' });
          return;
        }
        if (!expected || !name || !safeEqual(given, expected)) {
          ctx.status = 401;
          ctx.type = 'html';
          ctx.body = signInPage({
            next: nextPath,
            name,
            error: !name ? 'Enter your name.' : 'That password is not right.',
          });
          return;
        }
        ctx.cookies.set(SESSION_COOKIE, encodeSession({ id: randomUUID(), name }), {
          httpOnly: true,
          sameSite: 'lax',
          secure: ctx.secure,
          maxAge: SESSION_DAYS * 864e5,
          overwrite: true,
        });
        ctx.redirect(nextPath);
        return;
      }
    }

    if (ctx.path === '/sign-out') {
      ctx.cookies.set(SESSION_COOKIE, null, { overwrite: true });
      ctx.redirect('/sign-in');
      return;
    }

    if (!authRequired() || ctx.req[SessionSymbol] || isPublicPath(ctx.path)) {
      await next();
      return;
    }

    if (['GET', 'HEAD'].includes(ctx.method) && ctx.accepts('html') && !ctx.path.startsWith('/media') && !ctx.path.startsWith('/api')) {
      ctx.redirect(`/sign-in?next=${encodeURIComponent(ctx.originalUrl)}`);
      return;
    }
    ctx.status = 401;
    ctx.body = { error: 'sign_in_required' };
  };
}
