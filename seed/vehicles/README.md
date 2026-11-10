Approved vehicle reference photos, shipped with the app. One image per vehicle,
named by id: `<id>.jpg` (plus an optional `<id>-thumb.jpg` for the picker).
Ids are in `src/shared/scene.ts` (VEHICLES). The app reads these whenever the
vehicle is not in storage, so they survive dyno restarts without a bucket.
