import type { ReactNode } from 'react';
import { Button as AriaButton, ToggleButton } from 'react-aria-components';

import styles from './ToggleTile.module.css';

export type ToggleTileProps = {
  isSelected: boolean;
  onChange: (selected: boolean) => void;
  isDisabled?: boolean | undefined;
  'aria-label'?: string | undefined;
  className?: string | undefined;
  children?: ReactNode | undefined;
};

/** A selectable tile (a card that toggles on and off). Selected state shows
 * through `[data-selected]` on the element. */
export function ToggleTile({
  isSelected,
  onChange,
  isDisabled = false,
  'aria-label': ariaLabel,
  className,
  children,
}: ToggleTileProps) {
  return (
    <ToggleButton
      isSelected={isSelected}
      onChange={onChange}
      isDisabled={isDisabled}
      aria-label={ariaLabel}
      className={[styles.tile, className].filter(Boolean).join(' ')}
    >
      {children}
    </ToggleButton>
  );
}

export type ActionTileProps = {
  onPress: () => void;
  isDisabled?: boolean | undefined;
  'aria-label'?: string | undefined;
  className?: string | undefined;
  children?: ReactNode | undefined;
};

/** A tile that runs an action when pressed (e.g. an "Add" tile in a grid). */
export function ActionTile({
  onPress,
  isDisabled = false,
  'aria-label': ariaLabel,
  className,
  children,
}: ActionTileProps) {
  return (
    <AriaButton
      onPress={onPress}
      isDisabled={isDisabled}
      aria-label={ariaLabel}
      className={[styles.tile, className].filter(Boolean).join(' ')}
    >
      {children}
    </AriaButton>
  );
}
