import ENV from 'explorviz-frontend/config/environment';
import Controller from '@ember/controller';
import { action, set } from '@ember/object';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import CollaborationSession from 'collaborative-mode/services/collaboration-session';
import LocalUser, {
  VisualizationMode,
} from 'collaborative-mode/services/local-user';
import debugLogger from 'ember-debug-logger';
import PlotlyTimeline from 'explorviz-frontend/components/visualization/page-setup/timeline/plotly-timeline';
import LandscapeListener from 'explorviz-frontend/services/landscape-listener';
import LandscapeTokenService from 'explorviz-frontend/services/landscape-token';
import LandscapeRestructure from 'explorviz-frontend/services/landscape-restructure';
import ReloadHandler from 'explorviz-frontend/services/reload-handler';
import ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';
import TimestampRepository from 'explorviz-frontend/services/repos/timestamp-repository';
import TimestampService from 'explorviz-frontend/services/timestamp';
import AlertifyHandler from 'explorviz-frontend/utils/alertify-handler';
import { DynamicLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/dynamic/dynamic-data';
import { StructureLandscapeData, preProcessAndEnhanceStructureLandscape } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
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
import {
  VISUALIZATION_MODE_UPDATE_EVENT,
  VisualizationModeUpdateMessage,
} from 'virtual-reality/utils/vr-message/sendable/visualization_mode_update';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import {
  SerializedApp,
  SerializedDetachedMenu,
  SerializedHighlightedComponent,
} from 'virtual-reality/utils/vr-multi-user/serialized-vr-room';
import UserSettings from 'explorviz-frontend/services/user-settings';
import LinkRenderer from 'explorviz-frontend/services/link-renderer';
import { timeout } from 'ember-concurrency';
import HighlightingService from 'explorviz-frontend/services/highlighting-service';
import { animatePlayPauseButton } from 'explorviz-frontend/utils/animate';
import TimestampPollingService from 'explorviz-frontend/services/timestamp-polling';
import { Timestamp } from 'explorviz-frontend/utils/landscape-schemes/timestamp';
import CodeServiceFetchingService from 'explorviz-frontend/services/code-service-fetching';
import { EvolutedApplication, EvolutionLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/evolution-data';
import PlotlyCommitline from 'explorviz-frontend/components/visualization/page-setup/commitline/plotly-commitline';
import ConfigurationRepository, { ConfigurationItem } from 'explorviz-frontend/services/repos/configuration-repository';
import { combineStructures } from 'explorviz-frontend/utils/landscape-structure-helpers';


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

  @service('landscape-restructure') landscapeRestructure!: LandscapeRestructure;

  @service('repos/timestamp-repository') timestampRepo!: TimestampRepository;

  @service('timestamp-polling')
  timestampPollingService!: TimestampPollingService;

  @service('code-service-fetching')
  codeServiceFetchingService!: CodeServiceFetchingService;

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

  plotlyTimelineRef: (PlotlyTimeline | undefined)[] = [undefined, undefined];

  plotlyCommitlineRef!: PlotlyCommitline;

  queryParams = ['roomId'];

  selectedTimestampRecords: Timestamp[][] = [];

  staticStructureData? : StructureLandscapeData = undefined;
  dynamicStructureData? : StructureLandscapeData = undefined;

  @tracked
  roomId?: string;

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
  currentSelectedCommits: Map<string, SelectedCommit[]> = new Map();

  @tracked
  currentSelectedApplication?: string = undefined;

  @tracked
  showConfigurationOverview: boolean = false;

  @tracked
  commitlineConfiguration: ConfigurationItem[] = [];

  @tracked
  commitlineMetrics: String[] = [];

  @tracked
  visualizationPaused = false;

  @tracked
  timelineTimestamps: Timestamp[][] = []; // TODO: Timestamp[][]

  @tracked
  highlightedMarkerColor = 'blue';

  @tracked
  vrSupported: boolean = false;

  @tracked
  buttonText: string = '';

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
    const selectedCommits = this.currentSelectedCommits.get(this.currentSelectedApplication!);
    const timelineTimestamps : Timestamp[][] = [];
    if (selectedCommits?.length) {
      const firstCommitTimestamps = this.timestampRepo.getTimestamps(currentToken, selectedCommits[0].commitId);
      timelineTimestamps.push(firstCommitTimestamps);

      if (selectedCommits.length === 2) {
        const secondCommitTimestamps = this.timestampRepo.getTimestamps(currentToken, selectedCommits[1].commitId);
        timelineTimestamps.push(secondCommitTimestamps);
      }
    }
    this.timelineTimestamps = timelineTimestamps;
  }

  @action
  receiveNewLandscapeData(
    structureData: StructureLandscapeData,
    dynamicData: DynamicLandscapeData,
    selectedTimeline?: number // TODO: non optional
  ) {
    this.debug('receiveNewLandscapeData');
    if (!this.visualizationPaused) {
      this.updateLandscape(structureData, dynamicData); 
      console.log('1', this.timestampService.timestamp);
      if (this.timelineTimestamps[0]?.lastObject) {
        console.log('2', this.timestampService.timestamp);
        this.timestampService.timestamp =
          this.timelineTimestamps[0].lastObject?.epochMilli;

        const selectedCommits : SelectedCommit[] | undefined = this.currentSelectedApplication && this.currentSelectedCommits.get(this.currentSelectedApplication);
        if(selectedCommits && selectedCommits.length > 0) {
          this.selectedTimestampRecords[0] = [
            this.timestampRepo.getLatestTimestamp(structureData.landscapeToken, selectedCommits[0].commitId)!,
          ];
          //this.plotlyTimelineRef.continueTimeline(this.selectedTimestampRecords, );
        }
      }
    }
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
    this.webSocket.send<VisualizationModeUpdateMessage>(
      VISUALIZATION_MODE_UPDATE_EVENT,
      { mode }
    );
  }

  @action
  resetView() {
    this.plotlyTimelineRef[0]?.continueTimeline(this.selectedTimestampRecords, 0);
    this.plotlyTimelineRef[1]?.continueTimeline(this.selectedTimestampRecords, 1);
  }

  @action
  resetTimestampPolling() {
    this.timestampPollingService.resetPolling();
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
  async timelineClicked(selectedTimeline: number, selectedTimestamps: Timestamp[]) { // TODO: timeline of which selected commit?
    console.log("TIMELINE CLICKED ::::: ", selectedTimeline );
    if (
      this.selectedTimestampRecords.length > 0 &&
      selectedTimestamps[0] === this.selectedTimestampRecords[selectedTimeline][0]
    ) {
      return;
    }
    this.selectedTimestampRecords[selectedTimeline] = selectedTimestamps;
    this.pauseVisualizationUpdating();
    this.updateTimestamp(selectedTimeline, selectedTimestamps[0].epochMilli, selectedTimestamps);
  }

  async updateTimestamp(
    selectedTimeline: number,
    epochMilli: number,
    timestampRecordArray?: Timestamp[]
  ) { 
    try {
      const selectedCommits = this.currentSelectedCommits.get(this.currentSelectedApplication!);
      let [structureData, dynamicData] =
        await this.reloadHandler.loadLandscapeByTimestamp(selectedCommits![selectedTimeline], epochMilli); // TODO: if two commits selected also load from the dynamics for the second commit and combine both. Delete selectedCommitline logic

      this.dynamicStructureData = structureData;

      // TODO: combine dynamic structure with static structure
      const renderStaticStructure = this.userSettings.applicationSettings.staticStructure.value;
      const renderDynamicStructure = this.userSettings.applicationSettings.dynamicStructure.value;

      if(renderStaticStructure && renderDynamicStructure) {
        const staticCopy = this.staticStructureData;
        const dynamicCopy = this.dynamicStructureData;
        structureData = combineStructures(staticCopy, dynamicCopy) || {landscapeToken: this.landscapeTokenService.token!.value, nodes: []};
        console.log("STATIC AND DYNAMIC STRUCTURE DATA COMBINED ::::::::::::::::: ", structureData);
      } else if (renderStaticStructure && !renderDynamicStructure) {
        dynamicData = [];
        if(this.staticStructureData)
          structureData = this.staticStructureData;
        else
          structureData = {landscapeToken: this.landscapeTokenService.token!.value, nodes: []}

        console.log("STATIC STRUCTURE DATA ::::::::::::::::: ", structureData);
      } else if (!renderStaticStructure && renderDynamicStructure) {
        if(this.dynamicStructureData)
          structureData = this.dynamicStructureData;
        else
          structureData = {landscapeToken: this.landscapeTokenService.token!.value, nodes: []}
      } else {
        console.debug("Should never happen!");
        structureData = {landscapeToken: this.landscapeTokenService.token!.value, nodes: []}
        dynamicData = [];
      }


      this.updateLandscape(structureData, dynamicData); // TODO: if two commits selected we need to combine their data before we update the landscape
      if (timestampRecordArray) {
        this.selectedTimestampRecords[selectedTimeline] = timestampRecordArray;
      }
      this.timestampService.timestamp = epochMilli;
    } catch (e) {
      this.debug("Landscape couldn't be requested!", e);
      AlertifyHandler.showAlertifyMessage("Landscape couldn't be requested!");
      this.resumeVisualizationUpdating();
    }
  }

  @action
  getTimelineReference(plotlyTimelineRef: PlotlyTimeline, selectedTimeline: number) {
    // called from within the plotly timeline component
    console.log("GET TIMELINE REFERENCE ", selectedTimeline);
    this.plotlyTimelineRef[selectedTimeline] = plotlyTimelineRef;
    set(this, 'plotlyTimelineRef', this.plotlyTimelineRef); // trigger change
  }

  @action
  toggleTimeline() {
    this.isTimelineActive = !this.isTimelineActive;
    console.log("CURRENT SELECTED COMMITS XXXXXXX: ", this.currentSelectedCommits);
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
    const selectedCommits = this.currentSelectedApplication && this.currentSelectedCommits.get(this.currentSelectedApplication);
    if (this.visualizationPaused && selectedCommits?.length === 1) {
      this.visualizationPaused = false;
      this.highlightedMarkerColor = 'blue ';
      this.plotlyTimelineRef[0]?.continueTimeline(this.selectedTimestampRecords, 0);
      this.plotlyTimelineRef[1]?.continueTimeline(this.selectedTimestampRecords, 1);
      animatePlayPauseButton(false);
    }
  }

  pauseVisualizationUpdating() {
    if (!this.visualizationPaused) {
      this.visualizationPaused = true;
      this.highlightedMarkerColor = 'red';
      this.plotlyTimelineRef[0]?.continueTimeline(this.selectedTimestampRecords, 0);
      this.plotlyTimelineRef[1]?.continueTimeline(this.selectedTimestampRecords, 1);
      animatePlayPauseButton(true);
    }
  }

  initRendering() {
    this.debug('initRendering');
    this.landscapeData = null;
    this.selectedTimestampRecords = [];
    this.visualizationPaused = false;
    this.closeDataSelection();
    // this.timestampPollingService.initTimestampPollingWithCallback(
    //   this.timestampPollingCallback.bind(this)
    // );
    this.codeServiceFetchingService.initApplicationFetchingWithCallback(
      this.applicationFetchingCallback.bind(this)
    );
    this.updateTimestampList();
    this.initWebSocket();
    this.debug('initRendering done');
  }

  willDestroy() {
    this.collaborationSession.disconnect();
    this.landscapeRestructure.resetLandscapeRestructure();
    this.resetLandscapeListenerPolling();
    this.resetTimestampPolling();
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

  timestampPollingCallback(timestamps: Timestamp[][]) {

    const selectedCommits = this.currentSelectedCommits.get(this.currentSelectedApplication!);

    if(!selectedCommits) {
      console.debug("Error during polling callback");
      return;
    }

    if(selectedCommits.length === 0) {
      console.debug("No commits selected during polling callback");
      return;
    }else {
      this.timestampRepo.addTimestamps(
        this.landscapeTokenService.token!.value,
        selectedCommits[0].commitId,
        timestamps[0]
      );
  
      if(selectedCommits.length === 2) {
        this.timestampRepo.addTimestamps(
          this.landscapeTokenService.token!.value,
          selectedCommits[1].commitId,
          timestamps[1]
        );
      }
    }


    if (timestamps[0].length > 0 || (selectedCommits.length > 1 && timestamps[1].length > 0)) {
      this.timestampRepo.triggerTimelineUpdate();
    }

    if (!this.visualizationPaused) { 
      const lastSelectTimestamp = this.timestampService.timestamp;
      const timestampToRender = this.timestampRepo.getNextTimestampOrLatest(
        this.landscapeTokenService.token!.value,
        selectedCommits[0].commitId,
        lastSelectTimestamp
      );

      if (
        timestampToRender &&
        JSON.stringify(this.selectedTimestampRecords) !==
          JSON.stringify([timestampToRender])
      ) {
        this.updateTimestamp(0, timestampToRender.epochMilli);
        this.selectedTimestampRecords[0] = [timestampToRender];
        this.plotlyTimelineRef[0]?.continueTimeline(this.selectedTimestampRecords, 0); // TODO: specific timeline as in updateTimestamp?
        
      }
    }
  }

  applicationFetchingCallback(applications: string[]) {
    const evolutionLandscapeData : EvolutionLandscapeData = {
      applications: [],
    };
    applications.forEach(appName => {
      const evolutedApplication : EvolutedApplication = {
        name: appName,
        branches: [],
      };
      evolutionLandscapeData.applications = [...evolutionLandscapeData.applications, evolutedApplication];
    });
    this.evolutionLandscapeData = evolutionLandscapeData;
    console.log("XXXX: " + applications);
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
    console.log("onTimestampUpdateTimer");
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

  @action
  async applicationButtonClicked(application: string) {
    if(this.currentSelectedApplication !== application){ // don't trigger reload
      this.currentSelectedApplication = application;
      this.codeServiceFetchingService.initCommitTreeFetchingWithCallback(
        this.commitTreeFetchingCallback.bind(this), this.currentSelectedApplication);
    }
  }

  commitTreeFetchingCallback(commitTree: EvolutedApplication) {
    const oldCommitTree = this.evolutionLandscapeData?.applications.find(application => {
      return application.name === this.currentSelectedApplication;
    });
    if(oldCommitTree) {
      const index = this.evolutionLandscapeData!.applications.indexOf(oldCommitTree);
      if(index !== -1){
        this.evolutionLandscapeData!.applications[index] = commitTree;
        set(this, 'evolutionLandscapeData', this.evolutionLandscapeData); // trigger reload
      }
    }

  }

  @action
  getCommitlineReference(plotlyCommitlineRef: PlotlyCommitline) {
    // called from within the plotly timeline component
    set(this, 'plotlyCommitlineRef', plotlyCommitlineRef);
  }

  @action
  toggleCommitlineConfigurationOverview() {
    this.showConfigurationOverview = !this.showConfigurationOverview;
  }

  @action
  updateConfigurationsAndMetrics() {
    const currentToken = this.landscapeTokenService.token!.value;
    this.commitlineConfiguration = this.configurationRepo.getConfiguration(currentToken);
    this.commitlineMetrics = this.configurationRepo.getSoftwaremetrics(currentToken)
  }

  @action 
  updatePlotForMetrics(){
    if(this.plotlyCommitlineRef){
      //this.plotlyCommitlineRef.updatePlotlineForMetric();
    }
  }

  // TODO: DELETE
  // @action
  // async renderSettingChanged() {
  //   this.timestampPollingService.resetPolling();
  //   const selected = this.currentSelectedCommits.get(this.currentSelectedApplication!);
  //   this.timestampPollingService.initTimestampPollingWithCallback(
  //     selected!,
  //     this.timestampPollingCallback.bind(this)
  //   );

  // }

  @action
  async commitlineClicked(commits: Map<string,SelectedCommit[]>, staticStructureData?: StructureLandscapeData ) {
    // TODO: change timeline requests so that it only fetches dynamic data regarding the selected commit(s)
    // (one timeline for each commit) but don't forget to also enhance it with the static landscape structure
    // 
    // TODO: build static landscape and show it (can be deactivated in the settings)

    // enhance dynamic landscape structure with static landscape structure

    if(staticStructureData)
      this.staticStructureData = preProcessAndEnhanceStructureLandscape(staticStructureData); // needed when fetching dynamic data so we can enhance it with the static data (if enabled)
    
    set(this, "currentSelectedCommits", commits);

    const selected = this.currentSelectedCommits.get(this.currentSelectedApplication!);
    const numOfSelectedCommits = selected?.length;
    console.log(this.currentSelectedApplication + " has " + numOfSelectedCommits + " selected commits" );

    this.timestampPollingService.resetPolling();
    if(numOfSelectedCommits && numOfSelectedCommits > 0){
      this.timestampPollingService.initTimestampPollingWithCallback(
        selected,
        this.timestampPollingCallback.bind(this)
      );
    } else {
      this.updateLandscape({landscapeToken: this.landscapeTokenService.token!.value, nodes: []}, []);
    }
    
    // TODO: make visualization paused if for each of the two timelines a timepoint got selected

    // TODO: call reload handler and stop it and remove it from init method so the same dynamic data is not loaded every 10s 
    
  }


}

// DO NOT DELETE: this is how TypeScript knows how to look up your controllers.
declare module '@ember/controller' {
  // tslint:disable-next-line: interface-name
  interface Registry {
    visualizationController: VisualizationController;
  }
}
