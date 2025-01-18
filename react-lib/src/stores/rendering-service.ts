import { createStore } from "zustand/vanilla";
export type VisualizationMode = "runtime" | "evolution";
import { LandscapeData } from "react-lib/src/utils/landscape-schemes/landscape-data";
import { Timestamp } from "react-lib/src/utils/landscape-schemes/timestamp";
import { DynamicLandscapeData } from "react-lib/src/utils/landscape-schemes/dynamic/dynamic-data";
import { StructureLandscapeData } from "react-lib/src/utils/landscape-schemes/structure-data";
import { animatePlayPauseIcon } from "react-lib/src/utils/animate";
import { combineStructureLandscapeData, getAllMethodHashesOfLandscapeStructureData } from "../utils/landscape-structure-helpers";
import { combineDynamicLandscapeData } from "../utils/landscape-dynamic-helpers";
import { areArraysEqual } from 'react-lib/src/utils/helpers/array-helpers';

interface RenderingServiceState {
  previousMethodHashes: string[];
  currentRuntimeLandscapeData: Map<string, LandscapeData>;
  // _timelineDataObjectHandler: TimelineDataObjectHandler | null;
  _landscapeData: LandscapeData | null;
  _visualizationPaused: boolean;
  _visualizationMode: VisualizationMode;
  _userInitiatedStaticDynamicCombination: boolean;
  mapTimestampsToEpochs: (
    commitToSelectedTimestampMap: Map<string, Timestamp[]>
  ) => Map<string, number[]>;
  combineLandscapeData: (
    prevLandscapeData: LandscapeData | undefined,
    newLandscapeData: LandscapeData
  ) => LandscapeData;
  getCombineDynamicLandscapeData: (
    commitToLandscapeDataMap: Map<string, LandscapeData>
  ) => DynamicLandscapeData;
  requiresRerendering: (
    newStructureLandscapeData: StructureLandscapeData,
    newDynamicLandscapeData: DynamicLandscapeData
  ) => boolean;
  //   updateTimelineData: (
  //     commitToSelectedTimestampMap: Map<string, Timestamp[]>
  //   ) => void;
  //   setRuntimeModeActive: () => void;
  //   handleError:(e: any) => void;
  //   resumeVisualizationUpdating:()=> void;
  //   resetAllRenderingStates:() => void;
}

export const useRenderingServiceStore = createStore<RenderingServiceState>(
  (set, get) => ({
    previousMethodHashes: [],
    currentRuntimeLandscapeData: new Map<string, LandscapeData>(),
    _timelineDataObjectHandler: null,
    _landscapeData: null,
    _visualizationPaused: false,
    _visualizationMode: "runtime",
    _userInitiatedStaticDynamicCombination: false,
    mapTimestampsToEpochs: (
      commitToSelectedTimestampMap: Map<string, Timestamp[]>
    ) => {
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
    combineLandscapeData: (
      prevLandscapeData: LandscapeData | undefined,
      newLandscapeData: LandscapeData
    ) => {
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
    getCombineDynamicLandscapeData: (
      commitToLandscapeDataMap: Map<string, LandscapeData>
    ) => {
      const combinedDynamicLandscapeData: DynamicLandscapeData = [];

      commitToLandscapeDataMap.forEach((landscapeData) => {
        combinedDynamicLandscapeData.pushObjects(
          landscapeData.dynamicLandscapeData
        );
      });
      return combinedDynamicLandscapeData;
    },
    requiresRerendering: (
      newStructureLandscapeData: StructureLandscapeData,
      newDynamicLandscapeData: DynamicLandscapeData
    ) => {
      const state = get();
      let requiresRerendering = false;
      const latestMethodHashes = getAllMethodHashesOfLandscapeStructureData(
        newStructureLandscapeData
      );

      if (
        !areArraysEqual(latestMethodHashes, state.previousMethodHashes) ||
        !areArraysEqual(
          newDynamicLandscapeData,
          state.getCombineDynamicLandscapeData(
            state.currentRuntimeLandscapeData
          )
        )
      ) {
        requiresRerendering = true;
      }
      state.previousMethodHashes = latestMethodHashes;
      return requiresRerendering;
    },
    // updateTimelineData: (
    //   commitToSelectedTimestampMap: Map<string, Timestamp[]>
    // ) => {
    //   const state = get();
    //   if (commitToSelectedTimestampMap.size > 0) {
    //     for (const [
    //       commitId,
    //       selectedTimestamps,
    //     ] of commitToSelectedTimestampMap.entries()) {
    //       state.timelineDataObjectHandler?.updateSelectedTimestampsForCommit(
    //         selectedTimestamps,
    //         commitId
    //       );
    //     }
    //     state.timelineDataObjectHandler?.triggerTimelineUpdate();
    //   }
    // },
    // setRuntimeModeActive: () => {
    //   const state = get();
    //   if (state._visualizationMode === "evolution") {
    //     state.toastHandlerService.showInfoToastMessage(
    //       "Switching to cross-commit runtime visualization."
    //     );
    //     state._visualizationMode = "runtime";

    //     state._userInitiatedStaticDynamicCombination = false;
    //   }

    //   state.resetAllRenderingStates();
    //   state.evolutionDataRepository.resetStructureLandscapeData();
    //   state.timestampRepo.resetState();
    //   state.timestampRepo.restartTimestampPollingAndVizUpdate([]);
    // },
    // handleError:(e: any) => {
    // const state = get();
    //   state.debug("An error occured!", { error: e });
    //   state.toastHandlerService.showErrorToastMessage(
    //     "An error occured for the rendering!"
    //   );
    //   state.resumeVisualizationUpdating();
    // },
    // resumeVisualizationUpdating:()=> {
    //   const state = get();
    //   if (state._visualizationPaused) {
    //     state._visualizationPaused = false;

    //     state.timelineDataObjectHandler?.updateHighlightedMarkerColorForSelectedCommits(
    //       false
    //     );
    //     animatePlayPauseIcon(false);
    //     state.timelineDataObjectHandler?.triggerTimelineUpdate();
    //   }
    // },
    // resetAllRenderingStates:() => {
    //   const state = get();
    //   state.debug("Reset Rendering States");
    //   state._userInitiatedStaticDynamicCombination = false;
    //   state._landscapeData = null;
    //   state.currentRuntimeLandscapeData = new Map();
    //   state.previousMethodHashes = [];
    // },
  })
);
