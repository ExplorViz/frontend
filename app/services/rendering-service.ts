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

  // #region Services

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

  // #endregion

  // #region Properties

  private previousMethodHashes: string[] = [];
  private previousLandscapeDynamicData: DynamicLandscapeData | null = null;

  private _timelineDataObjectHandler: TimelineDataObjectHandler | null = null;

  @tracked
  private _landscapeData: LandscapeData | null = null;

  @tracked
  private _visualizationPaused = false;

  private visualizationMode: 'evolution' | 'runtime' = 'runtime';

  // #endregion

  // #region  Getter / Setter

  set timelineDataObjectHandler(
    newTimelineDataObjectHandler: TimelineDataObjectHandler | null
  ) {
    this._timelineDataObjectHandler = newTimelineDataObjectHandler;
  }

  get timelineDataObjectHandler() {
    return this._timelineDataObjectHandler;
  }

  set landscapeData(newLandscapeData: LandscapeData | null) {
    this._landscapeData = newLandscapeData;
  }

  get landscapeData() {
    return this._landscapeData;
  }

  set visualizationPaused(newValue: boolean) {
    this._visualizationPaused = newValue;
  }

  get visualizationPaused() {
    return this._visualizationPaused;
  }

  // #endregion

  // #region Rendering Triggering

  async triggerRenderingForGivenTimestamps(
    commitToSelectedTimestampMap: Map<string, Timestamp[]>
  ) {
    if (!this.timelineDataObjectHandler) {
      throw new Error('Timestamp Repository needs TimelineDataObjectHandler');
    }

    this.debug('triggerRenderingForGivenTimestamps');

    try {
      const fetchedCombinedRuntimeLandscapeData =
        await this.fetchCombinedRuntimeLandscapeData(
          commitToSelectedTimestampMap
        );

      if (fetchedCombinedRuntimeLandscapeData) {
        const { newDynamic, newStruct, requiresRerendering } =
          this.processFetchedLandscapeData(fetchedCombinedRuntimeLandscapeData);

        if (requiresRerendering) {
          this.triggerRenderingForGivenLandscapeData(newStruct, newDynamic);
        }
      }

      this.updateTimelineData(commitToSelectedTimestampMap);

      this.timestampService.updateSelectedTimestamp(
        this.mapTimestampsToEpochs(commitToSelectedTimestampMap)
      );
    } catch (e) {
      this.handleError(e);
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
  ): Promise<void> {
    try {
      this.timestampRepo.stopTimestampPollingAndVizUpdate();

      if (appNameToSelectedCommits.size > 0) {
        await this.setEvolutionModeActiveAndHandleRendering(
          appNameToSelectedCommits
        );
      } else {
        this.setRuntimeModeActive();
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  // #endregion

  // #region Helper functions

  private mapTimestampsToEpochs(
    commitToSelectedTimestampMap: Map<string, Timestamp[]>
  ): Map<string, number[]> {
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
  }

  private async fetchCombinedRuntimeLandscapeData(
    commitToSelectedTimestampMap: Map<string, Timestamp[]>
  ): Promise<LandscapeData | undefined> {
    let currentFetchedCombinedRuntimeLandscapeData: LandscapeData | undefined =
      undefined;
    for (const selectedTimestampsForACommit of commitToSelectedTimestampMap.values()) {
      for (const selectedTimestamp of selectedTimestampsForACommit) {
        const [
          latestFetchedStructureLandscapeData,
          latestFetchedDynamicLandscapeData,
        ] = await this.reloadHandler.loadLandscapeByTimestamp(
          selectedTimestamp.epochMilli
        );
        currentFetchedCombinedRuntimeLandscapeData = this.combineLandscapeData(
          currentFetchedCombinedRuntimeLandscapeData,
          latestFetchedStructureLandscapeData,
          latestFetchedDynamicLandscapeData
        );
      }
    }
    return currentFetchedCombinedRuntimeLandscapeData;
  }

  private combineLandscapeData(
    previousData: LandscapeData | undefined,
    newStructureLandscapeData: StructureLandscapeData,
    newDynamicLandscapeData: DynamicLandscapeData
  ): LandscapeData {
    if (previousData) {
      return {
        structureLandscapeData: combineStructureLandscapeData(
          previousData.structureLandscapeData,
          newStructureLandscapeData
        ),
        dynamicLandscapeData: combineDynamicLandscapeData(
          previousData.dynamicLandscapeData,
          newDynamicLandscapeData
        ),
      };
    } else {
      return {
        structureLandscapeData: newStructureLandscapeData,
        dynamicLandscapeData: newDynamicLandscapeData,
      };
    }
  }

  private processFetchedLandscapeData(fetchedData: LandscapeData): {
    newDynamic: DynamicLandscapeData;
    newStruct: StructureLandscapeData;
    requiresRerendering: boolean;
  } {
    const newDynamic = fetchedData.dynamicLandscapeData;
    const newStruct = combineStructureLandscapeData(
      this.evolutionDataRepository.combinedStructureLandscapes ||
        createEmptyStructureLandscapeData,
      fetchedData.structureLandscapeData
    );

    let requiresRerendering = false;
    const latestMethodHashes =
      getAllMethodHashesOfLandscapeStructureData(newStruct);

    if (
      !areArraysEqual(latestMethodHashes, this.previousMethodHashes) ||
      !areArraysEqual(newDynamic, this.previousLandscapeDynamicData)
    ) {
      requiresRerendering = true;
    }

    this.previousMethodHashes = latestMethodHashes;
    this.previousLandscapeDynamicData = newDynamic;

    return { newDynamic, newStruct, requiresRerendering };
  }

  private updateTimelineData(
    commitToSelectedTimestampMap: Map<string, Timestamp[]>
  ) {
    if (commitToSelectedTimestampMap.size > 0) {
      for (const [
        commitId,
        selectedTimestamps,
      ] of commitToSelectedTimestampMap.entries()) {
        this.timelineDataObjectHandler?.updateSelectedTimestampsForCommit(
          selectedTimestamps,
          commitId
        );
      }
      this.timelineDataObjectHandler?.triggerTimelineUpdate();
    }
  }

  private async setEvolutionModeActiveAndHandleRendering(
    appNameToSelectedCommits: Map<string, SelectedCommit[]>
  ) {
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
  }

  private setRuntimeModeActive() {
    if (this.visualizationMode === 'evolution') {
      this.toastHandlerService.showInfoToastMessage(
        'Switching to cross-commit runtime visualization.'
      );
      this.visualizationMode = 'runtime';
    }

    this.resetAllRenderingStates();
    this.evolutionDataRepository.resetStructureLandscapeData();
    this.timestampRepo.resetState();
    this.timestampRepo.restartTimestampPollingAndVizUpdate([]);
  }

  private handleError(e: any) {
    this.debug('An error occured!', { error: e });
    this.toastHandlerService.showErrorToastMessage(
      'An error occured for the rendering!'
    );
    this.resumeVisualizationUpdating();
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
          false
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
          true
        );
        animatePlayPauseIcon(true);
        if (triggerTimelineUpdate) {
          this.timelineDataObjectHandler.triggerTimelineUpdate();
        }
      }
    }
  }
  // #endregion

  // #region Reset functions

  resetAllRenderingStates() {
    this.debug('Reset Rendering States');
    this._landscapeData = null;
    this.previousLandscapeDynamicData = null;
    this.previousMethodHashes = [];
  }

  // #endregion
}

declare module '@ember/service' {
  interface Registry {
    'rendering-service': RenderingService;
  }
}
