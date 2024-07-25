import { action } from '@ember/object';
import Service, { inject as service } from '@ember/service';
import { areArraysEqual } from 'explorviz-frontend/utils/helpers/array-helpers';
import { Timestamp } from 'explorviz-frontend/utils/landscape-schemes/timestamp';
import { getAllMethodHashesOfLandscapeStructureData } from 'explorviz-frontend/utils/landscape-structure-helpers';
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

export default class RenderingService extends Service {
  private readonly debug = debugLogger('RenderingService');

  @service('reload-handler')
  reloadHandler!: ReloadHandler;

  @service('timestamp')
  timestampService!: TimestampService;

  @service('toast-handler')
  toastHandlerService!: ToastHandlerService;

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

  // #endregion

  // #region Rendering Triggering

  async triggerRenderingForGivenTimestamp(
    epochMilli: number,
    timestampRecordArray?: Timestamp[]
  ) {
    try {
      const [structureData, dynamicData] =
        await this.reloadHandler.loadLandscapeByTimestamp(epochMilli);

      let requiresRerendering = !this._landscapeData;
      let latestMethodHashes: string[] = [];

      if (!requiresRerendering) {
        latestMethodHashes =
          getAllMethodHashesOfLandscapeStructureData(structureData);

        if (
          !areArraysEqual(latestMethodHashes, this.previousMethodHashes) ||
          !areArraysEqual(dynamicData, this.previousLandscapeDynamicData)
        ) {
          requiresRerendering = true;
        }
      }

      this.previousMethodHashes = latestMethodHashes;
      this.previousLandscapeDynamicData = dynamicData;

      if (requiresRerendering) {
        this.triggerRenderingForGivenLandscapeData(structureData, dynamicData);
      }

      if (this.timelineDataObjectHandler) {
        if (timestampRecordArray) {
          this.timelineDataObjectHandler.updateSelectedTimestamps(
            timestampRecordArray
          );
        }
        this.timelineDataObjectHandler.triggerTimelineUpdate();
      }

      this.timestampService.updateSelectedTimestamp(epochMilli);
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
    this._landscapeData = {
      structureLandscapeData: structureData,
      dynamicLandscapeData: dynamicData,
    };
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
        this.timelineDataObjectHandler.updateHighlightedMarkerColor('blue');
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
        this.timelineDataObjectHandler.updateHighlightedMarkerColor('red');
        animatePlayPauseIcon(true);
        if (triggerTimelineUpdate) {
          this.timelineDataObjectHandler.triggerTimelineUpdate();
        }
      }
    }
  }
  // #endregion
}

declare module '@ember/service' {
  interface Registry {
    'rendering-service': RenderingService;
  }
}
