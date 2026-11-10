import { Maximize2, Search, ShieldAlert } from 'lucide-react';

import type { Scene } from '../../library.ts';
import { Alert } from '../ui/Alert.tsx';
import { Button } from '../ui/Button.tsx';
import { EmptyState } from '../ui/EmptyState.tsx';
import { TextInput } from '../ui/TextInput.tsx';
import { SCENARIO_LABELS, labelOf } from '../../shared/scene.ts';
import { mediaUrl, scenarioLabel, sceneAlt } from './sceneMeta.ts';
import type { LibraryFilter } from './useLibraryFilter.ts';
import styles from './SceneLibrary.module.css';

export type SceneLibraryProps = {
  scenes: Scene[];
  loading: boolean;
  error: { message: string } | null;
  onRetry: () => void;
  filter: LibraryFilter;
  activeId: string | null;
  onShow: (id: string) => void;
  onOpen: (id: string) => void;
};

export function SceneLibrary({
  scenes,
  loading,
  error,
  onRetry,
  filter,
  activeId,
  onShow,
  onOpen,
}: SceneLibraryProps) {
  if (loading) {
    return (
      <div className={styles.grid} aria-busy="true" aria-label="Loading scenes">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className={`${styles.tile} ${styles.skeleton}`} />
        ))}
      </div>
    );
  }
  if (error) {
    return (
      <div className={styles.stack}>
        <Alert tone="error" title="Couldn't Load the Scene Library">
          {error.message}
        </Alert>
        <div>
          <Button onPress={onRetry}>Try Again</Button>
        </div>
      </div>
    );
  }
  if (scenes.length === 0) {
    return (
      <EmptyState
        title="No Scenes Yet"
        hint="Pick your cast and a scenario, then press Generate Scene. Every result is saved here for the whole team."
      />
    );
  }

  return (
    <div className={styles.stack}>
      {filter.showFilters ? (
        <div className={styles.filters}>
          <div className={styles.chips} role="group" aria-label="Filter by scenario">
            <Chip
              on={filter.scenario === 'all'}
              onClick={() => filter.setScenario('all')}
            >
              All
            </Chip>
            {filter.scenarios.map((s) => (
              <Chip
                key={s.id}
                on={filter.scenario === s.id}
                onClick={() => filter.setScenario(s.id)}
              >
                {labelOf(SCENARIO_LABELS, s.id)}
              </Chip>
            ))}
          </div>
          <div className={styles.search}>
            <Search size={14} aria-hidden className={styles.searchIcon} />
            <TextInput
              aria-label="Search scenes by cast name"
              type="search"
              placeholder="Search by cast name"
              value={filter.query}
              onChange={filter.setQuery}
            />
          </div>
        </div>
      ) : null}

      {filter.filtered.length === 0 ? (
        <EmptyState
          title="No Scenes Match"
          hint="Try a different scenario or cast name."
          action={
            <Button size="sm" onPress={filter.clear}>
              Clear Filters
            </Button>
          }
        />
      ) : (
        <div className={styles.grid}>
          {filter.visible.map((scene) => (
            <Tile
              key={scene.id}
              scene={scene}
              active={scene.id === activeId}
              onShow={() => onShow(scene.id)}
              onOpen={() => onOpen(scene.id)}
            />
          ))}
        </div>
      )}

      {filter.hasMore ? (
        <div className={styles.more}>
          <Button onPress={filter.showMore}>
            Show More ({filter.filtered.length - filter.visible.length} left)
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      className={on ? styles.chipOn : styles.chip}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function Tile({
  scene,
  active,
  onShow,
  onOpen,
}: {
  scene: Scene;
  active: boolean;
  onShow: () => void;
  onOpen: () => void;
}) {
  const label = scenarioLabel(scene.config);
  const ready = scene.status === 'succeeded' && scene.imageKey;
  return (
    <div className={active ? `${styles.tile} ${styles.active}` : styles.tile}>
      <button
        type="button"
        className={styles.main}
        aria-pressed={active}
        aria-label={`Show ${sceneAlt(scene)} in the preview${scene.check?.status === 'flagged' ? ' (flagged by the brand check)' : ''}`}
        title={scene.status === 'failed' ? scene.error : undefined}
        onClick={onShow}
      >
        {ready ? (
          <img
            className={styles.img}
            src={mediaUrl(scene.imageKey!)}
            alt=""
            loading="lazy"
            width={1600}
            height={900}
          />
        ) : scene.status === 'pending' ? (
          <span className={`${styles.state} ${styles.skeleton}`}>
            Generating…
          </span>
        ) : (
          <span className={`${styles.state} ${styles.failed}`}>Failed</span>
        )}
        {ready && scene.check?.status === 'flagged' ? (
          <span className={styles.flag} title="Brand check flagged this scene">
            <ShieldAlert size={12} aria-hidden />
            Flagged
          </span>
        ) : null}
        <span className={styles.caption}>
          <span className={styles.captionTitle}>{label}</span>
          <span className={styles.captionSub}>
            {scene.castNames.length > 0 ? scene.castNames.join(', ') : 'No cast'}
          </span>
        </span>
      </button>
      {ready ? (
        <button
          type="button"
          className={styles.expand}
          aria-label="Open full size"
          title="Open Full Size"
          onClick={onOpen}
        >
          <Maximize2 size={14} aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
