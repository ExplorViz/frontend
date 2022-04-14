import Controller from '@ember/controller';
import {
  action,
  set
} from '@ember/object';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import CollaborationSession from 'collaborative-mode/services/collaboration-session';
import CollaborativeService from 'collaborative-mode/services/collaborative-service';
import ElkConstructor from 'elkjs/lib/elk-api';
import { perform } from 'ember-concurrency-ts';
import debugLogger from 'ember-debug-logger';
import PlotlyTimeline from 'explorviz-frontend/components/visualization/page-setup/timeline/plotly-timeline';
import LandscapeListener from 'explorviz-frontend/services/landscape-listener';
import LandscapeTokenService from 'explorviz-frontend/services/landscape-token';
import ReloadHandler from 'explorviz-frontend/services/reload-handler';
import TimestampRepository, { Timestamp } from 'explorviz-frontend/services/repos/timestamp-repository';
import AlertifyHandler from 'explorviz-frontend/utils/alertify-handler';
import { DynamicLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/dynamic-data';
import { Application, StructureLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import HeatmapConfiguration from 'heatmap/services/heatmap-configuration';
import THREE from 'three';
import LocalVrUser from 'virtual-reality/services/local-vr-user';
import WebSocketService from 'virtual-reality/services/web-socket';
import { InitialLandscapeMessage, INITIAL_LANDSCAPE_EVENT } from 'virtual-reality/utils/vr-message/receivable/landscape';
import { SerializedVrRoom } from 'virtual-reality/utils/vr-multi-user/serialized-vr-room';

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

  @service('collaborative-service') collaborativeService!: CollaborativeService;

  @service('repos/timestamp-repository') timestampRepo!: TimestampRepository;

  @service('heatmap-configuration') heatmapConf!: HeatmapConfiguration;

  @service('landscape-token') landscapeTokenService!: LandscapeTokenService;

  @service('reload-handler') reloadHandler!: ReloadHandler;

  @service('collaboration-session')
  collaborationSession!: CollaborationSession;

  plotlyTimelineRef!: PlotlyTimeline;

  @tracked
  selectedTimestampRecords: Timestamp[] = [];

  @tracked
  font!: THREE.Font; // set by the route

  @tracked
  showDataSelection = false;

  @tracked
  components: string[] = [];

  @tracked
  showAR: boolean = false;

  @tracked
  showVR: boolean = false;

  @tracked
  showTimeline: boolean = true;

  @tracked
  landscapeData: LandscapeData | null = null;

  @tracked
  visualizationPaused = false;

  @tracked
  timelineTimestamps: Timestamp[] = [];

  // @tracked
  // openApplications: string[] = [];

  @tracked
  openApplications: Map<string, Application> = new Map<string, Application>();

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

  @action
  updateTimestampList() {
    this.debug('updateTimestampList')
    const currentToken = this.landscapeTokenService.token!.value;
    this.timelineTimestamps = this.timestampRepo.getTimestamps(currentToken) ?? [];
  }

  @action
  receiveNewLandscapeData(structureData: StructureLandscapeData,
    dynamicData: DynamicLandscapeData) {
    this.debug('receiveNewLandscapeData')
    if (!this.visualizationPaused) {
      this.updateLandscape(structureData, dynamicData);
    }
  }

  updateLandscape(structureData: StructureLandscapeData,
    dynamicData: DynamicLandscapeData) {
    this.debug('updateLandscape')
    if (this.landscapeData !== null) {
      for (const applicationId of this.openApplications.keys()) {
        const newApplication = VisualizationController.getApplicationFromLandscapeById(
          applicationId, structureData,
        );
        if (newApplication) {
          this.openApplications.set(applicationId, newApplication);
        } else {
          this.openApplications.delete(applicationId);
        }
      }
    }

    this.landscapeData = {
      structureLandscapeData: structureData,
      dynamicLandscapeData: dynamicData,
    };
  }

  static getApplicationFromLandscapeById(id: string,
    structureData: StructureLandscapeData) {
    let foundApplication: Application | undefined;
    structureData.nodes.forEach((node) => {
      node.applications.forEach((application) => {
        if (application.id === id) {
          foundApplication = application;
        }
      });
    });

    return foundApplication;
  }

  @action
  showApplication(appId: string) {
    this.debug('showApplication')
    AlertifyHandler.closeAlertifyMessages();
    this.closeDataSelection();
    if (this.landscapeData === null) {
      return;
    }
    const application = VisualizationController.getApplicationFromLandscapeById(appId,
      this.landscapeData.structureLandscapeData);
    if (!application) {
      return;
    }
    if (application.packages.length === 0) {
      const message = `Sorry, there is no information for application <b>
        ${application.name}</b> available.`;
      AlertifyHandler.showAlertifyMessage(message);
      return;
    }
    this.openApplications.set(appId, application);
    this.openApplications = this.openApplications;
  }

  @action
  switchToAR() {
    if (!this.showVR) {
      this.pauseVisualizationUpdating();
      this.closeDataSelection();
      this.showAR = true;
    }
  }

  @action
  switchToVR() {
    if (!this.showVR) {
      this.pauseVisualizationUpdating();
      this.closeDataSelection();
      this.showVR = true;
    }
  }

  @action
  resetView() {
    this.plotlyTimelineRef.continueTimeline(this.selectedTimestampRecords);
  }

  @action
  resetLandscapeListenerPolling() {
    if (this.landscapeListener.timer !== null) {
      clearTimeout(this.landscapeListener.timer);
    }
  }

  @action
  closeDataSelection() {
    this.debug('closeDataSelection')
    this.showDataSelection = false;
    this.components = [];
  }

  @action
  openDataSelection() {
    this.debug('openDataSelection')
    this.showDataSelection = true;
  }

  @action
  addComponent(component: string) {
    this.debug('addComponent')
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
    this.updateTimestamp(timestampRecordArray[0].timestamp, timestampRecordArray)
  }

  async updateTimestamp(timestamp: number, timestampRecordArray?: Timestamp[]) {
    this.pauseVisualizationUpdating();
    try {
      const [structureData, dynamicData] = await
        this.reloadHandler.loadLandscapeByTimestamp(timestamp);

      this.updateLandscape(structureData, dynamicData);
      if (timestampRecordArray) {
        set(this, 'selectedTimestampRecords', timestampRecordArray);
      }
    } catch (e) {
      this.debug('Landscape couldn\'t be requested!', e);
      AlertifyHandler.showAlertifyMessage('Landscape couldn\'t be requested!');
      this.resumeVisualizationUpdating();
    }
  }

  async restoreRoom(
    room: SerializedVrRoom) {
    this.debug('restoreRoom')

    this.updateTimestamp(room.landscape.timestamp)
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
    this.debug('initRendering')
    this.landscapeData = null;
    this.selectedTimestampRecords = [];
    this.visualizationPaused = false;
    this.showAR = false;
    this.showVR = false;
    this.closeDataSelection();
    this.landscapeListener.initLandscapePolling();
    this.updateTimestampList();
    this.initWebSocket();
    this.collaborationSession.updateRemoteUsers()
    this.webSocket.on(INITIAL_LANDSCAPE_EVENT, this, this.onInitialLandscape);
    this.debug('initRendering done')
  }

  willDestroy() {
    this.resetLandscapeListenerPolling();
    this.webSocket.off(INITIAL_LANDSCAPE_EVENT, this, this.onInitialLandscape);
  }

  @service('local-vr-user')
  localUser!: LocalVrUser;

  @service('web-socket')
  private webSocket!: WebSocketService;

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
    // await this.roomSerializer.restoreRoom({ landscape, openApps, detachedMenus });
    await this.restoreRoom({ landscape, openApps, detachedMenus })

    // this.landscapeMarker.add(this.vrLandscapeRenderer.landscapeObject3D);
    // this.arSettings.updateLandscapeOpacity();

    // this.applicationRenderer.getOpenApplications().forEach((applicationObject3D) => {
    //   this.addApplicationToMarker(applicationObject3D);
    // });
  }

}

// DO NOT DELETE: this is how TypeScript knows how to look up your controllers.
declare module '@ember/controller' {
  // tslint:disable-next-line: interface-name
  interface Registry {
    'visualizationController': VisualizationController;
  }
}
