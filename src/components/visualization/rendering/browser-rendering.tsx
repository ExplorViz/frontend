import { GearIcon, ToolsIcon } from '@primer/octicons-react';
import VscodeExtensionSettings from 'explorviz-frontend/src/components/collaboration/visualization/page-setup/sidebar/customizationbar/vscode/vscode-extension-settings';
import HeatmapInfo from 'explorviz-frontend/src/components/heatmap/heatmap-info';
import Settings from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/settings';
import EntitySearch from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/entity-search/entity-search';
import KubernetesDiagrams from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/kubernetes-diagrams/kubernetes-diagrams';
import CanvasWrapper from 'explorviz-frontend/src/components/visualization/rendering/canvas-wrapper';
import { useIdeWebsocketStore } from 'explorviz-frontend/src/ide/ide-websocket';
import { useAnnotationHandlerStore } from 'explorviz-frontend/src/stores/annotation-handler';
import { usePlayroomConnectionStore } from 'explorviz-frontend/src/stores/collaboration/playroom-connection-store';
import { useConfigurationStore } from 'explorviz-frontend/src/stores/configuration';
import { useLandscapeTokenStore } from 'explorviz-frontend/src/stores/landscape-token';
import { usePopupHandlerStore } from 'explorviz-frontend/src/stores/popup-handler';
import { useRenderingServiceStore } from 'explorviz-frontend/src/stores/rendering-service';
import { ApiToken } from 'explorviz-frontend/src/stores/user-api-token';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import GamepadControls from 'explorviz-frontend/src/utils/controls/gamepad/gamepad-controls';
import { useEffect, useRef, useState } from 'react';
import Button from 'react-bootstrap/Button';
import { useShallow } from 'zustand/react/shallow';
import {
  EntityFilteringController,
  EntitySearchController,
} from '../../chatbot/chatbot-context';
import CollaborationControls from '../../collaboration/visualization/page-setup/sidebar/customizationbar/collaboration/collaboration-controls';
import ContextMenu from '../../context-menu';
import { EditingProvider } from '../../editing/editing-context';
import ComponentTabs from '../page-setup/sidebar/component-tabs';
import ChatBox from '../page-setup/sidebar/customizationbar/chat/chat-box';
import ChatbotBox from '../page-setup/sidebar/customizationbar/chatbot/chatbot-box';
import EntityConfig from '../page-setup/sidebar/customizationbar/entity-config/entity-config';
import Restructure from '../page-setup/sidebar/customizationbar/restructure/restructure';
import SettingsSidebar from '../page-setup/sidebar/customizationbar/settings-sidebar';
import {
  defaultSettingsSidebarState,
  SettingsSidebarActions,
  SettingsSidebarContext,
  SettingsSidebarState,
  SettingsSidebarTab,
} from '../page-setup/sidebar/customizationbar/settings-sidebar-context';
import Snapshot from '../page-setup/sidebar/customizationbar/snapshot/snapshot';
import { CodeAnalysisSection } from '../page-setup/sidebar/toolbar/code-analysis-trigger/code-analysis-section';
import EntityFiltering from '../page-setup/sidebar/toolbar/entity-filtering/entity-filtering';
import EntityFilteringApplier from '../page-setup/sidebar/toolbar/entity-filtering/entity-filtering-applier';
import TelemetrySearch from '../page-setup/sidebar/toolbar/telemetry-search/telemetry-search';
import ToolSelection from '../page-setup/sidebar/toolbar/tool-selection';
import {
  defaultToolbarState,
  ToolbarActions,
  ToolbarContext,
  ToolbarState,
  ToolbarTool,
} from '../page-setup/sidebar/toolbar/toolbar-context';
import TraceSelectionAndReplayer from '../page-setup/sidebar/toolbar/trace-replayer/trace-selection-and-replayer';
import AnnotationCoordinator from './annotations/annotation-coordinator';
import Popups from './popups/popups';

interface BrowserRenderingProps {
  readonly userApiTokens: ApiToken[];
  readonly visualizationPaused: boolean;
}

