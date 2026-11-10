import { SOCIAL_CROPS, type FrameId } from '../../shared/scene.ts';
import { frameRatio } from './sceneMeta.ts';
import styles from './CropGuides.module.css';

/**
 * Dashed rectangles over a frame showing the 1:1, 4:5 and 9:16 social cuts:
 * the largest centred rect of each ratio that fits. A cut identical to the
 * frame is skipped. Position the parent `relative`; this fills it.
 */
export function CropGuides({ frame }: { frame: FrameId }) {
  const { w: fw, h: fh } = frameRatio(frame);
  const frameR = fw / fh;
  return (
    <div className={styles.guides} aria-hidden>
      {SOCIAL_CROPS.map((crop) => {
        const cropR = crop.w / crop.h;
        if (Math.abs(cropR - frameR) < 1e-6) return null;
        const width = cropR > frameR ? 100 : (cropR / frameR) * 100;
        const height = cropR > frameR ? (frameR / cropR) * 100 : 100;
        return (
          <div
            key={crop.id}
            className={styles.guide}
            style={{ width: `${width}%`, height: `${height}%` }}
          >
            <span className={styles.chip}>{crop.id}</span>
          </div>
        );
      })}
    </div>
  );
}
