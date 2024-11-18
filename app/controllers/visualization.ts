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
  SerializedAnnotation,
  // SerializedAnnotation,
  SerializedApp,
  SerializedDetachedMenu,
  SerializedPopup,
} from 'collaboration/utils/web-socket-messages/types/serialized-room';
import { timeout } from 'ember-concurrency';
import debugLogger from 'ember-debug-logger';
import ENV from 'explorviz-frontend/config/environment';
import AnnotationHandlerService from 'explorviz-frontend/services/annotation-handler';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import Auth from 'explorviz-frontend/services/auth';
import HighlightingService from 'explorviz-frontend/services/highlighting-service';
import LandscapeRestructure from 'explorviz-frontend/services/landscape-restructure';
import LinkRenderer from 'explorviz-frontend/services/link-renderer';
import ReloadHandler from 'explorviz-frontend/services/reload-handler';
import TimestampRepository from 'explorviz-frontend/services/repos/timestamp-repository';
import SnapshotTokenService from 'explorviz-frontend/services/snapshot-token';
import TimestampService from 'explorviz-frontend/services/timestamp';
import TimestampPollingService from 'explorviz-frontend/services/timestamp-polling';
import ToastHandlerService from 'explorviz-frontend/services/toast-handler';
import UserApiTokenService, {
  ApiToken,
} from 'explorviz-frontend/services/user-api-token';
import UserSettings from 'explorviz-frontend/services/user-settings';
import { Timestamp } from 'explorviz-frontend/utils/landscape-schemes/timestamp';
import DetachedMenuRenderer from 'extended-reality/services/detached-menu-renderer';
import * as THREE from 'three';
import TimelineDataObjectHandler from 'explorviz-frontend/utils/timeline/timeline-data-object-handler';
import SidebarHandler from 'explorviz-frontend/utils/sidebar/sidebar-handler';
import EvolutionDataRepository from 'explorviz-frontend/services/repos/evolution-data-repository';
import RenderingService, {
  VisualizationMode as RenderingVisualizationMode,
} from 'explorviz-frontend/services/rendering-service';
import CommitTreeStateService from 'explorviz-frontend/services/commit-tree-state';
import HeatmapConfiguration from 'heatmap/services/heatmap-configuration';
import LandscapeTokenService from 'explorviz-frontend/services/landscape-token';
import { LandscapeData } from 'explorviz-frontend/utils/landscape-schemes/landscape-data';

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

  @service('auth')
  auth!: Auth;
  private readonly debug = debugLogger('VisualizationController');

  queryParams = [
    'roomId',
    'deviceId',
    'sharedSnapshot',
    'owner',
    'createdAt',
    'commit1',
    'commit2',
    'bottomBar',
  ];

  private sidebarHandler!: SidebarHandler;

  private commit1: string | undefined | null;
  private commit2: string | undefined | null;

  private bottomBar: RenderingVisualizationMode | undefined | null;

  // #region Services

  @service('commit-tree-state')
  commitTreeStateService!: CommitTreeStateService;

  @service('rendering-service')
  renderingService!: RenderingService;

  @service('landscape-restructure')
  landscapeRestructure!: LandscapeRestructure;

  @service('repos/timestamp-repository')
  timestampRepo!: TimestampRepository;

  @service('timestamp-polling')
  timestampPollingService!: TimestampPollingService;

  @service('heatmap-configuration')
  heatmapConf!: HeatmapConfiguration;

  @service('landscape-token')
  landscapeTokenService!: LandscapeTokenService;

  @service('snapshot-token') snapshotTokenService!: SnapshotTokenService;

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

  @service('user-api-token')
  userApiTokenService!: UserApiTokenService;

  @service('toast-handler')
  toastHandlerService!: ToastHandlerService;

  @service('annotation-handler')
  annotationHandler!: AnnotationHandlerService;

  @service('repos/evolution-data-repository')
  evolutionDataRepository!: EvolutionDataRepository;

  // #endregion

  // #region Tracked properties

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
  vrButtonText: string = '';

  @tracked
  timelineDataObjectHandler!: TimelineDataObjectHandler;

  @tracked
  isBottomBarMaximized: boolean = true;

  @tracked
  isRuntimeTimelineSelected: boolean = true;

  @tracked
  isCommitTreeSelected: boolean = false;

  // #endregion

  // #region Template helpers

  get isLandscapeExistentAndEmpty() {
    return (
      this.renderingService.landscapeData !== null &&
      this.renderingService.landscapeData.structureLandscapeData?.nodes
        .length === 0
    );
  }

  get allLandscapeDataExistsAndNotEmpty() {
    return (
      this.renderingService.landscapeData !== null &&
      this.renderingService.landscapeData.structureLandscapeData?.nodes.length >
        0
    );
  }

  get shouldDisplayBottomBar() {
    return (
      this.renderingService.landscapeData &&
      !this.showAR &&
      !this.showVR &&
      !this.isSingleLandscapeMode &&
      this.spectateUser.spectateConfigurationId !== 'arena-2'
    );
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
  async initRenderingAndSetupListeners() {
    this.debug('initRenderingAndSetupListeners');
    this.timelineDataObjectHandler = new TimelineDataObjectHandler(
      getOwner(this)
    );

    this.renderingService.landscapeData = null;

    // set timelineDataObjectHandler where necessary
    this.renderingService.timelineDataObjectHandler =
      this.timelineDataObjectHandler;

    this.timestampRepo.timelineDataObjectHandler =
      this.timelineDataObjectHandler;

    this.sidebarHandler = new SidebarHandler();
    this.renderingService.visualizationPaused = false;

    // fetch applications for evolution mode
    await this.evolutionDataRepository.fetchAndStoreApplicationCommitTrees();

    let showEvolutionVisualization = false;

    // check what kind of rendering we should start
    if (this.commit1 && this.commit1.length > 0) {
      showEvolutionVisualization = this.commitTreeStateService.setDefaultState(
        this.evolutionDataRepository.appNameCommitTreeMap,
        this.commit1,
        this.commit2
      );

      // check which bottom bar should be displayed by default
      if (this.bottomBar === 'runtime') {
        this.isRuntimeTimelineSelected = true;
        this.isCommitTreeSelected = false;
      } else {
        this.isRuntimeTimelineSelected = false;
        this.isCommitTreeSelected = true;
      }
    }

    if (showEvolutionVisualization) {
      this.renderingService.triggerRenderingForSelectedCommits();
    } else {
      // start main loop for cross-commit runtime
      this.timestampRepo.restartTimestampPollingAndVizUpdate([]);
    }

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

  // #endregio

  // #region Event Handlers

  // collaboration start
  // user handling end
  async onInitialLandscape({
    landscape,
    openApps,
    detachedMenus,
    highlightedExternCommunicationLinks, //transparentExternCommunicationLinks
    annotations,
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
      annotations: annotations as SerializedAnnotation[],
    };

    this.highlightingService.updateHighlighting();
    await this.renderingService.triggerRenderingForGivenTimestamp(
      landscape.timestamp
    );
    // Disable polling. It is now triggerd by the websocket.
  }

  async onTimestampUpdate({
    originalMessage: { timestamp },
  }: ForwardedMessage<TimestampUpdateMessage>): Promise<void> {
    this.renderingService.triggerRenderingForGivenTimestamp(timestamp);
  }

  async onTimestampUpdateTimer({
    timestamp,
  }: TimestampUpdateTimerMessage): Promise<void> {
    await this.reloadHandler.loadLandscapeByTimestamp(timestamp);
    this.renderingService.triggerRenderingForGivenTimestamp(timestamp);
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
      annotations,
      detachedMenus,
    } = event.originalMessage;
    const serializedRoom = {
      landscape: landscape,
      openApps: openApps as SerializedApp[],
      highlightedExternCommunicationLinks,
      popups: popups as SerializedPopup[],
      annotations: annotations as SerializedAnnotation[],
      detachedMenus: detachedMenus as SerializedDetachedMenu[],
    };
    console.log('onSyncRoomState');
    this.applicationRenderer.restoreFromSerialization(serializedRoom);
    this.detachedMenuRenderer.restore(
      serializedRoom.popups,
      serializedRoom.detachedMenus
    );
    this.detachedMenuRenderer.restoreAnnotations(serializedRoom.annotations);

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
      // war mal 350?
      await timeout(50);
    }

    /**
     * Serialized room is used in landscape-data-watcher to load the landscape with
     * all highlights and popUps.
     */
    this.roomSerializer.serializedRoom =
      this.snapshotTokenService.snapshotToken.serializedRoom;

    this.localUser.defaultCamera.position.set(
      this.snapshotTokenService.snapshotToken.camera!.x,
      this.snapshotTokenService.snapshotToken.camera!.y,
      this.snapshotTokenService.snapshotToken.camera!.z
    );
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
  switchToOnScreenMode() {
    this.switchToMode('browser');
  }

  private switchToMode(mode: VisualizationMode) {
    this.roomSerializer.serializeRoom();
    this.sidebarHandler.closeSettingsSidebar();
    this.localUser.visualizationMode = mode;
    this.webSocket.send<VisualizationModeUpdateMessage>(
      VISUALIZATION_MODE_UPDATE_EVENT,
      { mode }
    );
  }

  /**
   * Checks the current status of WebXR in the browser and if compatible
   * devices are connected. Sets the tracked properties
   * 'vrButtonText' and 'vrSupported' accordingly.
   */
  @action
  async updateVrStatus() {
    if ('xr' in navigator) {
      this.vrSupported =
        (await navigator.xr?.isSessionSupported('immersive-vr')) || false;

      if (this.vrSupported) {
        this.vrButtonText = 'Enter VR';
      } else if (window.isSecureContext === false) {
        this.vrButtonText = 'WEBXR NEEDS HTTPS';
      } else {
        this.vrButtonText = 'WEBXR NOT AVAILABLE';
      }
    } else {
      this.vrButtonText = 'WEBXR NOT SUPPORTED';
    }
  }

  // #endregion

  // #region Template Actions

  @action
  toggleBottomChart() {
    // disable keyboard events for button to prevent space bar
    document.getElementById('bottom-bar-toggle-chart-button')?.blur();

    if (this.isCommitTreeSelected) {
      this.isCommitTreeSelected = false;
      this.isRuntimeTimelineSelected = true;
    } else {
      this.isRuntimeTimelineSelected = false;
      this.isCommitTreeSelected = true;
    }
  }

  @action
  toggleVisibilityBottomBar() {
    this.isBottomBarMaximized = !this.isBottomBarMaximized;
  }

  // #endregion

  // #region Cleanup

  willDestroy() {
    this.landscapeRestructure.resetLandscapeRestructure();
    this.timestampPollingService.resetPolling();
    this.applicationRenderer.cleanup();
    this.timestampRepo.commitToTimestampMap = new Map();
    this.renderingService.resetAllRenderingStates();

    if (this.sidebarHandler) {
      this.sidebarHandler.closeSettingsSidebar();
      this.sidebarHandler.closeToolsSidebar();
    }

    // Always show runtime first
    this.isRuntimeTimelineSelected = true;
    this.isCommitTreeSelected = false;

    this.evolutionDataRepository.resetAllEvolutionData();

    this.roomId = null;
    this.localUser.visualizationMode = 'browser';

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
