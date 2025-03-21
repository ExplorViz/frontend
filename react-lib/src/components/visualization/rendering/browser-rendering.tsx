import React, { useEffect, useRef, useState } from 'react';

import { useShallow } from 'zustand/react/shallow';
import { useResizeDetector } from 'react-resize-detector';
import { useCollaborationSessionStore } from 'react-lib/src/stores/collaboration/collaboration-session';
import { useLocalUserStore } from 'react-lib/src/stores/collaboration/local-user';
import { LandscapeData } from 'react-lib/src/utils/landscape-schemes/landscape-data';
import useInteractionModifier, {
  Position2D,
} from 'react-lib/src/hooks/interaction-modifier';
import { usePopupHandlerStore } from 'react-lib/src/stores/popup-handler';
import RenderingLoop from 'react-lib/src/rendering/application/rendering-loop';
import { useApplicationRendererStore } from 'react-lib/src/stores/application-renderer';
import { useConfigurationStore } from 'react-lib/src/stores/configuration';
import { useHighlightingStore } from 'react-lib/src/stores/highlighting';
import { useLandscapeRestructureStore } from 'react-lib/src/stores/landscape-restructure';
import { useApplicationRepositoryStore } from 'react-lib/src/stores/repos/application-repository';
import { useUserSettingsStore } from 'react-lib/src/stores/user-settings';
import CameraControls from 'react-lib/src/utils/application-rendering/camera-controls';
import {
  moveCameraTo,
  updateColors,
} from 'react-lib/src/utils/application-rendering/entity-manipulation';
import {
  Span,
  Trace,
} from 'react-lib/src/utils/landscape-schemes/dynamic/dynamic-data';
import { Class } from 'react-lib/src/utils/landscape-schemes/structure-data';
import ApplicationObject3D from 'react-lib/src/view-objects/3d/application/application-object-3d';
import ComponentMesh from 'react-lib/src/view-objects/3d/application/component-mesh';
import FoundationMesh from 'react-lib/src/view-objects/3d/application/foundation-mesh';
import { Vector3 } from 'three';
import * as THREE from 'three';
import { MapControls } from 'three-stdlib';
import { useSpectateUserStore } from 'react-lib/src/stores/collaboration/spectate-user';
import {
  EntityMesh,
  isEntityMesh,
} from 'react-lib/src/utils/extended-reality/vr-helpers/detail-info-composer';
import IdeWebsocket from 'react-lib/src/ide/ide-websocket';
import IdeCrossCommunication from 'react-lib/src/ide/ide-cross-communication';
import { removeAllHighlightingFor } from 'react-lib/src/utils/application-rendering/highlighting';
import { useLinkRendererStore } from 'react-lib/src/stores/link-renderer';
import { useSceneRepositoryStore } from 'react-lib/src/stores/repos/scene-repository';
import { useRoomSerializerStore } from 'react-lib/src/stores/collaboration/room-serializer';
import { useAnnotationHandlerStore } from 'react-lib/src/stores/annotation-handler';
import { SnapshotToken } from 'react-lib/src/stores/snapshot-token';
import { useAuthStore } from 'react-lib/src/stores/auth';
import GamepadControls from 'react-lib/src/utils/controls/gamepad/gamepad-controls';
import SemanticZoomManager from 'react-lib/src/view-objects/3d/application/utils/semantic-zoom-manager';
import { ImmersiveView } from 'react-lib/src/rendering/application/immersive-view';
import ClazzCommunicationMesh from 'react-lib/src/view-objects/3d/application/clazz-communication-mesh';
import { useMinimapStore } from 'react-lib/src/stores/minimap-service';
import Raycaster from 'react-lib/src/utils/raycaster';
import calculateHeatmap from 'react-lib/src/utils/calculate-heatmap';
import { useHeatmapConfigurationStore } from 'react-lib/src/stores/heatmap/heatmap-configuration';
import { useToastHandlerStore } from 'react-lib/src/stores/toast-handler';
import Landscape3D from 'react-lib/src/view-objects/3d/landscape/landscape-3d';
import PopupData from 'react-lib/src/components/visualization/rendering/popups/popup-data';
import LoadingIndicator from 'react-lib/src/components/visualization/rendering/loading-indicator';
import CollaborationOpener from 'react-lib/src/components/collaboration/visualization/page-setup/sidebar/customizationbar/collaboration/collaboration-opener';
import VscodeExtensionOpener from 'react-lib/src/components/collaboration/visualization/page-setup/sidebar/customizationbar/vscode/vscode-extension-settings-opener';
import RestructureOpener from 'react-lib/src/components/visualization/page-setup/sidebar/customizationbar/restructure/restructure-opener';
import SettingsOpener from 'react-lib/src/components/visualization/page-setup/sidebar/customizationbar/settings/settings-opener';
import SnapshotOpener from 'react-lib/src/components/visualization/page-setup/sidebar/customizationbar/snapshot/snapshot-opener';
import TraceReplayerOpener from 'react-lib/src/components/visualization/page-setup/sidebar/toolbar/trace-replayer/trace-replayer-opener';
import ApplicationSearchOpener from 'react-lib/src/components/visualization/page-setup/sidebar/toolbar/application-search/application-search-opener';
import EntityFilteringOpener from 'react-lib/src/components/visualization/page-setup/sidebar/toolbar/entity-filtering/entity-filtering-opener';
import HeatmapInfo from 'react-lib/src/components/heatmap/heatmap-info';
import VscodeExtensionSettings from 'react-lib/src/components/collaboration/visualization/page-setup/sidebar/customizationbar/vscode/vscode-extension-settings';
import ApplicationSearch from 'react-lib/src/components/visualization/page-setup/sidebar/toolbar/application-search/application-search';
import { DynamicLandscapeData } from 'react-lib/src/utils/landscape-schemes/dynamic/dynamic-data';
import { StructureLandscapeData } from 'react-lib/src/utils/landscape-schemes/structure-data';
import MetricsWorker from 'react-lib/src/workers/metrics-worker.js?worker'; // Vite query suffix worker import

