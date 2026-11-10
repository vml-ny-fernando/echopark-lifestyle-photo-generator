import { useState } from 'react';
import { AppShell } from './layouts/AppShell.tsx';
import { Section } from './layouts/Section.tsx';
import { ChoiceGroup } from './ui/ChoiceGroup.tsx';
import { RichSelect } from './ui/RichSelect.tsx';
import { SlotSlider } from './ui/SlotSlider.tsx';
import { TextArea } from './ui/TextArea.tsx';
import { TextInput } from './ui/TextInput.tsx';
import { ScenarioPicker } from './brief/ScenarioPicker.tsx';
import { CastPicker } from './cast/CastPicker.tsx';
import { GenerateBar } from './stage/GenerateBar.tsx';
import { Stage } from './stage/Stage.tsx';
import { useSceneGeneration } from './stage/useSceneGeneration.ts';
import { trpc } from './trpc.ts';
import {
  ACCENTS,
  castInstruction,
  suggestedCast,
  castWanted,
  DEFAULT_CONFIG,
  DEPTH,
  LENSES,
  LIGHT,
  MAX_ACCENT_CUSTOM,
  QUALITY,
  isCurrentScenario,
  isCurrentVehicle,
  SCENARIOS,
  VEHICLES,
  vehicleThumbKey,
  type Option,
  type SceneConfig,
} from '../shared/scene.ts';
import styles from './App.module.css';

const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

const VEHICLE_OPTIONS = VEHICLES.map((v) => ({
  id: v.id,
  label: `${v.label}, ${titleCase(v.hint ?? '')}`,
  hint: v.description,
  image: `/media/${vehicleThumbKey(v.id)}`,
}));
const VEHICLE_SECTIONS = [{ id: 'all', label: '', options: VEHICLE_OPTIONS }];

export function App() {
  const profile = trpc.profile.useQuery();
  const [config, setConfig] = useState<SceneConfig>(DEFAULT_CONFIG);
  const set =
    <K extends keyof SceneConfig>(key: K) =>
    (value: SceneConfig[K]) =>
      setConfig((c) => ({ ...c, [key]: value }));
  const generation = useSceneGeneration();
  // A scenario brings its own car (and light, where the moment needs one);
  // both stay editable below.
  const pickScenario = (id: string) => {
    const s = SCENARIOS.find((o) => o.id === id);
    setConfig((c) => ({
      ...c,
      scenario: id,
      vehicle: s?.vehicle ?? c.vehicle,
      light: s?.light ?? c.light,
    }));
  };

  return (
    <AppShell
      title="EchoPark Scene Studio"
      user={profile.data ?? undefined}
      maxWidth={1280}
    >
      <div className={styles.logo}>
        <img
          src="/echopark-logo.svg"
          alt="EchoPark Automotive"
          width={250}
          height={83}
        />
        <p className={styles.intro}>
          Brief a candid lifestyle scene: pick the cast, the moment and the car.
          <br />
          Every frame carries one touch of Echo Green.
        </p>
      </div>
      <div className={styles.workspace}>
        <div className={styles.brief}>
          <Section
            title="Scenario"
            description="Every scenario puts the car in the moment and picks its vehicle and light, which you can change below. The icons show who it's written for."
          >
            <ScenarioPicker
              value={config.scenario}
              custom={config.scenarioCustom ?? ''}
              onPick={pickScenario}
              onCustomChange={set('scenarioCustom')}
            />
          </Section>

          <Section
            title="Cast"
            description={castInstruction(config)}
            label="The cast"
          >
            <SuggestedCast roles={suggestedCast(config.scenario)} />
            <CastPicker
              selected={config.characterIds}
              onChange={set('characterIds')}
              want={castWanted(config.scenario)}
            />
          </Section>


          <Section
            title="Echo Green Accent"
            description={
              <>
                One subtle element in{' '}
                <span className={styles.hex}>#62A60A</span>
              </>
            }
          >
            <Choices options={ACCENTS} label="Echo Green accent" value={config.accent} onChange={set('accent')} />
            {config.accent === 'other' ? (
              <TextInput
                className={styles.accentCustom}
                label="What Should Be Echo Green?"
                value={config.accentCustom ?? ''}
                onChange={set('accentCustom')}
                placeholder="e.g. a coffee cup, a bike helmet, a beach towel"
                maxLength={MAX_ACCENT_CUSTOM}
                autoFocus
              />
            ) : null}
          </Section>

          <Section
            title="Vehicle"
            description="The approved line-up. The scene keeps the car's design and paint, with no badges and blank plates."
          >
            <RichSelect
              sections={VEHICLE_SECTIONS}
              aria-label="Vehicle"
              value={config.vehicle}
              onChange={set('vehicle')}
            />
          </Section>

          <Section title="Photography">
            <Field label="Depth of Field">
              <Choices options={DEPTH} label="Depth of field" value={config.depth} onChange={set('depth')} wide />
            </Field>
            <Field label="Light">
              <Choices options={LIGHT} label="Light" value={config.light} onChange={set('light')} />
            </Field>
            <Field label="Lens">
              <Choices options={LENSES} label="Lens" value={config.lens} onChange={set('lens')} wide />
            </Field>
            <Field label="Resolution">
              <SlotSlider
                options={QUALITY}
                aria-label="Resolution"
                value={config.quality}
                onChange={(id) => set('quality')(id as SceneConfig['quality'])}
              />
            </Field>
          </Section>

          <Section title="Direction Notes">
            <TextArea
              aria-label="Direction notes"
              value={config.notes}
              onChange={set('notes')}
              rows={3}
              placeholder="Optional — e.g. laughing mid-conversation, autumn leaves"
            />
          </Section>

          <div className={styles.generateBar}>
            <GenerateBar config={config} generation={generation} />
          </div>
        </div>

        <div className={styles.stage} data-surface="park">
          <Stage
            frame={config.frame}
            generation={generation}
            onReuse={(c) =>
              setConfig({
                ...DEFAULT_CONFIG,
                ...c,
                scenario: isCurrentScenario(c.scenario)
                  ? c.scenario
                  : DEFAULT_CONFIG.scenario,
                vehicle: isCurrentVehicle(c.vehicle)
                  ? c.vehicle
                  : DEFAULT_CONFIG.vehicle,
              })
            }
          />
        </div>
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={styles.field}>
      <div className={styles.fieldLabel}>{label}</div>
      {children}
    </div>
  );
}

function Choices({
  options,
  value,
  onChange,
  label,
  wide = false,
}: {
  options: readonly Option[];
  value: string;
  onChange: (id: string) => void;
  label: string;
  wide?: boolean;
}) {
  return (
    <ChoiceGroup
      aria-label={label}
      options={options}
      value={value}
      onChange={onChange}
      wide={wide}
    />
  );
}

/** "SUGGESTED: MALE 1 · MALE 2 · DOG" — who the scenario is written for. */
function SuggestedCast({ roles }: { roles: string[] }) {
  if (roles.length === 0) return null;
  return (
    <p className={styles.suggested}>
      <span className={styles.suggestedLabel}>Suggested:</span>
      {roles.map((r) => (
        <span key={r} className={styles.suggestedRole}>
          {r}
        </span>
      ))}
    </p>
  );
}
