import type { Scene } from '../../library.ts';
import {
  accentName,
  FRAMES,
  labelOf,
  QUALITY,
  SCENARIO_LABELS,
  type FrameId,
  type SceneConfig,
} from '../../shared/scene.ts';

/** Width and height of a master frame, e.g. `16:9` -> `{ w: 16, h: 9 }`. */
export function frameRatio(frame: FrameId): { w: number; h: number } {
  const [w, h] = frame.split(':').map(Number);
  return { w: w ?? 16, h: h ?? 9 };
}

export function scenarioLabel(config: SceneConfig): string {
  return labelOf(SCENARIO_LABELS, config.scenario);
}

export function accentLabel(config: SceneConfig): string {
  return config.accent === 'auto' ? 'Accent chosen by the scene' : accentName(config);
}

export function frameLabel(config: SceneConfig): string {
  return `${labelOf(FRAMES, config.frame)} at ${config.quality}`;
}

export function qualityLabel(config: SceneConfig): string {
  return labelOf(QUALITY, config.quality);
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export function sceneAlt(scene: Scene): string {
  const who =
    scene.castNames.length > 0
      ? joinNames(scene.castNames)
      : 'a happy car owner';
  return `${scenarioLabel(scene.config)} scene with ${who}`;
}

export function castLine(scene: Scene): string {
  return scene.castNames.length > 0
    ? scene.castNames.join(', ')
    : 'No cast (generic car owner)';
}

export function formatCreated(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function mediaUrl(imageKey: string): string {
  return `/media/${imageKey}`;
}

export function downloadUrl(imageKey: string): string {
  return `/media/${imageKey}?download`;
}
