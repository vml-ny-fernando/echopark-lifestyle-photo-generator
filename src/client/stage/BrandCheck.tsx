import { LoaderCircle, RotateCcw, ShieldAlert, ShieldCheck } from 'lucide-react';

import type { SceneCheck } from '../../library.ts';
import { Alert } from '../ui/Alert.tsx';
import { Button } from '../ui/Button.tsx';
import styles from './BrandCheck.module.css';

export type BrandCheckProps = {
  check: SceneCheck | undefined;
  /** Offer a fresh take with the same settings when the check flags the scene. */
  onRegenerate?: (() => void) | undefined;
  regenerating?: boolean | undefined;
};

/**
 * The automatic brand check on a finished scene: running, clear, flagged
 * (with what it found) or unavailable. Scenes made before the check existed
 * show nothing.
 */
export function BrandCheck({ check, onRegenerate, regenerating }: BrandCheckProps) {
  if (!check) return null;
  if (check.status === 'pending') {
    return (
      <p className={styles.line} role="status">
        <LoaderCircle size={14} aria-hidden className={styles.spin} />
        Checking for badges, text and the right car…
      </p>
    );
  }
  if (check.status === 'clear') {
    return (
      <p className={styles.line}>
        <ShieldCheck size={14} aria-hidden className={styles.ok} />
        Brand check passed: no badges, text or vehicle drift found.
      </p>
    );
  }
  if (check.status === 'flagged') {
    return (
      <div className={styles.flag}>
        <Alert tone="warning" title="Brand Check Flagged This Scene">
          <ul className={styles.issues}>
            {(check.issues ?? []).map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
          Don't use it as is. Generate a new take, or retouch it before it goes out.
        </Alert>
        {onRegenerate ? (
          <div>
            <Button
              icon={<RotateCcw size={14} aria-hidden />}
              loading={regenerating}
              onPress={onRegenerate}
            >
              Generate a New Take
            </Button>
          </div>
        ) : null}
      </div>
    );
  }
  return (
    <p className={styles.line}>
      <ShieldAlert size={14} aria-hidden className={styles.muted} />
      Brand check didn't run{check.issues?.[0] ? `: ${check.issues[0]}` : '.'} Look
      for badges and text by eye.
    </p>
  );
}
