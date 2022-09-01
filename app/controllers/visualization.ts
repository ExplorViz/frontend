import Controller from '@ember/controller';
import {
  action,
  set,
} from '@ember/object';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import CollaborationSession from 'collaborative-mode/services/collaboration-session';
import LocalUser, { VisualizationMode } from 'collaborative-mode/services/local-user';
import ElkConstructor from 'elkjs/lib/elk-api';
import debugLogger from 'ember-debug-logger';
import PlotlyTimeline from 'explorviz-frontend/components/visualization/page-setup/timeline/plotly-timeline';
import LandscapeListener from 'explorviz-frontend/services/landscape-listener';
import LandscapeTokenService from 'explorviz-frontend/services/landscape-token';
import ReloadHandler from 'explorviz-frontend/services/reload-handler';
import ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';
import TimestampRepository, { Timestamp } from 'explorviz-frontend/services/repos/timestamp-repository';
import TimestampService from 'explorviz-frontend/services/timestamp';
import AlertifyHandler from 'explorviz-frontend/utils/alertify-handler';
import { DynamicLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/dynamic-data';
import { StructureLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import HeatmapConfiguration from 'heatmap/services/heatmap-configuration';
import * as THREE from 'three';
import VrRoomSerializer from 'virtual-reality/services/vr-room-serializer';
import WebSocketService from 'virtual-reality/services/web-socket';
import { ForwardedMessage } from 'virtual-reality/utils/vr-message/receivable/forwarded';
import { InitialLandscapeMessage, INITIAL_LANDSCAPE_EVENT } from 'virtual-reality/utils/vr-message/receivable/landscape';
import { TimestampUpdateTimerMessage, TIMESTAMP_UPDATE_TIMER_EVENT } from 'virtual-reality/utils/vr-message/receivable/timestamp-update-timer';
import { TimestampUpdateMessage, TIMESTAMP_UPDATE_EVENT } from 'virtual-reality/utils/vr-message/sendable/timetsamp_update';

export interface LandscapeData {
  structureLandscapeData: StructureLandscapeData;
  dynamicLandscapeData: DynamicLandscapeData;
}

export const earthTexture = new THREE.TextureLoader().load('images/earth-map.jpg');

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
  @service('landscape-listener') landscapeListener!: LandscapeListener;

  @service('repos/timestamp-repository') timestampRepo!: TimestampRepository;

  @service('heatmap-configuration') heatmapConf!: HeatmapConfiguration;

  @service('landscape-token') landscapeTokenService!: LandscapeTokenService;

  @service('reload-handler') reloadHandler!: ReloadHandler;

  @service('repos/application-repository')
  applicationRepo!: ApplicationRepository;

  @service('collaboration-session')
  collaborationSession!: CollaborationSession;

  @service('vr-room-serializer')
  roomSerializer!: VrRoomSerializer;

  @service('timestamp')
  timestampService!: TimestampService;

  @service('local-user')
  localUser!: LocalUser;

  @service('web-socket')
  private webSocket!: WebSocketService;

  plotlyTimelineRef!: PlotlyTimeline;

  @tracked
  selectedTimestampRecords: Timestamp[] = [];

  @tracked
  showDataSelection = false;

  @tracked
  components: string[] = [];

  @tracked
  showTimeline: boolean = true;

  @tracked
  landscapeData: LandscapeData | null = null;

  @tracked
  visualizationPaused = false;

  @tracked
  timelineTimestamps: Timestamp[] = [];

  @tracked
  elk = new ElkConstructor({
    workerUrl: './assets/web-workers/elk-worker.min.js',
  });

  debug = debugLogger();

  get isLandscapeExistentAndEmpty() {
    return this.landscapeData !== null
      && this.landscapeData.structureLandscapeData.nodes.length === 0;
  }

  get allLandscapeDataExistsAndNotEmpty() {
    return this.landscapeData !== null
      && this.landscapeData.structureLandscapeData.nodes.length > 0;
  }

  constructor() {
    super(...arguments);

    this.webSocket.on(INITIAL_LANDSCAPE_EVENT, this, this.onInitialLandscape);
    this.webSocket.on(TIMESTAMP_UPDATE_EVENT, this, this.onTimestampUpdate);
    this.webSocket.on(TIMESTAMP_UPDATE_TIMER_EVENT, this, this.onTimestampUpdateTimer);
    this.timestampService.on(TIMESTAMP_UPDATE_EVENT, this, this.onTimestampUpdate);
  }

  @action
  updateTimestampList() {
    this.debug('updateTimestampList');
    const currentToken = this.landscapeTokenService.token!.value;
    this.timelineTimestamps = this.timestampRepo.getTimestamps(currentToken) ?? [];
  }

  @action
  receiveNewLandscapeData(structureData: StructureLandscapeData,
    dynamicData: DynamicLandscapeData) {
    this.debug('receiveNewLandscapeData');
    if (!this.visualizationPaused) {
      this.updateLandscape(structureData, dynamicData);
      if (this.timelineTimestamps.lastObject) {
        this.timestampService.timestamp = this.timelineTimestamps.lastObject?.timestamp;
      }
    }
  }

  updateLandscape(structureData: StructureLandscapeData,
    dynamicData: DynamicLandscapeData) {
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
    this.switchToMode('vr');
  }

  @action
  openLandscapeView() {
    this.switchToMode('browser');
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
  }

  @action
  resetView() {
    this.plotlyTimelineRef.continueTimeline(this.selectedTimestampRecords);
  }

  @action
  resetLandscapeListenerPolling() {
    if (this.landscapeListener.timer !== null) {
      this.debug('Stopping timer');
      clearTimeout(this.landscapeListener.timer);
    }
  }

  @action
  closeDataSelection() {
    this.debug('closeDataSelection');
    this.showDataSelection = false;
    this.components = [];
  }

  @action
  openDataSelection() {
    this.debug('openDataSelection');
    this.showDataSelection = true;
  }

  @action
  addComponent(component: string) {
    this.debug('addComponent');
    if (this.components.includes(component)) {
      // remove it and readd it in the code below,
      // so it again appears on top inside the sidebar
      // This will not reset the component
      this.removeComponent(component);
    }

    this.components = [component, ...this.components];
  }

  @action
  removeComponent(path: string) {
    if (this.components.length === 0) { return; }

    const index = this.components.indexOf(path);
    // Remove existing sidebar component
    if (index !== -1) {
      const components = [...this.components];
      components.splice(index, 1);
      this.components = components;
    }
  }

  @action
  async timelineClicked(timestampRecordArray: Timestamp[]) {
    if (this.selectedTimestampRecords.length > 0
      && timestampRecordArray[0] === this.selectedTimestampRecords[0]) {
      return;
    }
    this.pauseVisualizationUpdating();
    this.updateTimestamp(timestampRecordArray[0].timestamp, timestampRecordArray);
  }

  async updateTimestamp(timestamp: number, timestampRecordArray?: Timestamp[]) {
    try {
      const [structureData, dynamicData] = await
      this.reloadHandler.loadLandscapeByTimestamp(timestamp);

      this.updateLandscape(structureData, dynamicData);
      if (timestampRecordArray) {
        set(this, 'selectedTimestampRecords', timestampRecordArray);
      }
      this.timestampService.timestamp = timestamp;
    } catch (e) {
      this.debug('Landscape couldn\'t be requested!', e);
      AlertifyHandler.showAlertifyMessage('Landscape couldn\'t be requested!');
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
    this.showTimeline = !this.showTimeline;
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
      set(this, 'selectedTimestampRecords', []);
      this.plotlyTimelineRef.resetHighlighting();
      AlertifyHandler.showAlertifyMessage('Visualization resumed!');
    }
  }

  pauseVisualizationUpdating() {
    if (!this.visualizationPaused) {
      this.visualizationPaused = true;
      AlertifyHandler.showAlertifyMessage('Visualization paused!');
    }
  }

  initRendering() {
    this.debug('initRendering');
    this.landscapeData = null;
    this.selectedTimestampRecords = [];
    this.visualizationPaused = false;
    this.closeDataSelection();
    this.landscapeListener.initLandscapePolling();
    this.updateTimestampList();
    this.initWebSocket();
    this.debug('initRendering done');
  }

  willDestroy() {
    this.collaborationSession.disconnect();
    this.resetLandscapeListenerPolling();
    this.applicationRepo.clear();
    this.webSocket.off(INITIAL_LANDSCAPE_EVENT, this, this.onInitialLandscape);
    this.webSocket.off(TIMESTAMP_UPDATE_EVENT, this, this.onTimestampUpdate);
    this.webSocket.off(TIMESTAMP_UPDATE_TIMER_EVENT, this, this.onTimestampUpdateTimer);
    this.timestampService.off(TIMESTAMP_UPDATE_EVENT, this, this.onTimestampUpdate);
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
  }: InitialLandscapeMessage): Promise<void> {
    this.roomSerializer.serializedRoom = { landscape, openApps, detachedMenus };
    this.updateTimestamp(landscape.timestamp);
    // disable polling. It is now triggerd by the websocket.
    this.resetLandscapeListenerPolling();
  }

  async onTimestampUpdate({
    originalMessage: { timestamp },
  }: ForwardedMessage<TimestampUpdateMessage>): Promise<void> {
    this.updateTimestamp(timestamp);
  }

  async onTimestampUpdateTimer(
    { timestamp }: TimestampUpdateTimerMessage,
  ): Promise<void> {
    this.resetLandscapeListenerPolling();
    this.landscapeListener.pollData(timestamp);
    this.updateTimestamp(timestamp);
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your controllers.
declare module '@ember/controller' {
  // tslint:disable-next-line: interface-name
  interface Registry {
    'visualizationController': VisualizationController;
  }
}
