import { Maximize2, RotateCcw } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';

import type { Scene } from '../../library.ts';
import type { FrameId, SceneConfig } from '../../shared/scene.ts';
import { Section } from '../layouts/Section.tsx';
import { trpc } from '../trpc.ts';
import { Alert } from '../ui/Alert.tsx';
import { Button } from '../ui/Button.tsx';
import { ImagePlaceholder } from '../ui/ImagePlaceholder.tsx';
import { Text } from '../ui/Text.tsx';
import { BrandCheck } from './BrandCheck.tsx';
import { DownloadLink } from './DownloadLink.tsx';
import { ErrorNotice } from './ErrorNotice.tsx';
import { FrameBox } from './FrameBox.tsx';
import { Lightbox } from './Lightbox.tsx';
import { SceneLibrary } from './SceneLibrary.tsx';
import {
  accentLabel,
  castLine,
  formatCreated,
  frameLabel,
  frameRatio,
  mediaUrl,
  scenarioLabel,
  sceneAlt,
} from './sceneMeta.ts';
import type { SceneGeneration } from './useSceneGeneration.ts';
import { useElapsed } from './useElapsed.ts';
import { useLibraryFilter } from './useLibraryFilter.ts';
import styles from './Stage.module.css';

export type StageProps = {
  frame: FrameId;
  generation: SceneGeneration;
  onReuse: (config: SceneConfig) => void;
};

export function Stage({ frame, generation, onReuse }: StageProps) {
  const scenesQuery = trpc.scenes.useQuery();
  const scenes = scenesQuery.data ?? [];
  const filter = useLibraryFilter(scenes);
  const [guides, setGuides] = useState(true);
  const [lightboxId, setLightboxId] = useState<string | null>(null);

  const active = scenes.find((s) => s.id === generation.activeId);

  // A scene shown from the library (or after a reload) whose check is still
  // running gets polled until it lands.
  const { watchCheck } = generation;
  const activeChecking =
    active?.status === 'succeeded' && active.check?.status === 'pending'
      ? active.id
      : null;
  useEffect(() => {
    if (activeChecking) watchCheck(activeChecking);
  }, [activeChecking, watchCheck]);

  const lightboxScenes = (() => {
    const withImage = filter.filtered.filter((s) => s.imageKey);
    if (lightboxId === null || withImage.some((s) => s.id === lightboxId)) {
      return withImage;
    }
    const extra = scenes.find((s) => s.id === lightboxId && s.imageKey);
    return extra ? [extra] : withImage;
  })();

  return (
    <>
      <Section
        title="Preview"
        description="Dashed guides show the 1:1, 4:5 and 9:16 social cuts — keep the subject inside them."
      >
        <Preview
          frame={frame}
          generation={generation}
          active={active}
          scenesLoading={scenesQuery.isLoading}
          guides={guides}
          onToggleGuides={() => setGuides((g) => !g)}
          onReuse={onReuse}
          onOpen={setLightboxId}
        />
      </Section>

      <Section
        title="Scene Library"
        description="Every scene the team has generated."
      >
        <SceneLibrary
          scenes={scenes}
          loading={scenesQuery.isLoading}
          error={scenesQuery.error}
          onRetry={() => void scenesQuery.refetch()}
          filter={filter}
          activeId={generation.activeId}
          onShow={(id) => generation.show(id)}
          onOpen={setLightboxId}
        />
      </Section>

      <Lightbox
        scenes={lightboxScenes}
        openId={lightboxId}
        onChange={setLightboxId}
        generation={generation}
      />
    </>
  );
}

type PreviewProps = {
  frame: FrameId;
  generation: SceneGeneration;
  active: Scene | undefined;
  scenesLoading: boolean;
  guides: boolean;
  onToggleGuides: () => void;
  onReuse: (config: SceneConfig) => void;
  onOpen: (id: string) => void;
};

function Preview({
  frame,
  generation,
  active,
  scenesLoading,
  guides,
  onToggleGuides,
  onReuse,
  onOpen,
}: PreviewProps) {
  const { busy, submit, startedAt, progress, pollError } = generation;
  const elapsed = useElapsed(startedAt);

  const generating =
    submit.isPending ||
    active?.status === 'pending' ||
    (active === undefined && (busy || (generation.activeId !== null && scenesLoading)));

  let body: ReactNode;
  let shownFrame: FrameId = active?.config.frame ?? frame;

  if (generating) {
    shownFrame = submit.isPending || !active ? frame : active.config.frame;
    body = (
      <>
        <FrameBox frame={shownFrame} guides={guides}>
          <div className={styles.skeleton} role="status" aria-live="polite">
            <span className={styles.status}>
              Generating…
              {elapsed ? <span aria-hidden> {elapsed}</span> : null}
            </span>
            <span className={styles.hint}>
              Nano Banana Pro usually takes 20–60 seconds.
            </span>
            {typeof progress === 'number' ? (
              <span
                className={styles.progress}
                role="progressbar"
                aria-label="Generation progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress * 100)}
              >
                <span
                  className={styles.progressFill}
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </span>
            ) : null}
          </div>
        </FrameBox>
        {pollError ? (
          <ErrorNotice
            error={pollError}
            title="Couldn't Check the Scene's Progress"
          />
        ) : null}
      </>
    );
  } else if (active?.status === 'failed') {
    body = (
      <div className={styles.stack}>
        <Alert tone="error" title="This Scene Didn't Generate">
          {active.error ?? 'The generation failed.'}
        </Alert>
        <div>
          <Button
            icon={<RotateCcw size={14} aria-hidden />}
            loading={busy}
            onPress={() => generation.generate(active.config)}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  } else if (active?.status === 'succeeded' && active.imageKey) {
    body = (
      <FrameBox frame={active.config.frame} guides={guides}>
        <img
          className={styles.img}
          src={mediaUrl(active.imageKey)}
          alt={sceneAlt(active)}
        />
      </FrameBox>
    );
  } else {
    body = (
      <FrameBox frame={frame} guides={guides}>
        <ImagePlaceholder
          label="Your generated scene will appear here"
          aspectRatio={`${frameRatio(frame).w} / ${frameRatio(frame).h}`}
        />
      </FrameBox>
    );
  }

  const showGuideToggle = generating || active?.status !== 'failed';
  const done = !generating && active?.status === 'succeeded' && active.imageKey;

  return (
    <div className={styles.stack}>
      {body}
      {showGuideToggle ? (
        <div className={styles.toolbar}>
          <Button size="sm" variant="ghost" onPress={onToggleGuides}>
            {guides ? 'Hide Guides' : 'Show Guides'}
          </Button>
        </div>
      ) : null}
      {done && active ? (
        <>
          <div className={styles.actions}>
            <DownloadLink imageKey={active.imageKey!} />
            <Button
              icon={<Maximize2 size={14} aria-hidden />}
              onPress={() => onOpen(active.id)}
            >
              Open Full Size
            </Button>
            <Button
              icon={<RotateCcw size={14} aria-hidden />}
              onPress={() => onReuse(active.config)}
            >
              Reuse Settings
            </Button>
          </div>
          <BrandCheck
            check={active.check}
            onRegenerate={() => generation.generate(active.config)}
            regenerating={busy}
          />
          <Text tone="secondary" size="sm" as="p">
            {castLine(active)} · {scenarioLabel(active.config)} ·{' '}
            {accentLabel(active.config)} · {frameLabel(active.config)} ·{' '}
            {formatCreated(active.createdAt)}
          </Text>
        </>
      ) : null}
    </div>
  );
}
