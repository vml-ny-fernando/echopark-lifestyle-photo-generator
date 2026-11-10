/**
 * The EchoPark scene vocabulary and the prompt it compiles to. Shared by the
 * server (which sends the prompt) and the client (which shows it), so the
 * "View prompt" panel is always exactly what was generated.
 */

export type Option = { id: string; label: string; hint?: string };

export const ECHO_GREEN = {
  hex: '#62A60A',
  pantone: 'Pantone 369',
  cmyk: 'CMYK 67 12 100 1',
} as const;

export const SCENARIO_GROUPS = [
  { id: 'road', label: 'On the Road' },
  { id: 'outdoors', label: 'Outdoors and Weekends' },
  { id: 'family', label: 'Family Life' },
  { id: 'echopark', label: 'At EchoPark' },
] as const;
export type ScenarioGroupId = (typeof SCENARIO_GROUPS)[number]['id'];

export type Scenario = Option & {
  group: ScenarioGroupId;
  /** The whole moment as one prompt clause; `{car}` becomes the picked vehicle. */
  brief: string;
  /** Vehicle picked when this scenario is chosen (closest in the line-up). */
  vehicle: string;
  /** Light picked when this scenario is chosen, where the moment needs one. */
  light?: string;
  /** Who the brief calls for, in order, shown as small icons on the chip. */
  who: readonly Figure[];
};

/**
 * One figure a scenario calls for. `adult` is used where the brief doesn't
 * say a gender, so the icons never claim more than it does.
 */
export type Figure = 'man' | 'woman' | 'adult' | 'child' | 'baby' | 'dog' | 'guide';

/**
 * The brand team's scenario list. Every one puts the car in the moment. The
 * brief describes the scene's people too: picked cast members take the lead
 * roles, and anyone else it calls for is generated.
 */
