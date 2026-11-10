import {
  Label,
  TextArea as AriaTextArea,
  TextField,
} from 'react-aria-components';

import styles from './TextArea.module.css';

export type TextAreaProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string | undefined;
  rows?: number | undefined;
  label?: string | undefined;
  'aria-label'?: string | undefined;
  disabled?: boolean | undefined;
  autoFocus?: boolean | undefined;
  className?: string | undefined;
};

export function TextArea({
  value,
  onChange,
  placeholder,
  rows = 3,
  label,
  'aria-label': ariaLabel,
  disabled = false,
  autoFocus,
  className,
}: TextAreaProps) {
  return (
    <TextField
      value={value}
      onChange={onChange}
      isDisabled={disabled}
      aria-label={label ? undefined : ariaLabel}
      className={[styles.field, className].filter(Boolean).join(' ')}
    >
      {label && <Label className={styles.label}>{label}</Label>}
      <AriaTextArea
        placeholder={placeholder}
        rows={rows}
        autoFocus={autoFocus}
        className={styles.textarea}
      />
    </TextField>
  );
}
