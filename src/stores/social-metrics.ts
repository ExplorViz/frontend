
import { SelectedCommit } from 'explorviz-frontend/src/stores/commit-tree-state';
import {
  ContributorDto,
  SocialMetricDto,
  useEvolutionDataFetchServiceStore,
} from 'explorviz-frontend/src/stores/evolution-data-fetch-service';
import {
  sortSelectedCommitsForComparison,
  useEvolutionDataRepositoryStore,
} from 'explorviz-frontend/src/stores/repos/evolution-data-repository';
import {
  BuildingMetricIds,
  useHeatmapStore,
} from 'explorviz-frontend/src/stores/heatmap/heatmap-store';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useRenderingServiceStore } from 'explorviz-frontend/src/stores/rendering-service';
import { create } from 'zustand';

interface SocialMetricsState {
  repositoryName: string | null;
  commit: string | null;
  contributors: ContributorDto[];
  availableTimeRange: { from: number; to: number } | null;
  selectedContributorIds: Set<number>;
  selectedTimeRange: { from: number; to: number } | null;
  normalization: { logScale: boolean; quantile: number };


  initializeForSelection: (
      repositoryName: string,
      commits: SelectedCommit[]
    ) => Promise<void>;
    updateSocialMetrics: () => Promise<void>;
    setSelectedContributorIds: (ids: Set<number>) => void;
    setSelectedTimeRange: (range: { from: number; to: number } | null) => void;
    setNormalization: (normalization: { logScale: boolean; quantile: number }) => void;
    reset: () => void;
    _applyAndRender: (dtos: SocialMetricDto[]) => void;
}

const EMPTY_STATE = {
  repositoryName: null,
  commit: null,
  contributors: [],
  availableTimeRange: null,
  selectedContributorIds: new Set<number>(),
  selectedTimeRange: null,
  normalization: { logScale: true, quantile: 0.99 }, // possibly null this out instead, cleaner and should be handled
};

export const useSocialMetricsStore = create<SocialMetricsState>((set, get) => ({
  ...EMPTY_STATE,

  initializeForSelection: async (repositoryName, commits) => {
    if (commits.length === 0) {
      get().reset();
      return;
    }



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
        fetchService.fetchSocialMetrics(repositoryName, commit)
      ]);

      set({
        repositoryName,
        commit,
        contributors: contributorsResponse.contributors,
        availableTimeRange: contributorsResponse.timeRange,
        selectedContributorIds: new Set(
          contributorsResponse.contributors.map((c) => c.contributorId)
        ),
        selectedTimeRange: null,
      });
      get()._applyAndRender(dtos);

    } catch (e) {
      get().reset();
      console.error(
         `Failed to fetch social metrics for repoName: ${repositoryName}, reason: ${e}`
      );
    }
  },

  updateSocialMetrics: async () => {
    const {
      repositoryName,
      commit,
      contributors,
      selectedContributorIds,
      selectedTimeRange,
      normalization,
    } = get();
    if (!repositoryName || !commit) {
      return;
    }

    const allSelected = selectedContributorIds.size === contributors.length;
    const dtos = await useEvolutionDataFetchServiceStore
      .getState()
      .fetchSocialMetrics(repositoryName, commit, {
        from: selectedTimeRange?.from,
        to: selectedTimeRange?.to,
        contributorIds: allSelected ? undefined : Array.from(selectedContributorIds),
        logScale: normalization.logScale,
        quantile: normalization.quantile,
      });
    get()._applyAndRender(dtos);
  },

  setSelectedContributorIds: (ids) => set({ selectedContributorIds: ids}),
  setSelectedTimeRange: (range) => set({ selectedTimeRange: range}),
  setNormalization: (normalization) => set({ normalization }),
  reset: () => set(EMPTY_STATE),

  _applyAndRender: (dtos) => {
    const { repositoryName } = get();
    if (!repositoryName) {
      return;
    }

    useEvolutionDataRepositoryStore.getState().applySocialMetrics(dtos);

    const mergedFlat = useEvolutionDataRepositoryStore.getState()
      ._repoNameToFlatLandscapeMap.get(repositoryName);

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
