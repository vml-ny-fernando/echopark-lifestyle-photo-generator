import { useEffect, useRef, useState } from 'react';

import type { SceneConfig } from '../../shared/scene.ts';
import { trpc } from '../trpc.ts';

/** How often a pending scene is polled. */
const POLL_MS = 3000;

/**
 * The one in-flight generation, shared by the Generate button and the
 * preview: submit with `generate(config)`, then `sceneStatus` is polled until
 * the scene succeeds or fails. `activeId` is the scene the preview shows —
 * the one just generated, or one picked from the library with `show(id)`.
 */
export function useSceneGeneration() {
  const utils = trpc.useUtils();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);

  const submit = trpc.generateScene.useMutation({
    onSuccess: (scene) => {
      setActiveId(scene.id);
      setPendingId(scene.id);
      void utils.scenes.invalidate();
    },
    onError: () => setStartedAt(null),
  });

  // After the image lands, its brand check is polled through the same route.
  const [checkId, setCheckId] = useState<string | null>(null);
  // Checks this tab has seen finish. The scenes list can still show such a
  // check as pending until its refetch lands; without this, Stage would ask
  // to watch it again, the finished poll would clear it again, and the two
  // would loop until React gave up ("Maximum update depth exceeded").
  const settledChecks = useRef(new Set<string>());
  const watchedId = pendingId ?? checkId;

  const status = trpc.sceneStatus.useQuery(
    { id: watchedId ?? '' },
    {
      enabled: watchedId !== null,
      refetchInterval: POLL_MS,
      retry: 2,
      gcTime: 0,
    }
  );

  const polled = status.data?.scene;
  useEffect(() => {
    if (!polled || polled.id !== watchedId || polled.status === 'pending') return;
    if (polled.id === pendingId) {
      setPendingId(null);
      setStartedAt(null);
      void utils.scenes.invalidate();
    }
    const checking = polled.check?.status === 'pending';
    if (checking && checkId !== polled.id) setCheckId(polled.id);
    if (!checking) settledChecks.current.add(polled.id);
    if (!checking && checkId === polled.id) {
      setCheckId(null);
      void utils.scenes.invalidate();
    }
  }, [polled, watchedId, pendingId, checkId, utils]);

  // A poll that keeps failing (signed out, scene deleted) ends the wait.
  useEffect(() => {
    if (status.isError && watchedId) {
      setPendingId(null);
      setCheckId(null);
      setStartedAt(null);
    }
  }, [status.isError, watchedId]);

  return {
    /** Submit a scene. The previous result stays in the library. */
    generate: (config: SceneConfig) => {
      setStartedAt(Date.now());
      submit.mutate(config);
    },
    /** Show a library scene in the preview. */
    show: (id: string | null) => setActiveId(id),
    /** Poll a scene whose brand check is still running (e.g. after a reload). */
    watchCheck: (id: string) => {
      if (settledChecks.current.has(id)) return;
      if (pendingId === null && checkId === null && !status.isError) setCheckId(id);
    },
    /** The scene whose brand check is being polled. */
    checkingId: checkId,
    activeId,
    /** True from the click until the scene finished (or failed to submit). */
    busy: submit.isPending || pendingId !== null,
    /** `Date.now()` when the current generation was clicked, for an elapsed timer. */
    startedAt,
    /** 0–1 when Runway reports progress for the pending scene. */
    progress: pendingId ? (status.data?.progress ?? null) : null,
    /** The submit mutation — `error`, `variables` and `mutate` for retry after sign-in. */
    submit,
    /** The status poll's error, if polling stopped on one. */
    pollError: pendingId !== null || checkId === null ? status.error : null,
  };
}

export type SceneGeneration = ReturnType<typeof useSceneGeneration>;
