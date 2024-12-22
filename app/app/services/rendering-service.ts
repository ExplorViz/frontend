import { action } from '@ember/object';
import Service, { inject as service } from '@ember/service';
import { areArraysEqual } from 'react-lib/src/utils/helpers/array-helpers';
import { Timestamp } from 'react-lib/src/utils/landscape-schemes/timestamp';
import {
  combineStructureLandscapeData,
  createEmptyStructureLandscapeData,
  getAllMethodHashesOfLandscapeStructureData,
} from 'react-lib/src/utils/landscape-structure-helpers';
import ReloadHandler from './reload-handler';
import { DynamicLandscapeData } from 'react-lib/src/utils/landscape-schemes/dynamic/dynamic-data';
import { tracked } from '@glimmer/tracking';
import { LandscapeData } from 'react-lib/src/utils/landscape-schemes/landscape-data';
import debugLogger from 'ember-debug-logger';
import { StructureLandscapeData } from 'react-lib/src/utils/landscape-schemes/structure-data';
import TimestampService from './timestamp';
import ToastHandlerService from './toast-handler';
import TimelineDataObjectHandler from 'explorviz-frontend/utils/timeline/timeline-data-object-handler';
import { animatePlayPauseIcon } from 'react-lib/src/utils/animate';
import { combineDynamicLandscapeData } from 'react-lib/src/utils/landscape-dynamic-helpers';
import EvolutionDataRepository from './repos/evolution-data-repository';
import { SelectedCommit } from './commit-tree-state';
import TimestampRepository from './repos/timestamp-repository';
import CommitTreeStateService from './commit-tree-state';

export type VisualizationMode = 'evolution' | 'runtime';

export type EvolutionModeRenderingConfiguration = {
  renderDynamic: boolean;
  renderStatic: boolean;
  renderOnlyDifferences: boolean;
};

export default class RenderingService extends Service {
  private readonly debug = debugLogger('RenderingService');

  // #region Services

  @service('reload-handler')
  private reloadHandler!: ReloadHandler;

  @service('timestamp')
  private timestampService!: TimestampService;

  @service('toast-handler')
  private toastHandlerService!: ToastHandlerService;

  @service('repos/evolution-data-repository')
  private evolutionDataRepository!: EvolutionDataRepository;

  @service('repos/timestamp-repository')
  private timestampRepo!: TimestampRepository;

  @service('commit-tree-state')
  private commitTreeStateService!: CommitTreeStateService;

  // #endregion

  // #region Properties

  private previousMethodHashes: string[] = [];

  private currentRuntimeLandscapeData: Map<string, LandscapeData> = new Map(); // <commitId, LandscapeData>

  private _timelineDataObjectHandler: TimelineDataObjectHandler | null = null;

  @tracked
  private _landscapeData: LandscapeData | null = null;

  @tracked
  private _visualizationPaused = false;

  @tracked
  private _visualizationMode: VisualizationMode = 'runtime';

  private _userInitiatedStaticDynamicCombination = false;

  // #endregion

  // #region  Getter / Setter

  get visualizationMode(): VisualizationMode {
    return this._visualizationMode;
  }

  get userInitiatedStaticDynamicCombination(): boolean {
    return this._userInitiatedStaticDynamicCombination;
  }

  set userInitiatedStaticDynamicCombination(newValue: boolean) {
    this._userInitiatedStaticDynamicCombination = newValue;
  }

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

    if (
      this._visualizationMode === 'evolution' &&
      !this._userInitiatedStaticDynamicCombination
    ) {
      return;
    }

    this.debug('triggerRenderingForGivenTimestamps');

