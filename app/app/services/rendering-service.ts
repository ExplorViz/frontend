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
import TimelineDataObjectHandler from 'explorviz-frontend/utils/timeline/timeline-data-object-handler';
import { animatePlayPauseIcon } from 'react-lib/src/utils/animate';
import { combineDynamicLandscapeData } from 'react-lib/src/utils/landscape-dynamic-helpers';
import EvolutionDataRepository from './repos/evolution-data-repository';
import {
  SelectedCommit,
  useCommitTreeStateStore,
} from 'react-lib/src/stores/commit-tree-state';
import TimestampRepository from './repos/timestamp-repository';
import { useRenderingServiceStore } from 'react-lib/src/stores/rendering-service';
import { useToastHandlerStore } from 'react-lib/src/stores/toast-handler';

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

  @service('repos/evolution-data-repository')
  private evolutionDataRepository!: EvolutionDataRepository;

  @service('repos/timestamp-repository')
  private timestampRepo!: TimestampRepository;

  // @service('commit-tree-state')
  // private commitTreeStateService!: CommitTreeStateService;

  // #endregion

  // #region Properties

  // private previousMethodHashes: string[] = [];
  get previousMethodHashes(): string[] {
    return useRenderingServiceStore.getState().previousMethodHashes;
  }
  set previousMethodHashes(value: string[]) {
    useRenderingServiceStore.setState({ previousMethodHashes: value });
  }

  // private currentRuntimeLandscapeData: Map<string, LandscapeData> = new Map(); // <commitId, LandscapeData>
  get currentRuntimeLandscapeData(): Map<string, LandscapeData> {
    return useRenderingServiceStore.getState().currentRuntimeLandscapeData;
  }
  set currentRuntimeLandscapeData(value: Map<string, LandscapeData>) {
    useRenderingServiceStore.setState({ currentRuntimeLandscapeData: value });
  }

  private _timelineDataObjectHandler: TimelineDataObjectHandler | null = null;
  // get _timelineDataObjectHandler(): TimelineDataObjectHandler {
  //   return useRenderingServiceStore.getState()._timelineDataObjectHandler;
  // }
  // set _timelineDataObjectHandler(value: TimelineDataObjectHandler) {
  //   useRenderingServiceStore.setState({ _timelineDataObjectHandler: value });
  // }

  @tracked
  private _landscapeData: LandscapeData | null = null;
  // get _landscapeData(): LandscapeData | null {
  //   return useRenderingServiceStore.getState()._landscapeData;
  // }
  // set _landscapeData(value: LandscapeData | null) {
  //   useRenderingServiceStore.setState({ _landscapeData: value });
  // }

  // @tracked
  // private _visualizationPaused = false;
  get _visualizationPaused(): boolean {
    return useRenderingServiceStore.getState()._visualizationPaused;
  }
  set _visualizationPaused(value: boolean) {
    useRenderingServiceStore.setState({ _visualizationPaused: value });
  }

  // @tracked
  // private _visualizationMode: VisualizationMode = 'runtime';
  get _visualizationMode(): VisualizationMode {
    return useRenderingServiceStore.getState()._visualizationMode;
  }
  set _visualizationMode(value: VisualizationMode) {
    useRenderingServiceStore.setState({ _visualizationMode: value });
  }

  // private _userInitiatedStaticDynamicCombination = false;
  get _userInitiatedStaticDynamicCombination(): boolean {
    return useRenderingServiceStore.getState()
      ._userInitiatedStaticDynamicCombination;
  }
  set _userInitiatedStaticDynamicCombination(value: boolean) {
    useRenderingServiceStore.setState({
      _userInitiatedStaticDynamicCombination: value,
    });
  }

  // #endregion

  // #region  Getter / Setter

  get visualizationMode(): VisualizationMode {
    return useRenderingServiceStore.getState()._visualizationMode;
  }

  get userInitiatedStaticDynamicCombination(): boolean {
    return useRenderingServiceStore.getState()
      ._userInitiatedStaticDynamicCombination;
  }

  set userInitiatedStaticDynamicCombination(newValue: boolean) {
    // this._userInitiatedStaticDynamicCombination = newValue;
    useRenderingServiceStore.setState({
      _userInitiatedStaticDynamicCombination: newValue,
    });
  }

  set timelineDataObjectHandler(
    newTimelineDataObjectHandler: TimelineDataObjectHandler | null
  ) {
    this._timelineDataObjectHandler = newTimelineDataObjectHandler;
    // useRenderingServiceStore.setState({
    //   _timelineDataObjectHandler: newTimelineDataObjectHandler,
    // });
  }

  get timelineDataObjectHandler() {
    return this._timelineDataObjectHandler;
    // return useRenderingServiceStore.getState()._timelineDataObjectHandler;
  }

  // region landscapeData: Change after remove tracked

  set landscapeData(newLandscapeData: LandscapeData | null) {
    this._landscapeData = newLandscapeData;
  }

  get landscapeData() {
    return this._landscapeData;
  }

  // set landscapeData(newLandscapeData: LandscapeData | null) {
  //   // this._landscapeData = newLandscapeData;
  //   useRenderingServiceStore.setState({ _landscapeData: newLandscapeData });
  // }

  // get landscapeData() {
  //   return useRenderingServiceStore.getState()._landscapeData;
  // }

  // endregion

  set visualizationPaused(newValue: boolean) {
    // this._visualizationPaused = newValue;
    useRenderingServiceStore.setState({ _visualizationPaused: newValue });
  }

  get visualizationPaused() {
    return useRenderingServiceStore.getState()._visualizationPaused;
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
        useCommitTreeStateStore.getState().getSelectedCommits();

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
    return useRenderingServiceStore
      .getState()
      .mapTimestampsToEpochs(commitToSelectedTimestampMap);
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
    return useRenderingServiceStore
      .getState()
      .combineLandscapeData(prevLandscapeData, newLandscapeData);
  }

  private getCombineDynamicLandscapeData(
    commitToLandscapeDataMap: Map<string, LandscapeData>
  ): DynamicLandscapeData {
    return useRenderingServiceStore
      .getState()
      .getCombineDynamicLandscapeData(commitToLandscapeDataMap);
  }

  private requiresRerendering(
    newStructureLandscapeData: StructureLandscapeData,
    newDynamicLandscapeData: DynamicLandscapeData
  ) {
    return useRenderingServiceStore
      .getState()
      .requiresRerendering(newStructureLandscapeData, newDynamicLandscapeData);
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
    // useRenderingServiceStore
    //   .getState()
    //   .updateTimelineData(commitToSelectedTimestampMap);
  }

  private async setEvolutionModeActiveAndHandleRendering(
    appNameToSelectedCommits: Map<string, SelectedCommit[]>
  ) {
    if (this._visualizationMode === 'runtime') {
      useToastHandlerStore
        .getState()
        .showInfoToastMessage('Switching to evolution mode.');
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
      useToastHandlerStore
        .getState()
        .showInfoToastMessage(
          'Switching to cross-commit runtime visualization.'
        );
      this._visualizationMode = 'runtime';

      this._userInitiatedStaticDynamicCombination = false;
    }

    this.resetAllRenderingStates();
    this.evolutionDataRepository.resetStructureLandscapeData();
    this.timestampRepo.resetState();
    this.timestampRepo.restartTimestampPollingAndVizUpdate([]);
    // useRenderingServiceStore.getState().setRuntimeModeActive();
  }

  private handleError(e: any) {
    this.debug('An error occured!', { error: e });
    useToastHandlerStore
      .getState()
      .showErrorToastMessage('An error occured for the rendering!');
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
    // useRenderingServiceStore.getState().resumeVisualizationUpdating();
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
    // useRenderingServiceStore.getState().resetAllRenderingStates();
  }

  // #endregion
}

declare module '@ember/service' {
  interface Registry {
    'rendering-service': RenderingService;
  }
}
