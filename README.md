# EchoPark Scene Studio

Generate on-brand EchoPark lifestyle photos of approved characters with an Echo
Green accent, shallow depth of field and social-ready framing. Each finished
scene gets an automatic brand check for maker badges, stray text and a car
that drifted from the reference.

This app was built in Runway App Studio and ported to run on its own (Heroku +
GitHub) so testers can use it without Runway accounts.

## What changed from the App Studio build

| Inside Runway (Bay)                         | Self-hosted                                              |
| ------------------------------------------- | -------------------------------------------------------- |
| `@runway/bay`, `@runway/bay-react` packages | `src/platform/*` and `src/client/platform.tsx` stand-ins |
| Runway sign-in, visitor's Runway credits    | One shared tester password + name (`/sign-in`)           |
| `gemini_3_pro` / `gemini_api` via Runway     | Google Gemini API directly, on the server's key          |
| Runway-managed S3                            | Your own S3 bucket (Heroku Bucketeer add-on)             |

The UI, prompts (`src/shared/scene.ts`), brand-check logic and cast/scene
flow are unchanged. The app code still calls `createTask` / `taskSnapshot`;
`src/platform/runway.ts` runs those on Gemini.

Also fixed: a page crash ("This part didn't load") when a scene's brand check
finished before the scene list refreshed (`useSceneGeneration.ts`).

## Deploy to Heroku

1. **Connect GitHub.** Heroku app → Deploy → Deployment method: GitHub →
   connect this repo → Enable Automatic Deploys from `main` (or Deploy Branch).
2. **Storage (optional for a demo).** Without a bucket, files live on the
   dyno's disk and the cast and generated scenes reset on every restart
   (Heroku restarts at least daily); vehicle photos come from `seed/`. To keep
   them, use any S3-compatible bucket:
   - **Bucketeer** add-on: sets the `BUCKETEER_*` vars automatically.
   - **Supabase Storage**: create a private bucket, then Storage → Settings →
     S3 Connection → new access key, and set `S3_BUCKET` (bucket name),
     `S3_ENDPOINT` (`https://<project-ref>.storage.supabase.co/storage/v1/s3`),
     `S3_REGION` (the project's region, e.g. `us-east-1`),
     `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY`.
3. **Set Config Vars** (Settings → Reveal Config Vars):
   - `APP_PASSWORD`: the password you give testers
   - `SESSION_SECRET` (optional): any long random string; without it testers
     are signed out on each restart
   - `GEMINI_API_KEY`: from https://aistudio.google.com/apikey (billing must be
     enabled on the Google project for the image model)
   - `NODE_ENV` = `production`
   - optional `GEMINI_IMAGE_MODEL` (default `gemini-3-pro-image-preview`),
     `GEMINI_TEXT_MODEL` (default `gemini-2.5-flash`)
4. **Keep one web dyno.** Running generations live in that dyno's memory and
   library updates are serialised in-process. Basic is fine.
5. **Load the vehicle photos once** (see below), then add the cast in the app.

The build runs `pnpm install` and `pnpm build` (typecheck, Vite client,
esbuild server bundle); the `Procfile` starts `.build/index.mjs`.

## Vehicle reference photos

The approved vehicle photos lived in Runway's storage and were not part of the
export. The simplest home for them is `seed/vehicles/` in this repo: the app
reads a vehicle from there whenever storage doesn't have it, so they survive
dyno restarts even without a bucket. Name one image per vehicle by id:

```
crossover-white.jpg   crossover-grey.jpg   sedan-slate-blue.jpg   sedan-grey.jpg
sedan-silver.jpg      pickup-white.jpg     convertible-blue.jpg
```

Optional `<id>-thumb.jpg` files become the picker thumbnails (otherwise the
full photo is shown). To put them in the bucket instead, with the bucket's env
vars set:

```
pnpm seed:vehicles ./vehicles
```

## Cast

On first run (storage has no `library/cast.json` yet) the app loads every
character sheet in `seed/cast/<Label>.jpg` as one character, named by the
file. After that the cast is managed in the app (Add Character / edit /
delete) and is never reseeded. Labels drive grouping: `Female30A`, `Male40B`,
`MaleTeenA`, `DogA`, `GuideM30A`. Keep sheets at or under 2048px JPEGs (the
app refuses uploads over 15 MB).

## Local development

```
pnpm install
cp .env.example .env   # fill in GEMINI_API_KEY; leave APP_PASSWORD empty to skip sign-in
set -a; source .env; set +a
pnpm dev:api           # API on :3001 (files go to .data/ without a bucket)
pnpm dev:web           # Vite on :5173, proxies the API
```

Production-like run: `pnpm build && NODE_ENV=production pnpm start`.

## Layout

- `src/index.ts`: Koa server (health, sign-in, uploads, tRPC, media, static)
- `src/api-library.ts`: cast and scene procedures, generation and brand check
- `src/shared/scene.ts`: scenarios, vehicles, prompt builder
- `src/platform/`: auth, storage and the Gemini task client
- `src/client/`: React app (design rules in `design.md`)
