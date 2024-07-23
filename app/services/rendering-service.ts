import { action } from '@ember/object';
import Service, { inject as service } from '@ember/service';
import { areArraysEqual } from 'explorviz-frontend/utils/helpers/array-helpers';
import { Timestamp } from 'explorviz-frontend/utils/landscape-schemes/timestamp';
import {
  combineStructureLandscapeData,
  createEmptyStructureLandscapeData,
  getAllMethodHashesOfLandscapeStructureData,
} from 'explorviz-frontend/utils/landscape-structure-helpers';
import ReloadHandler from './reload-handler';
import { DynamicLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/dynamic/dynamic-data';
import { tracked } from '@glimmer/tracking';
import { LandscapeData } from 'explorviz-frontend/utils/landscape-schemes/landscape-data';
import debugLogger from 'ember-debug-logger';
import { StructureLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import TimestampService from './timestamp';
import ToastHandlerService from './toast-handler';
import TimelineDataObjectHandler from 'explorviz-frontend/utils/timeline/timeline-data-object-handler';
import { animatePlayPauseIcon } from 'explorviz-frontend/utils/animate';
import { combineDynamicLandscapeData } from 'explorviz-frontend/utils/landscape-dynamic-helpers';
import EvolutionDataRepository from './repos/evolution-data-repository';
import { SelectedCommit } from 'explorviz-frontend/utils/commit-tree/commit-tree-handler';
import TimestampRepository from './repos/timestamp-repository';

export default class RenderingService extends Service {
  private readonly debug = debugLogger('RenderingService');

  @service('reload-handler')
  reloadHandler!: ReloadHandler;

  @service('timestamp')
  timestampService!: TimestampService;

  @service('toast-handler')
  toastHandlerService!: ToastHandlerService;

  @service('repos/evolution-data-repository')
  evolutionDataRepository!: EvolutionDataRepository;

  @service('repos/timestamp-repository')
  timestampRepo!: TimestampRepository;

  // #region Properties / Getter / Setter

  private previousMethodHashes: string[] = [];
  private previousLandscapeDynamicData: DynamicLandscapeData | null = null;

  private _timelineDataObjectHandler: TimelineDataObjectHandler | null = null;

  set timelineDataObjectHandler(
    newTimelineDataObjectHandler: TimelineDataObjectHandler | null
  ) {
    this._timelineDataObjectHandler = newTimelineDataObjectHandler;
  }

  get timelineDataObjectHandler() {
    return this._timelineDataObjectHandler;
  }

  @tracked
  private _landscapeData: LandscapeData | null = null;

  set landscapeData(newLandscapeData: LandscapeData | null) {
    this._landscapeData = newLandscapeData;
  }

  get landscapeData() {
    return this._landscapeData;
  }

  @tracked
  private _visualizationPaused = false;

  set visualizationPaused(newValue: boolean) {
    this._visualizationPaused = newValue;
  }

  get visualizationPaused() {
    return this._visualizationPaused;
  }

  private visualizationMode: 'evolution' | 'runtime' = 'runtime';

  // #endregion

  // #region Rendering Triggering

  async triggerRenderingForGivenTimestamps(
    commitToSelectedTimestampMap: Map<string, Timestamp[]>
  ) {
    if (!this.timelineDataObjectHandler) {
      throw new Error('Timestamp Repository needs TimelineDataObjectHandler');
    }

    this.debug('triggerRenderingForGivenTimestamps');

    //console.log('commitToSelectedTimestampMap', commitToSelectedTimestampMap);

    try {
      const commitToSelectedEpochMap: Map<string, number[]> = new Map();

      //const selectedEpochMillis: number[] = [];

      let fetchedCombinedRuntimeLandscapeData: LandscapeData | undefined =
        undefined;

      for (const [
        commitId,
        selectedTimestampsForACommit,
      ] of commitToSelectedTimestampMap.entries()) {
        commitToSelectedEpochMap.set(
          commitId,
          selectedTimestampsForACommit.map((timestamp) => timestamp.epochMilli)
        );

        for (const selectedTimestamp of selectedTimestampsForACommit) {
          const [structureLandscapeData, dynamicLandscapeData] =
            await this.reloadHandler.loadLandscapeByTimestamp(
              selectedTimestamp.epochMilli
            );

          if (fetchedCombinedRuntimeLandscapeData) {
            fetchedCombinedRuntimeLandscapeData = {
              structureLandscapeData: combineStructureLandscapeData(
                fetchedCombinedRuntimeLandscapeData.structureLandscapeData,
                structureLandscapeData
              ),
              dynamicLandscapeData: combineDynamicLandscapeData(
                fetchedCombinedRuntimeLandscapeData.dynamicLandscapeData,
                dynamicLandscapeData
              ),
            };
          } else {
            fetchedCombinedRuntimeLandscapeData = {
              structureLandscapeData,
              dynamicLandscapeData,
            };
          }
        }
      }

      if (fetchedCombinedRuntimeLandscapeData) {
        const newDynamic =
          fetchedCombinedRuntimeLandscapeData.dynamicLandscapeData;

        const newStruct = combineStructureLandscapeData(
          this.evolutionDataRepository.combinedStructureLandscapes ||
            createEmptyStructureLandscapeData,
          fetchedCombinedRuntimeLandscapeData.structureLandscapeData
        );

        let requiresRerendering = false;
        let latestMethodHashes: string[] = [];

        if (!requiresRerendering) {
          latestMethodHashes =
            getAllMethodHashesOfLandscapeStructureData(newStruct);

          if (
            !areArraysEqual(latestMethodHashes, this.previousMethodHashes) ||
            !areArraysEqual(newDynamic, this.previousLandscapeDynamicData)
          ) {
            requiresRerendering = true;
          }
        }

        this.previousMethodHashes = latestMethodHashes;
        this.previousLandscapeDynamicData = newDynamic;

        if (requiresRerendering) {
          this.triggerRenderingForGivenLandscapeData(newStruct, newDynamic);
        }
      }

      // check if we need to retrigger timeline
      if (commitToSelectedTimestampMap.size > 0) {
        for (const [
          commitId,
          selectedTimestamps,
        ] of commitToSelectedTimestampMap.entries()) {
          this.timelineDataObjectHandler.updateSelectedTimestampsForCommit(
            selectedTimestamps,
            commitId
          );
        }
        this.timelineDataObjectHandler.triggerTimelineUpdate();
      }
      this.timestampService.updateSelectedTimestamp(commitToSelectedEpochMap);
    } catch (e) {
      this.debug("Landscape couldn't be requested!", e);
      this.toastHandlerService.showErrorToastMessage(
        "Landscape couldn't be requested!"
      );
      this.resumeVisualizationUpdating();
    }
  }

  @action
  triggerRenderingForGivenLandscapeData(
    structureData: StructureLandscapeData,
    dynamicData: DynamicLandscapeData
  ) {
    this.debug('triggerRenderingForGivenLandscapeData');
    this._landscapeData = {
      structureLandscapeData: structureData,
      dynamicLandscapeData: dynamicData,
    };
  }

  @action
  async triggerRenderingForSelectedCommits(
    appNameToSelectedCommits: Map<string, SelectedCommit[]>
  ) {
    this.timestampRepo.stopTimestampPollingAndVizUpdate();

    if (appNameToSelectedCommits.size > 0) {
      if (this.visualizationMode === 'runtime') {
        this.toastHandlerService.showInfoToastMessage(
          'Switching to evolution mode.'
        );
        this.visualizationMode = 'evolution';
      }

      await this.evolutionDataRepository.fetchAndSetAllStructureLandscapeDataForSelectedCommits(
        appNameToSelectedCommits
      );

      const allCombinedStructureLandscapes =
        this.evolutionDataRepository.combinedStructureLandscapes;

      // always resume when commit got clicked so the landscape updates
      if (this.visualizationPaused) {
        this.resumeVisualizationUpdating();
      }

      if (allCombinedStructureLandscapes.nodes.length > 0) {
        this.triggerRenderingForGivenLandscapeData(
          allCombinedStructureLandscapes,
          []
        );
      }

      this.timestampRepo.resetState();

      const selectedCommits = Array.from(
        appNameToSelectedCommits.values()
      ).flat();

      this.timestampRepo.restartTimestampPollingAndVizUpdate(selectedCommits);
    } else {
      if (this.visualizationMode === 'evolution') {
        this.toastHandlerService.showInfoToastMessage(
          'Switching to cross-commit runtime visualization.'
        );
        this.visualizationMode = 'runtime';
      }

      // no more selected commits, reset all evolution data and go back to visualize cross-commit runtime behavior
      this.resetAllRenderingStates();
      this.evolutionDataRepository.resetStructureLandscapeData();
      this.timestampRepo.resetState();
      this.timestampRepo.restartTimestampPollingAndVizUpdate([]);
    }
  }

  // #endregion

  // #region Pause / Play
  @action
  toggleVisualizationUpdating() {
    if (this.visualizationPaused) {
      this.resumeVisualizationUpdating();
    } else {
      this.pauseVisualizationUpdating();
    }
  }

  resumeVisualizationUpdating() {
    if (this.visualizationPaused) {
      this.visualizationPaused = false;

      if (this.timelineDataObjectHandler) {
        this.timelineDataObjectHandler.updateHighlightedMarkerColorForSelectedCommits(
          'blue'
        );
        animatePlayPauseIcon(false);
        this.timelineDataObjectHandler.triggerTimelineUpdate();
      }
    }
  }

  @action
  pauseVisualizationUpdating(triggerTimelineUpdate: boolean = true) {
    if (!this.visualizationPaused) {
      this.visualizationPaused = true;

      if (this.timelineDataObjectHandler) {
        this.timelineDataObjectHandler.updateHighlightedMarkerColorForSelectedCommits(
          'red'
        );
        animatePlayPauseIcon(true);
        if (triggerTimelineUpdate) {
          this.timelineDataObjectHandler.triggerTimelineUpdate();
        }
      }
    }
  }
  // #endregion

  resetAllRenderingStates() {
    this.debug('Reset Rendering States');
    this._landscapeData = null;
    this.previousLandscapeDynamicData = null;
    this.previousMethodHashes = [];
  }
}

declare module '@ember/service' {
  interface Registry {
    'rendering-service': RenderingService;
  }
}
