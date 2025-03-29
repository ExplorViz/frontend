import React, { useState, useRef, useEffect } from 'react';

import {
  AnalysisMode,
  useRenderingServiceStore,
} from 'react-lib/src/stores/rendering-service';
import { Font, FontLoader } from 'three-stdlib'; //'three/examples/jsm/loaders/FontLoader';
import { ApiToken, useUserApiTokenStore } from '../stores/user-api-token';
import { LandscapeData } from '../utils/landscape-schemes/landscape-data';
import { Timestamp } from '../utils/landscape-schemes/timestamp';
import TimelineDataObjectHandler from '../utils/timeline/timeline-data-object-handler';
import { useSpectateConfigurationStore } from '../stores/spectate-configuration';
import {
  useLocalUserStore,
  VisualizationMode,
} from 'react-lib/src/stores/collaboration/local-user';
import { useTimestampRepositoryStore } from 'react-lib/src/stores/repos/timestamp-repository';
import SemanticZoomManager from '../view-objects/3d/application/utils/semantic-zoom-manager';
import { useEvolutionDataRepositoryStore } from 'react-lib/src/stores/repos/evolution-data-repository';
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
import { useSnapshotTokenStore } from 'react-lib/src/stores/snapshot-token';
import { useWebSocketStore } from 'react-lib/src/stores/collaboration/web-socket';
import {
  VISUALIZATION_MODE_UPDATE_EVENT,
  VisualizationModeUpdateMessage,
} from '../utils/collaboration/web-socket-messages/sendable/visualization-mode-update';
import { useLandscapeRestructureStore } from '../stores/landscape-restructure';
import { useTimestampPollingStore } from 'react-lib/src/stores/timestamp-polling';
import { StructureLandscapeData } from '../utils/landscape-schemes/structure-data';
import { DynamicLandscapeData } from '../utils/landscape-schemes/dynamic/dynamic-data';
// import ArRendering from 'react-lib/src/components/extended-reality/ar-rendering';
import VrRendering from 'react-lib/src/components/extended-reality/vr-rendering';
import { useUserSettingsStore } from '../stores/user-settings';
import BrowserRendering from 'react-lib/src/components/visualization/rendering/browser-rendering';
import { useLandscapeTokenStore } from '../stores/landscape-token';
import PlayPauseButton from '../components/visualization/rendering/play-pause-button';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useFontRepositoryStore } from '../stores/repos/font-repository';
import { Button } from 'react-bootstrap';
import PlotlyTimeline from 'react-lib/src/components/visualization/page-setup/bottom-bar/runtime/plotly-timeline';
import CommitTreeApplicationSelection from '../components/visualization/page-setup/bottom-bar/evolution/commit-tree-application-selection';
import EvolutionRenderingButtons from '../components/extended-reality/visualization/page-setup/bottom-bar/evolution/evolution-rendering-buttons';
import PlotlyCommitTree from 'react-lib/src/components/visualization/page-setup/bottom-bar/evolution/plotly-commit-tree';
import { ChevronUpIcon } from '@primer/octicons-react';
import { useCollaborationSessionStore } from '../stores/collaboration/collaboration-session';
import useSyncState from '../hooks/sync-state';
import { useShallow } from 'zustand/react/shallow';
import { ImmersiveView } from '../rendering/application/immersive-view';
import { useTimestampStore } from '../stores/timestamp';

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
  const bottomBar = useRef<AnalysisMode | undefined | null>(undefined);
  const navigate = useNavigate();

  const [searchParams, setSearchParams] = useSearchParams();

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
    useState<TimelineDataObjectHandler>(new TimelineDataObjectHandler()); //(null);
  const [isBottomBarMaximized, setIsBottomBarMaximized] =
    useState<boolean>(true);
  const [isRuntimeTimelineSelected, setIsRuntimeTimelineSelected] =
    useState<boolean>(true);
  const [isCommitTreeSelected, setIsCommitTreeSelected] =
    useState<boolean>(false);

  // # endregion

  // #region useEffects

  useEffect(() => {
    const loadUserAPITokens = async () => {
      const token = await useUserApiTokenStore.getState().retrieveApiTokens();
      setUserApiTokens(token);
    };

    loadUserAPITokens();
  }, []);

  // beforeModel equivalent
  useEffect(() => {
    const loadFont = async () => {
      return await new Promise<Font>((resolve, reject) => {
        new FontLoader().load(
          // resource URL
          '/three.js/fonts/roboto_mono_bold_typeface.json',

          // onLoad callback
          (font) => {
            setFont(font);
            SemanticZoomManager.instance.font = font;
            ImmersiveView.instance.font = font;
            resolve(font);
          },
          undefined,
          (e) => {
            useToastHandlerStore
              .getState()
              .showErrorToastMessage('Failed to load font for labels.');
            reject(e);
          }
        );
      });
    };

    if (
      landscapeTokenServiceToken === null &&
      snapshotToken === null &&
      !snapshotSelected
    ) {
      navigate('/landscapes');
    }

    if (!font) {
      loadFont();
    }

    return () => {
      landscapeTokenRemoveToken();
    };
  }, []);

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
    const handleToggleVisualizationUpdating = () => {
      renderingServiceToggleVisualizationUpdating();
    };

    eventEmitter.on('restructureLandscapeData', handleRestructureLandscapeData);
    eventEmitter.on('toggelVisualization', handleToggleVisualizationUpdating);

    return () => {
      willDestroy();

      eventEmitter.off(
        'restructureLandscapeData',
        handleRestructureLandscapeData
      );
      eventEmitter.off(
        'toggelVisualization',
        handleToggleVisualizationUpdating
      );
    };
  }, []);

  useEffect(() => {
    initRenderingAndSetupListeners();
  }, []);

  // equivalent to old auto-join-lobby
  useEffect(() => {
    const autoJoinLobby = async (retries = 5) => {
      if (connectionStatus === 'online') {
        return;
      }
      const roomHosted = await hostRoom(searchParams.get('roomId')!);

      if (!roomHosted && retries <= 0) {
        useToastHandlerStore
          .getState()
          .showErrorToastMessage('Failed to join room automatically.');
      } else {
        setTimeout(() => {
          autoJoinLobby(retries - 1);
        }, 5000);
      }
    };

    if (searchParams.get('roomId')) {
      autoJoinLobby();
    }
  }, []);

  useEffect(() => {
    const fetchVrStatus = async () => {
      await updateVrStatus();
    };
    fetchVrStatus();
  }, []);

  useSyncState();

  // #endregion

  // #region Store state declaration
  const connectionStatus = useCollaborationSessionStore(
    (state) => state.connectionStatus
  );
  const hostRoom = useCollaborationSessionStore((state) => state.hostRoom);
  const renderingServiceToggleVisualizationUpdating = useRenderingServiceStore(
    (state) => state.toggleVisualizationUpdating
  );
  const renderingServiceLandscapeData = useRenderingServiceStore(
    (state) => state._landscapeData
  );
  const setLandscapeDataRenderingService = useRenderingServiceStore(
    (state) => state.setLandscapeData
  );
  const renderingServiceVisualizationPaused = useRenderingServiceStore(
    (state) => state._visualizationPaused
  );
  const setVisualizationPausedRenderingService = useRenderingServiceStore(
    (state) => state.setVisualizationPaused
  );
  const renderingServiceTriggerRenderingForSelectedCommits =
    useRenderingServiceStore(
      (state) => state.triggerRenderingForSelectedCommits
    );
  const renderingServiceTriggerRenderingForGivenTimestamp =
    useRenderingServiceStore(
      (state) => state.triggerRenderingForGivenTimestamps
    );
  const renderingServiceTriggerRenderingForGivenLandscapeData =
    useRenderingServiceStore(
      (state) => state.triggerRenderingForGivenLandscapeData
    );
  const spectateUserSpectateConfigurationId = useSpectateConfigurationStore(
    (state) => state.spectateConfig?.id
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
    useEvolutionDataRepositoryStore((state) => state._appNameCommitTreeMap);
  const fetchAndStoreApplicationCommitTrees = useEvolutionDataRepositoryStore(
    (state) => state.fetchAndStoreApplicationCommitTrees
  );
  const getCurrentSelectedApplicationName = useCommitTreeStateStore(
    (state) => state.getCurrentSelectedApplicationName
  );
  const getSelectedCommits = useCommitTreeStateStore(
    (state) => state.getSelectedCommits
  );
  const setSelectedCommits = useCommitTreeStateStore(
    (state) => state.setSelectedCommits
  );
  const setDefaultState = useCommitTreeStateStore(
    (state) => state.setDefaultState
  );
  const getCloneOfAppNameAndBranchNameToColorMap = useCommitTreeStateStore(
    (state) => state.getCloneOfAppNameAndBranchNameToColorMap
  );
  const setAppNameAndBranchNameToColorMap = useCommitTreeStateStore(
    (state) => state.setAppNameAndBranchNameToColorMap
  );
  const linkRendererFlag = useLinkRendererStore((state) => state._flag);
  const setFlag = useLinkRendererStore((state) => state.setFlag);
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
  const webSocketSend = useWebSocketStore((state) => state.send);
  const visualizationSettings = useUserSettingsStore(
    (state) => state.visualizationSettings
  );
  const landscapeTokenServiceToken = useLandscapeTokenStore(
    (state) => state.token
  );
  const landscapeTokenRemoveToken = useLandscapeTokenStore(
    (state) => state.removeToken
  );
  const snapshotSelected = useSnapshotTokenStore(
    (state) => state.snapshotSelected
  );
  const font = useFontRepositoryStore((state) => state.font);
  const setFont = useFontRepositoryStore((state) => state.setFont);
  const currentSelectedApplicationName = useCommitTreeStateStore(
    (state) => state._currentSelectedApplicationName
  );

  const roomSerializer = useRoomSerializerStore(
    useShallow((state) => ({
      serializeRoom: state.serializeRoom,
      setSerializedRoom: state.setSerializedRoom,
    }))
  );

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

  const { mode } = useParams();

  const showAR = (() => {
    return localUserVisualizationMode === 'ar' || mode === 'ar';
  })();

  const showVR = (() => {
    return localUserVisualizationMode === 'vr' || mode === 'vr';
  })();

  // # endregion

  // #region Setup
  const initRenderingAndSetupListeners = async () => {
    setLandscapeDataRenderingService(null);

    // set timelineDataObjectHandler where necessary
    useRenderingServiceStore.setState({
      _timelineDataObjectHandler: timelineDataObjectHandler,
    });

    useTimestampRepositoryStore.setState({
      _timelineDataObjectHandler: timelineDataObjectHandler,
    });

    setVisualizationPausedRenderingService(false);

    if (snapshotSelected) {
      const snapshotToken = await useSnapshotTokenStore.getState().retrieveToken(searchParams.get('owner')!, Number(searchParams.get('createdAt')!), searchParams.get('isShared')! === "true" ? true : false);
      if (snapshotToken === null) {
        useToastHandlerStore.getState().showErrorToastMessage('Snapshot could not be loaded');
        navigate("/landscapes");
      } else {
        useSnapshotTokenStore.setState({ snapshotToken: snapshotToken });
      }

      if (useSnapshotTokenStore.getState().snapshotToken !== null) {
        useLandscapeTokenStore.setState({ token: useSnapshotTokenStore.getState().snapshotToken?.landscapeToken});
        loadSnapshot();
      }
    }

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
    roomSerializer.setSerializedRoom({
      landscape: landscape,
      openApps: openApps as SerializedApp[],
      detachedMenus: detachedMenus as SerializedDetachedMenu[],
      highlightedExternCommunicationLinks,
      popups: [],
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
    roomSerializer.setSerializedRoom(snapshotToken.serializedRoom);

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
    roomSerializer.serializeRoom();
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
      const isSessionSupported =
        (await navigator.xr?.isSessionSupported('immersive-vr')) || false;
      setVrSupported(isSessionSupported!);

      if (isSessionSupported) {
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

    setIsCommitTreeSelected((prev) => !prev);
    setIsRuntimeTimelineSelected((prev) => !prev);
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

    // Always show runtime first
    setIsRuntimeTimelineSelected(true);
    setIsCommitTreeSelected(false);

    useEvolutionDataRepositoryStore.getState().resetAllEvolutionData();

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

  // TODO: Check for Args from parent

  return (
    <>
      <div id="vizspace">
        {/* Loading screen  */}
        {!allLandscapeDataExistsAndNotEmpty && (
          <div className="container-fluid mt-6">
            <div className="jumbotron">
              {isLandscapeExistentAndEmpty ? (
                <h2>Empty Landscape received.</h2>
              ) : (
                <h2>Loading Landscape ...</h2>
              )}
              <p>A new landscape will be fetched every 10 seconds.</p>
            </div>
            <div className="spinner-center-3" role="status"></div>
          </div>
        )}

        {/* ! Rendering mode */}
        {showAR ? (
          <></>
        ) : // <ArRendering
        //   id="ar-rendering"
        //   landscapeData={renderingServiceLandscapeData}
        //   switchToOnScreenMode={switchToOnScreenMode}
        //   toggleVisualizationUpdating={
        //     renderingServiceToggleVisualizationUpdating
        //   }
        //   visualizationPaused={renderingServiceVisualizationPaused}
        //   openedSettingComponent={
        //     sidebarHandler.openedSettingComponent
        //   }
        //   toggleSettingsSidebarComponent={
        //     sidebarHandler.toggleSettingsSidebarComponent
        //   }
        //   showSettingsSidebar={sidebarHandler.showSettingsSidebar}
        //   openSettingsSidebar={sidebarHandler.openSettingsSidebar}
        //   closeSettingsSidebar={sidebarHandler.closeSettingsSidebar}
        // />
        showVR ? (
          <VrRendering
            id="vr-rendering"
            landscapeData={renderingServiceLandscapeData!}
            switchToOnScreenMode={switchToOnScreenMode}
            debugMode={visualizationSettings?.showVrOnClick.value ?? false}
          />
        ) : (
          <BrowserRendering
            // addComponent={addComponent}
            // applicationArgs={applicationArgs}
            // closeDataSelection={closeDataSelection}
            components={components}
            componentsToolsSidebar={componentsToolsSidebar}
            id="browser-rendering"
            isDisplayed={allLandscapeDataExistsAndNotEmpty}
            landscapeData={renderingServiceLandscapeData}
            landscapeToken={landscapeTokenServiceToken}
            removeTimestampListener={removeTimestampListener}
            // restructureLandscape={restructureLandscape}
            snapshot={snapshotSelected}
            snapshotReload={snapshotToken}
            switchToAR={switchToAR}
            toggleVisualizationUpdating={
              renderingServiceToggleVisualizationUpdating
            }
            // updateLandscape={updateLandscape}
            userApiTokens={userApiTokens}
            visualizationPaused={visualizationPaused}
          />
        )}
      </div>

      {/* ! Bottom Bar */}
      {shouldDisplayBottomBar() && (
        <div id="bottom-bar-container">
          <>
            {/* ! Toggle Bottom Bar Button */}
            <Button
              onClick={toggleVisibilityBottomBar}
              variant="secondary"
              className="bottom-bar-toggle-btn"
              title={
                isBottomBarMaximized ? 'Hide Bottom Bar' : 'Show Bottom Bar'
              }
            >
              {!isBottomBarMaximized && (
                <span className="pr-1">Bottom Bar</span>
              )}
              <ChevronUpIcon
                size="small"
                className={
                  isBottomBarMaximized
                    ? 'align-middle hide-bottom-bar-icon-down'
                    : 'align-middle'
                }
              />
            </Button>

            {/* ! VR Button */}
            {visualizationSettings.showVrButton.value && !showVR && (
              <button
                className="bottom-bar-vr-button"
                type="button"
                onClick={switchToVR}
              >
                {vrButtonText}
              </button>
            )}

            {/* ! Runtime / Code Charts */}
            <div
              id="bottom-bar-chart-container"
              className={`bottom-bar-chart 
                ${isCommitTreeSelected && isBottomBarMaximized ? 'bottom-bar-chart-commitTree' : ''} 
                ${!isBottomBarMaximized ? 'bottom-bar-chart-hide' : ''}`}
            >
              <div id="bottom-bar-chart-button-div">
                <Button
                  id="bottom-bar-toggle-chart-button"
                  onClick={toggleBottomChart}
                  className="bottom-bar-chart-button"
                >
                  {isRuntimeTimelineSelected ? 'Show Commit Chart' : ''}
                  {isCommitTreeSelected ? 'Show Runtime Chart' : ''}
                </Button>
              </div>

              {isRuntimeTimelineSelected && (
                <>
                  <PlotlyTimeline
                    timelineDataObject={
                      timelineDataObjectHandler.timelineDataObject!
                    }
                    clicked={timelineDataObjectHandler.timelineClicked}
                  />
                </>
              )}

              {isCommitTreeSelected && (
                <>
                  <div className="row justify-content-md-center">
                    {/* !-- TODO: CommitTreeApplicationSelection is a bit off to the left. Find solution. */}
                    <div className="row justify-content-md-center">
                      <CommitTreeApplicationSelection
                        appNameCommitTreeMap={
                          appNameCommitTreeMapEvolutionDataRepository
                        }
                        selectedAppName={currentSelectedApplicationName}
                      />
                    </div>
                    <EvolutionRenderingButtons
                      selectedAppName={currentSelectedApplicationName}
                      selectedCommits={getSelectedCommits()}
                    />
                  </div>
                  <PlotlyCommitTree
                    appNameCommitTreeMap={
                      appNameCommitTreeMapEvolutionDataRepository
                    }
                    triggerVizRenderingForSelectedCommits={
                      renderingServiceTriggerRenderingForSelectedCommits
                    }
                    selectedAppName={currentSelectedApplicationName}
                    selectedCommits={getSelectedCommits()}
                    setSelectedCommits={setSelectedCommits}
                    getCloneOfAppNameAndBranchNameToColorMap={
                      getCloneOfAppNameAndBranchNameToColorMap
                    }
                    setAppNameAndBranchNameToColorMap={
                      setAppNameAndBranchNameToColorMap
                    }
                  />
                </>
              )}
            </div>
          </>
        </div>
      )}

      <PlayPauseButton />
    </>
  );
}