export const SCENARIOS: Scenario[] = [
  // On the road
  {
    id: 'copilot-dog',
    group: 'road',
    who: ['man', 'dog'],
    label: 'Co-Pilot Dog',
    hint: 'Man, early 30s, and his dog',
    vehicle: 'crossover-grey',
    brief:
      'a man in his early 30s driving his {car} down a sunny open road, his dog sitting up happily in the front passenger seat, seen through the open driver\'s window',
  },
  {
    id: 'coastal-highway',
    group: 'road',
    who: ['woman', 'woman'],
    label: 'Coastal Highway',
    hint: 'Two female friends, early 20s',
    vehicle: 'convertible-blue',
    light: 'golden',
    brief:
      'two female friends in their early 20s driving their {car} with the top down along a winding Pacific-coast beach highway, hair in the wind, ocean and cliffs beside the road',
  },
  {
    id: 'road-trip-crew',
    group: 'road',
    who: ['man', 'man', 'man'],
    label: 'Road Trip Crew',
    hint: 'Guys in their 20s',
    vehicle: 'crossover-grey',
    brief:
      'a group of guys in their 20s on a road trip in their {car}, laughing and talking, seen from the back seat looking forward, a scenic highway through the windshield',
  },
  {
    id: 'forest-lab',
    group: 'road',
    who: ['woman', 'dog'],
    label: 'Forest Drive with the Lab',
    hint: 'Woman, 40s, and her yellow lab',
    vehicle: 'sedan-slate-blue',
    light: 'soft',
    brief:
      'a woman in her 40s driving her {car} along a winding forest road, her yellow Labrador happily hanging its head out of the back window, tall trees all around',
  },
  {
    id: 'cornfield-trip',
    group: 'road',
    who: ['adult', 'adult', 'child', 'child'],
    label: 'Cornfield Road Trip',
    hint: 'Family of four',
    vehicle: 'crossover-white',
    brief:
      'a family of four on a road trip through farm country, tall cornfields outside, seen inside their {car}: the parents up front, a young boy in a car seat gazing out of the window, and his older brother absorbed in a paperback book with a plain cover',
  },
  {
    id: 'fall-foliage',
    group: 'road',
    who: ['adult'],
    label: 'Fall Foliage Break',
    hint: 'A roadside coffee stop',
    vehicle: 'sedan-silver',
    light: 'golden',
    brief:
      'a driver who has pulled over on a quiet country roadside to take in the fall foliage, leaning against their {car} with a coffee in hand, red and orange trees all around',
  },
  {
    id: 'starry-night',
    group: 'road',
    who: ['adult', 'adult'],
    label: 'Starry Night Drive',
    hint: 'Back-seat view, silhouettes',
    vehicle: 'crossover-white',
    light: 'blue',
    brief:
      'a view from the back seat of the {car} looking forward through the windshield at a breathtaking starry night sky over an empty road, the driver and front passenger seen as soft silhouettes',
  },
  // Outdoors and weekends
  {
    id: 'desert-camping',
    group: 'outdoors',
    who: ['adult', 'adult'],
    label: 'Desert Camping',
    hint: 'Couple, early to mid 20s',
    vehicle: 'crossover-white',
    light: 'golden',
    brief:
      'a young couple in their early to mid 20s at a desert campsite, relaxing beside a small tent and camp chairs, red rock and open sky behind them, their {car} parked in frame with the rear hatch open',
  },
  {
    id: 'bridge-fishing',
    group: 'outdoors',
    who: ['adult', 'adult'],
    label: 'Bridge Fishing',
    hint: 'Two friends, mid 20s',
    vehicle: 'crossover-grey',
    light: 'golden',
    brief:
      'two friends in their mid 20s, one Black and one white, sitting in the open trunk of their {car} parked on a quiet old bridge, fishing rods cast over the railing into the river, sharing a laugh',
  },
  {
    id: 'game-day',
    group: 'outdoors',
    who: ['man', 'man', 'man'],
    label: 'Game Day Tailgate',
    hint: 'Male friends, late 20s to early 30s',
    vehicle: 'pickup-white',
    light: 'midday',
    brief:
      'a group of male friends in their late 20s to early 30s, a mix of ethnicities, tailgating in a stadium parking lot with no signage in view, grilling and cheering around the open back of their {car}',
  },
  {
    id: 'family-hike',
    group: 'outdoors',
    who: ['adult', 'adult', 'child'],
    label: 'Family Hike',
    hint: 'Parents and their 10-year-old',
    vehicle: 'crossover-white',
    brief:
      'a young family with their 10-year-old son setting out on a hike, walking up a trail with daypacks, their {car} parked at the trailhead behind them',
  },
  {
    id: 'campfire',
    group: 'outdoors',
    who: ['adult', 'adult', 'child', 'child'],
    label: 'Campfire at Nightfall',
    hint: 'Family of four',
    vehicle: 'pickup-white',
    light: 'blue',
    brief:
      'a family of four camping in a forest at nightfall, gathered around a glowing bonfire in the foreground, their {car} parked among the trees in the background, warmly lit by the fire',
  },
  {
    id: 'desert-selfie',
    group: 'outdoors',
    who: ['woman', 'woman'],
    label: 'Desert Convertible Selfie',
    hint: 'Two women in their 20s',
    vehicle: 'convertible-blue',
    brief:
      'two women in their 20s taking a selfie together in the front seats of their {car}, parked on a desert road with mountains behind them',
  },
  {
    id: 'tennis',
    group: 'outdoors',
    who: ['adult', 'adult'],
    label: 'Tennis Morning',
    hint: 'Two friends, 20s to 30s',
    vehicle: 'sedan-slate-blue',
    light: 'midday',
    brief:
      'two friends in their 20s to 30s loading tennis bags into the open trunk of their clean pre-owned {car} beside a neighborhood tennis court on a sunny morning, one laughing while the other puts away a racket',
  },
  // Family life
  {
    id: 'soccer-carpool',
    group: 'family',
    who: ['woman', 'child', 'child', 'child', 'child'],
    label: 'Soccer Carpool',
    hint: 'Mom and a car full of kids',
    vehicle: 'crossover-grey',
    brief:
      'a mother at the wheel of her {car} smiling back at a car full of 10- to 12-year-old kids in plain, unnumbered soccer jerseys, a mix of boys and girls of different ethnicities, laughing in the back seats',
  },
  {
    id: 'park-picnic',
    group: 'family',
    who: ['woman', 'man', 'child'],
    label: 'Park Picnic',
    hint: 'Young family with a little one',
    vehicle: 'crossover-white',
    brief:
      'a young family having a picnic on a red-and-white checkered blanket in a green park: a white mother and an Asian father, both in their mid 30s to early 40s, and their 3- to 5-year-old child, their {car} parked on the grass beside them',
  },
  {
    id: 'front-yard-catch',
    group: 'family',
    who: ['man', 'child'],
    label: 'Front Yard Catch',
    hint: 'Dad, mid 40s, and his son',
    vehicle: 'crossover-grey',
    brief:
      'a father in his mid 40s playing catch with his 10- to 12-year-old son on the front lawn of their suburban home, their {car} parked in the driveway behind them',
  },
  {
    id: 'dorm-move-in',
    group: 'family',
    who: ['woman', 'adult', 'adult'],
    label: 'Dorm Move-In',
    hint: 'College student and her parents',
    vehicle: 'crossover-grey',
    brief:
      'a college-aged young woman and her parents in their 50s unloading boxes, bedding and a lamp from the open back of their {car} outside her campus dorm, everyone smiling',
  },
  {
    id: 'home-from-trip',
    group: 'family',
    who: ['adult', 'adult', 'child'],
    label: 'Home from the Road',
    hint: 'Family unloading luggage',
    vehicle: 'crossover-grey',
    brief:
      'a family unloading suitcases and duffel bags from the open trunk of their {car} in their driveway after a long road trip, tired but happy',
  },
  {
    id: 'car-seat',
    group: 'family',
    who: ['adult', 'baby'],
    label: 'Car Seat Install',
    hint: 'Parent fitting a child seat',
    vehicle: 'crossover-white',
    brief:
      'a parent carefully installing a child safety seat in the back seat of their {car} through the open rear door, their little one watching nearby',
  },
  // At EchoPark
  {
    id: 'dashboard-walkthrough',
    group: 'echopark',
    who: ['man', 'guide'],
    label: 'Dashboard Walkthrough',
    hint: 'Man, mid 40s, with a guide',
    vehicle: 'crossover-white',
    brief:
      'on an EchoPark dealership lot, a man in his mid 40s sitting behind the wheel of the {car} while a friendly EchoPark Experience Guide in the front passenger seat points out a feature on the dashboard, both smiling',
  },
  {
    id: 'test-drive',
    group: 'echopark',
    who: ['woman', 'guide'],
    label: 'Test Drive',
    hint: 'Woman, 40s, with a guide',
    vehicle: 'sedan-grey',
    brief:
      'a woman in her 40s test driving the {car}, relaxed at the wheel, with a friendly EchoPark Experience Guide in the passenger seat',
  },
  {
    id: 'handshake',
    group: 'echopark',
    who: ['woman', 'guide'],
    label: 'Handshake Moment',
    hint: 'Woman, 30s, with a guide',
    vehicle: 'sedan-silver',
    brief:
      'a woman in her 30s shaking hands with a friendly EchoPark Experience Guide in front of the {car} on the dealership lot, both smiling',
  },
  {
    id: 'drive-in-welcome',
    group: 'echopark',
    who: ['guide', 'adult'],
    label: 'Drive-In Welcome',
    hint: 'A guide greets an arriving customer',
    vehicle: 'crossover-white',
    brief:
      'seen through the open driver\'s window, a friendly EchoPark Experience Guide happily welcoming a customer who has just pulled in driving the {car}, a modern glass-fronted dealership building softly out of focus in the background',
  },
  {
    id: 'pricing-review',
    group: 'echopark',
    who: ['adult', 'guide'],
    label: 'Pricing Review',
    hint: 'Customer, 40s, with a guide',
    vehicle: 'sedan-silver',
    brief:
      'a customer in their 40s standing beside the {car} on the dealership lot next to a friendly EchoPark Experience Guide, looking over a sheet of paper together, seen from behind so nothing on it is readable, with relaxed, easy expressions',
  },
];

