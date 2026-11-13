import { useEffect, useState } from 'react';

import BrowserRendering from 'explorviz-frontend/src/components/visualization/rendering/browser-rendering';
import PlayPauseButton from 'explorviz-frontend/src/components/visualization/rendering/play-pause-button';
import XrRendering from 'explorviz-frontend/src/components/visualization/rendering/xr-rendering';
import { useLocalUserStore } from 'explorviz-frontend/src/stores/collaboration/local-user';
import { useCommitTreeStateStore } from 'explorviz-frontend/src/stores/commit-tree-state';
import { useEntityFilteringStore } from 'explorviz-frontend/src/stores/entity-filtering-store';
import { useLandscapeTokenStore } from 'explorviz-frontend/src/stores/landscape-token';
import { useLayoutStore } from 'explorviz-frontend/src/stores/layout-store';
import {
  EvolutionModeRenderingConfiguration,
  useRenderingServiceStore,
} from 'explorviz-frontend/src/stores/rendering-service';
import { useEvolutionDataRepositoryStore } from 'explorviz-frontend/src/stores/repos/evolution-data-repository';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useTimestampRepositoryStore } from 'explorviz-frontend/src/stores/repos/timestamp-repository';
import { useSnapshotTokenStore } from 'explorviz-frontend/src/stores/snapshot-token';
import { useTimestampStore } from 'explorviz-frontend/src/stores/timestamp';
import {
  TIMESTAMP_POLLING_START_EVENT,
  useTimestampPollingStore,
} from 'explorviz-frontend/src/stores/timestamp-polling';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import { ApiToken, useUserApiTokenStore } from 'explorviz-frontend/src/stores/user-api-token';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import { useVisibilityServiceStore } from 'explorviz-frontend/src/stores/visibility-service';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import { ALL_BUILDING_COMPARISONS_VISIBLE } from 'explorviz-frontend/src/utils/city-rendering/building-comparison-visibility';
import {
  applyNewestCommitSelectionToState,
  markNewestCommitAutoSelectedForCurrentLandscape,
} from 'explorviz-frontend/src/utils/code-analysis-reload';
import eventEmitter from 'explorviz-frontend/src/utils/event-emitter';
import { DynamicLandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/telemetry/traces';
import { leaveRoomToOpenSnapshot, onSnapshotClosedForRoom } from 'explorviz-frontend/src/utils/collaboration/snapshots';
import { restoreSnapshotFromToken } from 'explorviz-frontend/src/utils/snapshot/snapshot-helpers';
import TimelineDataObjectHandler from 'explorviz-frontend/src/utils/timeline/timeline-data-object-handler';
import globalBundlingService from 'explorviz-frontend/src/view-objects/3d/city/global-bundling-service';
import { HAPSystemManager } from 'explorviz-frontend/src/view-objects/3d/city/hap-system-manager';
import { Button } from 'react-bootstrap';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import BottomBar from '../components/visualization/page-setup/bottom-bar/bottom-bar';
import {
  BottomBarActions,
  BottomBarChartView,
  BottomBarContext,
  BottomBarState,
} from '../components/visualization/page-setup/bottom-bar/bottom-bar-context';
import { useImmersiveViewStore } from '../stores/immersive-view-store';
import { useLandscapeRestructureStore } from '../stores/landscape-restructure';
import { usePopupHandlerStore } from '../stores/popup-handler';
import { FlatLandscape } from '../utils/landscape-schemes/flat-landscape';

const RUNTIME_VISUALIZATION_DEFAULTS: EvolutionModeRenderingConfiguration = {
  renderDynamic: true,
  renderStatic: true,
  renderOnlyDifferences: false,
  buildingComparisonVisibility: ALL_BUILDING_COMPARISONS_VISIBLE,
};

function applyRuntimeVisualizationDefaults() {
  useVisibilityServiceStore.getState().applyEvolutionModeRenderingConfiguration(RUNTIME_VISUALIZATION_DEFAULTS);
  useRenderingServiceStore.getState().setAnalysisModeFromEvolutionRenderingConfig(RUNTIME_VISUALIZATION_DEFAULTS);
}

function resetVisualizationSessionState(options?: { clearModels?: boolean }) {
  useLayoutStore.getState().clearLayouts();
  useVisualizationStore.getState().actions.resetVisualizationState();
  useVisualizationStore.getState().actions.setRemovedDistricts(new Set());
  useTimestampStore.getState().resetState();
  applyRuntimeVisualizationDefaults();
  useEntityFilteringStore.getState().actions.resetFilters();
  useCommitTreeStateStore.getState().resetCommitTreeFilters();
  usePopupHandlerStore.getState().clearPopups();

  if (options?.clearModels) {
    useModelStore.getState().clearAll();
  }

  HAPSystemManager.getInstance().clearAllHAPSystems();
  globalBundlingService.reset();
}

export default function Visualization() {
  const navigate = useNavigate();

  const [searchParams, setSearchParams] = useSearchParams();

  // #region States
  const [userApiTokens, setUserApiTokens] = useState<ApiToken[]>([]);
  const [visualizationPaused, setVisualizationPaused] = useState<boolean>(false);
  const [timelineDataObjectHandler] = useState<TimelineDataObjectHandler>(() => new TimelineDataObjectHandler());

  const [selectedChartOverride, setSelectedChartOverride] = useState<BottomBarChartView>();
  const [bottomBarState, setBottomBarState] = useState<Omit<BottomBarState, 'selectedChart'>>({
    isExpanded: true,
    runtimeMetricsState: {
      selectedMetric: null,
      selectedEntity: null,
    },
  });

  const bottomBarActions: BottomBarActions = {
    setIsExpanded: (isExpanded) => setBottomBarState((state) => ({ ...state, isExpanded: isExpanded })),

    setSelectedChart: setSelectedChartOverride,

    setSelectedMetric: (metric, entity) =>
      setBottomBarState((state) => ({
        ...state,
        runtimeMetricsState: {
          ...state.runtimeMetricsState,
          selectedMetric: metric,
          selectedEntity: entity ?? null,
        },
      })),

    setSelectedMetricEntity: (entity) =>
      setBottomBarState((state) => ({
        ...state,
        runtimeMetricsState: {
          ...state.runtimeMetricsState,
          selectedEntity: entity,
        },
      })),
  };

  const [countdown, setCountdown] = useState<number>(10);
  // Counts switches from one Landscape to another while the page is open (in a Room, the Host's switch).
  const [landscapeSwitches, setLandscapeSwitches] = useState(0);

  // # endregion

  // #region Store state declaration
  const renderingServiceToggleVisualizationUpdating = useRenderingServiceStore(
    (state) => state.toggleVisualizationUpdating
  );
  const renderingServiceLandscapeData = useRenderingServiceStore((state) => state._landscapeData);
  const setLandscapeDataRenderingService = useRenderingServiceStore((state) => state.setLandscapeData);
  const setVisualizationPausedRenderingService = useRenderingServiceStore((state) => state.setVisualizationPaused);
  const renderingServiceTriggerRenderingForSelectedCommits = useRenderingServiceStore(
    (state) => state.triggerRenderingForSelectedCommits
  );
  const renderingServiceTriggerRenderingForGivenLandscapeData = useRenderingServiceStore(
    (state) => state.triggerRenderingForGivenLandscapeData
  );
  const localUserVisualizationMode = useLocalUserStore((state) => state.visualizationMode);
  const setVisualizationMode = useLocalUserStore((state) => state.setVisualizationMode);
  const restartTimestampPollingAndVizUpdate = useTimestampRepositoryStore(
    (state) => state.restartTimestampPollingAndVizUpdate
  );
  const manualPollTimestamps = useTimestampPollingStore((state) => state.manuallyPollTimestamps);
  const fetchAndStoreRepositoryCommitTrees = useEvolutionDataRepositoryStore(
    (state) => state.fetchAndStoreRepositoryCommitTrees
  );
  const hasCommitData = useEvolutionDataRepositoryStore((state) =>
    Array.from(state._repoNameCommitTreeMap.values()).some((tree) =>
      tree.branches.some((branch) => branch.commits.length > 0)
    )
  );
  const hasRuntimeData = useTimestampRepositoryStore(
    (state) =>
      state.timestampsForDebugSnapshots.size > 0 ||
      Array.from(state.commitToTimestampMap.values()).some((timestamps) => timestamps.size > 0)
  );
  const setDefaultState = useCommitTreeStateStore((state) => state.setDefaultState);
  const snapshotToken = useSnapshotTokenStore((state) => state.snapshotToken);
  const landscapeTokenServiceToken = useLandscapeTokenStore((state) => state.token);
  const landscapeTokenRemoveToken = useLandscapeTokenStore((state) => state.removeToken);
  const snapshotSelected = useSnapshotTokenStore((state) => state.snapshotSelected);

  // # endregion

  // #region Computed values
  const selectedChart = selectedChartOverride ?? (hasRuntimeData && !hasCommitData ? 'runtime-chart' : 'commit-chart');

  const isLandscapeExistentAndEmpty =
    renderingServiceLandscapeData !== null &&
    (!renderingServiceLandscapeData.flatLandscapeData ||
      Object.keys(renderingServiceLandscapeData.flatLandscapeData.cities).length === 0);

  const allLandscapeDataExistsAndNotEmpty =
    renderingServiceLandscapeData !== null &&
    renderingServiceLandscapeData.flatLandscapeData &&
    Object.keys(renderingServiceLandscapeData.flatLandscapeData.cities).length > 0;

  const { mode } = useParams();

  const showAR = localUserVisualizationMode === 'ar' || mode === 'ar';
  const showVR = localUserVisualizationMode === 'vr' || mode === 'vr';

  const isSingleLandscapeMode =
    import.meta.env.VITE_ONLY_SHOW_TOKEN.length > 0 && import.meta.env.VITE_ONLY_SHOW_TOKEN !== 'change-token';

  const shouldDisplayBottomBar = !showAR && !showVR && !isSingleLandscapeMode;

  // # endregion

  // #region useEffects

  useEffect(() => {
    const loadUserAPITokens = async () => {
      const token = await useUserApiTokenStore.getState().retrieveApiTokens();
      setUserApiTokens(token);
    };

    loadUserAPITokens();
  }, []);

  // Load preset when visualization opens
  useEffect(() => {
    const { selectedPreset, loadPreset, listPresets } = useUserSettingsStore.getState();
    if (selectedPreset) {
      // Verify preset still exists before loading
      const presets = listPresets();
      if (presets.includes(selectedPreset)) {
        loadPreset(selectedPreset);
      }
    }
  }, []);

  useEffect(() => {
    if (
      landscapeTokenServiceToken === null &&
      !searchParams.get('landscapeToken') &&
      snapshotToken === null &&
      !snapshotSelected
    ) {
      navigate('/landscapes');
    }
  }, [landscapeTokenServiceToken, navigate, searchParams, snapshotToken, snapshotSelected]);

  useEffect(() => {
    return () => {
      landscapeTokenRemoveToken();
    };
  }, [landscapeTokenRemoveToken]);

  useEffect(() => {
    const handleRestructureLandscapeData = (flatStructure: FlatLandscape, dynamicData: DynamicLandscapeData) => {
      renderingServiceTriggerRenderingForGivenLandscapeData(flatStructure, dynamicData, {
        metrics: {},
        communications: [],
        fromUnixNano: 0n,
        toUnixNano: 0n,
      });
    };
    const handleToggleVisualizationUpdating = () => {
      renderingServiceToggleVisualizationUpdating();
    };

    eventEmitter.on('restructureLandscapeData', handleRestructureLandscapeData);
    eventEmitter.on('toggleVisualization', handleToggleVisualizationUpdating);

    return () => {
      eventEmitter.off('restructureLandscapeData', handleRestructureLandscapeData);
      eventEmitter.off('toggleVisualization', handleToggleVisualizationUpdating);
    };
  }, [renderingServiceToggleVisualizationUpdating, renderingServiceTriggerRenderingForGivenLandscapeData]);

  // Another Landscape was opened while this one is shown (in a Room, the Host switched it): load it as if
  // the page was opened anew. Restoring a Snapshot sets the token of its own Landscape; that is no switch.
  useEffect(
    () =>
      useLandscapeTokenStore.subscribe((state, previous) => {
        const next = state.token?.value;
        const before = previous.token?.value;
        if (!next || !before || next === before || useSnapshotTokenStore.getState().snapshotSelected) return;
        setSearchParams({ landscapeToken: next }, { replace: true });
        setLandscapeSwitches((switches) => switches + 1);
      }),
    [setSearchParams]
  );

  // Entering a Room closed the open Snapshot: load the Landscape's live data, as after a switch.
  useEffect(
    () =>
      onSnapshotClosedForRoom(() => {
        const landscapeToken = useLandscapeTokenStore.getState().token?.value;
        if (landscapeToken) setSearchParams({ landscapeToken }, { replace: true });
        setLandscapeSwitches((switches) => switches + 1);
      }),
    [setSearchParams]
  );

  useEffect(() => {
    const initRenderingAndSetupListeners = async () => {
      resetVisualizationSessionState({ clearModels: true });

      const tokenFromUrl = searchParams.get('landscapeToken');
      if (!useLandscapeTokenStore.getState().token && tokenFromUrl) {
        await useLandscapeTokenStore.getState().setTokenByValue(tokenFromUrl);
      }

      setLandscapeDataRenderingService(null);

      // set timelineDataObjectHandler where necessary
      useRenderingServiceStore.setState({
        _timelineDataObjectHandler: timelineDataObjectHandler,
      });

      useTimestampRepositoryStore.setState({
        _timelineDataObjectHandler: timelineDataObjectHandler,
      });

      setVisualizationPausedRenderingService(false);

      const snapshotOwner = searchParams.get('owner');
      const snapshotCreatedAt = searchParams.get('createdAt');
      const isSharedSnapshot = searchParams.get('sharedSnapshot') === 'true';
      // After a Landscape switch the new Landscape is loaded, not the Snapshot of the old one.
      const shouldRestoreSnapshot =
        landscapeSwitches === 0 && (snapshotSelected || (snapshotOwner !== null && snapshotCreatedAt !== null));

      if (shouldRestoreSnapshot) {
        // A Snapshot is opened alone, never in a Room.
        if (!(await leaveRoomToOpenSnapshot())) {
          useSnapshotTokenStore.setState({ snapshotToken: null, snapshotSelected: false });
          navigate('/landscapes');
          return;
        }

        let loadedSnapshot = useSnapshotTokenStore.getState().snapshotToken;

        // Ignore a stale token that belongs to another snapshot than the one requested via URL.
        if (
          loadedSnapshot &&
          snapshotOwner &&
          snapshotCreatedAt &&
          (loadedSnapshot.owner !== snapshotOwner || loadedSnapshot.createdAt !== Number(snapshotCreatedAt))
        ) {
          loadedSnapshot = null;
        }

        if (!loadedSnapshot && snapshotOwner && snapshotCreatedAt) {
          loadedSnapshot = await useSnapshotTokenStore
            .getState()
            .retrieveToken(snapshotOwner, Number(snapshotCreatedAt), isSharedSnapshot);
        }

        if (loadedSnapshot === null) {
          useToastHandlerStore.getState().showErrorToastMessage('Snapshot could not be loaded');
          navigate('/landscapes');
          return;
        }

        useSnapshotTokenStore.setState({
          snapshotToken: loadedSnapshot,
          snapshotSelected: true,
        });
        useLandscapeTokenStore.setState({
          token: loadedSnapshot.landscapeToken,
        });

        await restoreSnapshotFromToken(loadedSnapshot);
        return;
      }

      restartTimestampPollingAndVizUpdate([]);

      // Fetch repositories for evolution mode
      await fetchAndStoreRepositoryCommitTrees();

      const repoNameCommitTreeMap = useEvolutionDataRepositoryStore.getState()._repoNameCommitTreeMap;

      const commitTreeState = useCommitTreeStateStore.getState();
      if (commitTreeState.getSelectedCommits().size === 0 && applyNewestCommitSelectionToState()) {
        markNewestCommitAutoSelectedForCurrentLandscape();
      }

      let showEvolutionVisualization = false;

      const updatedCommitTreeState = useCommitTreeStateStore.getState();
      const selectedRepo = updatedCommitTreeState._currentSelectedRepositoryName;
      const selectedCommitsForCurrentSelectedRepo = updatedCommitTreeState.getSelectedCommits().get(selectedRepo);
      const initialCommit1 =
        selectedCommitsForCurrentSelectedRepo && selectedCommitsForCurrentSelectedRepo.length > 0
          ? selectedCommitsForCurrentSelectedRepo[0].commitId
          : undefined;
      const initialCommit2 =
        selectedCommitsForCurrentSelectedRepo && selectedCommitsForCurrentSelectedRepo.length > 1
          ? selectedCommitsForCurrentSelectedRepo[1].commitId
          : undefined;

      // check what kind of rendering we should start
      if (initialCommit1 && initialCommit1.length > 0) {
        showEvolutionVisualization = setDefaultState(repoNameCommitTreeMap, initialCommit1, initialCommit2);
      }

      if (showEvolutionVisualization) {
        await renderingServiceTriggerRenderingForSelectedCommits();
      } else {
        applyRuntimeVisualizationDefaults();
        restartTimestampPollingAndVizUpdate([]);
      }
    };

    initRenderingAndSetupListeners();

    return () => {
      useCommitTreeStateStore.getState().resetSelectedCommits();
      resetVisualizationSessionState({ clearModels: true });

      useEvolutionDataRepositoryStore.getState().resetAllEvolutionData();
      useImmersiveViewStore.getState().exitImmersive();
      useLandscapeRestructureStore.getState().resetLandscapeRestructure();
      usePopupHandlerStore.getState().cleanup();
      useRenderingServiceStore.getState().resetAllRenderingStates();
      useTimestampPollingStore.getState().resetState();
      useTimestampRepositoryStore.getState().resetState();

      setVisualizationMode('browser');
    };
  }, [landscapeSwitches]);

  // Countdown timer for loading screen - syncs with actual fetch intervals
  useEffect(() => {
    if (!allLandscapeDataExistsAndNotEmpty && !isLandscapeExistentAndEmpty) {
      // Start countdown from 10 when loading screen appears
      setCountdown(10);
      const countdownTick = () => setCountdown((c) => (c <= 0 ? 10 : c - 1));
      const interval = setInterval(countdownTick, 1000);

      return () => clearInterval(interval);
    }
  }, [allLandscapeDataExistsAndNotEmpty, isLandscapeExistentAndEmpty]);

  // Reset countdown when timestamp polling actually starts
  useEffect(() => {
    const handlePollingStart = () => {
      setCountdown(10); // Reset to 10 when polling starts
    };

    eventEmitter.on(TIMESTAMP_POLLING_START_EVENT, handlePollingStart);

    return () => {
      eventEmitter.off(TIMESTAMP_POLLING_START_EVENT, handlePollingStart);
    };
  }, []);

  // #endregion

  // #region Rendering

  // Use minimal setup for AR/VR
  if (localUserVisualizationMode === 'vr' || localUserVisualizationMode === 'ar') {
    return (
      <div id="vizspace">
        <XrRendering landscapeData={renderingServiceLandscapeData} />{' '}
      </div>
    );
  }

  // Browser mode
  return (
    <BottomBarContext value={{ ...bottomBarState, ...bottomBarActions, selectedChart }}>
      <div id="vizspace">
        {/* Loading screen  */}
        {!allLandscapeDataExistsAndNotEmpty && (
          <div className="loading-screen-container">
            <div className="loading-screen-content">
              {isLandscapeExistentAndEmpty ? (
                <h2 className="loading-screen-title">Received empty Landscape from Landscape Service.</h2>
              ) : (
                <>
                  <h2 className="loading-screen-title">Loading Landscape Data ...</h2>
                  <p className="loading-screen-message">Landscape data is being fetched every 10 seconds.</p>
                  <div className="loading-screen-countdown">Next fetch in: {countdown}s</div>
                  <div className="loading-screen-spinner" role="status" aria-label="Loading"></div>
                  <Button variant="primary" onClick={manualPollTimestamps} className="loading-screen-poll-button">
                    Fetch Now
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        <BrowserRendering userApiTokens={userApiTokens} visualizationPaused={visualizationPaused} />
      </div>

      {shouldDisplayBottomBar && <BottomBar timelineDataObjectHandler={timelineDataObjectHandler} />}

      <PlayPauseButton />
    </BottomBarContext>
  );

  // #endregion
}
