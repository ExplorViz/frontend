import React, { useState, useRef, useEffect } from 'react';
import SidebarHandler from '../utils/sidebar/sidebar-handler';
import {
  AnalysisMode,
  useRenderingServiceStore,
} from '../stores/rendering-service';
import { ApiToken } from '../stores/user-api-token';
import { LandscapeData } from '../utils/landscape-schemes/landscape-data';
import { Timestamp } from '../utils/landscape-schemes/timestamp';
import TimelineDataObjectHandler from '../utils/timeline/timeline-data-object-handler';
import { useSpectateConfigurationStore } from '../stores/spectate-configuration';
import {
  useLocalUserStore,
  VisualizationMode,
} from '../stores/collaboration/local-user';
import { useTimestampRepositoryStore } from '../stores/repos/timestamp-repository';
import SemanticZoomManager from '../view-objects/3d/application/utils/semantic-zoom-manager';
import { useEvolutionDataRepositoryStore } from '../stores/repos/evolution-data-repository';
import { useCommitTreeStateStore } from '../stores/commit-tree-state';
import eventEmitter from '../utils/event-emitter';
import {
  INITIAL_LANDSCAPE_EVENT,
  InitialLandscapeMessage,
} from '../utils/collaboration/web-socket-messages/receivable/landscape';
import {
  TIMESTAMP_UPDATE_EVENT,
  TimestampUpdateMessage,
} from '../utils/collaboration/web-socket-messages/sendable/timestamp-update';
import {
  SYNC_ROOM_STATE_EVENT,
  SyncRoomStateMessage,
} from '../utils/collaboration/web-socket-messages/sendable/synchronize-room-state';
import {
  TIMESTAMP_UPDATE_TIMER_EVENT,
  TimestampUpdateTimerMessage,
} from '../utils/collaboration/web-socket-messages/receivable/timestamp-update-timer';
import { useLinkRendererStore } from '../stores/link-renderer';
import { useRoomSerializerStore } from '../stores/collaboration/room-serializer';
import {
  SerializedAnnotation,
  SerializedApp,
  SerializedDetachedMenu,
  SerializedPopup,
} from '../utils/collaboration/web-socket-messages/types/serialized-room';
import { useHighlightingStore } from '../stores/highlighting';
import { ForwardedMessage } from '../utils/collaboration/web-socket-messages/receivable/forwarded';
import { useReloadHandlerStore } from '../stores/reload-handler';
import { useApplicationRendererStore } from '../stores/application-renderer';
import { useDetachedMenuRendererStore } from '../stores/extended-reality/detached-menu-renderer';
import { useToastHandlerStore } from '../stores/toast-handler';
import { useSnapshotTokenStore } from '../stores/snapshot-token';
import { useWebSocketStore } from '../stores/collaboration/web-socket';
import {
  VISUALIZATION_MODE_UPDATE_EVENT,
  VisualizationModeUpdateMessage,
} from '../utils/collaboration/web-socket-messages/sendable/visualization-mode-update';
import { useLandscapeRestructureStore } from '../stores/landscape-restructure';
import { useTimestampPollingStore } from '../stores/timestamp-polling';
import { StructureLandscapeData } from '../utils/landscape-schemes/structure-data';
import { DynamicLandscapeData } from '../utils/landscape-schemes/dynamic/dynamic-data';
import AutoJoinLobby from 'react-lib/src/components/collaboration/auto-join-lobby';
import SyncState from '../components/sync-state';
import ArRendering from 'react-lib/src/components/extended-reality/ar-rendering';
import VrRendering from 'react-lib/src/components/extender-reality/vr-rendering';
import { useUserSettingsStore } from '../stores/user-settings';
import BrowserRendering from 'react-lib/src/components/visualization/rendering/browser-rendering';
import { useLandscapeTokenStore } from '../stores/landscape-token';
import PlayPauseButton from '../components/visualization/rendering/play-pause-button';

const queryParams = [
  'roomId',
  'deviceId',
  'sharedSnapshot',
  'owner',
  'createdAt',
  'commit1',
  'commit2',
  'bottomBar',
];