/** Most characters a user may type for an Other accent. */
export const MAX_ACCENT_CUSTOM = 80;

/** How the accent reads in summaries: "Auto accent", "Scarf accent", "Coffee cup accent". */
export function accentName(config: Pick<SceneConfig, 'accent' | 'accentCustom'>): string {
  if (config.accent === 'auto') return 'Auto accent';
  if (config.accent === 'other') {
    const custom = config.accentCustom?.trim().replace(/^(an?|the) /i, '') ?? '';
    return custom ? `${custom.charAt(0).toUpperCase()}${custom.slice(1)} accent` : 'Custom accent';
  }
  return `${labelOf(ACCENTS, config.accent)} accent`;
}

/** Retired scenarios, kept only so older library scenes stay labelled. */
const RETIRED_SCENARIOS: Option[] = [
  { id: 'keys', label: 'Keys Handoff' },
  { id: 'roadtrip', label: 'Road Trip Packing' },
  { id: 'coffee', label: 'Morning Coffee Run' },
  { id: 'beach', label: 'Beach Day' },
  { id: 'dog', label: 'Trailhead with the Dog' },
  { id: 'citynight', label: 'City Night Out' },
  { id: 'market', label: 'Farmers Market' },
  { id: 'tailgate', label: 'Sunset Tailgate' },
  { id: 'camping', label: 'Lakeside Camping' },
  { id: 'pickup', label: 'School Pickup' },
];

