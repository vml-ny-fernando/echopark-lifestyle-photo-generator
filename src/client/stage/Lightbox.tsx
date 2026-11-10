import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import type { Scene } from '../../library.ts';
import { trpc } from '../trpc.ts';
import { Button } from '../ui/Button.tsx';
import { Dialog } from '../ui/Dialog.tsx';
import { Text } from '../ui/Text.tsx';
import { BrandCheck } from './BrandCheck.tsx';
import { DownloadLink } from './DownloadLink.tsx';
import { ErrorNotice } from './ErrorNotice.tsx';
import { FrameBox } from './FrameBox.tsx';
import {
  accentLabel,
  castLine,
  formatCreated,
  frameLabel,
  mediaUrl,
  sceneAlt,
  scenarioLabel,
} from './sceneMeta.ts';
import type { SceneGeneration } from './useSceneGeneration.ts';
import styles from './Lightbox.module.css';

export type LightboxProps = {
  /** The scenes to step through (those with an image). */
  scenes: Scene[];
  openId: string | null;
  onChange: (id: string | null) => void;
  generation: SceneGeneration;
};

export function Lightbox({ scenes, openId, onChange, generation }: LightboxProps) {
  const utils = trpc.useUtils();
  const [guides, setGuides] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const index = scenes.findIndex((s) => s.id === openId);
  const scene = index >= 0 ? scenes[index] : undefined;
  const prev = index > 0 ? scenes[index - 1] : undefined;
  const next = index >= 0 ? scenes[index + 1] : undefined;

  const remove = trpc.deleteScene.useMutation({
    onSuccess: (_, { id }) => {
      if (generation.activeId === id) generation.show(null);
      setConfirming(false);
      onChange((next ?? prev)?.id ?? null);
      void utils.scenes.invalidate();
    },
  });

  // A different scene (or reopening) starts without a pending confirmation.
  useEffect(() => {
    setConfirming(false);
    remove.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId]);

  const latest = useRef({ prev, next, onChange });
  latest.current = { prev, next, onChange };
  useEffect(() => {
    if (!scene) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select')) return;
      const to =
        e.key === 'ArrowLeft' ? latest.current.prev : latest.current.next;
      if (to) {
        e.preventDefault();
        latest.current.onChange(to.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [scene]);

  return (
    <Dialog
      isOpen={scene !== undefined}
      onOpenChange={(open) => {
        if (!open) onChange(null);
      }}
      title={scene ? scenarioLabel(scene.config) : 'Scene'}
      size="full"
    >
      {scene?.imageKey ? (
        <div className={styles.layout}>
          <div className={styles.stageRow}>
            <Button
              variant="ghost"
              aria-label="Previous scene"
              icon={<ChevronLeft size={16} aria-hidden />}
              disabled={!prev}
              onPress={() => prev && onChange(prev.id)}
            />
            <div className={styles.imageWrap}>
              <FrameBox frame={scene.config.frame} maxVh={72} guides={guides}>
                <img
                  className={styles.img}
                  src={mediaUrl(scene.imageKey)}
                  alt={sceneAlt(scene)}
                />
              </FrameBox>
            </div>
            <Button
              variant="ghost"
              aria-label="Next scene"
              icon={<ChevronRight size={16} aria-hidden />}
              disabled={!next}
              onPress={() => next && onChange(next.id)}
            />
          </div>

          <div className={styles.meta}>
            <Text tone="secondary" size="sm">
              {castLine(scene)} · {accentLabel(scene.config)} ·{' '}
              {frameLabel(scene.config)} · {formatCreated(scene.createdAt)} ·{' '}
              {index + 1} of {scenes.length}
            </Text>
            <BrandCheck check={scene.check} />
          </div>

          {remove.error ? (
            <ErrorNotice
              error={remove.error}
              title="Couldn't Delete the Scene"
              retry={() => remove.mutate({ id: scene.id })}
            />
          ) : null}

          {confirming ? (
            <div className={styles.confirm} role="alertdialog" aria-label="Confirm delete">
              <Text size="sm">Delete this scene? This can't be undone.</Text>
              <div className={styles.actions}>
                <Button
                  variant="primary"
                  loading={remove.isPending}
                  onPress={() => remove.mutate({ id: scene.id })}
                >
                  Delete Scene
                </Button>
                <Button
                  disabled={remove.isPending}
                  onPress={() => setConfirming(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className={styles.actions}>
              <DownloadLink imageKey={scene.imageKey} />
              <Button onPress={() => setGuides((g) => !g)}>
                {guides ? 'Hide Guides' : 'Show Guides'}
              </Button>
              <Button
                icon={<Trash2 size={14} aria-hidden />}
                onPress={() => setConfirming(true)}
              >
                Delete
              </Button>
            </div>
          )}
        </div>
      ) : null}
    </Dialog>
  );
}
