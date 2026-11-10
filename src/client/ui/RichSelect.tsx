import { Check, ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  Button,
  Header,
  ListBox,
  ListBoxItem,
  ListBoxSection,
  Popover,
  Select,
  SelectValue,
  Text,
} from 'react-aria-components';

import styles from './RichSelect.module.css';

export type RichOption = {
  id: string;
  label: string;
  hint?: string | undefined;
  /** A photo on the leading edge (4:3, contained on white). */
  image?: string | undefined;
  /** Right-aligned extras, e.g. icons. Decorative: say it in `asideLabel`. */
  aside?: ReactNode | undefined;
  /** What `aside` shows, in words, for screen readers. */
  asideLabel?: string | undefined;
};

export type RichSection = { id: string; label: string; options: readonly RichOption[] };

export type RichSelectProps = {
  /** Options under group headings; use one untitled section for a flat list. */
  sections: readonly RichSection[];
  value: string;
  onChange: (id: string) => void;
  /** Accessible name, e.g. "Vehicle". */
  'aria-label': string;
  /** `lg` sets each title as a large headline. */
  size?: 'md' | 'lg' | undefined;
};

function Row({ option, size }: { option: RichOption; size: 'md' | 'lg' }) {
  return (
    <>
      {option.image ? (
        <span className={styles.picture}>
          <img src={option.image} alt="" loading="lazy" />
        </span>
      ) : null}
      <span className={styles.text}>
        <Text slot="label" className={size === 'lg' ? styles.headline : styles.label}>
          {option.label}
        </Text>
        {option.hint || option.asideLabel ? (
          <Text slot="description" className={styles.hint}>
            {option.hint}
            {option.asideLabel ? <span className={styles.srOnly}>. {option.asideLabel}</span> : null}
          </Text>
        ) : null}
      </span>
      {option.aside ? (
        <span className={styles.aside} aria-hidden>
          {option.aside}
        </span>
      ) : null}
    </>
  );
}

/**
 * A full-width single-select dropdown whose trigger and rows each show a
 * title, a description and optionally a photo and right-aligned extras.
 * Arrow keys move, typing jumps, Enter picks, Escape closes.
 */
export function RichSelect({
  sections,
  value,
  onChange,
  'aria-label': ariaLabel,
  size = 'md',
}: RichSelectProps) {
  const current = sections.flatMap((s) => s.options).find((o) => o.id === value);
  return (
    <Select
      aria-label={ariaLabel}
      value={value}
      onChange={(key) => {
        if (key !== null) onChange(String(key));
      }}
      className={styles.select}
    >
      <Button className={styles.trigger}>
        <SelectValue className={styles.value}>
          {() => (current ? <Row option={current} size={size} /> : null)}
        </SelectValue>
        <ChevronDown size={18} aria-hidden className={styles.chevron} />
      </Button>
      <Popover className={styles.popover} offset={4}>
        <ListBox className={styles.list}>
          {sections.map((section) => (
            <ListBoxSection key={section.id} id={section.id} className={styles.section}>
              {section.label ? <Header className={styles.header}>{section.label}</Header> : null}
              {section.options.map((o) => (
                <ListBoxItem
                  key={o.id}
                  id={o.id}
                  textValue={o.label}
                  className={styles.option}
                >
                  {({ isSelected }) => (
                    <>
                      <Row option={o} size={size} />
                      <span className={styles.check}>
                        {isSelected ? <Check size={16} aria-hidden /> : null}
                      </span>
                    </>
                  )}
                </ListBoxItem>
              ))}
            </ListBoxSection>
          ))}
        </ListBox>
      </Popover>
    </Select>
  );
}
