import type { ReactNode } from 'react';
import {
  ToggleButton,
  ToggleButtonGroup,
  type Key,
} from 'react-aria-components';

import styles from './ChoiceGroup.module.css';

export type ChoiceOption = {
  id: string;
  label: string;
  hint?: string | undefined;
  /** Picture shown above the label in `pictures` mode. */
  image?: string | undefined;
  /** Small decorative icons under the hint in `wide` mode (aria-hidden). */
  icons?: ReactNode | undefined;
};

export type ChoiceGroupProps = {
  options: readonly ChoiceOption[];
  value: string;
  onChange: (id: string) => void;
  /** Accessible name for the group, e.g. "Scenario". */
  'aria-label': string;
  /** Grid of equal tiles with each option's hint under its label. */
  wide?: boolean | undefined;
  /** Grid of picture tiles: each option's `image`, then its label and hint. */
  pictures?: boolean | undefined;
};

/** Single-select chips: one option is always chosen. Arrow keys move between them. */
export function ChoiceGroup({
  options,
  value,
  onChange,
  'aria-label': ariaLabel,
  wide = false,
  pictures = false,
}: ChoiceGroupProps) {
  return (
    <ToggleButtonGroup
      aria-label={ariaLabel}
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={[value]}
      onSelectionChange={(keys: Set<Key>) => {
        const [next] = keys;
        if (next !== undefined) onChange(String(next));
      }}
      className={pictures ? styles.pictures : wide ? styles.wide : styles.wrap}
    >
      {options.map((o) => (
        <ToggleButton key={o.id} id={o.id} className={styles.chip}>
          {pictures ? (
            <span className={styles.picture}>
              {o.image ? (
                <img src={o.image} alt="" loading="lazy" draggable={false} />
              ) : null}
            </span>
          ) : null}
          <span className={styles.label}>{o.label}</span>
          {(wide || pictures) && o.hint ? (
            <span className={styles.hint}>{o.hint}</span>
          ) : null}
          {wide && o.icons ? (
            <span className={styles.icons} aria-hidden>
              {o.icons}
            </span>
          ) : null}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