    try {
      const fetchedRuntimeLandscapeData = await this.fetchRuntimeLandscapeData(
        commitToSelectedTimestampMap
      );

      let combinedRuntimeLandscapeData: LandscapeData = {
        structureLandscapeData: createEmptyStructureLandscapeData(),
        dynamicLandscapeData: [],
      };

      if (fetchedRuntimeLandscapeData.size > 0) {
        fetchedRuntimeLandscapeData.forEach((landscapeData) => {
          combinedRuntimeLandscapeData = this.combineLandscapeData(
            combinedRuntimeLandscapeData,
            landscapeData
          );
        });

        const structureToRender = combineStructureLandscapeData(
          this.evolutionDataRepository.combinedStructureLandscapeData ||
            createEmptyStructureLandscapeData,
          combinedRuntimeLandscapeData.structureLandscapeData
        );

        const dynamicToRender =
          combinedRuntimeLandscapeData.dynamicLandscapeData;

        if (this.requiresRerendering(structureToRender, dynamicToRender)) {
          this.triggerRenderingForGivenLandscapeData(
            structureToRender,
            dynamicToRender
          );
        }
      }

      this.updateTimelineData(commitToSelectedTimestampMap);

      this.timestampService.updateSelectedTimestamp(
        this.mapTimestampsToEpochs(commitToSelectedTimestampMap)
      );

      this.currentRuntimeLandscapeData =
        fetchedRuntimeLandscapeData ?? new Map();
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
  async triggerRenderingForSelectedCommits(): Promise<void> {
    try {
      const appNameToSelectedCommits: Map<string, SelectedCommit[]> =
        this.commitTreeStateService.selectedCommits;

      // always pause when the selected commits change
      this.pauseVisualizationUpdating();
      this.timestampRepo.stopTimestampPolling();

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

  private async fetchRuntimeLandscapeData(
    commitToSelectedTimestampMap: Map<string, Timestamp[]>
  ): Promise<Map<string, LandscapeData>> {
    const commitToRuntimeLandscapeDataMap = new Map<string, LandscapeData>();

    for (const [commitId, timestamps] of commitToSelectedTimestampMap) {
      for (const selectedTimestamp of timestamps) {
        const [
          latestFetchedStructureLandscapeData,
          latestFetchedDynamicLandscapeData,
        ] = await this.reloadHandler.loadLandscapeByTimestamp(
          selectedTimestamp.epochMilli
        );

        commitToRuntimeLandscapeDataMap.set(commitId, {
          structureLandscapeData: latestFetchedStructureLandscapeData,
          dynamicLandscapeData: latestFetchedDynamicLandscapeData,
        });
      }
    }
    return commitToRuntimeLandscapeDataMap;
  }

  private combineLandscapeData(
    prevLandscapeData: LandscapeData | undefined,
    newLandscapeData: LandscapeData
  ): LandscapeData {
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
  }

  private getCombineDynamicLandscapeData(
    commitToLandscapeDataMap: Map<string, LandscapeData>
  ): DynamicLandscapeData {
    const combinedDynamicLandscapeData: DynamicLandscapeData = [];

    commitToLandscapeDataMap.forEach((landscapeData) => {
      combinedDynamicLandscapeData.pushObjects(
        landscapeData.dynamicLandscapeData
      );
    });
    return combinedDynamicLandscapeData;
  }

  private requiresRerendering(
    newStructureLandscapeData: StructureLandscapeData,
    newDynamicLandscapeData: DynamicLandscapeData
  ) {
    let requiresRerendering = false;
    const latestMethodHashes = getAllMethodHashesOfLandscapeStructureData(
      newStructureLandscapeData
    );

    if (
      !areArraysEqual(latestMethodHashes, this.previousMethodHashes) ||
      !areArraysEqual(
        newDynamicLandscapeData,
        this.getCombineDynamicLandscapeData(this.currentRuntimeLandscapeData)
      )
    ) {
      requiresRerendering = true;
    }

    this.previousMethodHashes = latestMethodHashes;

    return requiresRerendering;
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
    if (this._visualizationMode === 'runtime') {
      this.toastHandlerService.showInfoToastMessage(
        'Switching to evolution mode.'
      );
      this._visualizationMode = 'evolution';

      // reset all timestamp data upon first change to this mode
      this.timestampRepo.resetState();
    }

    await this.evolutionDataRepository.fetchAndStoreEvolutionDataForSelectedCommits(
      appNameToSelectedCommits
    );

    const combinedEvolutionStructureLandscapeData =
      this.evolutionDataRepository.combinedStructureLandscapeData;

    const flattenedSelectedCommits: SelectedCommit[] = Array.from(
      appNameToSelectedCommits.values()
    ).flat();

    if (combinedEvolutionStructureLandscapeData.nodes.length > 0) {
      let combinedStructureLandscapeData: StructureLandscapeData =
        combinedEvolutionStructureLandscapeData;

      let combinedDynamicLandscapeData: DynamicLandscapeData = [];

      for (const commit of flattenedSelectedCommits) {
        const potentialRuntimeData = this.currentRuntimeLandscapeData.get(
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

      // remove timestamp and landscapedata with commits that are not selected anymore

      let notSelectedCommitIds: string[] = Array.from(
        this.currentRuntimeLandscapeData.keys()
      ).flat();

      notSelectedCommitIds = notSelectedCommitIds.filter(
        (commitId1) =>
          !flattenedSelectedCommits.some(
            ({ commitId: id2 }) => id2 === commitId1
          )
      );

      for (const commitIdToBeRemoved of notSelectedCommitIds) {
        this.currentRuntimeLandscapeData.delete(commitIdToBeRemoved);
        this.timestampRepo.commitToTimestampMap.delete(commitIdToBeRemoved);
        this._timelineDataObjectHandler?.timelineDataObject.delete(
          commitIdToBeRemoved
        );
      }

      this.triggerRenderingForGivenLandscapeData(
        combinedStructureLandscapeData,
        combinedDynamicLandscapeData
      );
    }

    this.timestampRepo.restartTimestampPollingAndVizUpdate(
      flattenedSelectedCommits
    );
  }

  private setRuntimeModeActive() {
    if (this._visualizationMode === 'evolution') {
      this.toastHandlerService.showInfoToastMessage(
        'Switching to cross-commit runtime visualization.'
      );
      this._visualizationMode = 'runtime';

      this._userInitiatedStaticDynamicCombination = false;
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
    if (this._visualizationPaused) {
      this.resumeVisualizationUpdating();
    } else {
      this.pauseVisualizationUpdating();
    }
  }

  resumeVisualizationUpdating() {
    if (this._visualizationPaused) {
      this._visualizationPaused = false;

      this.timelineDataObjectHandler?.updateHighlightedMarkerColorForSelectedCommits(
        false
      );
      animatePlayPauseIcon(false);
      this.timelineDataObjectHandler?.triggerTimelineUpdate();
    }
  }

  @action
  pauseVisualizationUpdating(forceTimelineUpdate: boolean = false) {
    if (forceTimelineUpdate || !this._visualizationPaused) {
      this._visualizationPaused = true;

      this.timelineDataObjectHandler?.updateHighlightedMarkerColorForSelectedCommits(
        true
      );
      animatePlayPauseIcon(true);

      this.timelineDataObjectHandler?.triggerTimelineUpdate();
    }
  }
  // #endregion

  // #region Reset functions

  resetAllRenderingStates() {
    this.debug('Reset Rendering States');
    this._userInitiatedStaticDynamicCombination = false;
    this._landscapeData = null;
    this.currentRuntimeLandscapeData = new Map();
    this.previousMethodHashes = [];
  }

  // #endregion
}

declare module '@ember/service' {
  interface Registry {
    'rendering-service': RenderingService;
  }
}