/** The scenario id for a moment the user writes themselves (`scenarioCustom`). */
export const CUSTOM_SCENARIO = 'custom';

/** Most characters a written scenario may have. */
export const MAX_SCENARIO_CUSTOM = 400;

/** Every scenario a stored scene can name, current ones first. */
export const SCENARIO_LABELS: readonly Option[] = [
  ...SCENARIOS,
  { id: CUSTOM_SCENARIO, label: 'Your Own Scenario' },
  ...RETIRED_SCENARIOS,
];

export function isCurrentScenario(id: string): boolean {
  return id === CUSTOM_SCENARIO || SCENARIOS.some((s) => s.id === id);
}

export const ACCENTS: (Option & { phrase: string })[] = [
  { id: 'auto', label: 'Let the Scene Decide', phrase: '' },
  { id: 'shirt', label: 'Shirt or Tee', phrase: 'a shirt' },
  { id: 'jacket', label: 'Jacket', phrase: 'a lightweight jacket' },
  { id: 'hairband', label: 'Hair Band', phrase: 'a hair band' },
  { id: 'purse', label: 'Purse or Tote', phrase: 'a purse or tote bag' },
  { id: 'scarf', label: 'Scarf', phrase: 'a scarf' },
  { id: 'cap', label: 'Cap', phrase: 'a baseball cap' },
  { id: 'sneakers', label: 'Sneakers', phrase: 'a pair of sneakers' },
  { id: 'bottle', label: 'Water Bottle', phrase: 'a reusable water bottle' },
  { id: 'leash', label: 'Dog Leash', phrase: 'a dog leash and collar' },
  { id: 'blanket', label: 'Picnic Blanket', phrase: 'a picnic blanket' },
  { id: 'backpack', label: 'Backpack', phrase: 'a backpack' },
  { id: 'other', label: 'Other', phrase: '' },
];

/**
 * The approved vehicle line-up. Each photo lives in storage at
 * `vehicles/<id>.jpg` (with a `-thumb.jpg` for the picker) and is sent to
 * the model as the `@vehicle` reference, so every scene shows one of these
 * exact designs. `sheet` marks a multi-view turnaround with printed labels.
 */
export const VEHICLES: (Option & { noun: string; description: string; sheet?: boolean })[] = [
  { id: 'crossover-white', label: 'Crossover SUV', hint: 'White', noun: 'white compact crossover SUV', description: 'A compact five-seat SUV for family errands and weekend trips' },
  { id: 'crossover-grey', label: 'Crossover SUV', hint: 'Graphite grey', noun: 'graphite grey compact crossover SUV', description: 'A compact five-seat SUV for family errands and weekend trips' },
  { id: 'sedan-slate-blue', label: 'Sedan', hint: 'Slate blue', noun: 'slate blue sedan', description: 'A four-door sedan for commutes and city driving' },
  { id: 'sedan-grey', label: 'Sedan', hint: 'Grey', noun: 'grey sedan', description: 'A four-door sedan for commutes and city driving' },
  { id: 'sedan-silver', label: 'Sedan', hint: 'Silver', noun: 'silver sedan', description: 'A four-door sedan for commutes and city driving' },
  { id: 'pickup-white', label: 'Pickup Truck', hint: 'White', noun: 'white crew-cab pickup truck', description: 'A crew-cab pickup with an open bed for gear and outdoor work', sheet: true },
  { id: 'convertible-blue', label: 'Roadster', hint: 'Ocean blue', noun: 'ocean blue convertible roadster', description: 'A two-seat open-top roadster for coastal drives', sheet: true },
];

