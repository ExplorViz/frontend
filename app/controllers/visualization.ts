/* eslint-disable no-self-assign */
import { getOwner } from '@ember/application';
import Controller from '@ember/controller';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import LocalUser, {
  VisualizationMode,
} from 'collaboration/services/local-user';
import RoomSerializer from 'collaboration/services/room-serializer';
import SpectateUser from 'collaboration/services/spectate-user';
import WebSocketService from 'collaboration/services/web-socket';
import { ForwardedMessage } from 'collaboration/utils/web-socket-messages/receivable/forwarded';
import {
  INITIAL_LANDSCAPE_EVENT,
  InitialLandscapeMessage,
} from 'collaboration/utils/web-socket-messages/receivable/landscape';
import {
  TIMESTAMP_UPDATE_TIMER_EVENT,
  TimestampUpdateTimerMessage,
} from 'collaboration/utils/web-socket-messages/receivable/timestamp-update-timer';
import {
  SYNC_ROOM_STATE_EVENT,
  SyncRoomStateMessage,
} from 'collaboration/utils/web-socket-messages/sendable/synchronize-room-state';
import {
  TIMESTAMP_UPDATE_EVENT,
  TimestampUpdateMessage,
} from 'collaboration/utils/web-socket-messages/sendable/timetsamp-update';
import {
  VISUALIZATION_MODE_UPDATE_EVENT,
  VisualizationModeUpdateMessage,
} from 'collaboration/utils/web-socket-messages/sendable/visualization-mode-update';
import {
  SerializedApp,
  SerializedDetachedMenu,
  SerializedPopup,
} from 'collaboration/utils/web-socket-messages/types/serialized-room';
import { timeout } from 'ember-concurrency';
import debugLogger from 'ember-debug-logger';
import ENV from 'explorviz-frontend/config/environment';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import HighlightingService from 'explorviz-frontend/services/highlighting-service';
import LandscapeRestructure from 'explorviz-frontend/services/landscape-restructure';
import LinkRenderer from 'explorviz-frontend/services/link-renderer';
import ReloadHandler from 'explorviz-frontend/services/reload-handler';
import TimestampRepository from 'explorviz-frontend/services/repos/timestamp-repository';
import TimestampService from 'explorviz-frontend/services/timestamp';
import TimestampPollingService from 'explorviz-frontend/services/timestamp-polling';
import ToastHandlerService from 'explorviz-frontend/services/toast-handler';
import UserSettings from 'explorviz-frontend/services/user-settings';
import { animatePlayPauseIcon } from 'explorviz-frontend/utils/animate';
import { DynamicLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/dynamic/dynamic-data';
import { StructureLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import { Timestamp } from 'explorviz-frontend/utils/landscape-schemes/timestamp';
import { getAllMethodHashesOfLandscapeStructureData } from 'explorviz-frontend/utils/landscape-structure-helpers';
import DetachedMenuRenderer from 'extended-reality/services/detached-menu-renderer';
import * as THREE from 'three';
import { areArraysEqual } from 'explorviz-frontend/utils/helpers/array-helpers';
import TimelineDataObjectHandler from 'explorviz-frontend/utils/timeline/timeline-data-object-handler';

export interface LandscapeData {
  structureLandscapeData: StructureLandscapeData;
  dynamicLandscapeData: DynamicLandscapeData;
}

export const earthTexture = new THREE.TextureLoader().load(
  'images/earth-map.jpg'
);

/**
 * TODO
 *
 * @class Visualization-Controller
 * @extends Ember.Controller
 *
 * @module explorviz
 * @submodule visualization
 */
export default class VisualizationController extends Controller {
  queryParams = ['roomId', 'deviceId'];

  private readonly debug = debugLogger('VisualizationController');

  private previousMethodHashes: string[] = [];
  private previousLandscapeDynamicData: DynamicLandscapeData | null = null;

  // #region Services

  @service('landscape-restructure')
  landscapeRestructure!: LandscapeRestructure;

  @service('repos/timestamp-repository')
  timestampRepo!: TimestampRepository;

  @service('timestamp-polling')
  timestampPollingService!: TimestampPollingService;

  @service('reload-handler')
  reloadHandler!: ReloadHandler;

  @service('detached-menu-renderer')
  detachedMenuRenderer!: DetachedMenuRenderer;

  @service('room-serializer')
  roomSerializer!: RoomSerializer;

  @service('timestamp')
  timestampService!: TimestampService;

  @service('local-user')
  localUser!: LocalUser;

  @service('web-socket')
  private webSocket!: WebSocketService;

  @service('application-renderer')
  private applicationRenderer!: ApplicationRenderer;

  @service('highlighting-service')
  private highlightingService!: HighlightingService;

  @service('user-settings')
  userSettings!: UserSettings;

  @service('link-renderer')
  linkRenderer!: LinkRenderer;

  @service('spectate-user')
  spectateUser!: SpectateUser;

  @service('toast-handler')
  toastHandlerService!: ToastHandlerService;

  // #endregion

  // #region Tracked properties

  @tracked
  roomId?: string | undefined | null;

  @tracked
  showSettingsSidebar = false;

  @tracked
  showToolsSidebar = false;

  @tracked
  components: string[] = [];

  @tracked
  componentsToolsSidebar: string[] = [];

  @tracked
  isTimelineActive: boolean = true;

  @tracked
  landscapeData: LandscapeData | null = null;

  @tracked
  visualizationPaused = false;

  @tracked
  vrSupported: boolean = false;

  @tracked
  buttonText: string = '';

  @tracked
  timelineDataObjectHandler!: TimelineDataObjectHandler;

  // #endregion

  // #region Template helpers

  get isLandscapeExistentAndEmpty() {
    return (
      this.landscapeData !== null &&
      this.landscapeData.structureLandscapeData?.nodes.length === 0
    );
  }

  get allLandscapeDataExistsAndNotEmpty() {
    return (
      this.landscapeData !== null &&
      this.landscapeData.structureLandscapeData?.nodes.length > 0
    );
  }

  get showTimeline() {
    return (
      this.landscapeData &&
      !this.showAR &&
      !this.showVR &&
      !this.isSingleLandscapeMode &&
      this.spectateUser.spectateConfigurationId !== 'arena-2'
    );
  }

  get showVrButton() {
    return this.userSettings.applicationSettings.showVrButton.value;
  }

  get isSingleLandscapeMode() {
    return (
      ENV.mode.tokenToShow.length > 0 && ENV.mode.tokenToShow !== 'change-token'
    );
  }

  get showAR() {
    return this.localUser.visualizationMode === 'ar';
  }

  get showVR() {
    return this.localUser.visualizationMode === 'vr';
  }

  // #endregion

  // #region Setup

  @action
  setupListeners() {
    this.debug('initRendering');
    this.timelineDataObjectHandler = new TimelineDataObjectHandler(
      getOwner(this)
    );
    this.landscapeData = null;
    this.visualizationPaused = false;
    this.timestampPollingService.initTimestampPollingWithCallback(
      this.timestampPollingCallback.bind(this)
    );
    this.debug('initRendering done');

    this.webSocket.on(INITIAL_LANDSCAPE_EVENT, this, this.onInitialLandscape);
    this.webSocket.on(TIMESTAMP_UPDATE_EVENT, this, this.onTimestampUpdate);
    this.webSocket.on(SYNC_ROOM_STATE_EVENT, this, this.onSyncRoomState);

    if (!this.isSingleLandscapeMode) {
      this.webSocket.on(
        TIMESTAMP_UPDATE_TIMER_EVENT,
        this,
        this.onTimestampUpdateTimer
      );
    }

    this.timestampService.on(
      TIMESTAMP_UPDATE_EVENT,
      this,
      this.onTimestampUpdate
    );
  }

  // #endregion

  // #region Short Polling Event Loop

  timestampPollingCallback(timestamps: Timestamp[]): void {
    // called every tenth second, main update loop
    this.timestampRepo.addTimestamps(timestamps);

    this.timelineDataObjectHandler.updateTimestamps();

    if (this.visualizationPaused) {
      this.timelineDataObjectHandler.triggerTimelineUpdate();
      return;
    }

    const lastSelectTimestamp = this.timestampService.timestamp;

    const timestampToRender =
      this.timestampRepo.getNextTimestampOrLatest(lastSelectTimestamp);

    if (
      timestampToRender &&
      !areArraysEqual(this.timelineDataObjectHandler.selectedTimestamps, [
        timestampToRender,
      ])
    ) {
      this.triggerRenderingForGivenTimestamp(timestampToRender.epochMilli, [
        timestampToRender,
      ]);
    }
  }

  // #endregion

  // #region Event Handlers

  @action
  async timelineClicked(selectedTimestamps: Timestamp[]) {
    if (
      this.timelineDataObjectHandler.selectedTimestamps.length > 0 &&
      selectedTimestamps[0] ===
        this.timelineDataObjectHandler.selectedTimestamps[0]
    ) {
      return;
    }
    this.pauseVisualizationUpdating(false);
    this.triggerRenderingForGivenTimestamp(
      selectedTimestamps[0].epochMilli,
      selectedTimestamps
    );
  }

  // collaboration start
  // user handling end
  async onInitialLandscape({
    landscape,
    openApps,
    detachedMenus,
    highlightedExternCommunicationLinks, //transparentExternCommunicationLinks
  }: InitialLandscapeMessage): Promise<void> {
    this.linkRenderer.flag = true;
    while (this.linkRenderer.flag) {
      await timeout(50);
    }
    // Now we can be sure our linkRenderer has all extern links

    // Serialized room is used in landscape-data-watcher
    this.roomSerializer.serializedRoom = {
      landscape: landscape,
      openApps: openApps as SerializedApp[],
      detachedMenus: detachedMenus as SerializedDetachedMenu[],
      highlightedExternCommunicationLinks,
      popups: [], // ToDo
    };

    this.highlightingService.updateHighlighting();
    await this.triggerRenderingForGivenTimestamp(landscape.timestamp);
    // Disable polling. It is now triggerd by the websocket.
  }

  async onTimestampUpdate({
    originalMessage: { timestamp },
  }: ForwardedMessage<TimestampUpdateMessage>): Promise<void> {
    this.triggerRenderingForGivenTimestamp(timestamp);
  }

  async onTimestampUpdateTimer({
    timestamp,
  }: TimestampUpdateTimerMessage): Promise<void> {
    await this.reloadHandler.loadLandscapeByTimestamp(timestamp);
    this.triggerRenderingForGivenTimestamp(timestamp);
  }

  async onSyncRoomState(event: {
    userId: string;
    originalMessage: SyncRoomStateMessage;
  }) {
    const {
      landscape,
      openApps,
      highlightedExternCommunicationLinks,
      popups,
      detachedMenus,
    } = event.originalMessage;
    const serializedRoom = {
      landscape: landscape,
      openApps: openApps as SerializedApp[],
      highlightedExternCommunicationLinks,
      popups: popups as SerializedPopup[],
      detachedMenus: detachedMenus as SerializedDetachedMenu[],
    };

    this.applicationRenderer.restoreFromSerialization(serializedRoom);
    this.detachedMenuRenderer.restore(
      serializedRoom.popups,
      serializedRoom.detachedMenus
    );

    this.highlightingService.updateHighlighting();

    this.toastHandlerService.showInfoToastMessage(
      'Room state synchronizing ...'
    );
  }

  @action
  restructureLandscapeData(
    structureData: StructureLandscapeData,
    dynamicData: DynamicLandscapeData
  ) {
    this.triggerRenderingForGivenLandscapeData(structureData, dynamicData);
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

      let requiresRerendering = !this.landscapeData;
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

      if (timestampRecordArray) {
        this.timelineDataObjectHandler.updateSelectedTimestamps(
          timestampRecordArray
        );
      }
      this.timelineDataObjectHandler.triggerTimelineUpdate();

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
    this.landscapeData = {
      structureLandscapeData: structureData,
      dynamicLandscapeData: dynamicData,
    };
  }

  // #endregion

  // #region Sidebars

  @action
  closeDataSelection() {
    this.debug('closeDataSelection');
    this.showSettingsSidebar = false;
    this.components = [];
  }

  @action
  closeToolsSidebar() {
    this.debug('closeToolsSidebar');
    this.showToolsSidebar = false;
    this.componentsToolsSidebar = [];
  }

  @action
  openSettingsSidebar() {
    this.debug('openSettingsSidebar');
    this.showSettingsSidebar = true;
  }

  @action
  openToolsSidebar() {
    this.debug('openToolsSidebar');
    this.showToolsSidebar = true;
  }

  @action
  toggleToolsSidebarComponent(component: string): boolean {
    if (this.componentsToolsSidebar.includes(component)) {
      this.removeToolsSidebarComponent(component);
    } else {
      this.componentsToolsSidebar = [component, ...this.componentsToolsSidebar];
    }
    return this.componentsToolsSidebar.includes(component);
  }

  @action
  toggleSettingsSidebarComponent(component: string): boolean {
    if (this.components.includes(component)) {
      this.removeComponent(component);
    } else {
      this.components = [component, ...this.components];
    }
    return this.components.includes(component);
  }

  removeComponent(path: string) {
    if (this.components.length === 0) {
      return;
    }

    const index = this.components.indexOf(path);
    // Remove existing sidebar component
    if (index !== -1) {
      const components = [...this.components];
      components.splice(index, 1);
      this.components = components;
    }
  }

  @action
  removeToolsSidebarComponent(path: string) {
    if (this.componentsToolsSidebar.length === 0) {
      return;
    }

    const index = this.componentsToolsSidebar.indexOf(path);
    // Remove existing sidebar component
    if (index !== -1) {
      const componentsToolsSidebar = [...this.componentsToolsSidebar];
      componentsToolsSidebar.splice(index, 1);
      this.componentsToolsSidebar = componentsToolsSidebar;
    }
  }

  // #endregion

  // #region XR

  @action
  switchToAR() {
    this.switchToMode('ar');
  }

  @action
  switchToVR() {
    if (this.vrSupported) {
      this.switchToMode('vr');
    }
  }

  @action
  openLandscapeView() {
    this.switchToMode('browser');
  }

  private switchToMode(mode: VisualizationMode) {
    this.roomSerializer.serializeRoom();
    this.closeDataSelection();
    this.localUser.visualizationMode = mode;
    this.webSocket.send<VisualizationModeUpdateMessage>(
      VISUALIZATION_MODE_UPDATE_EVENT,
      { mode }
    );
  }

  /**
   * Checks the current status of WebXR in the browser and if compatible
   * devices are connected. Sets the tracked properties
   * 'buttonText' and 'vrSupported' accordingly.
   */
  @action
  async updateVrStatus() {
    if ('xr' in navigator) {
      this.vrSupported =
        (await navigator.xr?.isSessionSupported('immersive-vr')) || false;

      if (this.vrSupported) {
        this.buttonText = 'Enter VR';
      } else if (window.isSecureContext === false) {
        this.buttonText = 'WEBXR NEEDS HTTPS';
      } else {
        this.buttonText = 'WEBXR NOT AVAILABLE';
      }
    } else {
      this.buttonText = 'WEBXR NOT SUPPORTED';
    }
  }

  // #endregion

  // #region Template Actions

  @action
  toggleTimeline() {
    this.isTimelineActive = !this.isTimelineActive;
  }

  @action
  toggleVisualizationUpdating() {
    // TODO: need to notify the timeline
    if (this.visualizationPaused) {
      this.resumeVisualizationUpdating();
    } else {
      this.pauseVisualizationUpdating();
    }
  }

  resumeVisualizationUpdating() {
    if (this.visualizationPaused) {
      this.visualizationPaused = false;
      this.timelineDataObjectHandler.updateHighlightedMarkerColor('blue');
      animatePlayPauseIcon(false);
      this.timelineDataObjectHandler.triggerTimelineUpdate();
    }
  }

  @action
  pauseVisualizationUpdating(triggerTimelineUpdate: boolean = true) {
    if (!this.visualizationPaused) {
      this.visualizationPaused = true;
      this.timelineDataObjectHandler.updateHighlightedMarkerColor('red');
      animatePlayPauseIcon(true);
      if (triggerTimelineUpdate) {
        this.timelineDataObjectHandler.triggerTimelineUpdate();
      }
    }
  }

  // #endregion

  // #region Cleanup

  willDestroy() {
    this.landscapeRestructure.resetLandscapeRestructure();
    this.timestampPollingService.resetPolling();
    this.applicationRenderer.cleanup();
    this.timestampRepo.timestamps = new Map();

    this.closeDataSelection();
    this.closeToolsSidebar();

    this.roomId = null;

    if (this.webSocket.isWebSocketOpen()) {
      this.webSocket.off(
        INITIAL_LANDSCAPE_EVENT,
        this,
        this.onInitialLandscape
      );
      this.webSocket.off(TIMESTAMP_UPDATE_EVENT, this, this.onTimestampUpdate);
      this.webSocket.off(
        TIMESTAMP_UPDATE_TIMER_EVENT,
        this,
        this.onTimestampUpdateTimer
      );
      this.webSocket.off(SYNC_ROOM_STATE_EVENT, this, this.onSyncRoomState);
    }

    if (this.timestampService.has(TIMESTAMP_UPDATE_EVENT)) {
      this.timestampService.off(
        TIMESTAMP_UPDATE_EVENT,
        this,
        this.onTimestampUpdate
      );
    }
  }

  @action
  removeTimestampListener() {
    if (this.webSocket.isWebSocketOpen()) {
      this.webSocket.off(
        TIMESTAMP_UPDATE_TIMER_EVENT,
        this,
        this.onTimestampUpdateTimer
      );
    }
  }

  // #endregion
}

// DO NOT DELETE: this is how TypeScript knows how to look up your controllers.
declare module '@ember/controller' {
  // tslint:disable-next-line: interface-name
  interface Registry {
    visualizationController: VisualizationController;
  }
}
