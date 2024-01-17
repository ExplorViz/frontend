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
import PlotlyTimeline, { IMarkerStates } from 'explorviz-frontend/components/visualization/page-setup/timeline/plotly-timeline';
import LandscapeListener from 'explorviz-frontend/services/landscape-listener';
import LandscapeTokenService from 'explorviz-frontend/services/landscape-token';
import LandscapeRestructure from 'explorviz-frontend/services/landscape-restructure';
import ReloadHandler from 'explorviz-frontend/services/reload-handler';
import ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';
import TimestampRepository from 'explorviz-frontend/services/repos/timestamp-repository';
import TimestampService from 'explorviz-frontend/services/timestamp';
import AlertifyHandler from 'explorviz-frontend/utils/alertify-handler';
import { DynamicLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/dynamic/dynamic-data';
import { Application, Node, Package, StructureLandscapeData, preProcessAndEnhanceStructureLandscape } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
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
import CommitComparisonRepository from 'explorviz-frontend/services/repos/commit-comparison-repository';


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

export enum RenderMode {
  STATIC_ONLY,
  DYNAMIC_ONLY,
  STATIC_DYNAMIC
};

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

  @service('repos/commit-comparison-repository')
  commitComparisonRepo!: CommitComparisonRepository;

  plotlyTimelineRef: (PlotlyTimeline | undefined) = undefined;

  plotlyCommitlineRef!: PlotlyCommitline;

  queryParams = ['roomId'];

  @tracked
  selectedTimestampRecords: [Timestamp[]?, Timestamp[]?] = [undefined, undefined];
  @tracked
  markerState: IMarkerStates[] = [{}, {}];

  staticStructureData? : StructureLandscapeData = undefined;
  dynamicStructureData? : StructureLandscapeData = undefined;
  
  @tracked
  dynamics: [DynamicLandscapeData?, DynamicLandscapeData?] = [undefined, undefined];
  @tracked
  renderMode?: RenderMode = undefined;

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
  timelineTimestamps: Timestamp[][] = []; // n commits selected iff length === n

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

  @tracked
  applicationNameAndBranchNameToColorMap : Map<string, string> = new Map();

  @tracked
  timelineColors : [string?, string?] = [undefined, undefined];

  
  

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
  onRenderSettingChange(renderMode: RenderMode) {
    this.renderMode = renderMode;
    console.log("onRenderSettingChange: ", renderMode);
    this.landscapeData = this.landscapeData; // trigger update
  //   console.log("updateLandscapeTriggered dynamic landscape data: ", this.landscapeData?.dynamicLandscapeData);
  //  switch(renderMode){
  //   case RenderMode.STATIC_ONLY:
  //     console.log("STATIC ONLY");
  //     this.applicationRenderer.hideDynamicVisualization(this.dynamicStructureData);
  //     break;
  //   case RenderMode.DYNAMIC_ONLY:
  //     console.log("DYNAMIC ONLY");
  //     this.applicationRenderer.hideStaticVisualization(this.staticStructureData);
  //     break;
  //   case RenderMode.STATIC_DYNAMIC:
  //     console.log("STATIC AND DYNAMIC");
  //   this.applicationRenderer.showDynamicVisualization(this.dynamicStructureData);
  //   this.applicationRenderer.showStaticVisualization(this.staticStructureData);
  //     break;
  //   default:
  //     this.debug("unknown render mode");
  //  } 

  }

  @action
  receiveNewLandscapeData(
    structureData: StructureLandscapeData,
    dynamicData: DynamicLandscapeData,
    selectedTimeline: number = 0 // TODO: no default
  ) {console.log('receiveNewLandscapeData');
    this.debug('receiveNewLandscapeData');
    if (!this.visualizationPaused) {
      this.updateLandscape(structureData, dynamicData); 
      console.log('1', this.timestampService.timestamp[selectedTimeline]);
      if (this.timelineTimestamps[selectedTimeline]?.lastObject) {
        console.log('2', this.timestampService.timestamp);
        this.timestampService.timestamp[selectedTimeline] =
          this.timelineTimestamps[selectedTimeline].lastObject?.epochMilli;

        const selectedCommits : SelectedCommit[] | undefined = this.currentSelectedApplication && this.currentSelectedCommits.get(this.currentSelectedApplication);
        if(selectedCommits && selectedCommits.length > 0) {
          this.selectedTimestampRecords[selectedTimeline] = [
            this.timestampRepo.getLatestTimestamp(structureData.landscapeToken, selectedCommits[selectedTimeline].commitId)!,
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
  ) { console.log("updateLandscape called");
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
    this.plotlyTimelineRef?.continueTimeline(this.selectedTimestampRecords, 0);
    this.plotlyTimelineRef?.continueTimeline(this.selectedTimestampRecords, 1);
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
  async timelineClicked(selectedTimeline: number, selectedTimestamps: Timestamp[], markerState: IMarkerStates) { // TODO: timeline of which selected commit?
    if (
      this.selectedTimestampRecords.length === 0 ||
      (selectedTimeline !== 0 && selectedTimeline !== 1) ||
      !this.selectedTimestampRecords[selectedTimeline] ||
      this.selectedTimestampRecords[selectedTimeline]!.length === 0 ||
      this.selectedTimestampRecords[selectedTimeline]![0] === selectedTimestamps[0]
    ) {
      return;
    }

    console.log("MARKER STATE -------------> ", markerState);
    //selectedTimestamps = [selectedTimestamps[selectedTimestamps.length - 1]];
    this.selectedTimestampRecords[selectedTimeline] = selectedTimestamps;
    this.markerState[selectedTimeline] = markerState;
    this.pauseVisualizationUpdating();
    const epochMillis : [number?, number?] = [undefined, undefined];
    if(selectedTimeline === 0) {
      epochMillis[0] = selectedTimestamps[0].epochMilli;
      epochMillis[1] = this.selectedTimestampRecords[1] && this.selectedTimestampRecords[1][0] && this.selectedTimestampRecords[1][0].epochMilli;
      this.updateTimestamp(epochMillis, [selectedTimestamps, this.selectedTimestampRecords[1]]);
    }else if(selectedTimeline === 1) {
      epochMillis[1] = selectedTimestamps[0].epochMilli;
      epochMillis[0] = this.selectedTimestampRecords[0] && this.selectedTimestampRecords[0][0] && this.selectedTimestampRecords[0][0].epochMilli;
      this.updateTimestamp(epochMillis, [this.selectedTimestampRecords[0], selectedTimestamps]);
    }

    console.log("----------- epochMillis timelineClicked ------------> ", epochMillis);
  }

  
  async updateTimestamp(
    epochMilli: [number?, number?],
    timestampRecordArray?: [Timestamp[]?, Timestamp[]?] 
  ) { 
    console.log("updateTimeStamp with epochMilli -----------> ",  epochMilli);
    try {
      const selectedCommits = this.currentSelectedCommits.get(this.currentSelectedApplication!);
      const dynamics : [LandscapeData?, LandscapeData?] = [undefined, undefined];
      if(epochMilli[0]) {
        const [structureData, dynamicData] = await this.reloadHandler.loadLandscapeByTimestamp(selectedCommits![0], epochMilli[0])
        dynamics[0] = {
          structureLandscapeData: structureData,
          dynamicLandscapeData: dynamicData
        };
      }

      if(epochMilli[1]) {
        const [structureData, dynamicData] = await this.reloadHandler.loadLandscapeByTimestamp(selectedCommits![1], epochMilli[1])
        dynamics[1] = {
          structureLandscapeData: structureData,
          dynamicLandscapeData: dynamicData
        };
      }

      this.dynamics= [dynamics[0]?.dynamicLandscapeData, dynamics[1]?.dynamicLandscapeData];
      console.log("setting this.dynamics => ", this.dynamics);

      let newDynamic : DynamicLandscapeData;
      if (dynamics[0] && dynamics[1]) {
        const combinedDynamicStructure = combineStructures(dynamics[0].structureLandscapeData, dynamics[1].structureLandscapeData);
        this.dynamicStructureData = combinedDynamicStructure;
        newDynamic = this.combineDynamics(dynamics[0].dynamicLandscapeData, dynamics[1].dynamicLandscapeData);
      } else if (dynamics[0]) {
        this.dynamicStructureData = dynamics[0].structureLandscapeData;
        newDynamic = dynamics[0].dynamicLandscapeData;
      } else if(dynamics[1]) {
        this.dynamicStructureData = dynamics[1].structureLandscapeData;
        newDynamic = dynamics[1].dynamicLandscapeData;
      }else {
        newDynamic = [];
      }

      // Schnittmenge erzeugen und testen. TODO: Delete
      const commonStructure : StructureLandscapeData = {
        landscapeToken: this.dynamicStructureData!.landscapeToken,
        nodes: [],
      };
      const commonNode : Node = {
        id: this.dynamicStructureData!.nodes[0].id,
        ipAddress: this.dynamicStructureData!.nodes[0].ipAddress,
        hostName: this.dynamicStructureData!.nodes[0].hostName,
        applications: []
      };
      const commonApplication : Application = {
        id: this.dynamicStructureData!.nodes[0].applications[0].id,
        name: this.dynamicStructureData!.nodes[0].applications[0].name,
        language: this.dynamicStructureData!.nodes[0].applications[0].language,
        instanceId: this.dynamicStructureData!.nodes[0].applications[0].instanceId,
        parent: this.dynamicStructureData!.nodes[0].applications[0].parent, // parent: commonNode
        packages: [],
      };

      const commonPackage : Package = {
        id: this.dynamicStructureData!.nodes[0].applications[0].packages[2].id,
        name: this.dynamicStructureData!.nodes[0].applications[0].packages[2].name,
        subPackages: this.dynamicStructureData!.nodes[0].applications[0].packages[2].subPackages,
        classes: this.dynamicStructureData!.nodes[0].applications[0].packages[2].classes,
        parent: this.dynamicStructureData!.nodes[0].applications[0].packages[2].parent
      };
      
      
      commonApplication.packages.push(commonPackage);
      commonNode.applications.push(commonApplication);
      commonStructure.nodes.push(commonNode);

      //console.log("DYNAMIC WHICH ALSO SHOULD BE STATIC: ", commonStructure);
      //console.log("STATIC AND DYNAMIC COMBINED: ", combineStructures(this.staticStructureData, commonStructure));
      this.staticStructureData = combineStructures(this.staticStructureData, commonStructure);
      // ---

      console.log("VOOORHER XXXXXXXXXXX : ", this.dynamicStructureData);
      const newStruct = combineStructures(this.staticStructureData, this.dynamicStructureData) || {landscapeToken: this.landscapeTokenService.token!.value, nodes: []};
      //let newStruct : StructureLandscapeData = {landscapeToken: this.landscapeTokenService.token!.value, nodes: []};
      //let newDynamic: DynamicLandscapeData = dynamicData;
      //const newDynamic = dynamicData;
      console.log("NACHHHEEEEEEEER XXXXXXXXXXX: ", this.dynamicStructureData);
      console.log("XXXXXXXXXXXXXXXXXXXXXXXXX: ", newStruct);

      // TODO: combine dynamic structure with static structure
      const renderStaticStructure = this.userSettings.applicationSettings.staticStructure.value;
      const renderDynamicStructure = this.userSettings.applicationSettings.dynamicStructure.value;

      if(renderStaticStructure && renderDynamicStructure) {
        this.renderMode = RenderMode.STATIC_DYNAMIC;
        //newStruct = combineStructures(this.staticStructureData, this.dynamicStructureData) || {landscapeToken: this.landscapeTokenService.token!.value, nodes: []};
      } else if (renderStaticStructure && !renderDynamicStructure) {
        this.renderMode = RenderMode.STATIC_ONLY;
        //newDynamic = [];
        //if(this.staticStructureData)
          //newStruct = this.staticStructureData;
      } else if (!renderStaticStructure && renderDynamicStructure) {
        this.renderMode = RenderMode.DYNAMIC_ONLY;
        //if(this.dynamicStructureData)
          //newStruct = this.dynamicStructureData;
      } else {
        console.debug("Should never happen!");
        //newDynamic = [];
      }


      this.updateLandscape(newStruct, newDynamic!); // TODO: if two commits selected we need to combine their data before we update the landscape
      if (timestampRecordArray) {
        this.selectedTimestampRecords = timestampRecordArray;
      }
      this.timestampService.timestamp = epochMilli;

      console.log("THIS.SELECTEDTIMESTAMPRECORDS ---------------------> ", this.selectedTimestampRecords);
      console.log("THIS.TIMESTAMPSERVICE.TIMESTAMP --------------------> " , this.timestampService.timestamp);
    } catch (e) {
      //this.debug("Landscape couldn't be requested!", e);
      console.log("Landscape couldn't be requested!", e);
      AlertifyHandler.showAlertifyMessage("Landscape couldn't be requested!");
      this.resumeVisualizationUpdating();
    }
  }

  private combineDynamics(dynamicsA: DynamicLandscapeData, dynamicsB: DynamicLandscapeData) {
    const dynamics = [...dynamicsA, ...dynamicsB];
    return dynamics;
  }

  @action
  getTimelineReference(plotlyTimelineRef: PlotlyTimeline) {
    this.plotlyTimelineRef = plotlyTimelineRef;
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
    if (this.visualizationPaused) {
      this.visualizationPaused = false;
      this.highlightedMarkerColor = 'blue';
      this.plotlyTimelineRef?.continueTimeline(this.selectedTimestampRecords, 0);
      if(this.selectedTimestampRecords[1]){
        this.plotlyTimelineRef?.continueTimeline(this.selectedTimestampRecords, 1);
      }
      animatePlayPauseButton(false);
    }
  }

  pauseVisualizationUpdating() {
    if (!this.visualizationPaused) {
      this.visualizationPaused = true;
      this.highlightedMarkerColor = 'red';
      this.plotlyTimelineRef?.continueTimeline(this.selectedTimestampRecords, 0);
      if(this.selectedTimestampRecords[1]){
        this.plotlyTimelineRef?.continueTimeline(this.selectedTimestampRecords, 1);
      }
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
      console.log("NOT PAUSED!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! ", this.staticStructureData);
      const lastSelectTimestamp = this.timestampService.timestamp;
      const timestampToRender : (Timestamp | undefined)[] = [
        this.timestampRepo.getNextTimestampOrLatest(
        this.landscapeTokenService.token!.value,
        selectedCommits[0].commitId,
        lastSelectTimestamp[0]!
      ), 
      selectedCommits[1] &&
      this.timestampRepo.getNextTimestampOrLatest(
        this.landscapeTokenService.token!.value,
        selectedCommits[1].commitId,
        lastSelectTimestamp[1]!
      )];


      const epochMillis: [number?, number?] = [undefined, undefined];
      if (
        timestampToRender[0] &&
        JSON.stringify(this.selectedTimestampRecords[0]) !==
          JSON.stringify([timestampToRender[0]])
      ) {
        epochMillis[0] = timestampToRender[0].epochMilli;
        epochMillis[1] = this.selectedTimestampRecords[1] && this.selectedTimestampRecords[1][0].epochMilli; 
        this.selectedTimestampRecords[0] = [timestampToRender[0]];
        this.plotlyTimelineRef?.continueTimeline(this.selectedTimestampRecords, 0);
      }

      if (
        timestampToRender[1] &&
        JSON.stringify(this.selectedTimestampRecords[1]) !==
          JSON.stringify([timestampToRender[1]])
      ) {
        epochMillis[1] = timestampToRender[1].epochMilli;
        if(!epochMillis[0]){
          epochMillis[0] = this.selectedTimestampRecords[0] && this.selectedTimestampRecords[0][0].epochMilli;
        }
        this.selectedTimestampRecords[1] = [timestampToRender[1]];
        this.plotlyTimelineRef?.continueTimeline(this.selectedTimestampRecords, 1);
      }

      if(epochMillis[0] || epochMillis[1]){
        this.updateTimestamp(epochMillis);
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
    console.log("onInitialLandscape");
    await this.updateTimestamp([landscape.timestamp, undefined]); // TODO: properly timestamp handling
    // disable polling. It is now triggerd by the websocket.
    this.resetLandscapeListenerPolling();
  }

  async onTimestampUpdate({
    originalMessage: { timestamp },
  }: ForwardedMessage<TimestampUpdateMessage>): Promise<void> {
    console.log("onTimestampUpdate");
    this.updateTimestamp([timestamp, undefined]); // TODO: properly timestamp handling
  }

  async onTimestampUpdateTimer({
    timestamp,
  }: TimestampUpdateTimerMessage): Promise<void> {
    console.log("onTimestampUpdateTimer");
    this.resetLandscapeListenerPolling();
    this.landscapeListener.pollData(timestamp);
    this.updateTimestamp([timestamp, undefined]); // TODO: properly timestamp handling
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
      this.plotlyCommitlineRef.updatePlotlineForMetric();
    }
  }

  @action
  async commitlineClicked(commits: Map<string,SelectedCommit[]>, timelineOfSelectedCommit?: number, staticStructureData?: StructureLandscapeData ) {



    if(staticStructureData){
      this.staticStructureData = preProcessAndEnhanceStructureLandscape(staticStructureData);
    }
    this.currentSelectedCommits = commits;
    //set(this, "currentSelectedCommits", commits);

    const selected = this.currentSelectedCommits.get(this.currentSelectedApplication!);
    const numOfSelectedCommits = selected?.length;

    this.timestampPollingService.resetPolling();
    if(numOfSelectedCommits && numOfSelectedCommits > 0){
      if(this.selectedTimestampRecords[1]) {
        // a commit (if timelineOfSelectedCommit=0 the first selected commit and if timelineOfSelectedCommit=1 the second selected commit) got unselected 
        this.selectedTimestampRecords = [undefined, undefined]; // undefined for both so the landscape gets updated within the timestampPollingCallback call-chain
        this.timelineTimestamps = [this.timelineTimestamps[1-timelineOfSelectedCommit!]];
        this.timestampService.timestamp = [this.timestampService.timestamp[1-timelineOfSelectedCommit!], undefined];
        this.markerState = [this.markerState[1-timelineOfSelectedCommit!], {}];
        this.timelineColors[timelineOfSelectedCommit!] = undefined;
        
        this.timestampPollingService.initTimestampPollingWithCallback(
          selected,
          this.timestampPollingCallback.bind(this)
        );

      }else {

        if(this.timelineTimestamps.length === 0) {
          // first commit got selected
          const keyForColor = this.currentSelectedApplication + selected[0].branchName;
          this.timelineColors[0] = this.applicationNameAndBranchNameToColorMap.get(keyForColor);
          
          // this section also removes the "bug" where if we pause during one selected commit (by clicking space or a timepoint) and unselect this commit
          // only to select this commit again, no landscape gets loaded
          if(this.visualizationPaused) {
            this.resumeVisualizationUpdating();
          }
        } else if(this.timelineTimestamps.length === 1) {console.log("XXXXXXXXXXXXXXXX::::XXXXXXXXXXXXXXX");
          // second commit got selected
          const keyForColor = this.currentSelectedApplication + selected[1].branchName;
          this.timelineColors[1] = this.applicationNameAndBranchNameToColorMap.get(keyForColor);
  
  
          if(this.visualizationPaused) {
            this.resumeVisualizationUpdating(); // so the landscape gets updated
          } 
        }
  
        this.timestampPollingService.initTimestampPollingWithCallback(
          selected,
          this.timestampPollingCallback.bind(this)
        );


      }
    
    } else {
      // no commits selected anymore
      this.selectedTimestampRecords = [undefined, undefined];
      this.timelineTimestamps = [];
      this.markerState = [{}, {}];
      this.timestampService.timestamp = [undefined, undefined];
      this.timelineColors = [undefined, undefined];
      this.plotlyTimelineRef = undefined;
      this.updateLandscape({landscapeToken: this.landscapeTokenService.token!.value, nodes: []}, []);
    }

  
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
