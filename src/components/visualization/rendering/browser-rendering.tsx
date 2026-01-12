import { useEffect, useRef, useState } from 'react';

import { GearIcon, ToolsIcon } from '@primer/octicons-react';
import { createXRStore } from '@react-three/xr';
import CollaborationOpener from 'explorviz-frontend/src/components/collaboration/visualization/page-setup/sidebar/customizationbar/collaboration/collaboration-opener';
import VscodeExtensionSettings from 'explorviz-frontend/src/components/collaboration/visualization/page-setup/sidebar/customizationbar/vscode/vscode-extension-settings';
import VscodeExtensionOpener from 'explorviz-frontend/src/components/collaboration/visualization/page-setup/sidebar/customizationbar/vscode/vscode-extension-settings-opener';
import HeatmapInfo from 'explorviz-frontend/src/components/heatmap/heatmap-info';
import RestructureOpener from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/restructure/restructure-opener';
import Settings from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/settings';
import SettingsOpener from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/settings-opener';
import SnapshotOpener from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/snapshot/snapshot-opener';
import ApplicationSearch from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/application-search/application-search';
import ApplicationSearchOpener from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/application-search/application-search-opener';
import EntityFilteringOpener from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/entity-filtering/entity-filtering-opener';
import TraceReplayerOpener from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/trace-replayer/trace-replayer-opener';
import CanvasWrapper from 'explorviz-frontend/src/components/visualization/rendering/canvas-wrapper';
import useCollaborativeModifier from 'explorviz-frontend/src/hooks/collaborative-modifier';
import { useIdeWebsocketStore } from 'explorviz-frontend/src/ide/ide-websocket';
import { useAnnotationHandlerStore } from 'explorviz-frontend/src/stores/annotation-handler';
import { useConfigurationStore } from 'explorviz-frontend/src/stores/configuration';
import { LandscapeToken } from 'explorviz-frontend/src/stores/landscape-token';
import { usePopupHandlerStore } from 'explorviz-frontend/src/stores/popup-handler';
import { useApplicationRepositoryStore } from 'explorviz-frontend/src/stores/repos/application-repository';
import { SnapshotToken } from 'explorviz-frontend/src/stores/snapshot-token';
import { ApiToken } from 'explorviz-frontend/src/stores/user-api-token';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import GamepadControls from 'explorviz-frontend/src/utils/controls/gamepad/gamepad-controls';
import eventEmitter from 'explorviz-frontend/src/utils/event-emitter';
import { DynamicLandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/dynamic-data';
import { LandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/landscape-data';
import { StructureLandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import Button from 'react-bootstrap/Button';
import { useShallow } from 'zustand/react/shallow';
import { ChatbotProvider } from '../../chatbot/chatbot-context';
import CollaborationControls from '../../collaboration/visualization/page-setup/sidebar/customizationbar/collaboration/collaboration-controls';
import ContextMenu from '../../context-menu';
import { EditingProvider } from '../../editing/editing-context';
import ChatBox from '../page-setup/sidebar/customizationbar/chat/chat-box';
import ChatbotBox from '../page-setup/sidebar/customizationbar/chatbot/chatbot-box';
import ChatbotOpener from '../page-setup/sidebar/customizationbar/chatbot/chatbot-opener';
import Restructure from '../page-setup/sidebar/customizationbar/restructure/restructure';
import SettingsSidebar from '../page-setup/sidebar/customizationbar/settings-sidebar';
import Snapshot from '../page-setup/sidebar/customizationbar/snapshot/snapshot';
import SidebarComponent from '../page-setup/sidebar/sidebar-component';
import EntityFiltering from '../page-setup/sidebar/toolbar/entity-filtering/entity-filtering';
import ToolSelection from '../page-setup/sidebar/toolbar/tool-selection';
import TraceSelectionAndReplayer from '../page-setup/sidebar/toolbar/trace-replayer/trace-selection-and-replayer';
import AnnotationCoordinator from './annotations/annotation-coordinator';
import Popups from './popups/popups';

interface BrowserRenderingProps {
  readonly id: string;
  readonly landscapeData: LandscapeData | null;
  readonly landscapeToken: LandscapeToken;
  readonly userApiTokens: ApiToken[];
  readonly visualizationPaused: boolean;
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
  toggleVisualizationUpdating,
  restructureLandscape,
  removeTimestampListener,
}: BrowserRenderingProps) {
  // MARK: Stores

  const xrStore = createXRStore({
    controller: {
      teleportPointer: { rayModel: { color: 'red' } },
      rayPointer: { rayModel: { color: 'red' } },
    },
    offerSession: false,
  });

  const applicationRepositoryActions = useApplicationRepositoryStore(
    useShallow((state) => ({
      cleanup: state.cleanup,
    }))
  );

  const configurationActions = useConfigurationStore(
    useShallow((state) => ({
      setIsCommRendered: state.setIsCommRendered,
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
      cleanup: state.cleanup,
    }))
  );

  const restartAndSetSocket = useIdeWebsocketStore(
    (state) => state.restartAndSetSocket
  );

  const closeConnection = useIdeWebsocketStore(
    (state) => state.closeConnection
  );

  // MARK: Event handlers

  const removeAnnotation = (annotationId: number) => {
    annotationHandlerActions.removeAnnotation(annotationId);
  };

  const setGamepadSupport = (enabled: boolean) => {
    if (gamepadControls.current) {
      gamepadControls.current.setGamepadSupport(enabled);
    }
  };

  const enterFullscreen = () => {
    // Find the canvas element by ID (set in CanvasWrapper)
    // The Canvas component from @react-three/fiber renders a canvas element
    let canvasElement: HTMLCanvasElement | null = document.getElementById(
      'three-js-canvas'
    ) as HTMLCanvasElement;

    // If not found by ID, try to find the canvas element within the element with that ID
    // or find any canvas element in the rendering container
    if (!canvasElement || canvasElement.tagName !== 'CANVAS') {
      const container = document.getElementById('three-js-canvas');
      if (container) {
        canvasElement = container.querySelector('canvas');
      }
      // Last resort: find any canvas in the rendering container
      if (!canvasElement) {
        const renderingContainer = document.getElementById('rendering');
        canvasElement = renderingContainer?.querySelector('canvas') || null;
      }
    }

    if (!canvasElement) {
      console.error('Unable to enter fullscreen: Canvas element not found');
      return;
    }

    // Try standard fullscreen API first
    if (canvasElement.requestFullscreen) {
      canvasElement.requestFullscreen().catch((error) => {
        console.error('Error entering fullscreen:', error);
      });
    }
    // Fallback for WebKit browsers (Safari)
    else if ((canvasElement as any).webkitRequestFullscreen) {
      (canvasElement as any).webkitRequestFullscreen();
    }
    // Fallback for Mozilla browsers
    else if ((canvasElement as any).mozRequestFullScreen) {
      (canvasElement as any).mozRequestFullScreen();
    }
    // Fallback for MS browsers
    else if ((canvasElement as any).msRequestFullscreen) {
      (canvasElement as any).msRequestFullscreen();
    } else {
      console.error('Fullscreen API is not supported in this browser');
    }
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

  const [showToolsSidebar, setShowToolsSidebar] = useState<boolean>(false);
  const [showSettingsSidebar, setShowSettingsSidebar] =
    useState<boolean>(false);
  const [openedToolComponent, setOpenedToolComponent] = useState<string | null>(
    null
  );
  const [openedSettingComponent, setOpenedSettingComponent] = useState<
    string | null
  >(null);

  // MARK: Refs

  const outerDiv = useRef<HTMLDivElement | null>(null);
  const gamepadControls = useRef<GamepadControls | null>(null);

  // MARK: Effects and hooks

  useEffect(function initialize() {
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

    // IDE Websocket connection setup
    restartAndSetSocket(landscapeToken?.value);

    // Cleanup on component unmount
    return function cleanup() {
      applicationRepositoryActions.cleanup();
      configurationActions.setIsCommRendered(true);
      popupHandlerActions.cleanup();
      annotationHandlerActions.cleanup();

      eventEmitter.off('openSettingsSidebar', handleOpenSettingsSidebarEvent);
      eventEmitter.off(
        'restructureComponent',
        handleToggleSettingsSidebarComponentEvent
      );

      closeConnection();
    };
  }, []);

  useCollaborativeModifier();

  // MARK: JSX

  return (
    <EditingProvider>
      <ChatbotProvider landscapeData={landscapeData}>
        <div className="row h-100">
          <div className="d-flex flex-column h-100 col-12">
            <div id="rendering" ref={outerDiv}>
              {!showToolsSidebar && (
                <div className="sidebar-tools-button foreground mt-6">
                  <Button
                    id="toolsOpener"
                    variant="outline-secondary"
                    title="Tools"
                    onClick={() => setShowToolsSidebar(true)}
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

              {useUserSettingsStore.getState().visualizationSettings
                .heatmapEnabled.value && <HeatmapInfo />}

              <ContextMenu enterVR={() => xrStore.enterVR()}>
                <CanvasWrapper landscapeData={landscapeData} store={xrStore} />
              </ContextMenu>

              {landscapeData && <Popups landscapeData={landscapeData} />}

              {annotationHandlerState.annotationData.map((data) => (
                <AnnotationCoordinator
                  key={data.annotationId}
                  annotationData={data}
                  removeAnnotation={removeAnnotation}
                />
              ))}
            </div>
          </div>
          {showToolsSidebar && (
            <div className="sidebar left" id="toolselection">
              <div
                className="mt-6 d-flex flex-row w-100"
                style={{ zIndex: 90 }}
              >
                <ToolSelection
                  closeToolSelection={() => setShowToolsSidebar(false)}
                >
                  <div className="explorviz-visualization-navbar">
                    <ul className="nav justify-content-center">
                      <EntityFilteringOpener
                        openedComponent={openedToolComponent}
                        toggleToolsSidebarComponent={
                          toggleToolsSidebarComponent
                        }
                      />
                      <ApplicationSearchOpener
                        openedComponent={openedToolComponent}
                        toggleToolsSidebarComponent={
                          toggleToolsSidebarComponent
                        }
                      />
                      <TraceReplayerOpener
                        openedComponent={openedToolComponent}
                        toggleToolsSidebarComponent={
                          toggleToolsSidebarComponent
                        }
                      />
                    </ul>
                  </div>
                  {openedToolComponent && (
                    <div className="card sidebar-card mt-3">
                      <div className="card-body d-flex flex-column">
                        {openedToolComponent === 'entity-filtering' &&
                          landscapeData && (
                            <>
                              <h5 className="text-center">Entity Filtering</h5>
                              <EntityFiltering landscapeData={landscapeData} />
                            </>
                          )}
                        {openedToolComponent === 'application-search' && (
                          <>
                            <h5 className="text-center">Application Search</h5>
                            <ApplicationSearch />
                          </>
                        )}
                        {openedToolComponent === 'Trace-Replayer' &&
                          landscapeData && (
                            <TraceSelectionAndReplayer
                              highlightTrace={() => {}}
                              removeHighlighting={() => {}}
                              dynamicData={landscapeData.dynamicLandscapeData}
                              structureData={
                                landscapeData.structureLandscapeData
                              }
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
              <div
                className="mt-6 d-flex flex-row w-100"
                style={{ zIndex: 90 }}
              >
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
                      {openedSettingComponent ===
                        'VSCode-Extension-Settings' && (
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
    </EditingProvider>
  );
}

// MARK: Types

export type TickCallback = {
  id: string;
  callback: (delta: number, frame: XRFrame | undefined) => void | Promise<void>;
};