import Button from 'react-bootstrap/Button';
import { GearIcon, ToolsIcon } from '@primer/octicons-react';
import ContextMenu from '../../context-menu';
import PopupCoordinator from './popups/popup-coordinator';
import AnnotationCoordinator from './annotations/annotation-coordinator';
import ToolSelection from '../page-setup/sidebar/toolbar/tool-selection';
import EntityFiltering from '../page-setup/sidebar/toolbar/entity-filtering/entity-filtering';
import TraceSelectionAndReplayer from '../page-setup/sidebar/toolbar/trace-replayer/trace-selection-and-replayer';
import SettingsSidebar from '../page-setup/sidebar/customizationbar/settings-sidebar';
import SidebarComponent from '../page-setup/sidebar/sidebar-component';
import CollaborationControls from '../../collaboration/visualization/page-setup/sidebar/customizationbar/collaboration/collaboration-controls';
import ChatBox from '../page-setup/sidebar/customizationbar/chat/chat-box';
import Restructure from '../page-setup/sidebar/customizationbar/restructure/restructure';
import { ApiToken } from '../../../stores/user-api-token';
import { LandscapeToken } from '../../../stores/landscape-token';
import Snapshot from '../page-setup/sidebar/customizationbar/snapshot/snapshot';
import Settings from 'react-lib/src/components/visualization/page-setup/sidebar/customizationbar/settings/settings';
import useLandscapeDataWatcher from '../../../hooks/landscape-data-watcher';

interface BrowserRenderingProps {
  readonly id: string;
  readonly landscapeData: LandscapeData | null;
  readonly landscapeToken: LandscapeToken;
  readonly userApiTokens: ApiToken[];
  readonly visualizationPaused: boolean;
  readonly isDisplayed: boolean;
  readonly showToolsSidebar: boolean;
  readonly showSettingsSidebar: boolean;
  readonly snapshot: boolean | undefined | null;
  readonly snapshotReload: SnapshotToken | undefined | null;
  readonly openedToolComponent: string;
  readonly openedSettingComponent: string;
  triggerRenderingForGivenLandscapeData(
    structureData: StructureLandscapeData,
    dynamicData: DynamicLandscapeData
  ): void;
  openToolsSidebar(): void;
  closeToolsSidebar(): void;
  toggleToolsSidebarComponent(componentId: string): void;
  openSettingsSidebar(): void;
  closeSettingsSidebar(): void;
  toggleSettingsSidebarComponent(componentId: string): void;
  pauseVisualizationUpdating(): void;
  toggleVisualizationUpdating(): void;
  switchToAR(): void;
  restructureLandscape(
    structureData: StructureLandscapeData,
    dynamicData: DynamicLandscapeData
  ): void;
  removeTimestampListener(): void;
}