export default function BrowserRendering({
  userApiTokens,
  visualizationPaused,
}: BrowserRenderingProps) {
  // MARK: Stores
  const landscapeData = useRenderingServiceStore(
    (state) => state._landscapeData
  );
  const landscapeToken = useLandscapeTokenStore((state) => state.token);
  const visualizationSettings = useUserSettingsStore(
    (state) => state.visualizationSettings
  );

  const configurationActions = useConfigurationStore(
    useShallow((state) => ({
      setIsCommRendered: state.setIsCommRendered,
    }))
  );

  const toggleVisualizationUpdating = useRenderingServiceStore(
    (state) => state.toggleVisualizationUpdating
  );

  const popupHandlerActions = usePopupHandlerStore(
    useShallow((state) => ({
      addPopup: state.addPopup,
      removePopup: state.removePopup,
      updatePopup: state.updatePopup,
      pinPopup: state.pinPopup,
      sharePopup: state.sharePopup,
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

  // MARK: State

  const [toolbarState, setToolbarState] =
    useState<ToolbarState>(defaultToolbarState);

  const toolbarActions: ToolbarActions = {
    openTool: (tool) =>
      setToolbarState((state) => ({
        ...state,
        showSidebar: true,
        selectedTool: tool,
      })),

    setTelemetrySearchTab: (tab) =>
      setToolbarState((state) => ({
        ...state,
        telemetrySearchState: {
          ...state.telemetrySearchState,
          selectedTab: tab,
        },
      })),

    searchSpans: (searchParams) =>
      setToolbarState((state) => ({
        ...state,
        showSidebar: true,
        selectedTool: ToolbarTool.TelemetrySearch,
        telemetrySearchState: {
          ...state.telemetrySearchState,
          spanSearchRequest: searchParams,
        },
      })),
  };

  const showToolsSidebar = toolbarState.showSidebar;
  const setShowToolsSidebar = (isShow: boolean) =>
    setToolbarState({ ...toolbarState, showSidebar: isShow });
  const selectedToolbarTool = toolbarState.selectedTool;
  const setSelectedToolbarTool = (tool: ToolbarTool) =>
    setToolbarState((state) => ({
      ...state,
      selectedTool: tool === selectedToolbarTool ? null : tool,
    }));

  const [settingsSidebarState, setSettingsSidebarState] =
    useState<SettingsSidebarState>(defaultSettingsSidebarState);

  const settingsSidebarActions: SettingsSidebarActions = {
    openSettingsSidebarTab: (tab) =>
      setSettingsSidebarState((state) => ({
        ...state,
        showSidebar: true,
        selectedTab: tab,
      })),
  };

  const showSettingsSidebar = settingsSidebarState.showSidebar;
  const setShowSettingsSidebar = (isShow: boolean) =>
    setSettingsSidebarState((state) => ({
      ...state,
      showSidebar: isShow,
    }));
  const selectedSettingsSidebarTab = settingsSidebarState.selectedTab;
  const setSelectedSettingsSidebarTab = (tab: SettingsSidebarTab | null) =>
    setSettingsSidebarState((state) => ({
      ...state,
      selectedTab: tab === selectedSettingsSidebarTab ? null : tab,
    }));

  // MARK: Refs

  const entityFilteringRef = useRef<EntityFilteringController | null>(null);
  const entitySearchRef = useRef<EntitySearchController | null>(null);
  const outerDiv = useRef<HTMLDivElement | null>(null);
  const gamepadControls = useRef<GamepadControls | null>(null);

  // MARK: Effects and hooks

  useEffect(function initialize() {
    // IDE Websocket connection setup
    //restartAndSetSocket(landscapeToken?.value);

    // Cleanup on component unmount
    return function cleanup() {
      configurationActions.setIsCommRendered(true);
      popupHandlerActions.cleanup();
      annotationHandlerActions.cleanup();

      closeConnection();
    };
  }, []);

  // Close the sidebar, when the connection menu is opened (so ot does not overlap)
  const isConnected = usePlayroomConnectionStore((state) => state.isConnected);
  const isLobbyOpen = usePlayroomConnectionStore((state) => state.isLobbyOpen);
  if (isLobbyOpen) {
    setShowSettingsSidebar(false);
    setShowToolsSidebar(false);
  }

  // MARK: JSX

  return (
    <EditingProvider>
      {/* <ChatbotProvider
        landscapeData={landscapeData}
        showToolsSidebar={showToolsSidebar}
        setShowToolsSidebar={setShowToolsSidebar}
        showSettingsSidebar={showSettingsSidebar}
        setShowSettingsSidebar={setShowSettingsSidebar}
        openedToolComponent={openedToolComponent}
        setOpenedToolComponent={setOpenedToolComponent}
        openedSettingComponent={openedSettingComponent}
        setOpenedSettingComponent={setOpenedSettingComponent}
        entityFilteringControllerRef={entityFilteringRef}
        entitySearchControllerRef={entitySearchRef}
      > */}
      <ToolbarContext value={{ ...toolbarState, ...toolbarActions }}>
        <SettingsSidebarContext
          value={{ ...settingsSidebarState, ...settingsSidebarActions }}
        >
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

                {visualizationSettings.heatmapEnabled.value && <HeatmapInfo />}

                <ContextMenu>
                  <CanvasWrapper
                    key={landscapeToken?.value ?? 'no-token'}
                    landscapeData={landscapeData}
                  />
                </ContextMenu>

                {landscapeData && <Popups landscapeData={landscapeData} />}

                {landscapeData && (
                  <EntityFilteringApplier landscapeData={landscapeData} />
                )}

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
                    <ComponentTabs
                      activeTab={selectedToolbarTool}
                      onChange={setSelectedToolbarTool}
                      tabs={[
                        {
                          value: ToolbarTool.Filter,
                          content: (
                            <>
                              <h5 className="text-center">Filter</h5>
                              <EntityFiltering
                                ref={entityFilteringRef}
                                landscapeData={landscapeData}
                              />
                            </>
                          ),
                        },
                        {
                          value: ToolbarTool.EntitySearch,
                          content: (
                            <>
                              <h5 className="text-center">Search</h5>
                              <EntitySearch ref={entitySearchRef} />
                            </>
                          ),
                        },
                        {
                          value: ToolbarTool.TracePlayer,
                          content: (
                            <TraceSelectionAndReplayer
                              highlightTrace={() => {}}
                              removeHighlighting={() => {}}
                              dynamicData={landscapeData.dynamicLandscapeData}
                              flatData={landscapeData.flatLandscapeData}
                            />
                          ),
                        },
                        {
                          value: ToolbarTool.TelemetrySearch,
                          content: <TelemetrySearch />,
                        },
                        {
                          value: ToolbarTool.RepositoryAnalysis,
                          content: (
                            <>
                              <h5 className="text-center">
                                Git Repository Analysis
                              </h5>
                              <CodeAnalysisSection
                                landscapeToken={landscapeToken?.value}
                              />
                            </>
                          ),
                        },
                        {
                          value: ToolbarTool.KubernetesDiagrams,
                          content: (
                            <>
                              <h5 className="text-center">
                                Kubernetes Diagrams
                              </h5>
                              <KubernetesDiagrams />
                            </>
                          ),
                        },
                      ]}
                    />
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
                    <ComponentTabs
                      activeTab={selectedSettingsSidebarTab}
                      onChange={setSelectedSettingsSidebarTab}
                      tabs={[
                        {
                          value: SettingsSidebarTab.EntityConfig,
                          content: <EntityConfig />,
                        },
                        {
                          value: SettingsSidebarTab.Collaboration,
                          content: (
                            <>
                              <CollaborationControls />
                              {isConnected && <ChatBox />}
                            </>
                          ),
                        },
                        {
                          value: SettingsSidebarTab.Chatbot,
                          content: <ChatbotBox />,
                        },
                        {
                          value: SettingsSidebarTab.VsCodeExtension,
                          content: <VscodeExtensionSettings />,
                        },
                        {
                          value: SettingsSidebarTab.Restructure,
                          content: (
                            <Restructure
                              landscapeData={landscapeData!}
                              restructureLandscape={() => {}}
                              visualizationPaused={visualizationPaused}
                              toggleVisualizationUpdating={
                                toggleVisualizationUpdating
                              }
                              userApiTokens={userApiTokens}
                              annotationData={
                                annotationHandlerState.annotationData
                              }
                              minimizedAnnotations={
                                annotationHandlerState.minimizedAnnotations
                              }
                              landscapeToken={landscapeToken}
                            />
                          ),
                        },
                        {
                          value: SettingsSidebarTab.Snapshot,
                          content: (
                            <Snapshot
                              landscapeData={landscapeData!}
                              annotationData={
                                annotationHandlerState.annotationData
                              }
                              minimizedAnnotations={
                                annotationHandlerState.minimizedAnnotations
                              }
                              landscapeToken={landscapeToken}
                            />
                          ),
                        },
                        {
                          value: SettingsSidebarTab.Settings,
                          content: (
                            <Settings
                              enterFullscreen={enterFullscreen}
                              setGamepadSupport={setGamepadSupport}
                            />
                          ),
                        },
                      ]}
                    />
                  </SettingsSidebar>
                </div>
              </div>
            )}
          </div>
        </SettingsSidebarContext>
      </ToolbarContext>
      {/* </ChatbotProvider> */}
    </EditingProvider>
  );
}

// MARK: Types

export type TickCallback = {
  id: string;
  callback: (delta: number, frame: XRFrame | undefined) => void | Promise<void>;
};