export const VEHICLE_TAG = 'vehicle';

export function vehicleImageKey(id: string): string {
  return `vehicles/${id}.jpg`;
}

export function vehicleThumbKey(id: string): string {
  return `vehicles/${id}-thumb.jpg`;
}

/** "White crossover SUV" — the vehicle as one readable phrase. */
/** Vehicles taken out of the line-up, kept so older scenes keep their names. */
const RETIRED_VEHICLES: Record<string, string> = {
  'compact-suv-teal': 'Teal compact SUV',
};

export function vehicleName(id: string): string {
  const v = VEHICLES.find((o) => o.id === id);
  return v ? `${v.hint} ${v.label.toLowerCase()}` : (RETIRED_VEHICLES[id] ?? id);
}

export function isCurrentVehicle(id: string): boolean {
  return VEHICLES.some((v) => v.id === id);
}

export const DEPTH: (Option & { lens: string })[] = [
  {
    id: 'subtle',
    label: 'Subtle',
    hint: 'f/4 · setting stays readable',
    lens: 'shot at f/4, the subjects tack-sharp and the background softly out of focus while still readable',
  },
  {
    id: 'medium',
    label: 'Medium',
    hint: 'f/2.8 · gentle falloff',
    lens: 'shot at f/2.8, the subjects in crisp focus with a gentle, natural falloff into a softly blurred background',
  },
  {
    id: 'shallow',
    label: 'Shallow',
    hint: 'f/1.8 · creamy bokeh',
    lens: 'shot wide open at f/1.8, the subjects razor-sharp against a creamy, beautifully blurred background with soft round bokeh',
  },
];

export const LIGHT: (Option & { light: string })[] = [
  {
    id: 'golden',
    label: 'Golden Hour',
    light: 'warm golden-hour sunlight backlighting the subjects with a soft rim light on their hair',
  },
  {
    id: 'soft',
    label: 'Soft Overcast',
    light: 'soft, even overcast daylight with gentle shadows and true-to-life skin tones',
  },
  {
    id: 'midday',
    label: 'Bright Daylight',
    light: 'bright, clean late-morning daylight with crisp natural contrast',
  },
  {
    id: 'blue',
    label: 'Blue Hour',
    light: 'cool blue-hour ambient light mixed with warm practical lights',
  },
];

export const LENSES: (Option & { mm: string })[] = [
  { id: '35', label: '35mm', hint: 'Environmental', mm: '35mm' },
  { id: '50', label: '50mm', hint: 'Natural', mm: '50mm' },
  { id: '85', label: '85mm', hint: 'Portrait', mm: '85mm' },
];

/** Master frames — each a ratio the model accepts. Social cuts are crops of it. */
export const FRAMES = [
  { id: '16:9', label: '16:9', hint: 'Web hero, video' },
  { id: '3:2', label: '3:2', hint: 'Collateral, print' },
  { id: '4:5', label: '4:5', hint: 'Social feed' },
] as const satisfies readonly Option[];

export type FrameId = (typeof FRAMES)[number]['id'];

export const QUALITY = [
  { id: '1K', label: '1K', hint: 'Quick look' },
  { id: '2K', label: '2K', hint: 'Collateral' },
  { id: '4K', label: '4K', hint: 'Large format' },
] as const satisfies readonly Option[];

export type QualityId = (typeof QUALITY)[number]['id'];

/** Social cuts drawn over the preview as crop guides. */
export const SOCIAL_CROPS = [
  { id: '1:1', w: 1, h: 1 },
  { id: '4:5', w: 4, h: 5 },
  { id: '9:16', w: 9, h: 16 },
] as const;