export default function BrowserRendering({
  id,
  landscapeData,
  landscapeToken,
  userApiTokens,
  visualizationPaused,
  isDisplayed,
  showToolsSidebar,
  showSettingsSidebar,
  snapshot,
  snapshotReload,
  openedToolComponent,
  openedSettingComponent,
  triggerRenderingForGivenLandscapeData,
  openToolsSidebar,
  closeToolsSidebar,
  toggleToolsSidebarComponent,
  openSettingsSidebar,
  closeSettingsSidebar,
  toggleSettingsSidebarComponent,
  pauseVisualizationUpdating,
  toggleVisualizationUpdating,
  switchToAR,
  restructureLandscape,
  removeTimestampListener,
}: BrowserRenderingProps) {
  // MARK: Stores

  const applicationRendererStoreActions = {
    getMeshById: useApplicationRendererStore((state) => state.getMeshById),
    getApplicationById: useApplicationRendererStore(
      (state) => state.getApplicationById
    ),
    getOpenApplications: useApplicationRendererStore(
      (state) => state.getOpenApplications
    ),
    openAllComponentsOfAllApplications: useApplicationRendererStore(
      (state) => state.openAllComponentsOfAllApplications
    ),
    toggleCommunicationRendering: useApplicationRendererStore(
      (state) => state.toggleCommunicationRendering
    ),
    toggleComponent: useApplicationRendererStore(
      (state) => state.toggleComponent
    ),
    closeAllComponents: useApplicationRendererStore(
      (state) => state.closeAllComponents
    ),
    addCommunicationForAllApplications: useApplicationRendererStore(
      (state) => state.addCommunicationForAllApplications
    ),
    openParents: useApplicationRendererStore((state) => state.openParents),
    cleanup: useApplicationRendererStore((state) => state.cleanup),
  };

  const applicationRepositoryStoreActions = {
    cleanup: useApplicationRepositoryStore((state) => state.cleanup),
  };

  const camera = useLocalUserStore((state) => state.defaultCamera);
  const minimapCamera = useLocalUserStore((state) => state.minimapCamera);
  const localUserStoreActions = {
    ping: useLocalUserStore((state) => state.ping),
    tick: useLocalUserStore((state) => state.tick),
    setDefaultCamera: useLocalUserStore((state) => state.setDefaultCamera),
    getCamera: useLocalUserStore((state) => state.getCamera),
  };

  const authUser = useAuthStore((state) => state.user);

  const { appSettings, colors } = useUserSettingsStore(
    useShallow((state) => ({
      appSettings: state.visualizationSettings,
      colors: state.colors,
      updateSetting: state.updateSetting,
    }))
  );
  const userSettingsStoreActions = useUserSettingsStore(
    useShallow((state) => ({
      updateSetting: state.updateSetting,
      applyDefaultSettings: state.applyDefaultSettings,
    }))
  );

  const { isCommRendered, setSemanticZoomEnabled } = useConfigurationStore(
    useShallow((state) => ({
      isCommRendered: state.isCommRendered,
      setSemanticZoomEnabled: state.setSemanticZoomEnabled,
    }))
  );
  const configurationStoreActions = {
    setSemanticZoomEnabled: useConfigurationStore(
      (state) => state.semanticZoomEnabled
    ),
    setIsCommRendered: useConfigurationStore(
      (state) => state.setIsCommRendered
    ),
  };

  const getScene = useSceneRepositoryStore((state) => state.getScene);

  const landscapeRestructureStoreActions = {
    setCanvas: useLandscapeRestructureStore((state) => state.setCanvas),
  };

  const highlightingStoreActions = {
    highlightTrace: useHighlightingStore((state) => state.highlightTrace),
    removeHighlightingForAllApplications: useHighlightingStore(
      (state) => state.removeHighlightingForAllApplications
    ),
    updateHighlighting: useHighlightingStore(
      (state) => state.updateHighlighting
    ),
    updateHighlightingOnHover: useHighlightingStore(
      (state) => state.updateHighlightingOnHover
    ),
    toggleHighlight: useHighlightingStore((state) => state.toggleHighlight),
    toggleHighlightById: useHighlightingStore(
      (state) => state.toggleHighlightById
    ),
  };

  const spectateUserStoreActions = {
    setCameraControls: useSpectateUserStore((state) => state.setCameraControls),
  };

  const minimapStoreActions = {
    initializeMinimap: useMinimapStore((state) => state.initializeMinimap),
    setRaycaster: useMinimapStore((state) => state.setRaycaster),
  };

  const popupData = usePopupHandlerStore((state) => state.popupData);
  const popupHandlerStoreActions = {
    addPopup: usePopupHandlerStore((state) => state.addPopup),
    removePopup: usePopupHandlerStore((state) => state.removePopup),
    pinPopup: usePopupHandlerStore((state) => state.pinPopup),
    sharePopup: usePopupHandlerStore((state) => state.sharePopup),
    handleMouseMove: usePopupHandlerStore((state) => state.handleMouseMove),
    handleHoverOnMesh: usePopupHandlerStore((state) => state.handleHoverOnMesh),
    updateMeshReference: usePopupHandlerStore(
      (state) => state.updateMeshReference
    ),
    cleanup: usePopupHandlerStore((state) => state.cleanup),
  };

  const annotationData = useAnnotationHandlerStore(
    (state) => state.annotationData
  );
  const minimizedAnnotations = useAnnotationHandlerStore(
    (state) => state.minimizedAnnotations
  );
  const annotationHandlerStoreActions = {
    addAnnotation: useAnnotationHandlerStore((state) => state.addAnnotation),
    hideAnnotation: useAnnotationHandlerStore((state) => state.hideAnnotation),
    minimizeAnnotation: useAnnotationHandlerStore(
      (state) => state.minimizeAnnotation
    ),
    editAnnotation: useAnnotationHandlerStore((state) => state.editAnnotation),
    updateAnnotation: useAnnotationHandlerStore(
      (state) => state.updateAnnotation
    ),
    removeAnnotation: useAnnotationHandlerStore(
      (state) => state.removeAnnotation
    ),
    clearAnnotations: useAnnotationHandlerStore(
      (state) => state.clearAnnotations
    ),
    shareAnnotation: useAnnotationHandlerStore(
      (state) => state.shareAnnotation
    ),
    handleMouseMove: useAnnotationHandlerStore(
      (state) => state.handleMouseMove
    ),
    handleHoverOnMesh: useAnnotationHandlerStore(
      (state) => state.handleHoverOnMesh
    ),
    updateMeshReference: useAnnotationHandlerStore(
      (state) => state.updateMeshReference
    ),
    cleanup: useAnnotationHandlerStore((state) => state.cleanup),
  };

  const heatmapActive = useHeatmapConfigurationStore(
    (state) => state.heatmapActive
  );
  const heatmapConfigurationStoreActions = {
    setActiveApplication: useHeatmapConfigurationStore(
      (state) => state.setActiveApplication
    ),
    cleanup: useHeatmapConfigurationStore((state) => state.cleanup),
  };

  const {
    showInfoToastMessage,
    showSuccessToastMessage,
    showErrorToastMessage,
  } = useToastHandlerStore(
    useShallow((state) => ({
      showInfoToastMessage: state.showInfoToastMessage,
      showSuccessToastMessage: state.showSuccessToastMessage,
      showErrorToastMessage: state.showErrorToastMessage,
    }))
  );

  // MARK: State

  const [landscape3D, setLandscape3D] = useState<Landscape3D>(
    new Landscape3D()
  );
  const [updateLayout, setUpdateLayout] = useState<boolean>(false);
  const [scene, setScene] = useState<THREE.Scene>(getScene('browser', true));
  const [mousePosition, setMousePosition] = useState<Vector3>(
    new Vector3(0, 0, 0)
  );
  const [selectedApplicationId, setSelectedApplicationId] =
    useState<string>('');

  // MARK: Event handlers

  const getSelectedApplicationObject3D = () => {
    if (selectedApplicationId === '') {
      // TODO
      setSelectedApplicationId(
        applicationRendererStoreActions.getOpenApplications()[0].getModelId()
      );
    }
    return applicationRendererStoreActions.getApplicationById(
      selectedApplicationId
    );
  };

  const getRaycastObjects = () => scene.children;

  const tick = async (delta: number) => {
    useCollaborationSessionStore
      .getState()
      .idToRemoteUser.forEach((remoteUser) => {
        remoteUser.update(delta); // TODO non-immutable update
      });
    if (initDone && useLinkRendererStore.getState()._flag) {
      useLinkRendererStore.getState().setFlag(false);
    }
  };

  const toggleSemanticZoom = () => {
    if (!SemanticZoomManager.instance.isEnabled) {
      SemanticZoomManager.instance.activate();
    } else {
      SemanticZoomManager.instance.deactivate();
    }
    userSettingsStoreActions.updateSetting(
      'semanticZoomState',
      SemanticZoomManager.instance.isEnabled
    );
    setSemanticZoomEnabled(SemanticZoomManager.instance.isEnabled);
  };

  const showSemanticZoomClusterCenters = () => {
    // Remove previous center points from scene
    const prevCenterPointList = scene.children.filter(
      (preCenterPoint) => preCenterPoint.name == 'centerPoints'
    );
    prevCenterPointList.forEach((preCenterPoint) => {
      scene.remove(preCenterPoint);
    });

    if (!SemanticZoomManager.instance.isEnabled) {
      return;
    }

    // Poll Center Vectors
    SemanticZoomManager.instance
      .getClusterCentroids()
      .forEach((centerPoint) => {
        // Create red material
        const xGroup = new THREE.Group();
        xGroup.name = 'centerPoints';
        const redMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });

        // Create the first part of the "X" (a thin rectangle)
        const geometry = new THREE.BoxGeometry(0.1, 0.01, 0.01); // A long thin box
        const part1 = new THREE.Mesh(geometry, redMaterial);
        part1.rotation.z = Math.PI / 4; // Rotate 45 degrees

        // Create the second part of the "X"
        const part2 = new THREE.Mesh(geometry, redMaterial);
        part2.rotation.z = -Math.PI / 4; // Rotate -45 degrees

        // Add both parts to the scene
        xGroup.add(part1);
        xGroup.add(part2);

        // Set Position of X Group
        xGroup.position.copy(centerPoint);
        scene.add(xGroup);
      });
  };

  const highlightTrace = (trace: Trace, traceStep: string) => {
    const selectedObject3D = getSelectedApplicationObject3D();

    if (!landscapeData || !selectedObject3D) {
      return;
    }

    highlightingStoreActions.highlightTrace(
      trace,
      traceStep,
      selectedObject3D,
      landscapeData.structureLandscapeData
    );
  };

  const resetView = async () => {
    cameraControls.current!.resetCameraFocusOn(1.0, [landscape3D]);
  };

  const initCameras = () => {
    if (!canvas.current) {
      console.error('Unable to initialize cameras: Canvas ref is not defined');
      return;
    }

    const aspectRatio = canvas.current.width / canvas.current.height;

    // Camera

    const newCam = new THREE.PerspectiveCamera(
      appSettings.cameraFov.value,
      aspectRatio,
      appSettings.cameraNear.value,
      appSettings.cameraFar.value
    );

    newCam.position.set(1, 2, 3);
    scene.add(newCam);
    localUserStoreActions.setDefaultCamera(newCam);

    // Add Camera to ImmersiveView manager

    ImmersiveView.instance.registerCamera(newCam);
    ImmersiveView.instance.registerScene(scene);
    ImmersiveView.instance.registerCanvas(canvas.current);

    // Controls

    cameraControls.current = new CameraControls(camera, canvas.current);
    spectateUserStoreActions.setCameraControls(cameraControls.current);

    tickCallbacks.current.push({
      id: 'local-user',
      callback: localUserStoreActions.tick,
    });
    tickCallbacks.current.push({
      id: 'camera-controls',
      callback: cameraControls.current.tick,
    });

    // Initialize minimap

    minimapStoreActions.initializeMinimap(
      scene,
      landscape3D,
      cameraControls.current
    );
    minimapStoreActions.setRaycaster(new Raycaster(minimapCamera));
  };

  /**
   * Initiates a WebGLRenderer
   */
  const initRenderer = () => {
    if (!canvas.current) {
      console.error('Failed to initialize renderer: Canvas ref is undefined');
      return;
    }

    const { width, height } = canvas.current;
    renderer.current = new THREE.WebGLRenderer({
      antialias: true,
      canvas: canvas.current,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    renderer.current.shadowMap.enabled = true;
    renderer.current.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.current.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.current.setSize(width, height);

    renderingLoop.current = new RenderingLoop({
      camera: camera,
      scene: scene,
      renderer: renderer.current,
      tickCallbacks: tickCallbacks.current,
    });
    ImmersiveView.instance.registerRenderingLoop(renderingLoop.current);
    renderingLoop.current.start();

    document.addEventListener('Landscape initialized', () => {
      if (!initDone.current && landscape3D.children.length > 0) {
        setTimeout(() => {
          cameraControls.current!.resetCameraFocusOn(1.2, [landscape3D]);
          if (
            SemanticZoomManager.instance.isEnabled ||
            appSettings.semanticZoomState.value == true
          ) {
            SemanticZoomManager.instance.activate();
            setSemanticZoomEnabled(SemanticZoomManager.instance.isEnabled);
          }
        }, 200);
        initDone.current = true;
      }

      if (snapshot || snapshotReload) {
        if (!initDone.current && landscape3D.children.length > 0) {
          setTimeout(() => {
            applicationRendererStoreActions.getOpenApplications();
          }, 200);
          initDone.current = true;
        }
      } else {
        if (!initDone.current && landscape3D.children.length > 0) {
          setTimeout(() => {
            cameraControls.current!.resetCameraFocusOn(1.2, [landscape3D]);
          }, 200);
          initDone.current = true;
        }
      }
    });
  };

  const handleSingleClick = (intersection: THREE.Intersection | null) => {
    if (intersection) {
      // setMousePosition(intersection.point.clone());
      handleSingleClickOnMesh(intersection.object);
      ideWebsocket.current.jumpToLocation(intersection.object);
      ideCrossCommunication.current.jumpToLocation(intersection.object);
    } else {
      removeAllHighlighting();
    }
  };

  const removeAllHighlighting = () => {
    highlightingStoreActions.removeHighlightingForAllApplications(true);
    highlightingStoreActions.updateHighlighting();
  };

  const lookAtMesh = (meshId: string) => {
    const mesh = applicationRendererStoreActions.getMeshById(meshId);
    if (mesh?.isObject3D) {
      cameraControls.current!.focusCameraOn(1, mesh);
    }
  };

  const handleSingleClickOnMesh = (mesh: THREE.Object3D) => {
    if (
      mesh instanceof FoundationMesh &&
      mesh.parent instanceof ApplicationObject3D
    ) {
      selectActiveApplication(mesh.parent);
    }

    if (isEntityMesh(mesh) && !heatmapActive) {
      highlightingStoreActions.toggleHighlight(mesh, { sendMessage: true });
    }
  };

  const handleDoubleClick = (intersection: THREE.Intersection) => {
    if (intersection) {
      handleDoubleClickOnMesh(intersection.object);
    }
  };

  const handleCtrlDown = () => {
    SemanticZoomManager.instance.logCurrentState();
    // nothing to do atm
  };

  const handleCtrlUp = () => {
    // nothing to do atm
  };

  const handleAltDown = () => {
    highlightingStoreActions.updateHighlightingOnHover(true);
  };

  const handleAltUp = () => {
    highlightingStoreActions.updateHighlightingOnHover(false);
  };

  const handleSpaceBar = () => {
    toggleVisualizationUpdating();
  };

  const selectActiveApplication = async (
    applicationObject3D: ApplicationObject3D
  ) => {
    if (applicationObject3D.dataModel.applicationMetrics.metrics.length === 0) {
      const workerPayload = {
        structure: applicationObject3D.dataModel.application,
        dynamic: landscapeData?.dynamicLandscapeData,
      };

      worker.current.onmessage = (e) => {
        calculateHeatmap(
          applicationObject3D.dataModel.applicationMetrics,
          e.data
        );
      };
      worker.current.postMessage(workerPayload);
    }

    if (getSelectedApplicationObject3D() !== applicationObject3D) {
      setSelectedApplicationId(applicationObject3D.getModelId());
      heatmapConfigurationStoreActions.setActiveApplication(
        applicationObject3D
      );
    }

    applicationObject3D.updateMatrixWorld();
    // TODO: Update links (make them invisible?)
  };

  const handleDoubleClickOnMeshIDEAPI = (meshID: string) => {
    const mesh = applicationRendererStoreActions.getMeshById(meshID);
    if (mesh?.isObject3D) {
      handleDoubleClickOnMesh(mesh);
    }
  };

  const handleDoubleClickOnMesh = (mesh: THREE.Object3D) => {
    if (mesh instanceof ComponentMesh || mesh instanceof FoundationMesh) {
      if (!appSettings.keepHighlightingOnOpenOrClose.value) {
        const applicationObject3D = mesh.parent;
        if (applicationObject3D instanceof ApplicationObject3D) {
          removeAllHighlightingFor(applicationObject3D);
        }
      }
    }

    if (mesh instanceof ComponentMesh) {
      const applicationObject3D = mesh.parent;
      if (applicationObject3D instanceof ApplicationObject3D) {
        // Toggle open state of clicked component
        applicationRendererStoreActions.toggleComponent(
          mesh,
          applicationObject3D
        );
      }
      // Close all components since foundation shall never be closed itself
    } else if (mesh instanceof FoundationMesh) {
      const applicationObject3D = mesh.parent;
      if (applicationObject3D instanceof ApplicationObject3D) {
        applicationRendererStoreActions.closeAllComponents(applicationObject3D);
      }
    }
    if (ImmersiveView.instance.isImmersiveViewCapable(mesh)) {
      ImmersiveView.instance.triggerObject(mesh);
    }
  };

  const handleMouseMove = (
    intersection: THREE.Intersection | null,
    event: MouseEvent
  ) => {
    popupHandlerStoreActions.handleMouseMove(event);
    annotationHandlerStoreActions.handleMouseMove(event);

    if (intersection) {
      setMousePosition(intersection.point.clone());
      handleMouseMoveOnMesh(intersection.object);
      //@ts-ignore Interface conformance can only be checked at runtime
      ImmersiveView.instance.takeHistory(intersection.object);
    } else if (hoveredObject.current) {
      hoveredObject.current.resetHoverEffect();
      hoveredObject.current = null;
      ImmersiveView.instance.takeHistory(null);
    }

    popupHandlerStoreActions.handleHoverOnMesh(intersection?.object);
    annotationHandlerStoreActions.handleHoverOnMesh(intersection?.object);

    if (!event.altKey) {
      highlightingStoreActions.updateHighlightingOnHover(
        isEntityMesh(intersection?.object) && intersection.object.highlighted
      );
    }
  };

  const showApplication = (appId: string) => {
    removePopup(appId);
    const applicationObject3D =
      applicationRendererStoreActions.getApplicationById(appId);
    if (applicationObject3D) {
      cameraControls.current!.focusCameraOn(0.8, applicationObject3D);
    }
  };

  const handleMouseMoveOnMesh = (mesh: THREE.Object3D | undefined) => {
    const { value: enableAppHoverEffects } = appSettings.enableHoverEffects;

    // Update hover effect
    if (isEntityMesh(mesh) && enableAppHoverEffects && !heatmapActive) {
      hoveredObject.current?.resetHoverEffect();
      hoveredObject.current = mesh;
      mesh.applyHoverEffect();
    }
  };

  const addAnnotationForPopup = (popup: PopupData) => {
    const mesh = applicationRendererStoreActions.getMeshById(popup.entity.id);
    if (!mesh) return;

    annotationHandlerStoreActions.addAnnotation({
      annotationId: undefined,
      mesh: mesh,
      position: { x: popup.mouseX + 400, y: popup.mouseY },
      hovered: true,
      annotationTitle: '',
      annotationText: '',
      sharedBy: '',
      owner: authUser!.name.toString(),
      shared: false,
      inEdit: true,
      lastEditor: undefined,
      wasMoved: true,
    });
  };

  const removePopup = (entityId: string) => {
    popupHandlerStoreActions.removePopup(entityId);

    // remove potential toggle effect
    const mesh = applicationRendererStoreActions.getMeshById(entityId);
    if (mesh?.isHovered) {
      mesh.resetHoverEffect();
    }
  };

  const removeAnnotation = (annotationId: number) => {
    if (!appSettings.enableCustomAnnotationPosition.value) {
      annotationHandlerStoreActions.clearAnnotations();
    } else {
      annotationHandlerStoreActions.removeAnnotation(annotationId);
    }
  };

  const handleMouseOut = (/*event: React.PointerEvent*/) => {
    popupHandlerStoreActions.handleHoverOnMesh();
    annotationHandlerStoreActions.handleHoverOnMesh();
  };

  const handleMouseStop = (
    intersection: THREE.Intersection | null,
    mouseOnCanvas: Position2D
  ) => {
    if (intersection) {
      popupHandlerStoreActions.addPopup({
        mesh: intersection.object,
        position: mouseOnCanvas,
        hovered: true,
      });

      annotationHandlerStoreActions.addAnnotation({
        annotationId: undefined,
        mesh: intersection.object,
        position: { x: mouseOnCanvas.x + 250, y: mouseOnCanvas.y },
        hovered: true,
        annotationTitle: '',
        annotationText: '',
        sharedBy: '',
        owner: authUser!.name,
        shared: false,
        inEdit: true,
        lastEditor: undefined,
      });
    }
  };

  /**
   * Moves camera such that a specified clazz or clazz communication is in focus.
   *
   * @param model Clazz or clazz communication which shall be in focus of the camera
   */
  const moveCameraToModel = (model: Class | Span) => {
    const selectedApplicationObject3D = getSelectedApplicationObject3D();
    if (!selectedApplicationObject3D || !landscapeData) {
      return;
    }
    moveCameraTo(
      model,
      selectedApplicationObject3D,
      landscapeData.dynamicLandscapeData,
      cameraControls.current!
    );
  };

  const updateSceneColors = () => {
    updateColors(scene, colors!);
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

  const handleResize = () => {
    if (!outerDiv.current) {
      console.error('Outer div ref was not assigned');
      return;
    }

    const width = outerDiv.current.clientWidth;
    const height = outerDiv.current.clientHeight;

    const newAspectRatio = width / height;

    // Update renderer and cameras according to canvas size
    renderer.current!.setSize(width, height);
    camera.aspect = newAspectRatio;
    camera.updateProjectionMatrix();

    // Gamepad controls
    gamepadControls.current = new GamepadControls(
      camera,
      scene,
      cameraControls.current!.perspectiveCameraControls,
      {
        lookAt: handleMouseMove,
        select: handleSingleClick,
        interact: handleDoubleClick,
        inspect: handleMouseStop,
        ping: localUserStoreActions.ping,
      }
    );
  };

  // MARK: Refs

  const canvas = useRef<HTMLCanvasElement | null>(null);
  const outerDiv = useRef<HTMLDivElement | null>(null);
  const renderer = useRef<THREE.WebGLRenderer | null>(null);
  const tickCallbacks = useRef<TickCallback[]>([]);
  const renderingLoop = useRef<RenderingLoop | null>(null);
  const hoveredObject = useRef<EntityMesh | null>(null);
  const controls = useRef<MapControls | null>(null);
  const cameraControls = useRef<CameraControls | null>(null);
  const gamepadControls = useRef<GamepadControls | null>(null);
  const initDone = useRef<boolean>(false);
  const toggleForceAppearenceLayer = useRef<boolean>(false);
  const semanticZoomToggle = useRef<boolean>(false);
  const ideWebsocket = useRef<IdeWebsocket>(
    new IdeWebsocket(handleDoubleClickOnMeshIDEAPI, lookAtMesh)
  );
  const ideCrossCommunication = useRef<IdeCrossCommunication>(
    new IdeCrossCommunication(handleDoubleClickOnMeshIDEAPI, lookAtMesh)
  );
  const worker = useRef<Worker>(new MetricsWorker());

  // MARK: Variables

  const rightClickMenuItems = [
    { title: 'Reset View', action: resetView },
    {
      title: 'Open All Components',
      action: () => {
        if (
          appSettings.autoOpenCloseFeature.value == true &&
          appSettings.semanticZoomState.value == true
        ) {
          showErrorToastMessage(
            'Open All Components not useable when Semantic Zoom with auto open/close is enabled.'
          );
          return;
        }
        applicationRendererStoreActions.openAllComponentsOfAllApplications();
      },
    },
    {
      title: isCommRendered ? 'Hide Communication' : 'Add Communication',
      action: applicationRendererStoreActions.toggleCommunicationRendering,
    },
    { title: 'Enter AR', action: switchToAR },
  ];

  // MARK: Effects and hooks

  useEffect(function initialize() {
    scene.background = colors!.backgroundColor;

    useLocalUserStore
      .getState()
      .setDefaultCamera(new THREE.PerspectiveCamera());

    setSemanticZoomEnabled(SemanticZoomManager.instance.isEnabled);

    scene.add(landscape3D);
    tickCallbacks.current.push(
      { id: 'browser-rendering', callback: tick },
      { id: 'spectate-user', callback: useSpectateUserStore.getState().tick },
      { id: 'minimap', callback: useMinimapStore.getState().tick }
    );

    // TODO reset popupHandler state?

    ImmersiveView.instance.callbackOnEntering = () => {
      usePopupHandlerStore.getState().setDeactivated(true);
      usePopupHandlerStore.getState().clearPopups();
    };

    ImmersiveView.instance.callbackOnExit = () => {
      usePopupHandlerStore.getState().setDeactivated(false);
    };

    // Semantic Zoom Manager shows/removes all communication arrows due to high rendering time.
    // If the Semantic Zoom feature is enabled, all previously generated arrows are hidden.
    // After that, the manager decides on which level to show.
    // If it gets disabled, all previous arrows are restored.
    // All this is done by shifting layers.
    SemanticZoomManager.instance.registerActivationCallback((onOff) => {
      useLinkRendererStore
        .getState()
        .getAllLinks()
        .forEach((currentCommunicationMesh: ClazzCommunicationMesh) => {
          currentCommunicationMesh.getArrowMeshes().forEach((arrow) => {
            if (onOff) {
              arrow.layers.disableAll();
            } else {
              arrow.layers.set(0);
            }
          });
        });
      applicationRendererStoreActions.getOpenApplications().forEach((ap) => {
        ap.getCommMeshes().forEach((currentCommunicationMesh) => {
          currentCommunicationMesh.getArrowMeshes().forEach((arrow) => {
            if (onOff) {
              arrow.layers.disableAll();
            } else {
              arrow.layers.set(0);
            }
          });
        });
      });
    });
    // Loads the AutoOpenClose activation state from the settings.
    SemanticZoomManager.instance.toggleAutoOpenClose(
      appSettings.autoOpenCloseFeature.value
    );

    useApplicationRendererStore.getState().setLandscape3D(landscape3D);

    // Cleanup on component unmount
    return function cleanup() {
      worker.current.terminate();
      renderingLoop.current?.stop();
      applicationRendererStoreActions.cleanup();
      applicationRepositoryStoreActions.cleanup();
      renderer.current?.dispose();
      renderer.current?.forceContextLoss();

      ideWebsocket.current.dispose();

      heatmapConfigurationStoreActions.cleanup();
      renderingLoop.current?.stop();
      configurationStoreActions.setIsCommRendered(false);
      popupHandlerStoreActions.cleanup();
      annotationHandlerStoreActions.cleanup();

      // Clean up WebGL rendering context by forcing context loss
      const gl = canvas.current?.getContext('webgl');
      if (!gl) {
        return;
      }
      const glExtension = gl.getExtension('WEBGL_lose_context');
      if (!glExtension) return;
      glExtension.loseContext();
    };
  }, []);

  useEffect(function handleCanvasInserted() {
    if (!canvas.current) {
      console.error('Canvas ref was not assigned');
      return;
    }

    landscapeRestructureStoreActions.setCanvas(canvas.current);
    canvas.current.oncontextmenu = (e) => {
      e.preventDefault();
    };

    initCameras();
    initRenderer();
  }, []);

  useResizeDetector({
    refreshMode: 'debounce',
    refreshRate: 100,
    targetRef: outerDiv,
    onResize: handleResize,
  });

  useLandscapeDataWatcher(landscapeData, landscape3D);
  useInteractionModifier(
    canvas,
    getRaycastObjects(),
    localUserStoreActions.getCamera(),
    {
      onSingleClick: handleSingleClick,
      onDoubleClick: handleDoubleClick,
      onMouseMove: handleMouseMove,
      onMouseOut: handleMouseOut,
      onMouseStop: handleMouseStop,
      onCtrlDown: handleCtrlDown,
      onCtrlUp: handleCtrlUp,
      onAltDown: handleAltDown,
      onAltUp: handleAltUp,
      onSpaceDown: handleSpaceBar,
    }
  );

  // MARK: JSX

  return (
    <div className={`row h-100 ${isDisplayed ? 'show' : 'hide'}`}>
      <div className="d-flex flex-column h-100 col-12">
        <div id="rendering" ref={outerDiv}>
          {!showToolsSidebar && (
            <div className="sidebar-tools-button foreground mt-6">
              <Button
                id="toolsOpener"
                variant="outline-secondary"
                title="Tools"
                onClick={openToolsSidebar}
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
                onClick={openSettingsSidebar}
              >
                <GearIcon size="small" className="align-middle" />
              </Button>
            </div>
          )}

          {heatmapActive && <HeatmapInfo />}

          <ContextMenu items={rightClickMenuItems}>
            <canvas id="threejs-canvas" className={'webgl'} ref={canvas} />
          </ContextMenu>
          {/* {loadNewLandscape.isRunning && (
            <div className="position-absolute mt-6 pt-5 ml-3 pointer-events-none">
              <LoadingIndicator text="Loading new Landscape" />
            </div>
          )} */}

          {popupData.map((data) => (
            <PopupCoordinator
              addAnnotationForPopup={addAnnotationForPopup}
              openParents={applicationRendererStoreActions.openParents}
              pinPopup={popupHandlerStoreActions.pinPopup}
              popupData={data}
              removePopup={removePopup}
              sharePopup={popupHandlerStoreActions.sharePopup}
              showApplication={showApplication}
              structureData={landscapeData!.structureLandscapeData}
              toggleHighlightById={highlightingStoreActions.toggleHighlightById}
              updateMeshReference={popupHandlerStoreActions.updateMeshReference}
            />
          ))}

          {annotationData.map((data) => (
            <AnnotationCoordinator
              isMovable={appSettings.enableCustomAnnotationPosition.value}
              annotationData={data}
              shareAnnotation={annotationHandlerStoreActions.shareAnnotation}
              updateMeshReference={
                annotationHandlerStoreActions.updateMeshReference
              }
              removeAnnotation={removeAnnotation}
              hideAnnotation={annotationHandlerStoreActions.hideAnnotation}
              minimizeAnnotation={
                annotationHandlerStoreActions.minimizeAnnotation
              }
              editAnnotation={annotationHandlerStoreActions.editAnnotation}
              updateAnnotation={annotationHandlerStoreActions.updateAnnotation}
              toggleHighlightById={highlightingStoreActions.toggleHighlightById}
              openParents={applicationRendererStoreActions.openParents}
            />
          ))}
        </div>
      </div>
      {showToolsSidebar && (
        <div className="sidebar left" id="toolselection">
          <div className="mt-6 d-flex flex-row w-100" style={{ zIndex: 90 }}>
            <ToolSelection closeToolSelection={closeToolsSidebar}>
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
                        <EntityFiltering
                          landscapeData={landscapeData!}
                          triggerRenderingForGivenLandscapeData={
                            triggerRenderingForGivenLandscapeData
                          }
                          pauseVisualizationUpdating={
                            pauseVisualizationUpdating
                          }
                        />
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
                        landscapeData={landscapeData!}
                        triggerRenderingForGivenLandscapeData={
                          triggerRenderingForGivenLandscapeData
                        }
                        moveCameraTo={moveCameraTo}
                        application={
                          getSelectedApplicationObject3D()!.dataModel
                            .application // Unsure if this is the correct value to pass
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
        <div className="sidebar right col-4" id="settingsSidebar">
          <div className="mt-6 d-flex flex-row w-100" style={{ zIndex: 90 }}>
            <SettingsSidebar closeSettingsSidebar={closeSettingsSidebar}>
              <div className="explorviz-visualization-navbar">
                <ul className="nav justify-content-center">
                  <CollaborationOpener
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
                  {openedSettingComponent === 'VSCode-Extension-Settings' && (
                    <VscodeExtensionSettings />
                  )}
                  {openedSettingComponent === 'Restructure-Landscape' && (
                    <Restructure
                      landscapeData={landscapeData!}
                      restructureLandscape={restructureLandscape}
                      visualizationPaused={visualizationPaused}
                      toggleVisualizationUpdating={toggleVisualizationUpdating}
                      removeTimestampListener={removeTimestampListener}
                      userApiTokens={userApiTokens}
                      popUpData={popupData}
                      annotationData={annotationData}
                      minimizedAnnotations={minimizedAnnotations}
                      landscapeToken={landscapeToken}
                    />
                  )}
                  {openedSettingComponent === 'Persist-Landscape' && (
                    <Snapshot
                      landscapeData={landscapeData!}
                      popUpData={popupData}
                      annotationData={annotationData}
                      minimizedAnnotations={minimizedAnnotations}
                      landscapeToken={landscapeToken}
                    />
                  )}
                  {openedSettingComponent === 'Settings' && (
                    <Settings
                      enterFullscreen={enterFullscreen}
                      popups={popupData}
                      redrawCommunication={
                        applicationRendererStoreActions.addCommunicationForAllApplications
                      }
                      resetSettings={
                        userSettingsStoreActions.applyDefaultSettings
                      }
                      showSemanticZoomClusterCenters={
                        showSemanticZoomClusterCenters
                      }
                      updateColors={updateSceneColors}
                      updateHighlighting={
                        highlightingStoreActions.updateHighlighting
                      }
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
  );
}

// MARK: Types

export type TickCallback = {
  id: string;
  callback:
    | ((delta: number, frame?: XRFrame) => void | Promise<void>)
    | ((delta?: number, frame?: XRFrame) => void | Promise<void>);
};
