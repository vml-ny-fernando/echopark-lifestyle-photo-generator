import { Sparkles } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  accentName,
  buildPrompt,
  castDiffers,
  castFigure,
  castTag,
  CUSTOM_SCENARIO,
  figurePhrase,
  labelOf,
  MAX_PHOTOS_PER_CHARACTER,
  SCENARIO_LABELS,
  SCENARIOS,
  vehicleName,
  type CastRef,
  type Figure,
  type SceneConfig,
} from '../../shared/scene.ts';
import { trpc } from '../trpc.ts';
import { Button } from '../ui/Button.tsx';
import { Dialog } from '../ui/Dialog.tsx';
import { Text } from '../ui/Text.tsx';
import { ErrorNotice, isPlanBlocked } from './ErrorNotice.tsx';
import type { SceneGeneration } from './useSceneGeneration.ts';
import styles from './GenerateBar.module.css';

export type GenerateBarProps = {
  config: SceneConfig;
  generation: SceneGeneration;
};

function shortcutHint(): string {
  const mac =
    typeof navigator !== 'undefined' &&
    /mac|iphone|ipad/i.test(navigator.platform || navigator.userAgent);
  return mac ? '⌘+Enter' : 'Ctrl+Enter';
}

export function GenerateBar({ config, generation }: GenerateBarProps) {
  const cast = trpc.cast.useQuery();
  const [promptOpen, setPromptOpen] = useState(false);
  const { busy, submit } = generation;

  // The same refs, in the same order, as the server builds the prompt from.
  const castRefs = useMemo<CastRef[]>(() => {
    const all = cast.data ?? [];
    return config.characterIds
      .map((id) => all.find((c) => c.id === id))
      .filter((c) => c !== undefined)
      .map((c, i) => {
        const tag = castTag(c.name, i);
        const photos = c.photoKeys.slice(0, MAX_PHOTOS_PER_CHARACTER);
        return {
          name: c.name,
          description: c.description,
          tag,
          extraTags: photos.slice(1).map((_, j) => `${tag}x${j + 1}`),
        };
      });
  }, [cast.data, config.characterIds]);

  const prompt = useMemo(
    () => buildPrompt(config, castRefs),
    [config, castRefs]
  );

  const summary = [
    config.characterIds.length > 0
      ? `${config.characterIds.length} in the cast`
      : 'No cast',
    labelOf(SCENARIO_LABELS, config.scenario),
    accentName(config),
    vehicleName(config.vehicle),
    `${config.quality} resolution`,
  ].join(' · ');

  // Cast wins: a scenario written for other people is played by the picked
  // cast, and the note says so before anyone spends credits on it.
  const scenario = SCENARIOS.find((s) => s.id === config.scenario);
  const castFigures = castRefs
    .map((c) => castFigure(c.name))
    .filter((f): f is Figure => f !== null);
  const castNote =
    scenario && castDiffers(scenario.who, castRefs.map((c) => c.name))
      ? `${scenario.label} is written for ${figurePhrase(scenario.who)}. Your ${
          castRefs.length === 1 ? 'pick' : 'cast'
        } (${figurePhrase(castFigures)}) will play it, and the roles adapt to them.`
      : null;

  // A plan refusal repeats for the same settings; wait for a change.
  const planBlocked =
    isPlanBlocked(submit.error) &&
    JSON.stringify(submit.variables) === JSON.stringify(config);

  const missing =
    config.scenario === CUSTOM_SCENARIO && !config.scenarioCustom?.trim()
      ? 'Describe your scenario under Scenario, or pick one of the presets.'
      : config.accent === 'other' && !config.accentCustom?.trim()
        ? 'Say what should be Echo Green under Echo Green Accent, or pick another accent.'
        : null;
  const canGenerate = !busy && !planBlocked && !missing;
  const latest = useRef({ canGenerate, config, generate: generation.generate });
  latest.current = { canGenerate, config, generate: generation.generate };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || !(e.metaKey || e.ctrlKey)) return;
      if (e.isComposing) return;
      const cur = latest.current;
      if (!cur.canGenerate) return;
      e.preventDefault();
      cur.generate(cur.config);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className={styles.bar}>
      {submit.error ? (
        <ErrorNotice
          generation
          error={submit.error}
          title="Couldn't Start the Scene"
          retry={() => {
            if (submit.variables) generation.generate(submit.variables);
          }}
        />
      ) : null}
      <Text tone="secondary" size="sm" className={styles.summary}>
        {summary}
      </Text>
      {castNote ? (
        <Text tone="secondary" size="sm" as="p" className={styles.note}>
          {castNote}
        </Text>
      ) : null}
      {missing ? (
        <Text tone="secondary" size="sm" as="p">
          {missing}
        </Text>
      ) : null}
      <Button
        variant="primary"
        icon={<Sparkles size={16} aria-hidden />}
        loading={busy}
        disabled={planBlocked || missing !== null}
        onPress={() => generation.generate(config)}
        className={styles.generate}
      >
        {busy ? 'Generating…' : 'Generate Scene'}
      </Button>
      <div className={styles.row}>
        <Button variant="ghost" size="sm" onPress={() => setPromptOpen(true)}>
          View Prompt
        </Button>
        <Text tone="muted" size="sm">
          {shortcutHint()} to generate
        </Text>
      </div>
      <Dialog
        isOpen={promptOpen}
        onOpenChange={setPromptOpen}
        title="Prompt for This Scene"
        size="lg"
        footer={
          <Button onPress={() => setPromptOpen(false)}>Close</Button>
        }
      >
        <p className={styles.promptNote}>
          This is exactly what is sent to the model, plus the cast reference
          photos.
        </p>
        <pre className={styles.prompt}>{prompt}</pre>
      </Dialog>
    </div>
  );
}
