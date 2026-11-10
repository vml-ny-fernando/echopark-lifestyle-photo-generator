import type { ChoiceOption } from './ChoiceGroup.tsx';

import styles from './SlotSlider.module.css';

export type SlotSliderProps = {
  options: readonly ChoiceOption[];
  value: string;
  onChange: (id: string) => void;
  /** Accessible name, e.g. "Resolution". */
  'aria-label': string;
};

/**
 * A slider that snaps to a few named slots. A native range input carries the
 * keyboard and pointer dragging; the slot labels under the track are also
 * clickable.
 */
export function SlotSlider({
  options,
  value,
  onChange,
  'aria-label': ariaLabel,
}: SlotSliderProps) {
  const last = Math.max(options.length - 1, 1);
  const index = Math.max(
    options.findIndex((o) => o.id === value),
    0
  );
  const current = options[index];
  const pct = (index / last) * 100;
  const pick = (i: number) => {
    const next = options[i];
    if (next && next.id !== value) onChange(next.id);
  };

  return (
    <div className={styles.slider} style={{ '--pos': `${pct}%` } as React.CSSProperties}>
      <div className={styles.rail}>
        <span className={styles.track} aria-hidden />
        <span className={styles.fill} aria-hidden />
        {options.map((o, i) => (
          <span
            key={o.id}
            className={styles.notch}
            data-reached={i <= index || undefined}
            style={{ left: `${(i / last) * 100}%` }}
            aria-hidden
          />
        ))}
        <input
          type="range"
          className={styles.input}
          min={0}
          max={options.length - 1}
          step={1}
          value={index}
          onChange={(e) => pick(Number(e.target.value))}
          aria-label={ariaLabel}
          aria-valuetext={
            current ? [current.label, current.hint].filter(Boolean).join(', ') : undefined
          }
        />
        <span className={styles.thumb} aria-hidden />
      </div>
      <div className={styles.slots}>
        {options.map((o, i) => (
          <button
            key={o.id}
            type="button"
            tabIndex={-1}
            className={styles.slot}
            data-selected={i === index || undefined}
            onClick={() => pick(i)}
            aria-hidden
          >
            <span className={styles.label}>{o.label}</span>
            {o.hint ? <span className={styles.hint}>{o.hint}</span> : null}
          </button>
        ))}
      </div>
    </div>
  );
}
