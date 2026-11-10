import {
  CUSTOM_SCENARIO,
  figurePhrase,
  MAX_SCENARIO_CUSTOM,
  SCENARIO_GROUPS,
  SCENARIOS,
} from '../../shared/scene.ts';
import { RichSelect, type RichSection } from '../ui/RichSelect.tsx';
import { Text } from '../ui/Text.tsx';
import { TextArea } from '../ui/TextArea.tsx';
import { FigureIcons } from './FigureIcons.tsx';
import styles from './ScenarioPicker.module.css';

export type ScenarioPickerProps = {
  value: string;
  custom: string;
  /** A scenario was picked (a preset also brings its vehicle and light). */
  onPick: (id: string) => void;
  onCustomChange: (text: string) => void;
};

const SECTIONS: RichSection[] = [
  ...SCENARIO_GROUPS.map((g) => ({
    id: g.id as string,
    label: g.label,
    options: SCENARIOS.filter((s) => s.group === g.id).map((s) => ({
      id: s.id,
      label: s.label,
      hint: s.hint,
      aside: <FigureIcons who={s.who} />,
      asideLabel: `For ${figurePhrase(s.who)}`,
    })),
  })),
  {
    id: 'own',
    label: 'Your Own',
    options: [
      {
        id: CUSTOM_SCENARIO,
        label: 'Write Your Own',
        hint: 'Describe any moment, with the car in it',
      },
    ],
  },
];

/**
 * The scenario as one full-width dropdown, grouped by moment. Each row shows
 * the title, who it's written for in words, and the same as icons with
 * counts. Write Your Own opens a text box under the dropdown.
 */
export function ScenarioPicker({ value, custom, onPick, onCustomChange }: ScenarioPickerProps) {
  return (
    <div className={styles.root}>
      <RichSelect
        aria-label="Scenario"
        sections={SECTIONS}
        value={value}
        onChange={onPick}
        size="lg"
      />
      {value === CUSTOM_SCENARIO ? (
        <div className={styles.custom}>
          <TextArea
            label="Describe the Moment"
            value={custom}
            onChange={(text) => onCustomChange(text.slice(0, MAX_SCENARIO_CUSTOM))}
            rows={4}
            autoFocus
            placeholder="e.g. two friends loading surfboards onto the roof at dawn, beach car park"
          />
          <Text tone="muted" size="sm" as="p">
            Say who is there and what they're doing. The car you pick under Vehicle is
            always in the scene. {custom.length}/{MAX_SCENARIO_CUSTOM}
          </Text>
        </div>
      ) : null}
    </div>
  );
}
