import type { ReactNode } from 'react';

import type { FrameId } from '../../shared/scene.ts';
import { CropGuides } from './CropGuides.tsx';
import { frameRatio } from './sceneMeta.ts';
import styles from './FrameBox.module.css';

export type FrameBoxProps = {
  frame: FrameId;
  /** Tallest the frame may grow, in viewport-height units, so a 4:5 master stays on screen. */
  maxVh?: number | undefined;
  guides?: boolean | undefined;
  /** Positioned to fill the frame (`position: absolute; inset: 0`) or sized like it. */
  children?: ReactNode | undefined;
};

/** A box with the master frame's aspect ratio, optionally with crop guides over its content. */
export function FrameBox({
  frame,
  maxVh = 70,
  guides = false,
  children,
}: FrameBoxProps) {
  const { w, h } = frameRatio(frame);
  return (
    <div
      className={styles.box}
      style={{
        aspectRatio: `${w} / ${h}`,
        width: `min(100%, ${(maxVh * w) / h}vh)`,
      }}
    >
      {children}
      {guides ? <CropGuides frame={frame} /> : null}
    </div>
  );
}
