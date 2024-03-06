import Controller from '@ember/controller';
import { action, set } from '@ember/object';
import { inject as service } from '@ember/service';
import { tracked } from '@glimmer/tracking';
import CollaborationSession from 'collaboration/services/collaboration-session';
import LocalUser, {
  VisualizationMode,
} from 'collaboration/services/local-user';
import debugLogger from 'ember-debug-logger';
import PlotlyTimeline, { IMarkerStates } from 'explorviz-frontend/components/visualization/page-setup/timeline/plotly-timeline';
import LandscapeTokenService from 'explorviz-frontend/services/landscape-token';
import LandscapeRestructure from 'explorviz-frontend/services/landscape-restructure';
import ReloadHandler from 'explorviz-frontend/services/reload-handler';
import ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';
import TimestampRepository from 'explorviz-frontend/services/repos/timestamp-repository';
import TimestampService from 'explorviz-frontend/services/timestamp';
import { DynamicLandscapeData, Trace } from 'explorviz-frontend/utils/landscape-schemes/dynamic/dynamic-data';
import { Application, Node, Package, StructureLandscapeData, preProcessAndEnhanceStructureLandscape } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import HeatmapConfiguration from 'heatmap/services/heatmap-configuration';
import * as THREE from 'three';
import UserSettings from 'explorviz-frontend/services/user-settings';
import LinkRenderer from 'explorviz-frontend/services/link-renderer';
import { timeout } from 'ember-concurrency';
import HighlightingService from 'explorviz-frontend/services/highlighting-service';
import { animatePlayPauseButton } from 'explorviz-frontend/utils/animate';
import TimestampPollingService from 'explorviz-frontend/services/timestamp-polling';
import { Timestamp } from 'explorviz-frontend/utils/landscape-schemes/timestamp';
import CodeServiceRequestService from 'explorviz-frontend/services/code-service-fetching';
import { EvolutedApplication, EvolutionLandscapeData } from 'explorviz-frontend/utils/landscape-schemes/evolution-data';
import PlotlyCommitTree from 'explorviz-frontend/components/visualization/page-setup/commit-tree/plotly-commit-tree';
import ConfigurationRepository, { ConfigurationItem } from 'explorviz-frontend/services/repos/configuration-repository';
import { combineStructures } from 'explorviz-frontend/utils/landscape-structure-helpers';
import CommitComparisonRepository from 'explorviz-frontend/services/repos/commit-comparison-repository';
import ToastHandlerService from 'explorviz-frontend/services/toast-handler';
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
import CommitReportRepository from 'explorviz-frontend/services/repos/commit-report-repository';
import ENV from 'explorviz-frontend/config/environment';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import DetachedMenuRenderer from 'extended-reality/services/detached-menu-renderer';



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
  @service('landscape-restructure')
  landscapeRestructure!: LandscapeRestructure;

  @service('repos/timestamp-repository')
  timestampRepo!: TimestampRepository;

  @service('timestamp-polling')
  timestampPollingService!: TimestampPollingService;

  @service('code-service-fetching')
  codeServiceFetchingService!: CodeServiceRequestService;

  @service('heatmap-configuration') heatmapConf!: HeatmapConfiguration;

  @service('landscape-token') landscapeTokenService!: LandscapeTokenService;

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

  @service('repos/configuration-repository')
  configurationRepo!: ConfigurationRepository;

  @service('repos/commit-comparison-repository')
  commitComparisonRepo!: CommitComparisonRepository;

  @service('repos/commit-report-repository')
  commitReportRepo!: CommitReportRepository;

  plotlyTimelineRef: (PlotlyTimeline | undefined) = undefined;

  plotlyCommitTreeRef!: PlotlyCommitTree;
  @service('spectate-user')
  spectateUser!: SpectateUser;

  @service('toast-handler')
  toastHandlerService!: ToastHandlerService;


  queryParams = ['roomId'];

  @tracked
  selectedTimestampRecords: [Timestamp[]?, Timestamp[]?] = [undefined, undefined];
  @tracked
  markerState: IMarkerStates[] = [{}, {}];

  @tracked
  staticStructureData? : StructureLandscapeData = undefined;
  @tracked
  dynamicStructureData? : StructureLandscapeData = undefined;

  
  @tracked
  dynamics: [DynamicLandscapeData?, DynamicLandscapeData?] = [undefined, undefined];
  @tracked
  renderMode?: RenderMode = undefined;

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
  evolutionLandscapeData: EvolutionLandscapeData | null = null;

  @tracked
  currentSelectedCommits: Map<string, SelectedCommit[]> = new Map();

  @tracked
  currentSelectedApplication?: string = undefined;

  @tracked
  showConfigurationOverview: boolean = false;

  @tracked
  commitTreeConfiguration: ConfigurationItem[] = [];

  @tracked
  commitTreeMetrics: String[] = [];

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

  private firstCommitSelected = false; // gets true whenever we get from no commits selected to commit selected
  private allCommitsUnselected = false; // gets true whenever we get from any commit selected to no commits selected
  

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

    let selectedCommits = undefined;
    if(this.currentSelectedApplication) {
      selectedCommits = this.currentSelectedCommits.get(this.currentSelectedApplication);
    }

    const currentToken = this.landscapeTokenService.token.value;
    const timelineTimestamps : Timestamp[][] = [];

    if(!selectedCommits || selectedCommits.length === 0) {
      const commitId = "";
      const allCommitsTimestamps = this.timestampRepo.getTimestamps(currentToken, commitId);
      timelineTimestamps.push(allCommitsTimestamps);
    }else {
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
    console.log("YYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY");
    this.renderMode = renderMode;
    this.landscapeData = this.landscapeData; // trigger render update
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
      this.timestampService.timestamp =
        this.timelineTimestamps.lastObject?.epochMilli;
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

  updateLandscape(
    structureData: StructureLandscapeData,
    dynamicData: DynamicLandscapeData
  ) { 
    this.landscapeData = {
      structureLandscapeData: structureData,
      dynamicLandscapeData: dynamicData,
    };

    console.log("updateLandscape called", this.landscapeData);
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

    //console.log("----------- epochMillis timelineClicked ------------> ", epochMillis);
  }

  
  async updateTimestamp(
    epochMilli: [number?, number?],
    timestampRecordArray?: [Timestamp[]?, Timestamp[]?] 
  ) { 

    console.log("updateTimestamp", epochMilli);


    try {

      let selectedCommits = undefined;
      if(this.currentSelectedApplication){
        selectedCommits = this.currentSelectedCommits.get(this.currentSelectedApplication);
      }

      const dynamics : [LandscapeData?, LandscapeData?] = [undefined, undefined];

      if(!selectedCommits || selectedCommits.length === 0) {
        // Load dynamic structure and dynamic data with respect to all commits ("cross-commit")
        if(epochMilli[0]) {
          const [structureData, dynamicData] = await this.reloadHandler.loadLandscapeByTimestamp(undefined, epochMilli[0])
          dynamics[0] = {
            structureLandscapeData: structureData,
            dynamicLandscapeData: dynamicData
          };
        }
      } else {

        // Load dynamic structure and dynamic data for selected commits

        if(epochMilli[0] && selectedCommits.length > 0) {
          const [structureData, dynamicData] = await this.reloadHandler.loadLandscapeByTimestamp(selectedCommits[0], epochMilli[0])
          dynamics[0] = {
            structureLandscapeData: structureData,
            dynamicLandscapeData: dynamicData
          };
        }
  
        if(epochMilli[1] && selectedCommits.length === 2) {
          const [structureData, dynamicData] = await this.reloadHandler.loadLandscapeByTimestamp(selectedCommits[1], epochMilli[1])
          dynamics[1] = {
            structureLandscapeData: structureData,
            dynamicLandscapeData: dynamicData
          };
        }

      }





      this.dynamics= [dynamics[0]?.dynamicLandscapeData, dynamics[1]?.dynamicLandscapeData];
      //console.log("setting this.dynamics => ", this.dynamics);

      let newDynamic : DynamicLandscapeData;
      if (dynamics[0] && dynamics[1]) {
        // TODO: don't let the frontend combine the dynamic structures. Provide an endpoint in the backend for that
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
        this.dynamicStructureData = undefined;
        newDynamic = [];
      }


      const newStruct = combineStructures(this.staticStructureData, this.dynamicStructureData) || {landscapeToken: this.landscapeTokenService.token!.value, nodes: []};

      console.log("this.dynamicStructureData ==>", this.dynamicStructureData);
      console.log("this.staticStructureData ==>", this.staticStructureData);

      // Refactor this (find a better place for this logic)
      const renderStaticStructure = this.userSettings.applicationSettings.staticStructure.value;
      const renderDynamicStructure = this.userSettings.applicationSettings.dynamicStructure.value;

      if(renderStaticStructure && renderDynamicStructure) {
        this.renderMode = RenderMode.STATIC_DYNAMIC;
      } else if (renderStaticStructure && !renderDynamicStructure) {
        this.renderMode = RenderMode.STATIC_ONLY;
      } else if (!renderStaticStructure && renderDynamicStructure) {
        this.renderMode = RenderMode.DYNAMIC_ONLY;
      } else {
        console.debug("Should never happen!");
      }
      
      
      this.updateLandscape(newStruct, newDynamic);

      if (timestampRecordArray) {
        this.selectedTimestampRecords = timestampRecordArray;
      }
      this.timestampService.timestamp = epochMilli;

      //console.log("THIS.SELECTEDTIMESTAMPRECORDS ---------------------> ", this.selectedTimestampRecords);
      //console.log("THIS.TIMESTAMPSERVICE.TIMESTAMP --------------------> " , this.timestampService.timestamp);
    } catch (e) {
      this.debug("Landscape couldn't be requested!", e);
      this.toastHandlerService.showErrorToastMessage(
        "Landscape couldn't be requested!"
      );
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
    //console.log("CURRENT SELECTED COMMITS XXXXXXX: ", this.currentSelectedCommits);
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
    console.log("initRendering");
    this.landscapeData = null;
    this.selectedTimestampRecords = [];
    this.visualizationPaused = false;
    this.closeDataSelection();

    this.timestampPollingService.initTimestampPollingWithCallback(
      /*(this.currentSelectedApplication && 
        this.currentSelectedCommits.get(this.currentSelectedApplication)
      ) || */
      [],
      this.timestampPollingCallback.bind(this)
    );

    // applications to build a commit tree for
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
    this.resetTimestampPolling();
    this.applicationRepo.cleanup();
    this.applicationRenderer.cleanup();

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

  timestampPollingCallback(timestamps: Timestamp[][]) {

    let selectedCommits : SelectedCommit[] | undefined = undefined;
    if(this.currentSelectedApplication) {
      selectedCommits = this.currentSelectedCommits.get(this.currentSelectedApplication);
    }

    if(!selectedCommits || selectedCommits.length === 0) {
        // No application or commit selected
        // Load all time dynamics evolution => all commits considered

        const commitId = ""; // use empty string as commit id

        this.timestampRepo.addTimestamps(
          this.landscapeTokenService.token!.value,
          commitId,
          timestamps[0]
        );
        
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

        
    if ((timestamps[0].length > 0) || (selectedCommits && selectedCommits.length > 1 && timestamps[1].length > 0)) {
      this.timestampRepo.triggerTimelineUpdate();
    }

    let timestampToRender : (Timestamp | undefined)[];
    if (!this.visualizationPaused) { 

      const lastSelectTimestamp = this.timestampService.timestamp;
      if(!selectedCommits || selectedCommits.length === 0) {
        const commitId = "";
        timestampToRender = [
          this.timestampRepo.getNextTimestampOrLatest(
          this.landscapeTokenService.token!.value,
          commitId,
          lastSelectTimestamp[0]
        ),
      undefined];
      }else {
        timestampToRender = [
          this.timestampRepo.getNextTimestampOrLatest(
            this.landscapeTokenService.token!.value,
            selectedCommits[0].commitId,
            lastSelectTimestamp[0]
          ), 
          selectedCommits[1] &&
          this.timestampRepo.getNextTimestampOrLatest(
            this.landscapeTokenService.token!.value,
            selectedCommits[1].commitId,
            lastSelectTimestamp[1]
          )
        ];
      }


      const epochMillis: [number?, number?] = [undefined, undefined];
      if (
        timestampToRender[0] &&
        (this.firstCommitSelected || this.allCommitsUnselected || JSON.stringify(this.selectedTimestampRecords[0]) !==
          JSON.stringify([timestampToRender[0]]))
      ) {
        this.firstCommitSelected = false;
        this.allCommitsUnselected = false;
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
    //console.log("onTimestampUpdate");
    this.updateTimestamp([timestamp, undefined]); // TODO: properly timestamp handling
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
  getCommitTreeReference(plotlyCommitTreeRef: PlotlyCommitTree) {
    // called from within the plotly timeline component
    set(this, 'plotlyCommitTreeRef', plotlyCommitTreeRef);
  }

  @action
  toggleCommitTreeConfigurationOverview() {
    this.showConfigurationOverview = !this.showConfigurationOverview;
  }

  @action
  updateConfigurationsAndMetrics() {
    const currentToken = this.landscapeTokenService.token!.value;
    this.commitTreeConfiguration = this.configurationRepo.getConfiguration(currentToken);
    this.commitTreeMetrics = this.configurationRepo.getSoftwaremetrics(currentToken)
  }

  @action 
  updatePlotForMetrics(){
    if(this.plotlyCommitTreeRef){
      this.plotlyCommitTreeRef.updatePlotlineForMetric();
    }
  }

  @action
  plotFileMetrics() {
    if(this.plotlyCommitTreeRef){
      this.plotlyCommitTreeRef.plotFileMetrics();
    }
  }

  @action
  async commitTreeClicked(commits: Map<string,SelectedCommit[]>, staticStructureData?: StructureLandscapeData, timelineOfSelectedCommit?: number) {

    this.timestampPollingService.resetPolling();

    // always resume when commit got clicked so the landscape updates
    if(this.visualizationPaused) {
      this.resumeVisualizationUpdating();
    } 

    // TODO: deactivate (if activated) heatmap when commit gets selected


    if(staticStructureData){
      this.staticStructureData = preProcessAndEnhanceStructureLandscape(staticStructureData);
    }
    this.currentSelectedCommits = commits;
    //set(this, "currentSelectedCommits", commits);

    const selected = this.currentSelectedCommits.get(this.currentSelectedApplication!);
    const numOfSelectedCommits = selected?.length;

    if(numOfSelectedCommits && numOfSelectedCommits > 0){
      if(this.selectedTimestampRecords[1]) {console.log("UNSELECT");
        // One of two (if timelineOfSelectedCommit=0 the first selected commit and if timelineOfSelectedCommit=1 the second selected commit) commits got unselected 
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

        if(numOfSelectedCommits === 1) {
          // first commit got selected

          console.log("First commit selected!", this.staticStructureData);

          const keyForColor = this.currentSelectedApplication + selected[0].branchName;
          this.timelineColors[0] = this.applicationNameAndBranchNameToColorMap.get(keyForColor);
          this.firstCommitSelected = true;
        } else if(numOfSelectedCommits === 2) {
          // second commit got selected

          console.log("Second commit selected!");
          const keyForColor = this.currentSelectedApplication + selected[1].branchName;
          this.timelineColors[1] = this.applicationNameAndBranchNameToColorMap.get(keyForColor);
        }
  
        this.timestampPollingService.initTimestampPollingWithCallback(
          selected,
          this.timestampPollingCallback.bind(this)
        );

      }
    
    } else {
      // no commits selected anymore

      console.log("No commit selected");

      this.selectedTimestampRecords = [undefined, undefined];
      this.timelineTimestamps = [];
      this.markerState = [{}, {}];
      this.timestampService.timestamp = [undefined, undefined];
      this.timelineColors = [undefined, undefined];
      this.plotlyTimelineRef = undefined;
      this.allCommitsUnselected = true;
      this.staticStructureData = undefined;
      //this.updateLandscape({landscapeToken: this.landscapeTokenService.token!.value, nodes: []}, []);
      this.timestampPollingService.initTimestampPollingWithCallback(
        [],
        this.timestampPollingCallback.bind(this)
      );
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
