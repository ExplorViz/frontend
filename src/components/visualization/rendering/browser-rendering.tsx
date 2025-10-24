import { useEffect, useRef, useState } from 'react';

import CollaborationOpener from 'explorviz-frontend/src/components/collaboration/visualization/page-setup/sidebar/customizationbar/collaboration/collaboration-opener';
import VscodeExtensionSettings from 'explorviz-frontend/src/components/collaboration/visualization/page-setup/sidebar/customizationbar/vscode/vscode-extension-settings';
import VscodeExtensionOpener from 'explorviz-frontend/src/components/collaboration/visualization/page-setup/sidebar/customizationbar/vscode/vscode-extension-settings-opener';
import HeatmapInfo from 'explorviz-frontend/src/components/heatmap/heatmap-info';
import RestructureOpener from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/restructure/restructure-opener';
import SettingsOpener from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/settings-opener';
import SnapshotOpener from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/snapshot/snapshot-opener';
import ApplicationSearch from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/application-search/application-search';
import ApplicationSearchOpener from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/application-search/application-search-opener';
import EntityFilteringOpener from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/entity-filtering/entity-filtering-opener';
import TraceReplayerOpener from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/trace-replayer/trace-replayer-opener';
import { ImmersiveView } from 'explorviz-frontend/src/rendering/application/immersive-view';
import RenderingLoop from 'explorviz-frontend/src/rendering/application/rendering-loop';
import { useAnnotationHandlerStore } from 'explorviz-frontend/src/stores/annotation-handler';
import { useApplicationRendererStore } from 'explorviz-frontend/src/stores/application-renderer';
import { useCollaborationSessionStore } from 'explorviz-frontend/src/stores/collaboration/collaboration-session';
import { useLocalUserStore } from 'explorviz-frontend/src/stores/collaboration/local-user';
import { useSpectateUserStore } from 'explorviz-frontend/src/stores/collaboration/spectate-user';
import { useConfigurationStore } from 'explorviz-frontend/src/stores/configuration';
import { useHighlightingStore } from 'explorviz-frontend/src/stores/highlighting';
import { useMinimapStore } from 'explorviz-frontend/src/stores/minimap-service';
import { usePopupHandlerStore } from 'explorviz-frontend/src/stores/popup-handler';
import { useApplicationRepositoryStore } from 'explorviz-frontend/src/stores/repos/application-repository';
import { useSceneRepositoryStore } from 'explorviz-frontend/src/stores/repos/scene-repository';
import { SnapshotToken } from 'explorviz-frontend/src/stores/snapshot-token';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import CameraControls from 'explorviz-frontend/src/utils/application-rendering/camera-controls';
import GamepadControls from 'explorviz-frontend/src/utils/controls/gamepad/gamepad-controls';
import {
  DynamicLandscapeData,
  Trace,
} from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/dynamic-data';
import { LandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/landscape-data';
import { StructureLandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';

import { GearIcon, ToolsIcon } from '@primer/octicons-react';
import Settings from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/settings';
import CanvasWrapper from 'explorviz-frontend/src/components/visualization/rendering/canvas-wrapper';
import Button from 'react-bootstrap/Button';
import useCollaborativeModifier from '../../../hooks/collaborative-modifier';
import useHeatmapRenderer from '../../../hooks/heatmap-renderer';
import useSyncState from '../../../hooks/sync-state';
import { LandscapeToken } from '../../../stores/landscape-token';
import { ApiToken } from '../../../stores/user-api-token';
import eventEmitter from '../../../utils/event-emitter';
import CollaborationControls from '../../collaboration/visualization/page-setup/sidebar/customizationbar/collaboration/collaboration-controls';
import ContextMenu from '../../context-menu';
import ChatBox from '../page-setup/sidebar/customizationbar/chat/chat-box';
import Restructure from '../page-setup/sidebar/customizationbar/restructure/restructure';
import SettingsSidebar from '../page-setup/sidebar/customizationbar/settings-sidebar';
import Snapshot from '../page-setup/sidebar/customizationbar/snapshot/snapshot';
import ChatbotOpener from '../page-setup/sidebar/customizationbar/chatbot/chatbot-opener';
import ChatbotBox from '../page-setup/sidebar/customizationbar/chatbot/chatbot-box';
import SidebarComponent from '../page-setup/sidebar/sidebar-component';
import EntityFiltering from '../page-setup/sidebar/toolbar/entity-filtering/entity-filtering';
import ToolSelection from '../page-setup/sidebar/toolbar/tool-selection';
import TraceSelectionAndReplayer from '../page-setup/sidebar/toolbar/trace-replayer/trace-selection-and-replayer';
import AnnotationCoordinator from './annotations/annotation-coordinator';
import Popups from './popups/popups';
import { ChatbotProvider } from '../../chatbot/chatbot-context';

interface BrowserRenderingProps {
  readonly id: string;
  readonly landscapeData: LandscapeData | null;
  readonly landscapeToken: LandscapeToken;
  readonly userApiTokens: ApiToken[];
  readonly visualizationPaused: boolean;
  readonly isDisplayed: boolean;
  readonly snapshot: boolean | undefined | null;
  readonly snapshotReload: SnapshotToken | undefined | null;
  toggleVisualizationUpdating(): void;
  switchToAR(): void;
  restructureLandscape(
    structureData: StructureLandscapeData,
    dynamicData: DynamicLandscapeData
  ): void;
  removeTimestampListener(): void;
}

export default function BrowserRendering({
  landscapeData,
  landscapeToken,
  userApiTokens,
  visualizationPaused,
  isDisplayed,
  toggleVisualizationUpdating,
  switchToAR,
  restructureLandscape,
  removeTimestampListener,
}: BrowserRenderingProps) {
  // MARK: Stores

  const applicationRendererActions = useApplicationRendererStore(
    useShallow((state) => ({
      getMeshById: state.getMeshById,
      getApplicationById: state.getApplicationById,
      getOpenApplications: state.getOpenApplications,
      openAllComponentsOfAllApplications:
        state.openAllComponentsOfAllApplications,
      toggleCommunicationRendering: state.toggleCommunicationRendering,
      toggleComponent: state.toggleComponent,
      closeAllComponents: state.closeAllComponents,
      addCommunicationForAllApplications:
        state.addCommunicationForAllApplications,
      openParents: state.openParents,
      cleanup: state.cleanup,
    }))
  );

  const applicationRepositoryActions = useApplicationRepositoryStore(
    useShallow((state) => ({
      cleanup: state.cleanup,
    }))
  );

  const landscape3D = useApplicationRendererStore().landscape3D;

  const localUserState = useLocalUserStore(
    useShallow((state) => ({
      camera: state.defaultCamera,
      minimapCamera: state.minimapCamera,
    }))
  );
  const localUserActions = {
    ping: useLocalUserStore((state) => state.ping),
    tick: useLocalUserStore((state) => state.tick),
    setDefaultCamera: useLocalUserStore((state) => state.setDefaultCamera),
    getCamera: useLocalUserStore((state) => state.getCamera),
  };

  const { cameraFar, cameraFov, cameraNear, colors, heatmapEnabled } =
    useUserSettingsStore(
      useShallow((state) => ({
        cameraFar: state.visualizationSettings.cameraFar.value,
        cameraFov: state.visualizationSettings.cameraFov.value,
        cameraNear: state.visualizationSettings.cameraNear.value,
        colors: state.colors,
        heatmapEnabled: state.visualizationSettings.heatmapEnabled.value,
      }))
    );

  const configurationActions = useConfigurationStore(
    useShallow((state) => ({
      setIsCommRendered: state.setIsCommRendered,
    }))
  );

  const sceneRepositoryActions = useSceneRepositoryStore(
    useShallow((state) => ({
      getScene: state.getScene,
    }))
  );

  const highlightingActions = useHighlightingStore(
    useShallow((state) => ({
      highlightTrace: state.highlightTrace,
      removeHighlightingForAllApplications:
        state.removeHighlightingForAllApplications,
      updateHighlighting: state.updateHighlighting,
      updateHighlightingOnHover: state.updateHighlightingOnHover,
      toggleHighlight: state.toggleHighlight,
      toggleHighlightById: state.toggleHighlightById,
    }))
  );
  const spectateUserActions = useSpectateUserStore(
    useShallow((state) => ({
      setCameraControls: state.setCameraControls,
    }))
  );

  const minimapActions = useMinimapStore(
    useShallow((state) => ({
      initializeMinimap: state.initializeMinimap,
      setRaycaster: state.setRaycaster,
    }))
  );

  const popupHandlerActions = usePopupHandlerStore(
    useShallow((state) => ({
      addPopup: state.addPopup,
      removePopup: state.removePopup,
      updatePopup: state.updatePopup,
      pinPopup: state.pinPopup,
      sharePopup: state.sharePopup,
      handleMouseMove: state.handleMouseMove,
      handleHoverOnMesh: state.handleHoverOnMesh,
      updateMeshReference: state.updateMeshReference,
      cleanup: state.cleanup,
    }))
  );

  const annotationHandlerState = useAnnotationHandlerStore(
    useShallow((state) => ({
      annotationData: state.annotationData,
      minimizedAnnotations: state.minimizedAnnotations,
    }))
  );
  const annotationHandlerActions = useAnnotationHandlerStore(
    useShallow((state) => ({
      addAnnotation: state.addAnnotation,
      removeAnnotation: state.removeAnnotation,
      clearAnnotations: state.clearAnnotations,
      handleMouseMove: state.handleMouseMove,
      handleHoverOnMesh: state.handleHoverOnMesh,
      updateMeshReference: state.updateMeshReference,
      cleanup: state.cleanup,
    }))
  );
  // MARK: Event handlers

  const getSelectedApplicationObject3D = () => {
    if (selectedApplicationId === '') {
      setSelectedApplicationId(
        applicationRendererActions.getOpenApplications()[0].getModelId()
      );
      return applicationRendererActions.getOpenApplications()[0];
    }
    return applicationRendererActions.getApplicationById(selectedApplicationId);
  };

  const tick = async (delta: number) => {
    useCollaborationSessionStore
      .getState()
      .idToRemoteUser.forEach((remoteUser) => {
        remoteUser.update(delta);
      });
  };

  const highlightTrace = (trace: Trace, traceStep: string) => {
    const selectedObject3D = getSelectedApplicationObject3D();

    if (!landscapeData || !selectedObject3D) {
      return;
    }

    highlightingActions.highlightTrace(
      trace,
      traceStep,
      selectedObject3D,
      landscapeData.structureLandscapeData
    );
  };

  const initCameras = () => {
    if (!canvas.current) {
      console.error('Unable to initialize cameras: Canvas ref is not defined');
      return;
    }

    const aspectRatio = canvas.current.width / canvas.current.height;

    // Camera
    const newCam = new THREE.PerspectiveCamera(
      cameraFov,
      aspectRatio,
      cameraNear,
      cameraFar
    );

    localUserState.camera = newCam;

    newCam.position.set(1, 2, 3);
    scene.add(newCam);
    localUserActions.setDefaultCamera(newCam);

    // Add Camera to ImmersiveView manager

    ImmersiveView.instance.registerCamera(newCam);
    ImmersiveView.instance.registerScene(scene);
    ImmersiveView.instance.registerCanvas(canvas.current);

    // Controls

    cameraControls.current = new CameraControls(
      localUserState.camera,
      canvas.current
    );
    spectateUserActions.setCameraControls(cameraControls.current);

    tickCallbacks.current.push({
      id: 'local-user',
      callback: localUserActions.tick,
    });
    tickCallbacks.current.push({
      id: 'camera-controls',
      callback: cameraControls.current.tick,
    });

    // Initialize minimap

    // minimapActions.initializeMinimap(
    //   scene,
    //   landscape3D,
    //   cameraControls.current
    // );
    // minimapActions.setRaycaster(new Raycaster(localUserState.minimapCamera));
  };

  const removeAllHighlighting = () => {
    highlightingActions.removeHighlightingForAllApplications(true);
    highlightingActions.updateHighlighting();
  };

  const lookAtMesh = (meshId: string) => {
    const mesh = applicationRendererActions.getMeshById(meshId);
    if (mesh?.isObject3D) {
      cameraControls.current!.focusCameraOn(1, mesh);
    }
  };

  const removeAnnotation = (annotationId: number) => {
    annotationHandlerActions.removeAnnotation(annotationId);
  };

  const setGamepadSupport = (enabled: boolean) => {
    if (gamepadControls.current) {
      gamepadControls.current.setGamepadSupport(enabled);
    }
  };

  const enterFullscreen = () => {
    if (!canvas.current) {
      console.error('Unable to enter fullscreen: Canvas ref is not set');
      return;
    }
    canvas.current.requestFullscreen();
  };

  const toggleToolsSidebarComponent = (component: string): boolean => {
    const newOpenedToolComponent =
      openedToolComponent === component ? null : component;
    setOpenedToolComponent(newOpenedToolComponent);
    return newOpenedToolComponent === component;
  };

  const toggleSettingsSidebarComponent = (component: string): boolean => {
    const newOpenedSettingComponent =
      openedSettingComponent === component ? null : component;
    setOpenedSettingComponent(newOpenedSettingComponent);
    return newOpenedSettingComponent === component;
  };

  // MARK: State

  const [showToolsSidebar, setShowToolsSiderbar] = useState<boolean>(false);
  const [showSettingsSidebar, setShowSettingsSidebar] =
    useState<boolean>(false);
  const [openedToolComponent, setOpenedToolComponent] = useState<string | null>(
    null
  );
  const [openedSettingComponent, setOpenedSettingComponent] = useState<
    string | null
  >(null);
  const [scene] = useState<THREE.Scene>(() =>
    sceneRepositoryActions.getScene('browser', true)
  );
  const [selectedApplicationId, setSelectedApplicationId] =
    useState<string>('');

  const [worker] = useState<Worker>(
    () =>
      new Worker(new URL('../../../workers/metrics-worker.js', import.meta.url))
  );

  // MARK: Refs

  const canvas = useRef<HTMLCanvasElement | null>(null);
  const outerDiv = useRef<HTMLDivElement | null>(null);
  const tickCallbacks = useRef<TickCallback[]>([]);
  const renderingLoop = useRef<RenderingLoop | null>(null);
  const cameraControls = useRef<CameraControls | null>(null);
  const gamepadControls = useRef<GamepadControls | null>(null);

  // MARK: Effects and hooks

  useEffect(
    function initialize() {
      if (!landscape3D) return;

      scene.background = colors!.backgroundColor;

      useLocalUserStore
        .getState()
        .setDefaultCamera(new THREE.PerspectiveCamera());

      tickCallbacks.current.push(
        { id: 'browser-rendering', callback: tick },
        { id: 'spectate-user', callback: useSpectateUserStore.getState().tick },
        { id: 'minimap', callback: useMinimapStore.getState().tick }
      );

      ImmersiveView.instance.callbackOnEntering = () => {
        usePopupHandlerStore.getState().setDeactivated(true);
        usePopupHandlerStore.getState().clearPopups();
      };

      ImmersiveView.instance.callbackOnExit = () => {
        usePopupHandlerStore.getState().setDeactivated(false);
      };

      // Open sidebars automatically on certain restructure actions

      const handleOpenSettingsSidebarEvent = () => {
        setShowSettingsSidebar(true);
      };

      const handleToggleSettingsSidebarComponentEvent = (component: string) => {
        const newOpenedSettingComponent =
          openedSettingComponent === component ? null : component;
        setOpenedSettingComponent(newOpenedSettingComponent);
        return newOpenedSettingComponent === component;
      };

      eventEmitter.on('openSettingsSidebar', handleOpenSettingsSidebarEvent);
      eventEmitter.on(
        'restructureComponent',
        handleToggleSettingsSidebarComponentEvent
      );

      // Cleanup on component unmount
      return function cleanup() {
        worker.terminate();
        // renderingLoop.current?.stop();
        applicationRendererActions.cleanup();
        applicationRepositoryActions.cleanup();
        // renderer.current?.dispose();
        // renderer.current?.forceContextLoss();

        // ideWebsocket.dispose();

        // renderingLoop.current?.stop();
        configurationActions.setIsCommRendered(true);
        popupHandlerActions.cleanup();
        annotationHandlerActions.cleanup();

        eventEmitter.off('openSettingsSidebar', handleOpenSettingsSidebarEvent);
        eventEmitter.off(
          'restructureComponent',
          handleToggleSettingsSidebarComponentEvent
        );
      };
    },
    [landscape3D]
  );

  useSyncState();
  useHeatmapRenderer(localUserState.camera, scene);
  useCollaborativeModifier();

  // MARK: JSX

  return (
    <ChatbotProvider landscapeData={landscapeData}>
      <div className={`row h-100 ${isDisplayed ? 'show' : 'hide'}`}>
        <div className="d-flex flex-column h-100 col-12">
          <div id="rendering" ref={outerDiv}>
            {!showToolsSidebar && (
              <div className="sidebar-tools-button foreground mt-6">
                <Button
                  id="toolsOpener"
                  variant="outline-secondary"
                  title="Tools"
                  onClick={() => setShowToolsSiderbar(true)}
                >
                  <ToolsIcon size="small" className="align-middle" />
                </Button>
              </div>
            )}

            {!showSettingsSidebar && (
              <div className="sidebar-open-button foreground mt-6">
                <Button
                  id="undoAction"
                  variant="outline-secondary"
                  title="Settings"
                  onClick={() => setShowSettingsSidebar(true)}
                >
                  <GearIcon size="small" className="align-middle" />
                </Button>
              </div>
            )}

            {heatmapEnabled && <HeatmapInfo />}

            <ContextMenu switchToAR={switchToAR}>
              <CanvasWrapper landscapeData={landscapeData} />
            </ContextMenu>
            {/* {loadNewLandscape.isRunning && (
            <div className="position-absolute mt-6 pt-5 ml-3 pointer-events-none">
              <LoadingIndicator text="Loading new Landscape" />
            </div>
          )} */}

            {landscapeData && (
              <Popups
                landscapeData={landscapeData}
                cameraControls={cameraControls}
              />
            )}

            {annotationHandlerState.annotationData.map((data) => (
              <AnnotationCoordinator
                key={data.annotationId}
                annotationData={data}
                removeAnnotation={removeAnnotation}
                toggleHighlightById={highlightingActions.toggleHighlightById}
                openParents={applicationRendererActions.openParents}
              />
            ))}
          </div>
        </div>
        {showToolsSidebar && (
          <div className="sidebar left" id="toolselection">
            <div className="mt-6 d-flex flex-row w-100" style={{ zIndex: 90 }}>
              <ToolSelection
                closeToolSelection={() => setShowToolsSiderbar(false)}
              >
                <div className="explorviz-visualization-navbar">
                  <ul className="nav justify-content-center">
                    <EntityFilteringOpener
                      openedComponent={openedToolComponent}
                      toggleToolsSidebarComponent={toggleToolsSidebarComponent}
                    />
                    <ApplicationSearchOpener
                      openedComponent={openedToolComponent}
                      toggleToolsSidebarComponent={toggleToolsSidebarComponent}
                    />
                    <TraceReplayerOpener
                      openedComponent={openedToolComponent}
                      toggleToolsSidebarComponent={toggleToolsSidebarComponent}
                    />
                  </ul>
                </div>
                {openedToolComponent && (
                  <div className="card sidebar-card mt-3">
                    <div className="card-body d-flex flex-column">
                      {openedToolComponent === 'entity-filtering' && (
                        <>
                          <h5 className="text-center">Entity Filtering</h5>
                          <EntityFiltering landscapeData={landscapeData!} />
                        </>
                      )}
                      {openedToolComponent === 'application-search' && (
                        <>
                          <h5 className="text-center">Application Search</h5>
                          <ApplicationSearch />
                        </>
                      )}
                      {openedToolComponent === 'Trace-Replayer' && (
                        <TraceSelectionAndReplayer
                          highlightTrace={highlightTrace}
                          removeHighlighting={removeAllHighlighting}
                          dynamicData={landscapeData!.dynamicLandscapeData}
                          renderingLoop={renderingLoop.current!}
                          structureData={landscapeData!.structureLandscapeData}
                          moveCameraTo={moveCameraTo}
                        />
                      )}
                    </div>
                  </div>
                )}
              </ToolSelection>
            </div>
          </div>
        )}
        {showSettingsSidebar && (
          <div className="sidebar right" id="settingsSidebar">
            <div className="mt-6 d-flex flex-row w-100" style={{ zIndex: 90 }}>
              <SettingsSidebar
                closeSettingsSidebar={() => setShowSettingsSidebar(false)}
              >
                <div className="explorviz-visualization-navbar">
                  <ul className="nav justify-content-center">
                    <CollaborationOpener
                      openedComponent={openedSettingComponent!}
                      toggleSettingsSidebarComponent={
                        toggleSettingsSidebarComponent
                      }
                    />
                    <ChatbotOpener
                      openedComponent={openedSettingComponent}
                      toggleSettingsSidebarComponent={
                        toggleSettingsSidebarComponent
                      }
                    />
                    <VscodeExtensionOpener
                      openedComponent={openedSettingComponent}
                      toggleSettingsSidebarComponent={
                        toggleSettingsSidebarComponent
                      }
                    />
                    <RestructureOpener
                      openedComponent={openedSettingComponent}
                      toggleSettingsSidebarComponent={
                        toggleSettingsSidebarComponent
                      }
                    />
                    <SnapshotOpener
                      openedComponent={openedSettingComponent}
                      toggleSettingsSidebarComponent={
                        toggleSettingsSidebarComponent
                      }
                    />
                    <SettingsOpener
                      openedComponent={openedSettingComponent}
                      toggleSettingsSidebarComponent={
                        toggleSettingsSidebarComponent
                      }
                    />
                  </ul>
                </div>
                {openedSettingComponent && (
                  <SidebarComponent componentId={openedSettingComponent}>
                    {openedSettingComponent === 'Collaboration' && (
                      <>
                        <CollaborationControls />
                        <ChatBox />
                      </>
                    )}
                    {openedSettingComponent === 'Chatbot' && (
                      <>
                        <ChatbotBox />
                      </>
                    )}
                    {openedSettingComponent === 'VSCode-Extension-Settings' && (
                      <VscodeExtensionSettings />
                    )}
                    {openedSettingComponent === 'Restructure-Landscape' && (
                      <Restructure
                        landscapeData={landscapeData!}
                        restructureLandscape={restructureLandscape}
                        visualizationPaused={visualizationPaused}
                        toggleVisualizationUpdating={
                          toggleVisualizationUpdating
                        }
                        removeTimestampListener={removeTimestampListener}
                        userApiTokens={userApiTokens}
                        annotationData={annotationHandlerState.annotationData}
                        minimizedAnnotations={
                          annotationHandlerState.minimizedAnnotations
                        }
                        landscapeToken={landscapeToken}
                      />
                    )}
                    {openedToolComponent === 'Trace-Replayer' && (
                      <TraceSelectionAndReplayer
                        highlightTrace={highlightTrace}
                        removeHighlighting={removeAllHighlighting}
                        dynamicData={landscapeData!.dynamicLandscapeData}
                        renderingLoop={renderingLoop.current!}
                        structureData={landscapeData!.structureLandscapeData}
                      />
                    )}
                    {openedSettingComponent === 'Persist-Landscape' && (
                      <Snapshot
                        landscapeData={landscapeData!}
                        annotationData={annotationHandlerState.annotationData}
                        minimizedAnnotations={
                          annotationHandlerState.minimizedAnnotations
                        }
                        landscapeToken={landscapeToken}
                      />
                    )}
                    {openedSettingComponent === 'Settings' && (
                      <Settings
                        enterFullscreen={enterFullscreen}
                        setGamepadSupport={setGamepadSupport}
                      />
                    )}
                  </SidebarComponent>
                )}
              </SettingsSidebar>
            </div>
          </div>
        )}
      </div>
    </ChatbotProvider>
  );
}

// MARK: Types

export type TickCallback = {
  id: string;
  callback: (delta: number, frame: XRFrame | undefined) => void | Promise<void>;
};
