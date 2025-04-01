import { create } from 'zustand';
import { Timestamp } from 'explorviz-frontend/src/utils/landscape-schemes/timestamp';
import {
  combineStructureLandscapeData,
  createEmptyStructureLandscapeData,
  getAllMethodHashesOfLandscapeStructureData,
} from 'explorviz-frontend/src/utils/landscape-structure-helpers';
import { areArraysEqual } from 'explorviz-frontend/src/utils/helpers/array-helpers';
import { useReloadHandlerStore } from './reload-handler';
import { DynamicLandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/dynamic-data';
import { LandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/landscape-data';
import { StructureLandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { useTimestampStore } from './timestamp';
import TimelineDataObjectHandler from 'explorviz-frontend/src/utils/timeline/timeline-data-object-handler';
import { animatePlayPauseIcon } from 'explorviz-frontend/src/utils/animate';
import { combineDynamicLandscapeData } from 'explorviz-frontend/src/utils/landscape-dynamic-helpers';
import { useEvolutionDataRepositoryStore } from 'explorviz-frontend/src/stores/repos/evolution-data-repository';
import {
  SelectedCommit,
  useCommitTreeStateStore,
} from 'explorviz-frontend/src/stores/commit-tree-state';
import { useTimestampRepositoryStore } from 'explorviz-frontend/src/stores/repos/timestamp-repository';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';

export type AnalysisMode = 'evolution' | 'runtime';

export type EvolutionModeRenderingConfiguration = {
  renderDynamic: boolean;
  renderStatic: boolean;
  renderOnlyDifferences: boolean;
};

interface RenderingServiceState {
  previousMethodHashes: string[];
  currentRuntimeLandscapeData: Map<string, LandscapeData>;
  _timelineDataObjectHandler: TimelineDataObjectHandler | null;
  _landscapeData: LandscapeData | null;
  _visualizationPaused: boolean;
  _analysisMode: AnalysisMode;
  _userInitiatedStaticDynamicCombination: boolean;
  triggerRenderingForGivenTimestamps: (
    commitToSelectedTimestampMap: Map<string, Timestamp[]>
  ) => Promise<void>;
  triggerRenderingForGivenLandscapeData: (
    structureData: StructureLandscapeData,
    dynamicData: DynamicLandscapeData
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
    newStructureLandscapeData: StructureLandscapeData,
    newDynamicLandscapeData: DynamicLandscapeData
  ) => boolean;
  _updateTimelineData: (
    commitToSelectedTimestampMap: Map<string, Timestamp[]>
  ) => void;
  _setEvolutionModeActiveAndHandleRendering: (
    appNameToSelectedCommits: Map<string, SelectedCommit[]>
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
    previousMethodHashes: [],
    currentRuntimeLandscapeData: new Map<string, LandscapeData>(),
    _timelineDataObjectHandler: null,
    _landscapeData: null, // tracked
    _visualizationPaused: false, // tracked
    _analysisMode: 'runtime', // tracked
    _userInitiatedStaticDynamicCombination: false, // private

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
        };

        if (fetchedRuntimeLandscapeData.size > 0) {
          fetchedRuntimeLandscapeData.forEach((landscapeData) => {
            combinedRuntimeLandscapeData = get()._combineLandscapeData(
              combinedRuntimeLandscapeData,
              landscapeData
            );
          });

          const structureToRender = combineStructureLandscapeData(
            useEvolutionDataRepositoryStore.getState()
              ._combinedStructureLandscapeData ||
              createEmptyStructureLandscapeData,
            combinedRuntimeLandscapeData.structureLandscapeData
          );

          const dynamicToRender =
            combinedRuntimeLandscapeData.dynamicLandscapeData;

          if (get()._requiresRerendering(structureToRender, dynamicToRender)) {
            get().triggerRenderingForGivenLandscapeData(
              structureToRender,
              dynamicToRender
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
      structureData: StructureLandscapeData,
      dynamicData: DynamicLandscapeData
    ) => {
      set({
        _landscapeData: {
          structureLandscapeData: structureData,
          dynamicLandscapeData: dynamicData,
        },
      });
    },

    triggerRenderingForSelectedCommits: async (): Promise<void> => {
      try {
        const appNameToSelectedCommits: Map<string, SelectedCommit[]> =
          useCommitTreeStateStore.getState().getSelectedCommits();

        // Always pause when the selected commits change
        get().pauseVisualizationUpdating(false);
        useTimestampRepositoryStore.getState().stopTimestampPolling();

        if (appNameToSelectedCommits.size > 0) {
          await get()._setEvolutionModeActiveAndHandleRendering(
            appNameToSelectedCommits
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
          selectedTimestampsForACommit.map((timestamp) => timestamp.epochMilli)
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
        for (const selectedTimestamp of timestamps) {
          const [
            latestFetchedStructureLandscapeData,
            latestFetchedDynamicLandscapeData,
          ] = await useReloadHandlerStore
            .getState()
            .loadLandscapeByTimestamp(selectedTimestamp.epochMilli);

          commitToRuntimeLandscapeDataMap.set(commitId, {
            structureLandscapeData: latestFetchedStructureLandscapeData,
            dynamicLandscapeData: latestFetchedDynamicLandscapeData,
          });
        }
      }
      return commitToRuntimeLandscapeDataMap;
    },

    // private
    _combineLandscapeData: (
      prevLandscapeData: LandscapeData | undefined,
      newLandscapeData: LandscapeData
    ): LandscapeData => {
      if (prevLandscapeData) {
        return {
          structureLandscapeData: combineStructureLandscapeData(
            prevLandscapeData.structureLandscapeData,
            newLandscapeData.structureLandscapeData
          ),
          dynamicLandscapeData: combineDynamicLandscapeData(
            prevLandscapeData.dynamicLandscapeData,
            newLandscapeData.dynamicLandscapeData
          ),
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
      newStructureLandscapeData: StructureLandscapeData,
      newDynamicLandscapeData: DynamicLandscapeData
    ) => {
      let requiresRerendering = false;
      const latestMethodHashes = getAllMethodHashesOfLandscapeStructureData(
        newStructureLandscapeData
      );

      if (
        !areArraysEqual(latestMethodHashes, get().previousMethodHashes) ||
        !areArraysEqual(
          newDynamicLandscapeData,
          get()._getCombineDynamicLandscapeData(
            get().currentRuntimeLandscapeData
          )
        )
      ) {
        requiresRerendering = true;
      }
      set({ previousMethodHashes: latestMethodHashes });
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
        get()._timelineDataObjectHandler?.triggerTimelineUpdate();
      }
    },

    // private
    _setEvolutionModeActiveAndHandleRendering: async (
      appNameToSelectedCommits: Map<string, SelectedCommit[]>
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
        .fetchAndStoreEvolutionDataForSelectedCommits(appNameToSelectedCommits);

      const combinedEvolutionStructureLandscapeData =
        useEvolutionDataRepositoryStore.getState()
          ._combinedStructureLandscapeData;

      const flattenedSelectedCommits: SelectedCommit[] = Array.from(
        appNameToSelectedCommits.values()
      ).flat();

      if (combinedEvolutionStructureLandscapeData.nodes.length > 0) {
        let combinedStructureLandscapeData: StructureLandscapeData =
          combinedEvolutionStructureLandscapeData;

        let combinedDynamicLandscapeData: DynamicLandscapeData = [];

        for (const commit of flattenedSelectedCommits) {
          const potentialRuntimeData = get().currentRuntimeLandscapeData.get(
            commit.commitId
          );

          if (potentialRuntimeData) {
            combinedStructureLandscapeData = combineStructureLandscapeData(
              combinedStructureLandscapeData,
              potentialRuntimeData.structureLandscapeData
            );

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
          combinedStructureLandscapeData,
          combinedDynamicLandscapeData
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
      useEvolutionDataRepositoryStore.getState().resetStructureLandscapeData();
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
        get()._timelineDataObjectHandler?.triggerTimelineUpdate();
      }
    },

    pauseVisualizationUpdating: (forceTimelineUpdate: boolean = false) => {
      if (forceTimelineUpdate || !get()._visualizationPaused) {
        set({ _visualizationPaused: true });

        get()._timelineDataObjectHandler?.updateHighlightedMarkerColorForSelectedCommits(
          true
        );
        animatePlayPauseIcon(true);

        get()._timelineDataObjectHandler?.triggerTimelineUpdate();
      }
    },

    resetAllRenderingStates: () => {
      set({
        _userInitiatedStaticDynamicCombination: false,
        _landscapeData: null,
        currentRuntimeLandscapeData: new Map(),
        previousMethodHashes: [],
      });
    },
  })
);
