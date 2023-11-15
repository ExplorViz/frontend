import ENV from 'explorviz-frontend/config/environment';
import Controller from '@ember/controller';
import { action, set } from '@ember/object';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import CollaborationSession from 'collaborative-mode/services/collaboration-session';
import LocalUser, {
  VisualizationMode,
} from 'collaborative-mode/services/local-user';
import ElkConstructor from 'elkjs/lib/elk-api';
import debugLogger from 'ember-debug-logger';
import PlotlyTimeline from 'explorviz-frontend/components/visualization/page-setup/timeline/plotly-timeline';
import LandscapeListener from 'explorviz-frontend/services/landscape-listener';
import LandscapeTokenService from 'explorviz-frontend/services/landscape-token';
import LandscapeRestructure from 'explorviz-frontend/services/landscape-restructure';
import ReloadHandler from 'explorviz-frontend/services/reload-handler';
import ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';
import TimestampRepository, {
  Timestamp,
} from 'explorviz-frontend/services/repos/timestamp-repository';
import TimestampService from 'explorviz-frontend/services/timestamp';
import AlertifyHandler from 'explorviz-frontend/utils/alertify-handler';
import { DynamicLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/dynamic/dynamic-data';
import { StructureLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import HeatmapConfiguration from 'heatmap/services/heatmap-configuration';
import * as THREE from 'three';
import VrRoomSerializer from 'virtual-reality/services/vr-room-serializer';
import WebSocketService from 'virtual-reality/services/web-socket';
import { ForwardedMessage } from 'virtual-reality/utils/vr-message/receivable/forwarded';
import {
  InitialLandscapeMessage,
  INITIAL_LANDSCAPE_EVENT,
} from 'virtual-reality/utils/vr-message/receivable/landscape';
import {
  TimestampUpdateTimerMessage,
  TIMESTAMP_UPDATE_TIMER_EVENT,
} from 'virtual-reality/utils/vr-message/receivable/timestamp-update-timer';
import {
  TimestampUpdateMessage,
  TIMESTAMP_UPDATE_EVENT,
} from 'virtual-reality/utils/vr-message/sendable/timetsamp_update';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import {
  SerializedApp,
  SerializedDetachedMenu,
  SerializedHighlightedComponent,
} from 'virtual-reality/utils/vr-multi-user/serialized-vr-room';
import UserSettings from 'explorviz-frontend/services/user-settings';
import LinkRenderer from 'explorviz-frontend/services/link-renderer';
import { timeout } from 'ember-concurrency';
import EvolutionListener from 'explorviz-frontend/services/evolution-listener';
import HighlightingService from 'explorviz-frontend/services/highlighting-service';
import { EvolutedApplication, EvolutionLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/evolution-data';
import PlotlyCommitline from 'explorviz-frontend/components/visualization/page-setup/commitline/plotly-commitline';
import ConfigurationRepository, { ConfigurationItem } from 'explorviz-frontend/services/repos/configuration-repository';

export interface LandscapeData {
  structureLandscapeData: StructureLandscapeData;
  dynamicLandscapeData: DynamicLandscapeData;
}

export interface SelectedCommit {
  commitId: string;
  branchName: string;
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
  @service('landscape-listener') landscapeListener!: LandscapeListener;

  @service('evolution-listener') evolutionListener!: EvolutionListener;

  @service('landscape-restructure') landscapeRestructure!: LandscapeRestructure;

  @service('repos/timestamp-repository') timestampRepo!: TimestampRepository;

  @service('heatmap-configuration') heatmapConf!: HeatmapConfiguration;

  @service('landscape-token') landscapeTokenService!: LandscapeTokenService;

  @service('reload-handler') reloadHandler!: ReloadHandler;

  @service('repos/application-repository')
  applicationRepo!: ApplicationRepository;

  @service('collaboration-session')
  collaborationSession!: CollaborationSession;

  @service('virtual-reality@vr-room-serializer')
  roomSerializer!: VrRoomSerializer;

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

  @service('repos/configuration-repository')
  configurationRepo!: ConfigurationRepository;

  plotlyTimelineRef!: PlotlyTimeline;

  plotlyCommitlineRef!: PlotlyCommitline;

  @tracked
  selectedTimestampRecords: Timestamp[] = [];

  //@tracked
  //selectedCommitToTimestampRecordsMap: Map<string, Timestamp[]> = new Map(); // TODO: replace selectedTimestampRecords with this

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
  evolutionLandscapeData: EvolutionLandscapeData | null = null;

  @tracked
  currentSelectedCommits: Map<string,SelectedCommit[]> = new Map();

  @tracked
  currentSelectedApplication: string | null = null;

  @tracked
  visualizationPaused = false;

  @tracked
  timelineTimestamps: Timestamp[] = [];

  @tracked
  showConfigurationOverview: boolean = false;

  @tracked
  commitlineConfiguration: ConfigurationItem[] = [];

  @tracked
  commitlineMetrics: String[] = [];


  @tracked
  vrSupported: boolean = false;

  @tracked
  buttonText: string = '';

  @tracked
  elk = new ElkConstructor({
    workerUrl: './assets/web-workers/elk-worker.min.js',
  });

  @tracked
  flag: boolean = false;

  @tracked
  isRequestsTimeline: boolean = true;
  
  @tracked
  isCommitsTimeline: boolean = false;

  debug = debugLogger();

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
    return !this.showAR && !this.showVR && !this.isSingleLandscapeMode;
  }

  get showXRButton() {
    return this.userSettings.applicationSettings.showXRButton.value;
  }

  @action
  setupListeners() {
    this.webSocket.on(INITIAL_LANDSCAPE_EVENT, this, this.onInitialLandscape);
    this.webSocket.on(TIMESTAMP_UPDATE_EVENT, this, this.onTimestampUpdate);

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
  updateConfigurationsAndMetrics() {
    const currentToken = this.landscapeTokenService.token!.value;
    this.commitlineConfiguration = this.configurationRepo.getConfiguration(currentToken);
    this.commitlineMetrics = this.configurationRepo.getSoftwaremetrics(currentToken)
  }

  @action updatePlotForMetrics(){
    if(this.plotlyCommitlineRef){
      this.plotlyCommitlineRef.updatePlotlineForMetric();
    }
  }

  @action
  receiveNewLandscapeData(
    structureData: StructureLandscapeData,
    dynamicData: DynamicLandscapeData
  ) {
    this.debug('receiveNewLandscapeData');
    if (!this.visualizationPaused) {
      this.updateLandscape(structureData, dynamicData);
      if (this.timelineTimestamps.lastObject) {
        this.timestampService.timestamp =
          this.timelineTimestamps.lastObject?.timestamp;
      }
    }
  }

  @action
  receiveNewEvolutionData(evolutionData: EvolutionLandscapeData){
    this.evolutionLandscapeData = evolutionData;
    this.evolutionLandscapeData.applications.forEach(application => {
      if(!this.currentSelectedCommits.get(application.name) || this.currentSelectedCommits.get(application.name)!.length === 0){ // if a new application arrives we preselect a commit for it and also for the existing ones that have no selected commits
        const selectedCommit = this.getLatestCommitFromMainBranch(application);
        if(selectedCommit){
          this.currentSelectedCommits.set(application.name, [selectedCommit]);
        }
      }
    });

    //this.initiateNewTimeline();
  }

  /* The idea is to initiate a timeline for every combination of selected commits: Let's assume we have n applications and app1 has k1 commits selected, app2 has k2 commits selected,...,
  appn has kn commits selected. Then we would need k1*k2*...*kn timelines
  @action
  initiateNewTimeline(){
     let timelineKeys: string[][] = [];
     //let index = 0;
     this.evolutionLandscapeData!.applications.forEach(application => {
       const selectedCommits = this.currentSelectedCommits.get(application.name);
       if(selectedCommits){
         let firstTime = true;
         let currentLength = timelineKeys.length;
         selectedCommits.forEach(selectedCommit => {
           if(firstTime){
             // append to the first currentLength Lists
             if(currentLength === 0){
               timelineKeys = [[selectedCommit.commitId]]
             }else {
               for(let i = 0; i < currentLength; i++){
                 timelineKeys[i].push(selectedCommit.commitId);
               }
             }
           }else{
             let additionalKeys = [...timelineKeys];
             // copy the first currentLength Lists and change the last element
             for(let i = 0; i < currentLength; i++){ // note that currentLength cannot be 0 in this case
               let n = additionalKeys[i].length;
               additionalKeys[i][n-1] =  selectedCommit.commitId;
             }
             timelineKeys = [...timelineKeys, ...additionalKeys];
           }
 
           firstTime = false;
         });
 
         //index++;
       }
 
     });
 
     timelineKeys.forEach(timelineKey => {
       const key = timelineKey.sort().join(",");
       console.log("key: ", key);
 
       const timeline = this.selectedCommitToTimestampRecordsMap.get(key);
       if(!timeline){
        //TODO: initiate new timeline
         this.selectedCommitToTimestampRecordsMap.set(key, []);
       }
     });
 
     console.log("TIMELINE KEYS: ", timelineKeys);
 
     console.log("CURRENT SELECTED COMMITS: ", this.currentSelectedCommits);
  }
  */

  getLatestCommitFromMainBranch(evolutedApplication: EvolutedApplication) : SelectedCommit | undefined {
    let selectedCommit = undefined;
    for(const branch of evolutedApplication.branches){
      if(branch.branchPoint.name === "NONE"){
        const commitId = branch.commits.lastObject;
        if(commitId){
          selectedCommit = {
            commitId: commitId,
            branchName: branch.name
          }
        }
      }
    }
    return selectedCommit;
  }

  @action
  restructureLandscapeData(
    structureData: StructureLandscapeData,
    dynamicData: DynamicLandscapeData
  ) {
    this.updateLandscape(structureData, dynamicData);
  }

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
  }


  @action
  toggleCommitlineConfigurationOverview() {
    this.showConfigurationOverview = !this.showConfigurationOverview;
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
      this.landscapeListener.latestStructureJsonString = null;
      this.landscapeListener.latestDynamicData = null;
    }
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
  async timelineClicked(timestampRecordArray: Timestamp[]) {
    if (
      this.selectedTimestampRecords.length > 0 &&
      timestampRecordArray[0] === this.selectedTimestampRecords[0]
    ) {
      return;
    }
    this.pauseVisualizationUpdating();
    this.updateTimestamp(
      timestampRecordArray[0].timestamp,
      timestampRecordArray
    );
  }

  @action
  async applicationButtonClicked(application: string) {
    if(this.currentSelectedApplication !== application){ // don't trigger reload
      this.currentSelectedApplication = application;
    }
  }

  // actually not needed since selectedCommits are tracked
  @action
  async commitlineClicked(commits: Map<string,SelectedCommit[]>, structureData?: StructureLandscapeData ) {
    this.currentSelectedCommits = commits;
    if(structureData){
      // 1 commit selected
      this.pauseVisualizationUpdating();
      this.updateLandscape(structureData, []);
    }else {
      // 2 commits selected
      this.updateLandscape(this.landscapeData!.structureLandscapeData, []);
      //this.notifyPropertyChange("landscapeData"); // triggers the visualization as updateLandscape does but in another way
    }
  }

  async updateTimestamp(timestamp: number, timestampRecordArray?: Timestamp[]) {
    try {
      const [structureData, dynamicData] =
        await this.reloadHandler.loadLandscapeByTimestamp(timestamp);

      this.updateLandscape(structureData, dynamicData);
      if (timestampRecordArray) {
        set(this, 'selectedTimestampRecords', timestampRecordArray);
      }
      this.timestampService.timestamp = timestamp;
    } catch (e) {
      this.debug("Landscape couldn't be requested!", e);
      AlertifyHandler.showAlertifyMessage("Landscape couldn't be requested!");
      this.resumeVisualizationUpdating();
    }
  }



  @action
  getTimelineReference(plotlyTimelineRef: PlotlyTimeline) {
    // called from within the plotly timeline component
    set(this, 'plotlyTimelineRef', plotlyTimelineRef);
  }

  @action
  getCommitlineReference(plotlyCommitlineRef: PlotlyCommitline) {
    // called from within the plotly timeline component
    set(this, 'plotlyCommitlineRef', plotlyCommitlineRef);
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
    this.landscapeListener.initLandscapePolling(); // TODO: let evolutionListener callback handle the initPolling call
    this.evolutionListener.initEvolutionPolling();
    this.updateTimestampList();
    this.initWebSocket();
    this.debug('initRendering done');
  }

  willDestroy() {
    this.collaborationSession.disconnect();
    this.landscapeRestructure.resetLandscapeRestructure();
    this.resetLandscapeListenerPolling();
    this.applicationRepo.cleanup();
    this.applicationRenderer.cleanup();

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
    }

    if (this.timestampService.has(TIMESTAMP_UPDATE_EVENT)) {
      this.timestampService.off(
        TIMESTAMP_UPDATE_EVENT,
        this,
        this.onTimestampUpdate
      );
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
  }: //openApps,
  //detachedMenus,
  InitialLandscapeMessage): Promise<void> {
    this.linkRenderer.flag = true;
    while (this.linkRenderer.flag) {
      await timeout(50);
    }
    // now we can be sure our linkRenderer has all extern links

    // Serialized room is used in landscape-data-watcher
    this.roomSerializer.serializedRoom = {
      landscape: landscape,
      openApps: openApps as SerializedApp[],
      detachedMenus: detachedMenus as SerializedDetachedMenu[],
      highlightedExternCommunicationLinks:
        highlightedExternCommunicationLinks as SerializedHighlightedComponent[],
    };

    this.highlightingService.updateHighlighting();
    await this.updateTimestamp(landscape.timestamp);
    // disable polling. It is now triggerd by the websocket.
    this.resetLandscapeListenerPolling();
  }

  async onTimestampUpdate({
    originalMessage: { timestamp },
  }: ForwardedMessage<TimestampUpdateMessage>): Promise<void> {
    this.updateTimestamp(timestamp);
  }

  async onTimestampUpdateTimer({
    timestamp,
  }: TimestampUpdateTimerMessage): Promise<void> {
    this.resetLandscapeListenerPolling();
    this.landscapeListener.pollData(timestamp);
    this.updateTimestamp(timestamp);
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

  @action
  showRequestsTimeline(){
    console.log("Requests Timeline");
    this.isCommitsTimeline = false;
    this.isRequestsTimeline = true;
  }

  @action
  showCommitsTimeline(){
    console.log("Commits Timeline");
    this.isRequestsTimeline = false;
    this.isCommitsTimeline = true;
  }


}

// DO NOT DELETE: this is how TypeScript knows how to look up your controllers.
declare module '@ember/controller' {
  // tslint:disable-next-line: interface-name
  interface Registry {
    visualizationController: VisualizationController;
  }
}
