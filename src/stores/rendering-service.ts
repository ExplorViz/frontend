import {
  SelectedCommit,
  useCommitTreeStateStore,
} from 'explorviz-frontend/src/stores/commit-tree-state';
import { useReloadHandlerStore } from 'explorviz-frontend/src/stores/reload-handler';
import { useEvolutionDataRepositoryStore } from 'explorviz-frontend/src/stores/repos/evolution-data-repository';
import { useTimestampRepositoryStore } from 'explorviz-frontend/src/stores/repos/timestamp-repository';
import { useTimestampStore } from 'explorviz-frontend/src/stores/timestamp';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import { animatePlayPauseIcon } from 'explorviz-frontend/src/utils/animate';
import { areArraysEqual } from 'explorviz-frontend/src/utils/helpers/array-helpers';
import { combineDynamicLandscapeData } from 'explorviz-frontend/src/utils/landscape-dynamic-helpers';
import { AggregatedBuildingCommunication } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/aggregated-file-communication';
import { DynamicLandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/dynamic-data';
import {
  convertStructureLandscapeFromFlat,
  FlatLandscape,
  getAllIdsOfFlatLandscape,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { LandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/landscape-data';
import { StructureLandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { Timestamp } from 'explorviz-frontend/src/utils/landscape-schemes/timestamp';
import { createEmptyStructureLandscapeData } from 'explorviz-frontend/src/utils/landscape-structure-helpers';
import TimelineDataObjectHandler from 'explorviz-frontend/src/utils/timeline/timeline-data-object-handler';
import { create } from 'zustand';

export type AnalysisMode = 'evolution' | 'runtime';

export type EvolutionModeRenderingConfiguration = {
  renderDynamic: boolean;
  renderStatic: boolean;
  renderOnlyDifferences: boolean;
};

interface RenderingServiceState {
  previousFlatLandscapeIds: string[];
  currentRuntimeLandscapeData: Map<string, LandscapeData>;
  _timelineDataObjectHandler: TimelineDataObjectHandler | null;
  _landscapeData: LandscapeData | null;
  _visualizationPaused: boolean;
  _analysisMode: AnalysisMode;
  _userInitiatedStaticDynamicCombination: boolean;
  timelineUpdateVersion: number;
  triggerRenderingForGivenTimestamps: (
    commitToSelectedTimestampMap: Map<string, Timestamp[]>
  ) => Promise<void>;
  triggerRenderingForGivenLandscapeData: (
    flatData: FlatLandscape,
    dynamicData: DynamicLandscapeData,
    aggregatedFileCommunication: AggregatedBuildingCommunication,
    structureData?: StructureLandscapeData // TODO: Should be remove, when LandscapeData doesn't contain StructureLandscapeData anymore
  ) => void;
  triggerRenderingForSelectedCommits: () => Promise<void>;
  _mapTimestampsToEpochs: (
    commitToSelectedTimestampMap: Map<string, Timestamp[]>
  ) => Map<string, number[]>;
  _fetchRuntimeLandscapeData: (
    commitToSelectedTimestampMap: Map<string, Timestamp[]>
  ) => Promise<Map<string, LandscapeData>>;
  _combineLandscapeData: (
    prevLandscapeData: LandscapeData | undefined,
    newLandscapeData: LandscapeData
  ) => LandscapeData;
  _getCombineDynamicLandscapeData: (
    commitToLandscapeDataMap: Map<string, LandscapeData>
  ) => DynamicLandscapeData;
  _requiresRerendering: (
    newFlatLandscape: FlatLandscape,
    newDynamicLandscapeData: DynamicLandscapeData,
    newAggregatedCommunication: AggregatedBuildingCommunication
  ) => boolean;
  _updateTimelineData: (
    commitToSelectedTimestampMap: Map<string, Timestamp[]>
  ) => void;
  _setEvolutionModeActiveAndHandleRendering: (
    repositoryName: string,
    repoNameToSelectedCommits: Map<string, SelectedCommit[]>
  ) => Promise<void>;
  _setRuntimeModeActive: () => void;
  _handleError: (e: any) => void;
  toggleVisualizationUpdating: () => void;
  resumeVisualizationUpdating: () => void;
  pauseVisualizationUpdating: (forceTimelineUpdate?: boolean) => void;
  resetAllRenderingStates: () => void;
  setLandscapeData: (data: LandscapeData | null) => void;
  setVisualizationPaused: (data: boolean) => void;
}

export const useRenderingServiceStore = create<RenderingServiceState>(
  (set, get) => ({
    previousFlatLandscapeIds: [],
    currentRuntimeLandscapeData: new Map<string, LandscapeData>(),
    _timelineDataObjectHandler: null,
    _landscapeData: null, // tracked
    _visualizationPaused: false, // tracked
    _analysisMode: 'runtime', // tracked
    _userInitiatedStaticDynamicCombination: false, // private
    timelineUpdateVersion: 0,

    setLandscapeData: (data: LandscapeData | null) => {
      set({ _landscapeData: data });
    },

    setVisualizationPaused: (data: boolean) => {
      set({ _visualizationPaused: data });
    },

    triggerRenderingForGivenTimestamps: async (
      commitToSelectedTimestampMap: Map<string, Timestamp[]>
    ) => {
      if (!get()._timelineDataObjectHandler) {
        throw new Error('Timestamp Repository needs TimelineDataObjectHandler');
      }

      if (
        get()._analysisMode === 'evolution' &&
        !get()._userInitiatedStaticDynamicCombination
      ) {
        return;
      }

      try {
        const fetchedRuntimeLandscapeData =
          await get()._fetchRuntimeLandscapeData(commitToSelectedTimestampMap);

        let combinedRuntimeLandscapeData: LandscapeData = {
          structureLandscapeData: createEmptyStructureLandscapeData(),
          dynamicLandscapeData: [],
          flatLandscapeData: {} as FlatLandscape,
        };

        if (fetchedRuntimeLandscapeData.size > 0) {
          fetchedRuntimeLandscapeData.forEach((landscapeData) => {
            combinedRuntimeLandscapeData = get()._combineLandscapeData(
              combinedRuntimeLandscapeData,
              landscapeData
            );
          });

          const dynamicToRender =
            combinedRuntimeLandscapeData.dynamicLandscapeData;

          const flatToRender = combinedRuntimeLandscapeData.flatLandscapeData;

          const aggregatedToRender =
            combinedRuntimeLandscapeData.aggregatedFileCommunication;

          if (
            get()._requiresRerendering(
              flatToRender,
              dynamicToRender,
              aggregatedToRender
            )
          ) {
            get().triggerRenderingForGivenLandscapeData(
              flatToRender,
              dynamicToRender,
              aggregatedToRender
            );
          }
        }

        get()._updateTimelineData(commitToSelectedTimestampMap);

        useTimestampStore
          .getState()
          .updateSelectedTimestamp(
            get()._mapTimestampsToEpochs(commitToSelectedTimestampMap)
          );

        set({
          currentRuntimeLandscapeData: fetchedRuntimeLandscapeData ?? new Map(),
        });
      } catch (e) {
        get()._handleError(e);
      }
    },

    triggerRenderingForGivenLandscapeData: (
      flatData: FlatLandscape,
      dynamicData: DynamicLandscapeData,
      aggregatedFileCommunication: AggregatedBuildingCommunication,
      structureData?: StructureLandscapeData
    ) => {
      set({
        _landscapeData: {
          structureLandscapeData: structureData
            ? structureData
            : convertStructureLandscapeFromFlat(flatData), // TODO: Can be removed, when LandscapeData doesn't contain StructureLandscapeData anymore
          dynamicLandscapeData: dynamicData,
          aggregatedFileCommunication: aggregatedFileCommunication,
          flatLandscapeData: flatData,
        },
      });
    },

    triggerRenderingForSelectedCommits: async (): Promise<void> => {
      try {
        const repoNameToSelectedCommits: Map<string, SelectedCommit[]> =
          useCommitTreeStateStore.getState().getSelectedCommits();
        const currentSelectedRepo = useCommitTreeStateStore
          .getState()
          .getCurrentSelectedRepositoryName();

        // Always pause when the selected commits change
        get().pauseVisualizationUpdating(false);
        useTimestampRepositoryStore.getState().stopTimestampPolling();

        if (repoNameToSelectedCommits.size > 0) {
          await get()._setEvolutionModeActiveAndHandleRendering(
            currentSelectedRepo,
            repoNameToSelectedCommits
          );
        } else {
          get()._setRuntimeModeActive();
        }
      } catch (error) {
        get()._handleError(error);
      }
    },

    // private
    _mapTimestampsToEpochs: (
      commitToSelectedTimestampMap: Map<string, Timestamp[]>
    ): Map<string, number[]> => {
      const commitToSelectedEpochMap: Map<string, number[]> = new Map();
      for (const [
        commitId,
        selectedTimestampsForACommit,
      ] of commitToSelectedTimestampMap.entries()) {
        commitToSelectedEpochMap.set(
          commitId,
          selectedTimestampsForACommit.map((timestamp) => timestamp.epochNano)
        );
      }
      return commitToSelectedEpochMap;
    },

    // private
    _fetchRuntimeLandscapeData: async (
      commitToSelectedTimestampMap: Map<string, Timestamp[]>
    ): Promise<Map<string, LandscapeData>> => {
      const commitToRuntimeLandscapeDataMap = new Map<string, LandscapeData>();

      for (const [commitId, timestamps] of commitToSelectedTimestampMap) {
        let timestampsToFetch = timestamps;
        if (timestampsToFetch.length === 0) {
          const timelineData =
            get()._timelineDataObjectHandler?.timelineDataObject.get(commitId);
          if (timelineData && timelineData.timestamps.length > 0) {
            timestampsToFetch = [
              timelineData.timestamps[timelineData.timestamps.length - 1],
            ];
          } else {
            continue;
          }
        }

        const sortedTimestamps = [...timestampsToFetch].sort(
          (a, b) => a.epochNano - b.epochNano
        );

        const timestampFrom = sortedTimestamps[0].epochNano;
        let timestampTo = undefined;
        if (sortedTimestamps.length > 1) {
          timestampTo = sortedTimestamps[sortedTimestamps.length - 1].epochNano;
        }

        const [
          latestFetchedFlatLandscapeData,
          latestFetchedDynamicLandscapeData,
          latestFetchedAggregatedCommunication,
        ] = await useReloadHandlerStore
          .getState()
          .loadLandscapeByTimestamp(timestampFrom, timestampTo);

        commitToRuntimeLandscapeDataMap.set(commitId, {
          structureLandscapeData: convertStructureLandscapeFromFlat(
            latestFetchedFlatLandscapeData
          ), // TODO: Remove after removing StructureLD from LandscapeData
          dynamicLandscapeData: latestFetchedDynamicLandscapeData,
          aggregatedFileCommunication: latestFetchedAggregatedCommunication,
          flatLandscapeData: latestFetchedFlatLandscapeData,
        });
      }
      return commitToRuntimeLandscapeDataMap;
    },

    // private
    _combineLandscapeData: (
      prevLandscapeData: LandscapeData | undefined,
      newLandscapeData: LandscapeData
    ): LandscapeData => {
      if (prevLandscapeData) {
        const newFlatLandscapeData =
          newLandscapeData.flatLandscapeData ??
          prevLandscapeData.flatLandscapeData;
        return {
          structureLandscapeData:
            convertStructureLandscapeFromFlat(newFlatLandscapeData),
          dynamicLandscapeData: combineDynamicLandscapeData(
            prevLandscapeData.dynamicLandscapeData,
            newLandscapeData.dynamicLandscapeData
          ),
          aggregatedFileCommunication:
            newLandscapeData.aggregatedFileCommunication, // For now, just take the new one or merge them if needed
          flatLandscapeData: newFlatLandscapeData,
        };
      } else {
        return newLandscapeData;
      }
    },

    // private
    _getCombineDynamicLandscapeData: (
      commitToLandscapeDataMap: Map<string, LandscapeData>
    ): DynamicLandscapeData => {
      const combinedDynamicLandscapeData: DynamicLandscapeData = [];

      commitToLandscapeDataMap.forEach((landscapeData) => {
        combinedDynamicLandscapeData.push(
          ...landscapeData.dynamicLandscapeData
        );
      });
      return combinedDynamicLandscapeData;
    },

    // private
    _requiresRerendering: (
      newFlatLandscapeData: FlatLandscape,
      newDynamicLandscapeData: DynamicLandscapeData,
      newAggregatedCommunication: AggregatedBuildingCommunication
    ) => {
      let requiresRerendering = false;
      const latestFlatLandscapeIds =
        getAllIdsOfFlatLandscape(newFlatLandscapeData);

      if (
        get()._landscapeData === null ||
        !areArraysEqual(
          latestFlatLandscapeIds,
          get().previousFlatLandscapeIds
        ) ||
        !areArraysEqual(
          newDynamicLandscapeData,
          get()._getCombineDynamicLandscapeData(
            get().currentRuntimeLandscapeData
          )
        ) ||
        (newAggregatedCommunication &&
          !areArraysEqual(
            newAggregatedCommunication.communications,
            get()._landscapeData?.aggregatedFileCommunication?.communications ??
              []
          ))
      ) {
        requiresRerendering = true;
      }
      set({ previousFlatLandscapeIds: latestFlatLandscapeIds });
      return requiresRerendering;
    },

    // private
    _updateTimelineData: (
      commitToSelectedTimestampMap: Map<string, Timestamp[]>
    ) => {
      if (commitToSelectedTimestampMap.size > 0) {
        for (const [
          commitId,
          selectedTimestamps,
        ] of commitToSelectedTimestampMap.entries()) {
          get()._timelineDataObjectHandler?.updateSelectedTimestampsForCommit(
            selectedTimestamps,
            commitId
          );
        }
        set((state) => {
          const next = state.timelineUpdateVersion + 1;

          return { timelineUpdateVersion: next };
        });
      }
    },

    _setEvolutionModeActiveAndHandleRendering: async (
      repositoryName: string,
      repoNameToSelectedCommits: Map<string, SelectedCommit[]>
    ) => {
      if (get()._analysisMode === 'runtime') {
        useToastHandlerStore
          .getState()
          .showInfoToastMessage('Switching to evolution mode.');
        set({ _analysisMode: 'evolution' });

        // Reset all timestamp data upon first change to evolution mode
        useTimestampRepositoryStore.getState().resetState();
      }

      await useEvolutionDataRepositoryStore
        .getState()
        .fetchAndStoreEvolutionDataForSelectedCommits(
          repositoryName,
          repoNameToSelectedCommits.get(repositoryName) ?? []
        );

      const selectedFlatLandscape = useEvolutionDataRepositoryStore
        .getState()
        .getRepoNameToFlatLandscapeMap()
        .get(repositoryName);

      const flattenedSelectedCommits: SelectedCommit[] = Array.from(
        repoNameToSelectedCommits.values()
      ).flat();

      if (selectedFlatLandscape !== undefined) {
        let combinedDynamicLandscapeData: DynamicLandscapeData = [];

        for (const commit of flattenedSelectedCommits) {
          const potentialRuntimeData = get().currentRuntimeLandscapeData.get(
            commit.commitId
          );

          if (potentialRuntimeData) {
            combinedDynamicLandscapeData = combineDynamicLandscapeData(
              combinedDynamicLandscapeData,
              potentialRuntimeData.dynamicLandscapeData
            );
          }
        }

        // Remove timestamp and landscape data with commits that are not selected anymore
        let notSelectedCommitIds: string[] = Array.from(
          get().currentRuntimeLandscapeData.keys()
        ).flat();

        notSelectedCommitIds = notSelectedCommitIds.filter(
          (commitId1) =>
            !flattenedSelectedCommits.some(
              ({ commitId: id2 }) => id2 === commitId1
            )
        );

        for (const commitIdToBeRemoved of notSelectedCommitIds) {
          const newCRLD = get().currentRuntimeLandscapeData;
          const newTDOH = get()._timelineDataObjectHandler;
          newCRLD.delete(commitIdToBeRemoved);
          useTimestampRepositoryStore
            .getState()
            .commitToTimestampMap.delete(commitIdToBeRemoved);
          newTDOH?.timelineDataObject.delete(commitIdToBeRemoved);
          set({
            currentRuntimeLandscapeData: newCRLD,
            _timelineDataObjectHandler: newTDOH,
          });
        }

        get().triggerRenderingForGivenLandscapeData(
          selectedFlatLandscape,
          combinedDynamicLandscapeData,
          { metrics: {}, communications: [] } // Default for evolution mode for now
        );
      }

      useTimestampRepositoryStore
        .getState()
        .restartTimestampPollingAndVizUpdate(flattenedSelectedCommits);
    },

    // private
    _setRuntimeModeActive: () => {
      if (get()._analysisMode === 'evolution') {
        useToastHandlerStore
          .getState()
          .showInfoToastMessage(
            'Switching to cross-commit runtime visualization.'
          );
        set({ _analysisMode: 'runtime' });

        set({ _userInitiatedStaticDynamicCombination: false });
      }

      get().resetAllRenderingStates();
      useTimestampRepositoryStore.getState().resetState();
      useTimestampRepositoryStore
        .getState()
        .restartTimestampPollingAndVizUpdate([]);
    },

    // private
    _handleError: (e: any) => {
      useToastHandlerStore
        .getState()
        .showErrorToastMessage('An error occured for the rendering!');
      console.error(e);

      get().resumeVisualizationUpdating();
    },

    toggleVisualizationUpdating: () => {
      if (get()._visualizationPaused) {
        get().resumeVisualizationUpdating();
      } else {
        get().pauseVisualizationUpdating(false);
      }
    },

    resumeVisualizationUpdating: () => {
      if (get()._visualizationPaused) {
        set({ _visualizationPaused: false });

        get()._timelineDataObjectHandler?.updateHighlightedMarkerColorForSelectedCommits(
          false
        );
        animatePlayPauseIcon(false);
      }
    },

    pauseVisualizationUpdating: () => {
      if (!get()._visualizationPaused) {
        set({ _visualizationPaused: true });

        get()._timelineDataObjectHandler?.updateHighlightedMarkerColorForSelectedCommits(
          true
        );
        animatePlayPauseIcon(true);
      }
    },

    resetAllRenderingStates: () => {
      set({
        _userInitiatedStaticDynamicCombination: false,
        _landscapeData: null,
        currentRuntimeLandscapeData: new Map(),
      });
    },
  })
);
