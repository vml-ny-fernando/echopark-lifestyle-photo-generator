import Router from '@koa/router';
import Koa from 'koa';

import { mountApi, mountStaticFallback } from './api-routes.ts';
import { media } from './media.ts';
import { testerAuth } from './platform/auth.ts';
import { uploadRoute } from './platform/storage.ts';
import { mountStatic, mountTrpc } from './routes.ts';

const app = new Koa();
app.proxy = true;

// Health check. Must stay unauthenticated and come before testerAuth().
app.use(async (ctx, next) => {
  if (ctx.path === '/__bay/health' || ctx.path === '/healthz') {
    ctx.status = 200;
    ctx.body = 'ok';
    return;
  }
  await next();
});

// Tester sign-in (src/platform/auth.ts): a shared APP_PASSWORD plus the
// tester's name, kept in a signed cookie. Signed-out visitors get the
// /sign-in page; tRPC procedures built on `signedInProcedure` refuse them
// with UNAUTHORIZED. Every generation runs on the server's Gemini key.
app.use(testerAuth());

// Browser uploads of cast photos: the signed URL from `presignUpload`.
const uploadRouter = new Router();
uploadRouter.put('/api/upload', uploadRoute);
app.use(uploadRouter.routes());

mountTrpc(app);
mountApi(app);

// Mount your own routers here — above the line below, so they answer before
// the static fallback and their answer is final (`bay add agent`'s router
// goes here).

// Stored images (cast photos, generated scenes): one stable URL per object
// that redirects to a short-lived presigned S3 GET.
const mediaRouter = new Router();
mediaRouter.get('/media/{*key}', media);
app.use(mediaRouter.routes());

// Mounts the static middleware, and tells the /api gate which responses came
// out of it — so the SPA shell answering an API path is rewritten as JSON
// while a real handler's answer (HTML included) is left alone.
mountStaticFallback(app, mountStatic);

const port = Number(process.env['PORT'] ?? 3000);
const server = app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

// Bay's gateway pools the upstream connection to this pod. Node's default
// 5s keepAliveTimeout closes idle connections before the next request
// arrives, forcing a slow cold re-dial — raise both past the gateway's
// idle window (BayApp does this automatically; raw Koa apps must set it).
server.keepAliveTimeout = 120_000;
server.headersTimeout = 125_000;

// The deployed container runs node as PID 1, and Linux never applies a
// signal's default action to PID 1 — without this handler SIGTERM is ignored
// and the pod is killed only when its grace period runs out. Stop accepting
// connections, let in-flight requests finish, and exit; the timer caps a
// long-lived stream well inside the pod's grace period.
process.once('SIGTERM', () => {
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 10_000).unref();
});