export default function Visualization() {
  const sidebarHandler = useRef<SidebarHandler>(new SidebarHandler());
  const bottomBar = useRef<AnalysisMode | undefined | null>(undefined);

  // #region States
  const [commit1, setCommit1] = useState<string | undefined | null>(undefined);
  const [commit2, setCommit2] = useState<string | undefined | null>(undefined);
  const [roomId, setRoomId] = useState<string | undefined | null>(undefined);
  const [sharedSnapshot, setSharedSnapshot] = useState<
    boolean | undefined | null
  >(undefined);
  const [owner, setOwner] = useState<string | undefined | null>(undefined);
  const [createdAt, setCreatedAt] = useState<number | undefined | null>(
    undefined
  );
  const [userApiTokens, setUserApiTokens] = useState<ApiToken[]>([]);
  const [showSettingsSidebar, setShowSettingsSidebar] =
    useState<boolean>(false);
  const [showToolsSiderbar, setShowToolsSiderbar] = useState<boolean>(false);
  const [components, setComponents] = useState<string[]>([]);
  const [componentsToolsSidebar, setComponentsToolsSidebar] = useState<
    string[]
  >([]);
  const [isTimelineActive, setIsTimelineActive] = useState<boolean>(true);
  const [landscapeData, setLandscapeData] = useState<LandscapeData | null>(
    null
  );
  const [visualizationPaused, setVisualizationPaused] =
    useState<boolean>(false);
  const [timelineTimestamps, setTimelineTimestamps] = useState<Timestamp[]>([]);
  const [highlightedMarkerColor, setHighlightedMarkerColor] =
    useState<string>('blue');
  const [vrSupported, setVrSupported] = useState<boolean>(false);
  const [vrButtonText, setVrButtonText] = useState<string>('');
  const [timelineDataObjectHandler, setTimelineDataObjectHandler] =
    useState<TimelineDataObjectHandler | null>(null);
  const [isBottomBarMaximized, setIsBottomBarMaximized] =
    useState<boolean>(true);
  const [isRuntimeTimelineSelected, setIsRuntimeTimelineSelected] =
    useState<boolean>(true);
  const [isCommitTreeSelected, setIsCommitTreeSelected] =
    useState<boolean>(false);

  // # endregion

  // #region useEffects

  useEffect(() => {
    const handleRestructureLandscapeData = (
      structureData: StructureLandscapeData,
      dynamicData: DynamicLandscapeData
    ) => {
      renderingServiceTriggerRenderingForGivenLandscapeData(
        structureData,
        dynamicData
      );
    };
    const handleOpenSettingsSidebar = () => {
      sidebarHandler.current.openSettingsSidebar();
    };
    const handleToggleSettingsSidebarComponent = (param: string) => {
      sidebarHandler.current.toggleSettingsSidebarComponent(param);
    };
    const handleToggleVisualizationUpdating = () => {
      renderingServiceToggleVisualizationUpdating();
    };

    eventEmitter.on('restructureLandscapeData', handleRestructureLandscapeData);
    eventEmitter.on('openSettingsSidebar', handleOpenSettingsSidebar);
    eventEmitter.on(
      'restructureComponent',
      handleToggleSettingsSidebarComponent
    );
    eventEmitter.on('toggelVisualization', handleToggleVisualizationUpdating);

    return () => {
      willDestroy();

      eventEmitter.off(
        'restructureLandscapeData',
        handleRestructureLandscapeData
      );
      eventEmitter.off('openSettingsSidebar', handleOpenSettingsSidebar);
      eventEmitter.off(
        'restructureComponent',
        handleToggleSettingsSidebarComponent
      );
      eventEmitter.off(
        'toggelVisualization',
        handleToggleVisualizationUpdating
      );
    };
  }, []);

  useEffect(() => {
    await initRenderingAndSetupListeners(); 
  }, []);
  
  // #endregion

  // #region Store state declaration
  const renderingServiceToggleVisualizationUpdating = useRenderingServiceStore(
    (state) => state.toggleVisualizationUpdating
  );
  const renderingServiceLandscapeData = useRenderingServiceStore(
    (state) => state.landscapeData
  );
  const setLandscapeDataRenderingService = useRenderingServiceStore(
    (state) => state.setLandscapeData
  );
  const renderingServiceVisualizationPaused = useRenderingServiceStore((state) => state.visualizationPaused);
  const setVisualizationPausedRenderingService = useRenderingServiceStore(
    (state) => state.setVisualizationPaused
  );
  const renderingServiceTriggerRenderingForSelectedCommits =
    useRenderingServiceStore(
      (state) => state.triggerRenderingForSelectedCommits
    );
  const renderingServiceTriggerRenderingForGivenTimestamp =
    useRenderingServiceStore(
      (state) => state.triggerRenderingForGivenTimestamp
    );
  const renderingServiceTriggerRenderingForGivenLandscapeData =
    useRenderingServiceStore(
      (state) => state.triggerRenderingForGivenLandscapeData
    );
  const spectateUserSpectateConfigurationId = useSpectateConfigurationStore(
    (state) => state.spectateConfigurationId
  );
  const localUserVisualizationMode = useLocalUserStore(
    (state) => state.visualizationMode
  );
  const setVisualizationMode = useLocalUserStore(
    (state) => state.setVisualizationMode
  );
  const restartTimestampPollingAndVizUpdate = useTimestampRepositoryStore(
    (state) => state.restartTimestampPollingAndVizUpdate
  );
  const appNameCommitTreeMapEvolutionDataRepository =
    useEvolutionDataRepositoryStore((state) => state.appNameCommitTreeMap);
  const fetchAndStoreApplicationCommitTrees = useEvolutionDataRepositoryStore(
    (state) => state.fetchAndStoreApplicationCommitTrees
  );
  const getCurrentSelectedApplicationName = useCommitTreeStateStore(
    (state) => state.getCurrentSelectedApplicationName
  );
  const getSelectedCommits = useCommitTreeStateStore(
    (state) => state.getSelectedCommits
  );
  const setDefaultState = useCommitTreeStateStore(
    (state) => state.setDefaultState
  );
  const linkRendererFlag = useLinkRendererStore((state) => state._flag);
  const setFlag = useLinkRendererStore((state) => state.setFlag);
  const setSerializedRoom = useRoomSerializerStore(
    (state) => state.setSerializedRoom
  );
  const updateHighlighting = useHighlightingStore(
    (state) => state.updateHighlighting
  );
  const loadLandscapeByTimestamp = useReloadHandlerStore(
    (state) => state.loadLandscapeByTimestamp
  );
  const restoreFromSerialization = useApplicationRendererStore(
    (state) => state.restoreFromSerialization
  );
  const detachedMenuRendererRestore = useDetachedMenuRendererStore(
    (state) => state.restore
  );
  const detachedMenuRendererRestoreAnnotations = useDetachedMenuRendererStore(
    (state) => state.restoreAnnotations
  );
  const showInfoToastMessage = useToastHandlerStore(
    (state) => state.showInfoToastMessage
  );
  const snapshotToken = useSnapshotTokenStore((state) => state.snapshotToken);
  const defaultCamera = useLocalUserStore((state) => state.defaultCamera);
  const setDefaultCamera = useLocalUserStore((state) => state.setDefaultCamera);
  const serializeRoom = useRoomSerializerStore((state) => state.serializeRoom);
  const webSocketSend = useWebSocketStore((state) => state.send);
  const visualizationSettings = useUserSettingsStore((state) => state.visualizationSettings);
  const landscapeTokenServiceToken = useLandscapeTokenStore((state) => state.token);
  const snapshotSelected = useSnapshotTokenStore((state) => state.snapshotSelected);

  // # endregion

  // #region Getter
  const isLandscapeExistentAndEmpty = (() => {
    return (
      renderingServiceLandscapeData !== null &&
      renderingServiceLandscapeData.structureLandscapeData?.nodes.length ===
        0 &&
      (!renderingServiceLandscapeData.structureLandscapeData.k8sNodes ||
        renderingServiceLandscapeData.structureLandscapeData?.k8sNodes
          .length === 0)
    );
  })();

  const allLandscapeDataExistsAndNotEmpty = (() => {
    return (
      renderingServiceLandscapeData !== null &&
      (renderingServiceLandscapeData.structureLandscapeData?.nodes.length > 0 ||
        (renderingServiceLandscapeData.structureLandscapeData.k8sNodes &&
          renderingServiceLandscapeData.structureLandscapeData?.k8sNodes
            .length > 0))
    );
  })();

  const shouldDisplayBottomBar = () => {
    return (
      renderingServiceLandscapeData &&
      !showAR &&
      !showVR &&
      !isSingleLandscapeMode &&
      spectateUserSpectateConfigurationId !== 'arena-2'
    );
  };

  const isSingleLandscapeMode = (() => {
    return (
      import.meta.env.VITE_ONLY_SHOW_TOKEN.length > 0 &&
      import.meta.env.VITE_ONLY_SHOW_TOKEN !== 'change-token'
    );
  })();

  const showAR = (() => {
    return localUserVisualizationMode === 'ar';
  })();

  const showVR = (() => {
    return localUserVisualizationMode === 'vr';
  })();

  // # endregion

  // #region Setup
  const initRenderingAndSetupListeners = async () => {
    setTimelineDataObjectHandler(new TimelineDataObjectHandler());

    setLandscapeDataRenderingService(null);

    // set timelineDataObjectHandler where necessary
    useRenderingServiceStore.setState({
      _timelineDataObjectHandler: timelineDataObjectHandler,
    });

    useTimestampRepositoryStore.setState({
      _timelineDataObjectHandler: this.timelineDataObjectHandler,
    });

    setVisualizationPausedRenderingService(false);

    // start main loop
    restartTimestampPollingAndVizUpdate([]);

    // Delete all Semantic Zoom Objects and its tables
    SemanticZoomManager.instance.reset();

    // fetch applications for evolution mode
    await fetchAndStoreApplicationCommitTrees();

    let showEvolutionVisualization = false;

    const selectedApp = getCurrentSelectedApplicationName();
    const selectedCommitsForCurrentSelectedApp =
      getSelectedCommits().get(selectedApp);
    setCommit1(
      selectedCommitsForCurrentSelectedApp &&
        selectedCommitsForCurrentSelectedApp.length > 0
        ? selectedCommitsForCurrentSelectedApp[0].commitId
        : undefined
    );

    setCommit2(
      selectedCommitsForCurrentSelectedApp &&
        selectedCommitsForCurrentSelectedApp.length > 1
        ? selectedCommitsForCurrentSelectedApp[1].commitId
        : undefined
    );

    // check what kind of rendering we should start
    if (commit1 && commit1.length > 0) {
      showEvolutionVisualization = setDefaultState(
        appNameCommitTreeMapEvolutionDataRepository,
        commit1,
        commit2
      );

      // Check which bottom bar should be displayed by default
      if (bottomBar.current === 'runtime') {
        setIsRuntimeTimelineSelected(true);
        setIsCommitTreeSelected(false);
      } else {
        setIsRuntimeTimelineSelected(false);
        setIsCommitTreeSelected(true);
      }
    }

    if (showEvolutionVisualization) {
      renderingServiceTriggerRenderingForSelectedCommits();
    } else {
      // start main loop for cross-commit runtime
      restartTimestampPollingAndVizUpdate([]);
    }

    eventEmitter.on(INITIAL_LANDSCAPE_EVENT, onInitialLandscape);
    eventEmitter.on(TIMESTAMP_UPDATE_EVENT, onTimestampUpdate);
    eventEmitter.on(SYNC_ROOM_STATE_EVENT, onSyncRoomState);

    if (!isSingleLandscapeMode) {
      eventEmitter.on(TIMESTAMP_UPDATE_TIMER_EVENT, onTimestampUpdateTimer);
    }

    eventEmitter.on(TIMESTAMP_UPDATE_EVENT, onTimestampUpdate);
  };

  // # endregion

  // #region Event Handlers

  // collaboration start
  // user handling end
  const onInitialLandscape = async ({
    landscape,
    openApps,
    detachedMenus,
    highlightedExternCommunicationLinks, //transparentExternCommunicationLinks
    annotations,
  }: InitialLandscapeMessage): Promise<void> => {
    setFlag(true);
    while (linkRendererFlag) {
      await new Promise((resolve) => {
        setTimeout(() => {
          resolve(null);
        }, 50);
      });
    }
    // Now we can be sure our linkRenderer has all extern links

    // Serialized room is used in landscape-data-watcher
    setSerializedRoom({
      landscape: landscape,
      openApps: openApps as SerializedApp[],
      detachedMenus: detachedMenus as SerializedDetachedMenu[],
      highlightedExternCommunicationLinks,
      popups: [], // ToDo
      annotations: annotations as SerializedAnnotation[],
    });

    updateHighlighting();
    await renderingServiceTriggerRenderingForGivenTimestamp(
      landscape.timestamp
    );
    // Disable polling. It is now triggerd by the websocket.
  };

  const onTimestampUpdate = async ({
    originalMessage: { timestamp },
  }: ForwardedMessage<TimestampUpdateMessage>): Promise<void> => {
    renderingServiceTriggerRenderingForGivenTimestamp(timestamp);
  };

  const onTimestampUpdateTimer = async ({
    timestamp,
  }: TimestampUpdateTimerMessage): Promise<void> => {
    await loadLandscapeByTimestamp(timestamp);
    renderingServiceTriggerRenderingForGivenTimestamp(timestamp);
  };

  const onSyncRoomState = async (event: {
    userId: string;
    originalMessage: SyncRoomStateMessage;
  }) => {
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
    restoreFromSerialization(serializedRoom);
    detachedMenuRendererRestore(
      serializedRoom.popups,
      serializedRoom.detachedMenus
    );
    detachedMenuRendererRestoreAnnotations(serializedRoom.annotations);

    updateHighlighting();

    showInfoToastMessage('Room state synchronizing ...');
  };

  const loadSnapshot = async () => {
    if (snapshotToken === null) {
      return;
    }

    // make sure our linkRenderer has all extern links
    setFlag(true);
    while (linkRendererFlag) {
      // war mal 350?
      await new Promise((resolve) => {
        setTimeout(() => {
          resolve(null);
        }, 50);
      });
    }

    /**
     * Serialized room is used in landscape-data-watcher to load the landscape with
     * all highlights and popUps.
     */
    setSerializedRoom(snapshotToken.serializedRoom);

    let dc = defaultCamera;
    dc.position.set(
      snapshotToken.camera!.x,
      snapshotToken.camera!.y,
      snapshotToken.camera!.z
    );
    setDefaultCamera(dc);
  };
  // #endregion

  // #region XR
  const switchToAR = () => {
    switchToMode('ar');
  };

  const switchToVR = () => {
    if (vrSupported) {
      switchToMode('vr');
    }
  };

  const switchToOnScreenMode = () => {
    switchToMode('browser');
  };

  const switchToMode = (mode: VisualizationMode) => {
    serializeRoom();
    sidebarHandler.current.closeSettingsSidebar();
    setVisualizationMode(mode);
    webSocketSend<VisualizationModeUpdateMessage>(
      VISUALIZATION_MODE_UPDATE_EVENT,
      { mode }
    );
  };

  /**
   * Checks the current status of WebXR in the browser and if compatible
   * devices are connected. Sets the tracked properties
   * 'vrButtonText' and 'vrSupported' accordingly.
   */
  const updateVrStatus = async () => {
    if ('xr' in navigator) {
      setVrSupported(
        (await navigator.xr?.isSessionSupported('immersive-vr')) || false
      );

      if (vrSupported) {
        setVrButtonText('Enter VR');
      } else if (!window.isSecureContext) {
        setVrButtonText('WEBXR NEEDS HTTPS');
      } else {
        setVrButtonText('WEBXR NOT AVAILABLE');
      }
    } else {
      setVrButtonText('WEBXR NOT SUPPORTED');
    }
  };

  // #endregion

  // #region Template Action
  const toggleBottomChart = () => {
    // Disable keyboard events for button to prevent space bar
    document.getElementById('bottom-bar-toggle-chart-button')?.blur();

    setIsCommitTreeSelected(!isCommitTreeSelected);
    setIsRuntimeTimelineSelected(!isCommitTreeSelected);
  };

  const toggleVisibilityBottomBar = () => {
    setIsBottomBarMaximized(!isBottomBarMaximized);
  };

  // #endregion

  // #region Cleanup

  const willDestroy = () => {
    useLandscapeRestructureStore.getState().resetLandscapeRestructure();
    useTimestampPollingStore.getState().resetPolling();
    useApplicationRendererStore.getState().cleanup();
    useTimestampRepositoryStore.setState({ commitToTimestampMap: new Map() });
    useRenderingServiceStore.getState().resetAllRenderingStates();

    if (sidebarHandler.current) {
      sidebarHandler.current.closeSettingsSidebar();
      sidebarHandler.current.closeToolsSidebar();
    }

    // Always show runtime first
    setIsRuntimeTimelineSelected(true);
    setIsCommitTreeSelected(false);

    useEvolutionDataRepositoryStore.resetAllEvolutionData();

    setRoomId(null);
    useLocalUserStore.setState({ visualizationMode: 'browser' });

    if (useWebSocketStore.getState().isWebSocketOpen()) {
      eventEmitter.off(INITIAL_LANDSCAPE_EVENT, onInitialLandscape);
      eventEmitter.off(TIMESTAMP_UPDATE_EVENT, onTimestampUpdate);
      eventEmitter.off(TIMESTAMP_UPDATE_TIMER_EVENT, onTimestampUpdateTimer);
      eventEmitter.off(SYNC_ROOM_STATE_EVENT, onSyncRoomState);
    }

    eventEmitter.off(TIMESTAMP_UPDATE_EVENT, onTimestampUpdate);
  };

  const removeTimestampListener = () => {
    if (useWebSocketStore.getState().isWebSocketOpen()) {
      eventEmitter.off(TIMESTAMP_UPDATE_TIMER_EVENT, onTimestampUpdateTimer);
    }
  };

  // #endregion

  // TODO: Add stuff from app/app/router/visualization 
  // TODO: Check for Args from parent

  return (
    <>
    <AutoJoinLobby roomId={roomId} />

    <div
      id='vizspace'
    >
      <SyncState />

      {/* Loading screen  */}
      {!allLandscapeDataExistsAndNotEmpty &&
        <div className='container-fluid mt-6'>
          <div className='jumbotron'>
            {isLandscapeExistentAndEmpty ? 
              <h2>Empty Landscape received.</h2>
              :
              <h2>Loading Landscape ...</h2>
            }
            <p>A new landscape will be fetched every 10 seconds.</p>
          </div>
          <div className='spinner-center-3' role='status'></div>
        </div>
      }

      {/* ! Rendering mode */}
      {showAR ?
        <ArRendering
          id='ar-rendering'
          landscapeData={renderingServiceLandscapeData}
          switchToOnScreenMode={switchToOnScreenMode}
          toggleVisualizationUpdating={renderingServiceToggleVisualizationUpdating}
          visualizationPaused={renderingServiceVisualizationPaused}
          openedSettingComponent={sidebarHandler.current.openedSettingComponent}
          toggleSettingsSidebarComponent={sidebarHandler.current.toggleSettingsSidebarComponent}
          showSettingsSidebar={sidebarHandler.current.showSettingsSidebar}
          openSettingsSidebar={sidebarHandler.current.openSettingsSidebar}
          closeSettingsSidebar={sidebarHandler.current.closeSettingsSidebar}
        />

      :
        {showVR ?
          <VrRendering 
            id='vr-rendering'
            landscapeData={renderingServiceLandscapeData}
            switchToOnScreenMode={switchToOnScreenMode}
            debugMode={visualizationSettings!.showVrOnClick.value}
          />

        :
          <BrowserRendering
            // addComponent={addComponent}
            // applicationArgs={applicationArgs}
            // closeDataSelection={closeDataSelection}
            closeToolsSidebar={sidebarHandler.current.closeToolsSidebar}
            closeSettingsSidebar={sidebarHandler.current.closeSettingsSidebar}
            components={components}
            componentsToolsSidebar={componentsToolsSidebar}
            id='browser-rendering'
            isDisplayed={allLandscapeDataExistsAndNotEmpty}
            landscapeData={renderingServiceLandscapeData}
            landscapeToken={landscapeTokenServiceToken}
            openedSettingComponent={sidebarHandler.current.openedSettingComponent}
            openedToolComponent={sidebarHandler.current.openedToolComponent}
            openSettingsSidebar={sidebarHandler.current.openSettingsSidebar}
            openToolsSidebar={sidebarHandler.current.openToolsSidebar}
            // pauseVisualizationUpdating={pauseVisualizationUpdating}
            removeTimestampListener={removeTimestampListener}
            // removeToolsSidebarComponent={sidebarHandler.current.removeToolsSidebarComponent}
            // restructureLandscape={restructureLandscape}
            showSettingsSidebar={sidebarHandler.current.showSettingsSidebar}
            showToolsSidebar={sidebarHandler.current.showToolsSidebar}
            snapshot={snapshotSelected}
            snapshotReload={snapshotToken}
            switchToAR={switchToAR}
            triggerRenderingForGivenLandscapeData={renderingServiceTriggerRenderingForGivenLandscapeData}
            toggleSettingsSidebarComponent={sidebarHandler.current.toggleSettingsSidebarComponent}
            toggleToolsSidebarComponent={sidebarHandler.current.toggleToolsSidebarComponent}
            toggleVisualizationUpdating={renderingServiceToggleVisualizationUpdating}
            // updateLandscape={updateLandscape}
            userApiTokens={userApiTokens}
            visualizationPaused={visualizationPaused}
          />
        }
      }
    </div>

    {/* {{! Bottom Bar }}
    {{#if this.shouldDisplayBottomBar}}
      <div id='bottom-bar-container'>

        {{! Toggle Bottom Bar Button}}
        <BsButton
          @onClick={{this.toggleVisibilityBottomBar}}
          @type='secondary'
          @outline={{true}}
          class='bottom-bar-toggle-btn'
          title={{if this.isBottomBarMaximized 'Hide Bottom Bar' 'Show Bottom Bar'}}
        >

          {{#unless this.isBottomBarMaximized}}
            <span class='pr-1'>Bottom Bar</span>
          {{/unless}}
          {{svg-jar
            'chevron-up-16'
            id='hide-bottom-bar-icon'
            class=(if
              this.isBottomBarMaximized
              'octicon align-middle hide-bottom-bar-icon-down'
              'octicon align-middle'
            )
          }}
        </BsButton>

        {{! VR Button}}
        {{#if
          (and
            this.userSettings.visualizationSettings.showVrButton.value
            (not this.showVR)
          )
        }}
          <button
            class='bottom-bar-vr-button'
            type='button'
            {{did-insert this.updateVrStatus}}
            {{on 'click' this.switchToVR}}
          >
            {{this.vrButtonText}}
          </button>
        {{/if}}

        {{! Runtime / Code Charts}}
        <div
          id='bottom-bar-chart-container'
          class='bottom-bar-chart
            {{if
              (and this.isCommitTreeSelected this.isBottomBarMaximized)
              "bottom-bar-chart-commitTree"
            }}
            {{unless this.isBottomBarMaximized "bottom-bar-chart-hide"}}'
        >

          <div id='bottom-bar-chart-button-div'>
            <BsButton
              id='bottom-bar-toggle-chart-button'
              @onClick={{this.toggleBottomChart}}
              @outline={{true}}
              class='bottom-bar-chart-button'
            >
              {{if this.isRuntimeTimelineSelected 'Show Commit Chart'}}
              {{if this.isCommitTreeSelected 'Show Runtime Chart'}}
            </BsButton>
          </div>

          {{#if this.isRuntimeTimelineSelected}}
            <Visualization::PageSetup::BottomBar::Runtime::PlotlyTimeline
              @timelineDataObject={{this.timelineDataObjectHandler.timelineDataObject}}
              @clicked={{this.timelineDataObjectHandler.timelineClicked}}
            />
          {{/if}}

          {{#if this.isCommitTreeSelected}}
            <div class='row justify-content-md-center'>
              {{!-- TODO: CommitTreeApplicationSelection is a bit off to the left. Find solution.  --}}
              <div class='row justify-content-md-center'
              {{react
                this.commitTreeApplicationSelection
                appNameCommitTreeMap=this.evolutionDataRepository.appNameCommitTreeMap
                selectedAppName=this.commitTreeStateService.currentSelectedApplicationName
              }} />
              <Visualization::PageSetup::BottomBar::Evolution::EvolutionRenderingButtons
                @selectedAppName={{this.commitTreeStateService.currentSelectedApplicationName}}
                @selectedCommits={{this.commitTreeStateService.selectedCommits}}
              />
            </div>
            <Visualization::PageSetup::BottomBar::Evolution::PlotlyCommitTree
              @appNameCommitTreeMap={{this.evolutionDataRepository.appNameCommitTreeMap}}
              @triggerVizRenderingForSelectedCommits={{this.renderingService.triggerRenderingForSelectedCommits}}
              @selectedAppName={{this.commitTreeStateService.currentSelectedApplicationName}}
              @selectedCommits={{this.commitTreeStateService.selectedCommits}}
              @setSelectedCommits={{this.commitTreeStateService.setSelectedCommits}}
              @getCloneOfAppNameAndBranchNameToColorMap={{this.commitTreeStateService.getCloneOfAppNameAndBranchNameToColorMap}}
              @setAppNameAndBranchNameToColorMap={{this.commitTreeStateService.setAppNameAndBranchNameToColorMap}}
            />
          {{/if}}

        </div>
      </div>
    {{/if}} */}

    <PlayPauseButton />
    </>
  );
}