export type SceneConfig = {
  characterIds: string[];
  scenario: string;
  /** The moment in the user's words when `scenario` is `custom`. */
  scenarioCustom?: string | undefined;
  accent: string;
  /** What carries the accent when `accent` is `other`, e.g. "a coffee cup". */
  accentCustom?: string | undefined;
  vehicle: string;
  depth: string;
  light: string;
  lens: string;
  frame: FrameId;
  quality: QualityId;
  notes: string;
};

export const DEFAULT_CONFIG: SceneConfig = {
  characterIds: [],
  scenario: 'copilot-dog',
  scenarioCustom: '',
  accent: 'auto',
  accentCustom: '',
  vehicle: 'crossover-grey',
  depth: 'medium',
  light: 'golden',
  lens: '50',
  frame: '16:9',
  quality: '2K',
  notes: '',
};

/** What the prompt needs to know about each cast member. */
export type CastRef = {
  name: string;
  tag: string;
  description: string;
  /** Tags of this person's extra reference photos, if any. */
  extraTags?: string[] | undefined;
  /** Pets are described and matched as animals, not people. */
  pet?: boolean | undefined;
};

/**
 * Cast rows, read from each character's file label ("Female30A", "MaleTeenA",
 * "DogB", "GuideF30A"). Labels that match none of these land in `other`.
 */
export const CAST_GROUPS = [
  { id: 'male', label: 'Males' },
  { id: 'female', label: 'Females' },
  { id: 'pet', label: 'Pets' },
  { id: 'guide', label: 'Experience Guides' },
  { id: 'other', label: 'Other' },
] as const;
export type CastGroupId = (typeof CAST_GROUPS)[number]['id'];

export function castGroup(name: string): CastGroupId {
  const n = name.trim().toLowerCase();
  if (/guide|experience/.test(n)) return 'guide';
  if (/^(dog|cat|pet|puppy)/.test(n)) return 'pet';
  if (n.startsWith('female')) return 'female';
  if (n.startsWith('male')) return 'male';
  return 'other';
}

/** Age read from the label: "Teen" sorts before 20; no age sorts last. */
export function castAge(name: string): number {
  if (/teen/i.test(name)) return 15;
  const m = /\d{2}/.exec(name);
  return m ? Number(m[0]) : Number.POSITIVE_INFINITY;
}

/** Youngest first, then alphabetical by label. */
export function compareCast(a: { name: string }, b: { name: string }): number {
  return (
    castAge(a.name) - castAge(b.name) ||
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
  );
}

/** The figure a cast member reads as, from their label; null when unknown. */
export function castFigure(name: string): Figure | null {
  const group = castGroup(name);
  if (group === 'pet') return 'dog';
  if (group === 'guide') return 'guide';
  if (group === 'other') return null;
  if (castAge(name) < 18) return 'child';
  return group === 'male' ? 'man' : 'woman';
}

function fits(cast: Figure, slot: Figure): boolean {
  return cast === slot || (slot === 'adult' && (cast === 'man' || cast === 'woman'));
}

/**
 * Whether the picked cast differs from the people a scenario is written for:
 * a cast member with no free role that fits them (two women for "a man and a
 * child"). The cast still plays it; this only drives the note under the brief.
 */
export function castDiffers(who: readonly Figure[], castNames: readonly string[]): boolean {
  const free = [...who];
  for (const name of castNames) {
    const f = castFigure(name);
    if (!f) continue;
    const i = free.findIndex((slot) => slot === f);
    const j = i >= 0 ? i : free.findIndex((slot) => fits(f, slot));
    if (j < 0) return true;
    free.splice(j, 1);
  }
  return false;
}

const FIGURE_NOUNS: Record<Figure, [string, string]> = {
  man: ['man', 'men'],
  woman: ['woman', 'women'],
  adult: ['adult', 'adults'],
  child: ['child', 'children'],
  baby: ['baby', 'babies'],
  dog: ['dog', 'dogs'],
  guide: ['Experience Guide', 'Experience Guides'],
};
const COUNT_WORDS = ['', 'a', 'two', 'three', 'four', 'five', 'six'];

