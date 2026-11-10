import { useMemo, useState } from 'react';

import type { Scene } from '../../library.ts';
import { SCENARIO_LABELS } from '../../shared/scene.ts';

const PAGE_SIZE = 12;
/** Filters appear once the library is bigger than this. */
const FILTER_THRESHOLD = 6;

/** Scenario chips, name search and "show more" paging over the scene list. */
export function useLibraryFilter(scenes: Scene[]) {
  const [scenario, setScenarioState] = useState('all');
  const [query, setQueryState] = useState('');
  const [limit, setLimit] = useState(PAGE_SIZE);

  const showFilters = scenes.length > FILTER_THRESHOLD;

  const scenarios = useMemo(() => {
    const present = new Set(scenes.map((s) => s.config.scenario));
    return SCENARIO_LABELS.filter((s) => present.has(s.id));
  }, [scenes]);

  const activeScenario =
    scenario !== 'all' && scenarios.some((s) => s.id === scenario)
      ? scenario
      : 'all';

  const filtered = useMemo(() => {
    if (!showFilters) return scenes;
    const q = query.trim().toLowerCase();
    return scenes.filter(
      (s) =>
        (activeScenario === 'all' || s.config.scenario === activeScenario) &&
        (q === '' || s.castNames.some((n) => n.toLowerCase().includes(q)))
    );
  }, [scenes, showFilters, activeScenario, query]);

  return {
    showFilters,
    scenarios,
    scenario: activeScenario,
    setScenario: (id: string) => {
      setScenarioState(id);
      setLimit(PAGE_SIZE);
    },
    query,
    setQuery: (q: string) => {
      setQueryState(q);
      setLimit(PAGE_SIZE);
    },
    clear: () => {
      setScenarioState('all');
      setQueryState('');
      setLimit(PAGE_SIZE);
    },
    filtered,
    visible: filtered.slice(0, limit),
    hasMore: filtered.length > limit,
    showMore: () => setLimit((l) => l + PAGE_SIZE),
  };
}

export type LibraryFilter = ReturnType<typeof useLibraryFilter>;
