import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import { FlatLandscape, Language } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { normalizeLanguage, sortLanguages } from 'explorviz-frontend/src/utils/language-utils';
import { BUILDING_METRIC_NAMES } from 'explorviz-frontend/src/utils/settings/settings-schemas';
import { create } from 'zustand';

export type EntityFilterMode = 'Hide' | 'Remove';

export type FqnFilterOption = {
  label: string;
  value: string;
};

export type LanguageCount = readonly [language: Language, count: number];
export type FileExtensionCount = readonly [extension: string, count: number];
export type LanguageFileExtensionStats = Readonly<Record<Language, readonly FileExtensionCount[]>>;

export function getFileExtensionFromPath(path: string): string {
  const fileName = path.split(/[/\\]/).pop() ?? path;
  const lastDotIndex = fileName.lastIndexOf('.');

  if (lastDotIndex <= 0) {
    return '(no extension)';
  }

  return fileName.slice(lastDotIndex).toLowerCase();
}

export type FileExtensionGroup = {
  extension: string;
  count: number;
  buildingIds: readonly string[];
};

export function getFileExtensionGroupsFromBuildings(
  buildings: Iterable<{ id: string; fqn?: string; name: string }>
): readonly FileExtensionGroup[] {
  const buildingIdsByExtension = new Map<string, string[]>();

  for (const building of buildings) {
    const extension = getFileExtensionFromPath(building.fqn ?? building.name);
    const buildingIds = buildingIdsByExtension.get(extension) ?? [];

    buildingIds.push(building.id);
    buildingIdsByExtension.set(extension, buildingIds);
  }

  return [...buildingIdsByExtension.entries()]
    .sort(([extensionA, idsA], [extensionB, idsB]) => {
      if (idsB.length !== idsA.length) {
        return idsB.length - idsA.length;
      }

      return extensionA.localeCompare(extensionB);
    })
    .map(([extension, buildingIds]) => ({
      extension,
      count: buildingIds.length,
      buildingIds,
    }));
}

export function getLanguageCountsFromBuildings(buildings: Iterable<{ language?: Language }>): LanguageCount[] {
  const counts = new Map<Language, number>();

  for (const building of buildings) {
    const lang = normalizeLanguage(building.language);
    counts.set(lang, (counts.get(lang) ?? 0) + 1);
  }

  return sortLanguages(Array.from(counts.keys())).map((language) => [language, counts.get(language)!] as const);
}

export function getLanguageFileExtensionStatsFromBuildings(
  buildings: Iterable<{ language?: Language; fqn?: string; name: string }>
): LanguageFileExtensionStats {
  const countsByLanguage = new Map<Language, Map<string, number>>();

  for (const building of buildings) {
    const language = normalizeLanguage(building.language);
    const extension = getFileExtensionFromPath(building.fqn ?? building.name);
    const extensionCounts = countsByLanguage.get(language) ?? new Map<string, number>();

    extensionCounts.set(extension, (extensionCounts.get(extension) ?? 0) + 1);
    countsByLanguage.set(language, extensionCounts);
  }

  const stats = {} as Record<Language, readonly FileExtensionCount[]>;

  for (const [language, extensionCounts] of countsByLanguage) {
    stats[language] = [...extensionCounts.entries()]
      .sort(([extensionA, countA], [extensionB, countB]) => {
        if (countB !== countA) {
          return countB - countA;
        }

        return extensionA.localeCompare(extensionB);
      })
      .map(([extension, count]) => [extension, count] as const);
  }

  return stats;
}

/**
 * Inclusive range of metric values a building must lie in to pass the filter.
 * An upper bound of `Infinity` means the range is open at the top, so it keeps
 * admitting buildings when a later landscape contains larger values.
 */
export type MetricRange = { readonly min: number; readonly max: number };

export const UNBOUNDED_METRIC_RANGE: MetricRange = { min: 0, max: Number.POSITIVE_INFINITY };

const getDefaultMetricRanges = (): Record<string, MetricRange> =>
  Object.fromEntries(BUILDING_METRIC_NAMES.map((name) => [name, UNBOUNDED_METRIC_RANGE]));

interface EntityFilteringStoreState {
  filterMode: EntityFilterMode;
  inclusionExpressions: readonly FqnFilterOption[];
  exclusionExpressions: readonly FqnFilterOption[];
  metricRanges: Record<string, MetricRange>;
  // Districts without direct buildings: in Hide mode open ones become invisible
  // (layout unchanged); in Remove mode they are removed and their inner
  // districts move up to the parent, compacting the layout.
  hideEmptyDistricts: boolean;
  baselineFlatLandscape: FlatLandscape | null;
  baselineLanguageStats: readonly LanguageCount[];
  baselineLanguageFileExtensionStats: LanguageFileExtensionStats;
  actions: {
    setFilterMode: (mode: EntityFilterMode) => void;
    setInclusionExpressions: (expressions: readonly FqnFilterOption[]) => void;
    setExclusionExpressions: (expressions: readonly FqnFilterOption[]) => void;
    setMetricRange: (metric: string, range: MetricRange) => void;
    setMetricRanges: (ranges: Record<string, MetricRange>) => void;
    setMinMethodCount: (value: number) => void;
    setHideEmptyDistricts: (hide: boolean) => void;
    setBaselineFlatLandscape: (flatLandscape: FlatLandscape) => void;
    setBaselineLanguageStats: (stats: readonly LanguageCount[]) => void;
    setBaselineLanguageFileExtensionStats: (stats: LanguageFileExtensionStats) => void;
    resetFilters: () => void;
  };
}

export const useEntityFilteringStore = create<EntityFilteringStoreState>((set) => ({
  filterMode: 'Remove',
  inclusionExpressions: [],
  exclusionExpressions: [],
  metricRanges: getDefaultMetricRanges(),
  hideEmptyDistricts: false,
  baselineFlatLandscape: null,
  baselineLanguageStats: [],
  baselineLanguageFileExtensionStats: {},
  actions: {
    setFilterMode: (mode) => set({ filterMode: mode }),
    setInclusionExpressions: (expressions) => set({ inclusionExpressions: expressions ?? [] }),
    setExclusionExpressions: (expressions) => set({ exclusionExpressions: expressions ?? [] }),
    setMetricRange: (metric, range) =>
      set((state) => ({
        metricRanges: { ...state.metricRanges, [metric]: range },
      })),
    setMetricRanges: (ranges) => set({ metricRanges: ranges }),
    setMinMethodCount: (value) =>
      set((state) => ({
        metricRanges: {
          ...state.metricRanges,
          functionCount: { ...(state.metricRanges.functionCount ?? UNBOUNDED_METRIC_RANGE), min: value },
        },
      })),
    setHideEmptyDistricts: (hide) => set({ hideEmptyDistricts: hide }),
    setBaselineFlatLandscape: (flatLandscape) => set({ baselineFlatLandscape: flatLandscape }),
    setBaselineLanguageStats: (stats) => set({ baselineLanguageStats: stats }),
    setBaselineLanguageFileExtensionStats: (stats) => set({ baselineLanguageFileExtensionStats: stats }),
    resetFilters: () => {
      const visualizationActions = useVisualizationStore.getState().actions;
      visualizationActions.resetModelTypeFilter();
      visualizationActions.resetLanguageFilter();
      set({
        filterMode: 'Remove',
        inclusionExpressions: [],
        exclusionExpressions: [],
        metricRanges: getDefaultMetricRanges(),
        hideEmptyDistricts: false,
      });
    },
  },
}));