/** Figures in first-seen order with how many of each. */
export function countFigures(who: readonly Figure[]): { figure: Figure; count: number }[] {
  const out: { figure: Figure; count: number }[] = [];
  for (const f of who) {
    const row = out.find((r) => r.figure === f);
    if (row) row.count += 1;
    else out.push({ figure: f, count: 1 });
  }
  return out;
}

/** "a man and a child", "two women", "two adults, a child and a dog". */
export function figurePhrase(who: readonly Figure[]): string {
  const parts = countFigures(who).map(({ figure, count }) => {
    const [one, many] = FIGURE_NOUNS[figure];
    if (count === 1) return `${/^[aeiouAEIOU]/.test(one) ? 'an' : 'a'} ${one}`;
    return `${COUNT_WORDS[count] ?? count} ${many}`;
  });
  return parts.length <= 1
    ? (parts[0] ?? '')
    : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

/** How many cast members to pick for a scenario: its roles, capped. */
export function castWanted(scenarioId: string): number {
  const scenario = SCENARIOS.find((s) => s.id === scenarioId);
  return Math.min(scenario?.who.length ?? MAX_CAST_PER_SCENE, MAX_CAST_PER_SCENE);
}

/** The Cast section's instruction: how many to pick for this scenario. */
export function castInstruction(config: Pick<SceneConfig, 'scenario'>): string {
  const scenario = SCENARIOS.find((s) => s.id === config.scenario);
  if (!scenario) {
    return `Pick up to ${COUNT_WORDS[MAX_CAST_PER_SCENE]} characters for your scenario, or none to have the scene cast for you.`;
  }
  const roles = scenario.who.length;
  const n = Math.min(roles, MAX_CAST_PER_SCENE);
  const pick = n === 1 ? 'Pick one character' : `Pick up to ${COUNT_WORDS[n]} characters`;
  const rest =
    roles > MAX_CAST_PER_SCENE
      ? ' for the lead roles; the rest are cast for you'
      : ', or none to have the scene cast for you';
  return `${scenario.label} is written for ${figurePhrase(scenario.who)}. ${pick}${rest}.`;
}

/** Most characters in one scene, and reference photos sent per character. */
export const MAX_CAST_PER_SCENE = 3;
export const MAX_PHOTOS_PER_CHARACTER = 3;

/** A reference-image tag the model accepts: lowercase letters and digits. */
export function castTag(name: string, index: number): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return (slug || 'person').slice(0, 16) + (index + 1);
}

function pick<T extends Option>(list: readonly T[], id: string): T {
  return list.find((o) => o.id === id) ?? list[0]!;
}

export function labelOf(list: readonly Option[], id: string): string {
  return list.find((o) => o.id === id)?.label ?? id;
}

/**
 * Compiles a scene into one narrative, positively framed photographic brief —
 * the prompt style the Nano Banana models follow best (verb first, subject →
 * action → place → composition → camera → light, no negations).
 */
