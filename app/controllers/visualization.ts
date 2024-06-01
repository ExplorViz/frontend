import Controller from '@ember/controller';
import { action, set } from '@ember/object';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import CollaborationSession from 'collaboration/services/collaboration-session';
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
import PlotlyTimeline from 'explorviz-frontend/components/visualization/page-setup/timeline/plotly-timeline';
import ENV from 'explorviz-frontend/config/environment';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import HighlightingService from 'explorviz-frontend/services/highlighting-service';
import LandscapeRestructure from 'explorviz-frontend/services/landscape-restructure';
import LandscapeTokenService from 'explorviz-frontend/services/landscape-token';
import LinkRenderer from 'explorviz-frontend/services/link-renderer';
import ReloadHandler from 'explorviz-frontend/services/reload-handler';
import ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';
import TimestampRepository from 'explorviz-frontend/services/repos/timestamp-repository';
import SnapshotTokenService, {
  SnapshotToken,
} from 'explorviz-frontend/services/snapshot-token';
import TimestampService from 'explorviz-frontend/services/timestamp';
import TimestampPollingService from 'explorviz-frontend/services/timestamp-polling';
import ToastHandlerService from 'explorviz-frontend/services/toast-handler';
import UserApiTokenService, {
  ApiToken,
} from 'explorviz-frontend/services/user-api-token';
import UserSettings from 'explorviz-frontend/services/user-settings';
import { animatePlayPauseButton } from 'explorviz-frontend/utils/animate';
import { DynamicLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/dynamic/dynamic-data';
import { StructureLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import { Timestamp } from 'explorviz-frontend/utils/landscape-schemes/timestamp';
import DetachedMenuRenderer from 'extended-reality/services/detached-menu-renderer';
import HeatmapConfiguration from 'heatmap/services/heatmap-configuration';
import * as THREE from 'three';

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
  @service('router')
  router!: any;

  @service('landscape-restructure')
  landscapeRestructure!: LandscapeRestructure;

  @service('repos/timestamp-repository')
  timestampRepo!: TimestampRepository;

  @service('timestamp-polling')
  timestampPollingService!: TimestampPollingService;

  @service('heatmap-configuration') heatmapConf!: HeatmapConfiguration;

  @service('landscape-token') landscapeTokenService!: LandscapeTokenService;

  @service('snapshot-token') snapshotTokenService!: SnapshotTokenService;

  @service('reload-handler') reloadHandler!: ReloadHandler;

  @service('repos/application-repository')
  applicationRepo!: ApplicationRepository;

  @service('collaboration-session')
  collaborationSession!: CollaborationSession;

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

  @service('user-api-token')
  userApiTokenService!: UserApiTokenService;

  @service('toast-handler')
  toastHandlerService!: ToastHandlerService;

  plotlyTimelineRef!: PlotlyTimeline;

  /**
   * Hier werden die query parameter festgehalten und dann können die einfach abgerufen werden
   * mit roomId: string | undefined | null;
   */
  queryParams = ['roomId', 'sharedSnapshot', 'owner', 'createdAt'];

  selectedTimestampRecords: Timestamp[] = [];

  @tracked
  roomId?: string | undefined | null;

  @tracked
  sharedSnapshot?: boolean | undefined | null;

  @tracked
  owner?: string | undefined | null;

  @tracked
  createdAt: number | undefined | null;

  @tracked
  userApiTokens: ApiToken[] = [];

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
  timelineTimestamps: Timestamp[] = [];

  @tracked
  highlightedMarkerColor = 'blue';

  @tracked
  vrSupported: boolean = false;

  @tracked
  buttonText: string = '';

  @tracked
  flag: boolean = false; // default value

  private readonly debug = debugLogger();

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

  @action
  setupListeners() {
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

  @action
  updateTimestampList() {
    if (!this.landscapeTokenService.token) {
      this.debug('No token available to update timestamp list');
      return;
    }
    this.debug('updateTimestampList');
    const currentToken = this.landscapeTokenService.token.value;
    this.timelineTimestamps =
      this.timestampRepo.getTimestamps(currentToken) ?? [];
  }

  @action
  receiveNewLandscapeData(
    structureData: StructureLandscapeData | null,
    dynamicData: DynamicLandscapeData
  ) {
    if (
      !structureData ||
      this.landscapeTokenService.token?.value !==
        this.landscapeData?.structureLandscapeData.landscapeToken
    ) {
      this.landscapeData = null;
      this.updateTimestampList();
      return;
    }

    this.debug('receiveNewLandscapeData');
    if (this.visualizationPaused) {
      return;
    }

    this.updateLandscape(structureData, dynamicData);
    if (this.timelineTimestamps.lastObject) {
      this.timestampService.updateSelectedTimestamp(
        this.timelineTimestamps.lastObject?.epochMilli
      );
      this.selectedTimestampRecords = [
        this.timestampRepo.getLatestTimestamp(structureData.landscapeToken)!,
      ];
      this.plotlyTimelineRef.continueTimeline(this.selectedTimestampRecords);
    }
  }

  @action
  restructureLandscapeData(
    structureData: StructureLandscapeData,
    dynamicData: DynamicLandscapeData
  ) {
    this.updateLandscape(structureData, dynamicData);
  }

  @action
  updateLandscape(
    structureData: StructureLandscapeData,
    dynamicData: DynamicLandscapeData
  ) {
    this.landscapeData = {
      structureLandscapeData: structureData,
      dynamicLandscapeData: dynamicData,
    };
  }

  @action
  switchToAR() {
    this.switchToMode('ar');
  }

  @action
  switchToVR() {
    this.flag = this.userSettings.applicationSettings.showVrOnClick.value;
    if (this.vrSupported) {
      this.switchToMode('vr');
    }
  }

  @action
  openLandscapeView() {
    this.switchToMode('browser');
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

  private switchToMode(mode: VisualizationMode) {
    this.roomSerializer.serializeRoom();
    this.closeDataSelection();
    this.localUser.visualizationMode = mode;
    this.webSocket.send<VisualizationModeUpdateMessage>(
      VISUALIZATION_MODE_UPDATE_EVENT,
      { mode }
    );
  }

  @action
  resetView() {
    this.plotlyTimelineRef.continueTimeline(this.selectedTimestampRecords);
  }

  @action
  resetTimestampPolling() {
    this.timestampPollingService.resetPolling();
  }

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

  @action
  async timelineClicked(selectedTimestamps: Timestamp[]) {
    if (
      this.selectedTimestampRecords.length > 0 &&
      selectedTimestamps[0] === this.selectedTimestampRecords[0]
    ) {
      return;
    }
    this.selectedTimestampRecords = selectedTimestamps;
    this.pauseVisualizationUpdating();
    this.updateTimestamp(selectedTimestamps[0].epochMilli, selectedTimestamps);
  }

  async updateTimestamp(
    epochMilli: number,
    timestampRecordArray?: Timestamp[]
  ) {
    try {
      if (!this.snapshotTokenService.snapshotToken) {
        const [structureData, dynamicData] =
          await this.reloadHandler.loadLandscapeByTimestamp(epochMilli);
        this.updateLandscape(structureData, dynamicData);
      } else {
        const [structureData, dynamicData] =
          await this.reloadHandler.loadLandscapeByTimestampSnapshot(
            this.snapshotTokenService.snapshotToken!.structureData
              .structureLandscapeData,
            this.snapshotTokenService.snapshotToken!.structureData
              .dynamicLandscapeData
          );
        this.updateLandscape(structureData, dynamicData);
      }

      if (timestampRecordArray) {
        this.selectedTimestampRecords = timestampRecordArray;
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
  getTimelineReference(plotlyTimelineRef: PlotlyTimeline) {
    // called from within the plotly timeline component
    set(this, 'plotlyTimelineRef', plotlyTimelineRef);
  }

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
      this.highlightedMarkerColor = 'blue ';
      this.plotlyTimelineRef.continueTimeline(this.selectedTimestampRecords);
      animatePlayPauseButton(false);
    }
  }

  @action
  pauseVisualizationUpdating() {
    if (!this.visualizationPaused) {
      this.visualizationPaused = true;
      this.highlightedMarkerColor = 'red';
      this.plotlyTimelineRef.continueTimeline(this.selectedTimestampRecords);
      animatePlayPauseButton(true);
    }
  }

  async initRendering() {
    if (this.owner && this.createdAt) {
      const snapshotToken: SnapshotToken | null =
        await this.snapshotTokenService.retrieveToken(
          this.owner,
          this.createdAt,
          this.sharedSnapshot!
        );
      if (snapshotToken === null) {
        this.toastHandlerService.showErrorToastMessage(
          'Snapshot could not be loaded.'
        );
        this.router.transitionTo('landscapes');
      } else {
        this.snapshotTokenService.setToken(snapshotToken);
        // if user reloads site and does not come from the homsescreen
        // this.landscapeTokenService.setToken(snapshotToken.landscapeToken);
      }
    }

    this.debug('initRendering');
    this.userApiTokens = await this.userApiTokenService.retrieveApiTokens();
    this.landscapeData = null;
    this.selectedTimestampRecords = [];
    this.visualizationPaused = false;

    if (this.snapshotTokenService.snapshotToken !== null) {
      this.loadSnapshot();
    }

    this.timestampPollingService.initTimestampPollingWithCallback(
      this.timestampPollingCallback.bind(this)
    );

    this.updateTimestampList();
    this.initWebSocket();
    this.debug('initRendering done');
  }

  willDestroy() {
    this.collaborationSession.disconnect();
    this.landscapeRestructure.resetLandscapeRestructure();
    this.resetTimestampPolling();
    this.applicationRepo.cleanup();
    this.applicationRenderer.cleanup();

    // added for snapshot, highlights need to be removed
    this.highlightingService.removeHighlightingForAllApplications(false);

    this.closeDataSelection();
    this.closeToolsSidebar();

    this.roomId = null;
    this.sharedSnapshot = null;
    this.owner = null;
    this.createdAt = null;
    this.snapshotTokenService.snapshotToken = null;

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

  timestampPollingCallback(timestamps: Timestamp[]) {
    this.timestampRepo.addTimestamps(
      this.landscapeTokenService.token!.value,
      timestamps
    );

    if (timestamps.length > 0) {
      this.timestampRepo.triggerTimelineUpdate();
    }

    const lastSelectTimestamp = this.timestampService.timestamp;

    if (this.visualizationPaused) {
      return;
    }

    const timestampToRender = this.timestampRepo.getNextTimestampOrLatest(
      this.landscapeTokenService.token!.value,
      lastSelectTimestamp
    );

    if (
      timestampToRender &&
      JSON.stringify(this.selectedTimestampRecords) !==
        JSON.stringify([timestampToRender])
    ) {
      this.updateTimestamp(timestampToRender.epochMilli);
      this.selectedTimestampRecords = [timestampToRender];
      this.plotlyTimelineRef?.continueTimeline(this.selectedTimestampRecords);
    }
  }

  private async initWebSocket() {
    this.debug('Initializing websocket...');
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
    await this.updateTimestamp(landscape.timestamp);
    // Disable polling. It is now triggerd by the websocket.
  }

  async onTimestampUpdate({
    originalMessage: { timestamp },
  }: ForwardedMessage<TimestampUpdateMessage>): Promise<void> {
    this.updateTimestamp(timestamp);
  }

  async onTimestampUpdateTimer({
    timestamp,
  }: TimestampUpdateTimerMessage): Promise<void> {
    await this.reloadHandler.loadLandscapeByTimestamp(timestamp);
    this.updateTimestamp(timestamp);
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

  async loadSnapshot() {
    if (this.snapshotTokenService.snapshotToken === null) {
      return;
    }

    // make sure our linkRenderer has all extern links
    this.linkRenderer.flag = true;
    while (this.linkRenderer.flag) {
      await timeout(50);
    }

    /**
     * Serialized room is used in landscape-data-watcher to load the landscape with
     * all highlights and popUps.
     */
    this.roomSerializer.serializedRoom =
      this.snapshotTokenService.snapshotToken.serializedRoom;

    await this.updateTimestamp(
      this.snapshotTokenService.snapshotToken.serializedRoom.landscape.timestamp
    );

    this.applicationRenderer.restoreFromSerialization(
      this.snapshotTokenService.snapshotToken!.serializedRoom
    );
    this.detachedMenuRenderer.restore(
      this.snapshotTokenService.snapshotToken!.serializedRoom.popups,
      this.snapshotTokenService.snapshotToken!.serializedRoom.detachedMenus
    );

    this.highlightingService.updateHighlighting();
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
}

// DO NOT DELETE: this is how TypeScript knows how to look up your controllers.
declare module '@ember/controller' {
  // tslint:disable-next-line: interface-name
  interface Registry {
    visualizationController: VisualizationController;
  }
}
