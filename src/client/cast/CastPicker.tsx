import { Check, Pencil, UserPlus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import type { Character } from '../../library.ts';
import {
  CAST_GROUPS,
  castGroup,
  compareCast,
  MAX_CAST_PER_SCENE,
} from '../../shared/scene.ts';
import { trpc } from '../trpc.ts';
import { Alert } from '../ui/Alert.tsx';
import { Button } from '../ui/Button.tsx';
import { EmptyState } from '../ui/EmptyState.tsx';
import { SkeletonBlock } from '../ui/Skeleton.tsx';
import { Text } from '../ui/Text.tsx';
import { ToggleTile } from '../ui/ToggleTile.tsx';
import styles from './CastPicker.module.css';
import { CharacterDialog } from './CharacterDialog.tsx';

export type CastPickerProps = {
  selected: string[];
  onChange: (ids: string[]) => void;
  /** How many the scenario asks for (already capped at the per-scene max). */
  want: number;
};

type DialogState = { character: Character | null } | null;

export function CastPicker({ selected, onChange, want }: CastPickerProps) {
  const cast = trpc.cast.useQuery();
  const [dialog, setDialog] = useState<DialogState>(null);

  const characters = cast.data;
  const rows = useMemo(
    () =>
      CAST_GROUPS.map((g) => ({
        ...g,
        members: (characters ?? [])
          .filter((c) => castGroup(c.name) === g.id)
          .sort(compareCast),
      })).filter((g) => g.members.length > 0),
    [characters]
  );

  // Drop picks whose character was deleted (or never existed).
  useEffect(() => {
    if (!characters) return;
    const known = new Set(characters.map((c) => c.id));
    const kept = selected.filter((id) => known.has(id));
    if (kept.length !== selected.length) onChange(kept);
  }, [characters, selected, onChange]);

  const toggle = (id: string, on: boolean) => {
    if (on) {
      if (selected.includes(id) || selected.length >= MAX_CAST_PER_SCENE) return;
      onChange([...selected, id]);
    } else {
      onChange(selected.filter((s) => s !== id));
    }
  };

  const openNew = () => setDialog({ character: null });
  const full = selected.length >= MAX_CAST_PER_SCENE;

  let body;
  if (cast.isPending) {
    body = (
      <div className={styles.grid} aria-busy="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={styles.skeletonCard}>
            <div className={styles.skeletonPhoto}>
              <SkeletonBlock height="100%" />
            </div>
            <SkeletonBlock height={12} />
          </div>
        ))}
      </div>
    );
  } else if (cast.isError) {
    body = (
      <Alert tone="error" title="Couldn't Load the Cast">
        <div className={styles.errorBody}>
          <span>{cast.error.message}</span>
          <Button size="sm" onPress={() => void cast.refetch()}>
            Try Again
          </Button>
        </div>
      </Alert>
    );
  } else if (cast.data.length === 0) {
    body = (
      <EmptyState
        title="No Approved Characters Yet"
        hint="Add each approved model with one to three clear reference photos — the same faces then appear in every scene."
        action={
          <Button variant="primary" icon={<UserPlus size={16} />} onPress={openNew}>
            Add Character
          </Button>
        }
      />
    );
  } else {
    body = (
      <>
        {rows.map((row) => (
          <section key={row.id} className={styles.row} aria-labelledby={`cast-${row.id}`}>
            <h3 id={`cast-${row.id}`} className={styles.rowTitle}>
              {row.label}
              <span className={styles.count}>{row.members.length}</span>
            </h3>
            <ul className={styles.grid}>
              {row.members.map((c) => {
                const order = selected.indexOf(c.id);
                const isSelected = order >= 0;
                const photo = c.photoKeys[0];
                return (
                  <li key={c.id} className={styles.card}>
                    <ToggleTile
                      isSelected={isSelected}
                      onChange={(on) => toggle(c.id, on)}
                      isDisabled={!isSelected && full}
                      aria-label={c.name}
                      className={styles.tile}
                    >
                      <span className={styles.photo}>
                        {photo ? (
                          <img
                            src={`/media/${photo}`}
                            alt=""
                            loading="lazy"
                            className={styles.img}
                          />
                        ) : null}
                        {isSelected ? (
                          <span className={styles.badge}>
                            <Check size={12} aria-hidden />
                            {selected.length > 1 ? <span>{order + 1}</span> : null}
                          </span>
                        ) : null}
                      </span>
                      <span className={styles.name}>{c.name}</span>
                    </ToggleTile>
                    <span className={styles.edit}>
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Edit ${c.name}`}
                        icon={<Pencil size={14} />}
                        onPress={() => setDialog({ character: c })}
                      />
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
        <div className={styles.addRow}>
          <Button icon={<UserPlus size={16} />} onPress={openNew}>
            Add Character
          </Button>
        </div>
      </>
    );
  }

  const status = full
    ? `${selected.length} picked, the most for one scene`
    : selected.length === 0
      ? 'None picked yet. Without a pick the scene casts new people.'
      : selected.length < want
        ? `${selected.length} of ${want} picked. Open roles go to new people.`
        : selected.length === want
          ? `${selected.length} of ${want} picked`
          : `${selected.length} picked, more than the scenario's ${want}`;

  return (
    <div className={styles.root}>
      {characters && characters.length > 0 ? (
        <p className={styles.status} aria-live="polite">
          <span className={styles.meter} aria-hidden>
            {Array.from({ length: Math.max(want, selected.length) }, (_, i) => (
              <span key={i} data-on={i < selected.length || undefined} />
            ))}
          </span>
          {status}
        </p>
      ) : null}
      {body}
      {dialog ? (
        <CharacterDialog
          key={dialog.character?.id ?? 'new'}
          character={dialog.character}
          onClose={() => setDialog(null)}
        />
      ) : null}
    </div>
  );
}
