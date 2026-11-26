import { SelectedCommit } from 'explorviz-frontend/src/stores/commit-tree-state';
import {
  ContributorDto,
  SocialMetricDto,
  useEvolutionDataFetchServiceStore,
} from 'explorviz-frontend/src/stores/evolution-data-fetch-service';
import { BuildingMetricIds, useHeatmapStore } from 'explorviz-frontend/src/stores/heatmap/heatmap-store';
import { useRenderingServiceStore } from 'explorviz-frontend/src/stores/rendering-service';
import {
  sortSelectedCommitsForComparison,
  useEvolutionDataRepositoryStore,
} from 'explorviz-frontend/src/stores/repos/evolution-data-repository';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { invalidateBuildingMetricBoundsCache } from 'explorviz-frontend/src/utils/settings/building-metrics';
import { create } from 'zustand';

interface SocialMetricsState {
  repositoryName: string | null;
  commit: string | null;
  contributors: ContributorDto[];
  availableTimeRange: { from: number; to: number } | null;
  selectedContributorIds: Set<number>;
  selectedTimeRange: { from: number; to: number } | null;
  normalization: { logScale: boolean; quantile: number };

  /** The metrics fetched for the selection, until they are replaced by those of another selection. */
  _loadedMetrics: SocialMetricDto[] | null;
  /**
   * Fetches the contributors and social metrics of the selection, without touching the landscape; that is
   * what `applyLoadedMetrics` does. Resolves to whether they were fetched and still belong to the latest
   * selection.
   */
  loadForSelection: (repositoryName: string, commits: SelectedCommit[]) => Promise<boolean>;
  /**
   * Merges the fetched metrics into the evolution landscape. With `render`, the landscape on screen is
   * updated as well; without, that is left to the caller, who is about to render the landscape anyway.
   * Returns false if there are no fetched metrics (yet).
   */
  applyLoadedMetrics: (options: { render: boolean }) => boolean;
  updateSocialMetrics: () => Promise<void>;
  setSelectedContributorIds: (ids: Set<number>) => void;
  setSelectedTimeRange: (range: { from: number; to: number } | null) => void;
  setNormalization: (normalization: { logScale: boolean; quantile: number }) => void;
  reset: () => void;
  _applyAndRender: (dtos: SocialMetricDto[]) => void;
}

// Counts the selections metrics were fetched for, so a response that arrives after the selection changed
// again (or was reset) is dropped.
let latestLoad = 0;

const EMPTY_STATE = {
  repositoryName: null,
  commit: null,
  contributors: [],
  availableTimeRange: null,
  selectedContributorIds: new Set<number>(),
  selectedTimeRange: null,
  normalization: { logScale: true, quantile: 0.99 }, // possibly null this out instead, cleaner and should be handled
  _loadedMetrics: null,
};

export const useSocialMetricsStore = create<SocialMetricsState>((set, get) => ({
  ...EMPTY_STATE,

  loadForSelection: async (repositoryName, commits) => {
    if (commits.length === 0) {
      get().reset();
      return false;
    }

    const load = ++latestLoad;
    set({ _loadedMetrics: null });

    // determine latest selected commit
    const sorted = sortSelectedCommitsForComparison(
      useEvolutionDataRepositoryStore.getState()._repoNameCommitTreeMap,
      repositoryName,
      commits
    );
    const commit = sorted[sorted.length - 1].commitId;

    try {
      const fetchService = useEvolutionDataFetchServiceStore.getState();
      const [contributorsResponse, dtos] = await Promise.all([
        fetchService.fetchContributors(repositoryName),
        fetchService.fetchSocialMetrics(repositoryName, commit),
      ]);
      if (load !== latestLoad) {
        return false;
      }

      set({
        repositoryName,
        commit,
        contributors: contributorsResponse.contributors,
        availableTimeRange: contributorsResponse.timeRange,
        selectedContributorIds: new Set(contributorsResponse.contributors.map((c) => c.contributorId)),
        selectedTimeRange: null,
        _loadedMetrics: dtos,
      });
      return true;
    } catch (e) {
      if (load === latestLoad) {
        get().reset();
      }
      console.error(`Failed to fetch social metrics for repoName: ${repositoryName}, reason: ${e}`);
      return false;
    }
  },

  applyLoadedMetrics: ({ render }) => {
    const { repositoryName, _loadedMetrics } = get();
    if (!repositoryName || !_loadedMetrics) {
      return false;
    }

    if (render) {
      get()._applyAndRender(_loadedMetrics);
    } else {
      invalidateBuildingMetricBoundsCache();
      useEvolutionDataRepositoryStore.getState().applySocialMetrics(_loadedMetrics);
    }
    return true;
  },

  updateSocialMetrics: async () => {
    const { repositoryName, commit, contributors, selectedContributorIds, selectedTimeRange, normalization } = get();
    if (!repositoryName || !commit) {
      return;
    }

    const allSelected = selectedContributorIds.size === contributors.length;
    const dtos = await useEvolutionDataFetchServiceStore.getState().fetchSocialMetrics(repositoryName, commit, {
      from: selectedTimeRange?.from,
      to: selectedTimeRange?.to,
      contributorIds: allSelected ? undefined : Array.from(selectedContributorIds),
      logScale: normalization.logScale,
      quantile: normalization.quantile,
    });
    get()._applyAndRender(dtos);
  },

  setSelectedContributorIds: (ids) => set({ selectedContributorIds: ids }),
  setSelectedTimeRange: (range) => set({ selectedTimeRange: range }),
  setNormalization: (normalization) => set({ normalization }),
  reset: () => {
    latestLoad++;
    set(EMPTY_STATE);
  },

  _applyAndRender: (dtos) => {
    const { repositoryName } = get();
    if (!repositoryName) {
      return;
    }

    invalidateBuildingMetricBoundsCache();

    useEvolutionDataRepositoryStore.getState().applySocialMetrics(dtos);

    const mergedFlat = useEvolutionDataRepositoryStore.getState()._repoNameToFlatLandscapeMap.get(repositoryName);

    if (mergedFlat) {
      const visible = useRenderingServiceStore.getState()._applyEvolutionLayoutFilter(mergedFlat);

      useModelStore.getState().setBuildings(Object.values(visible.buildings));
    }

    const heatmap = useHeatmapStore.getState();
    const selected = heatmap.getSelectedBuildingMetric();
    if (selected && selected.name !== BuildingMetricIds.None) {
      heatmap.setSelectedBuildingMetric(selected.name);
    }

    useRenderingServiceStore.getState().refreshCurrentEvolutionLandscape();
  },
}));