export function buildPrompt(config: SceneConfig, cast: CastRef[]): string {
  const scenario = pick(SCENARIOS, config.scenario);
  const accent = pick(ACCENTS, config.accent);
  const vehicle = pick(VEHICLES, config.vehicle);
  const depth = pick(DEPTH, config.depth);
  const light = pick(LIGHT, config.light);
  const lens = pick(LENSES, config.lens);

  const people = cast.filter((c) => !c.pet);
  const pets = cast.filter((c) => c.pet);
  const ref = (c: CastRef) =>
    `@${c.tag} (${c.name}${c.description ? `, ${c.description}` : ''})`;
  const refs = cast.map(ref);
  const who =
    refs.length <= 2
      ? refs.join(' and ')
      : `${refs.slice(0, -1).join('; ')}; and ${refs[refs.length - 1]}`;
  const sameAs = cast
    .filter((c) => c.extraTags?.length)
    .map(
      (c) =>
        ` ${c.extraTags!.map((t) => `@${t}`).join(' and ')} show the same ${c.pet ? 'animal' : 'person'} as @${c.tag}.`
    )
    .join('');
  const peopleLikeness =
    people.length === 0
      ? ''
      : ` Keep ${people.length === 1 ? "this person's" : "each person's"} face, hair, skin tone and build exactly as in their reference photos, taking only the person's likeness from any character sheet, styled in fresh casual clothing that suits the moment.`;
  const petLikeness =
    pets.length === 0
      ? ''
      : ` Keep ${pets.length === 1 ? "the pet's" : "each pet's"} breed, coat colours, markings and build exactly as in its reference photos, taking only the animal's likeness from any character sheet.`;
  const likeness = `${sameAs}${peopleLikeness}${petLikeness}`;

  const accentPhrase =
    config.accent === 'other' ? (config.accentCustom ?? '').trim() : accent.phrase;
  const accentLine = accentPhrase
    ? `Exactly one element carries the EchoPark brand accent: ${accentPhrase} in Echo Green, a fresh leaf green (${ECHO_GREEN.hex}, ${ECHO_GREEN.pantone}), worn or placed naturally so it reads as a real styling choice.`
    : `Exactly one small, natural element in the scene — a piece of clothing, a hair accessory, a bag or a prop — carries the EchoPark brand accent in Echo Green, a fresh leaf green (${ECHO_GREEN.hex}, ${ECHO_GREEN.pantone}), so it reads as a real styling choice; the rest of the palette stays natural and neutral.`;

  const notes = config.notes.trim() ? ` Direction: ${config.notes.trim()}` : '';

  const custom =
    config.scenario === CUSTOM_SCENARIO
      ? (config.scenarioCustom ?? '').trim().replace(/[.\s]+$/, '')
      : '';
  const moment = custom
    ? `${custom}, with the ${vehicle.noun} clearly part of the moment`
    : scenario.brief.replaceAll('{car}', vehicle.noun);

  // The cast wins: picked characters take the scene's roles whatever their
  // gender or age, and the scene adapts to them. Only roles the cast leaves
  // empty go to new people.
  const roles = custom ? null : scenario.who.length;
  const others =
    roles === null
      ? ' Anyone else the moment calls for is a new, natural-looking person who fits it.'
      : cast.length >= roles
        ? ' They are the only main characters; add no one else in a leading role.'
        : ' The roles the cast leaves open go to new, natural-looking people who fit the description.';
  const casting =
    cast.length === 0
      ? ''
      : ` ${who} ${cast.length === 1 ? 'plays the lead role' : 'play the lead roles'} in this scene, taking the place of the people${pets.length ? ' and pets' : ''} it describes in whichever roles suit them best. Keep the action, the setting and the car as described, and adapt each role (relationship, gender, age) to the cast member playing it, never the cast member to the role.${others}${likeness}`;

  return [
    `Capture a candid, authentic lifestyle photograph: ${moment}.${casting}`,
    `The mood is genuine, warm and relaxed — a real, unposed moment with natural expressions and body language.`,
    `The car in the scene is the ${vehicle.noun} shown in @${VEHICLE_TAG}, with the same body shape, proportions, wheels and paint colour as @${VEHICLE_TAG}${vehicle.sheet ? ', which is a multi-view design sheet of one vehicle, so show it once, from the angle that suits the shot' : ''}; it stays clearly part of the moment. It is a premium, unbranded vehicle with an emblem-free grille, smooth unbadged panels and plain blank license plates.`,
    accentLine,
    `No readable text, letters, numbers or logos anywhere in the frame: no brand emblems on the grille, tailgate, wheel centre caps or steering wheel, no model lettering, blank license plates, plain unmarked key fobs and keychains, unlabelled props and packaging, clothing without prints or lettering, and no signs, posters or screens with writing. Phones and screens stay dark or face away.`,
    `Compose for cropping: keep the people and the key action in the central third with generous headroom and breathing room on every side, so the frame crops cleanly to square, 4:5 and 9:16 vertical for social.`,
    `Photographed on a full-frame mirrorless camera with a ${lens.mm} prime lens, ${depth.lens}. Lit by ${light.light}.`,
    `Photorealistic editorial lifestyle photography with true-to-life skin texture, natural color grading, fine detail and a premium, modern brand feel.${notes}`,
  ].join(' ');
}
