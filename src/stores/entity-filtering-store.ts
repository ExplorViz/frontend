import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import { Language } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import {
  normalizeLanguage,
  sortLanguages,
} from 'explorviz-frontend/src/utils/settings/language-settings';
import { BUILDING_METRIC_NAMES } from 'explorviz-frontend/src/utils/settings/settings-schemas';
import { create } from 'zustand';

export type EntityFilterMode = 'Hide' | 'Remove';

export type FqnFilterOption = {
  label: string;
  value: string;
};

export type LanguageCount = readonly [language: Language, count: number];

export function getLanguageCountsFromBuildings(
  buildings: Iterable<{ language?: Language }>
): LanguageCount[] {
  const counts = new Map<Language, number>();

  for (const building of buildings) {
    const lang = normalizeLanguage(building.language);
    counts.set(lang, (counts.get(lang) ?? 0) + 1);
  }

  return sortLanguages(Array.from(counts.keys())).map(
    (language) => [language, counts.get(language)!] as const
  );
}

const getDefaultMetricThresholds = (): Record<string, number> =>
  Object.fromEntries(BUILDING_METRIC_NAMES.map((name) => [name, 0]));

interface EntityFilteringStoreState {
  filterMode: EntityFilterMode;
  inclusionExpressions: readonly FqnFilterOption[];
  exclusionExpressions: readonly FqnFilterOption[];
  metricThresholds: Record<string, number>;
  baselineLanguageStats: readonly LanguageCount[];
  actions: {
    setFilterMode: (mode: EntityFilterMode) => void;
    setInclusionExpressions: (expressions: readonly FqnFilterOption[]) => void;
    setExclusionExpressions: (expressions: readonly FqnFilterOption[]) => void;
    setMetricThreshold: (metric: string, value: number) => void;
    setMetricThresholds: (thresholds: Record<string, number>) => void;
    setMinMethodCount: (value: number) => void;
    setBaselineLanguageStats: (stats: readonly LanguageCount[]) => void;
    resetFilters: () => void;
  };
}

export const useEntityFilteringStore = create<EntityFilteringStoreState>(
  (set) => ({
    filterMode: 'Remove',
    inclusionExpressions: [],
    exclusionExpressions: [],
    metricThresholds: getDefaultMetricThresholds(),
    baselineLanguageStats: [],
    actions: {
      setFilterMode: (mode) => set({ filterMode: mode }),
      setInclusionExpressions: (expressions) =>
        set({ inclusionExpressions: expressions }),
      setExclusionExpressions: (expressions) =>
        set({ exclusionExpressions: expressions }),
      setMetricThreshold: (metric, value) =>
        set((state) => ({
          metricThresholds: { ...state.metricThresholds, [metric]: value },
        })),
      setMetricThresholds: (thresholds) =>
        set({ metricThresholds: thresholds }),
      setMinMethodCount: (value) =>
        set((state) => ({
          metricThresholds: { ...state.metricThresholds, functionCount: value },
        })),
      setBaselineLanguageStats: (stats) =>
        set({ baselineLanguageStats: stats }),
      resetFilters: () => {
        useVisualizationStore.getState().actions.resetLanguageFilter();
        set({
          filterMode: 'Remove',
          inclusionExpressions: [],
          exclusionExpressions: [],
          metricThresholds: getDefaultMetricThresholds(),
        });
      },
    },
  })
);
