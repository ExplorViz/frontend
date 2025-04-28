import { useEffect, useRef, useState } from 'react';

import { useShallow } from 'zustand/react/shallow';
import { useCollaborationSessionStore } from 'explorviz-frontend/src/stores/collaboration/collaboration-session';
import { useLocalUserStore } from 'explorviz-frontend/src/stores/collaboration/local-user';
import { LandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/landscape-data';
import { Position2D } from 'explorviz-frontend/src/hooks/interaction-modifier';
import { usePopupHandlerStore } from 'explorviz-frontend/src/stores/popup-handler';
import RenderingLoop from 'explorviz-frontend/src/rendering/application/rendering-loop';
import { useApplicationRendererStore } from 'explorviz-frontend/src/stores/application-renderer';
import { useConfigurationStore } from 'explorviz-frontend/src/stores/configuration';
import { useHighlightingStore } from 'explorviz-frontend/src/stores/highlighting';
import { useLandscapeRestructureStore } from 'explorviz-frontend/src/stores/landscape-restructure';
import { useApplicationRepositoryStore } from 'explorviz-frontend/src/stores/repos/application-repository';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import CameraControls from 'explorviz-frontend/src/utils/application-rendering/camera-controls';
import {
  moveCameraTo,
  updateColors,
} from 'explorviz-frontend/src/utils/application-rendering/entity-manipulation';
import {
  Span,
  Trace,
} from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/dynamic-data';
import { Class } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import ApplicationObject3D from 'explorviz-frontend/src/view-objects/3d/application/application-object-3d';
import ComponentMesh from 'explorviz-frontend/src/view-objects/3d/application/component-mesh';
import FoundationMesh from 'explorviz-frontend/src/view-objects/3d/application/foundation-mesh';
import { Vector3 } from 'three';
import * as THREE from 'three';
import { MapControls } from 'three-stdlib';
import { useSpectateUserStore } from 'explorviz-frontend/src/stores/collaboration/spectate-user';
import {
  EntityMesh,
  isEntityMesh,
} from 'explorviz-frontend/src/utils/extended-reality/vr-helpers/detail-info-composer';
import IdeWebsocket from 'explorviz-frontend/src/ide/ide-websocket';
import IdeCrossCommunication from 'explorviz-frontend/src/ide/ide-cross-communication';
import { removeAllHighlightingFor } from 'explorviz-frontend/src/utils/application-rendering/highlighting';
import { useLinkRendererStore } from 'explorviz-frontend/src/stores/link-renderer';
import { useSceneRepositoryStore } from 'explorviz-frontend/src/stores/repos/scene-repository';
import { useAnnotationHandlerStore } from 'explorviz-frontend/src/stores/annotation-handler';
import { SnapshotToken } from 'explorviz-frontend/src/stores/snapshot-token';
import { useAuthStore } from 'explorviz-frontend/src/stores/auth';
import GamepadControls from 'explorviz-frontend/src/utils/controls/gamepad/gamepad-controls';
import SemanticZoomManager from 'explorviz-frontend/src/view-objects/3d/application/utils/semantic-zoom-manager';
import { ImmersiveView } from 'explorviz-frontend/src/rendering/application/immersive-view';
import ClazzCommunicationMesh from 'explorviz-frontend/src/view-objects/3d/application/clazz-communication-mesh';
import { useMinimapStore } from 'explorviz-frontend/src/stores/minimap-service';
import Raycaster from 'explorviz-frontend/src/utils/raycaster';
import calculateHeatmap from 'explorviz-frontend/src/utils/calculate-heatmap';
import { useHeatmapConfigurationStore } from 'explorviz-frontend/src/stores/heatmap/heatmap-configuration';
import PopupData from 'explorviz-frontend/src/components/visualization/rendering/popups/popup-data';
import CollaborationOpener from 'explorviz-frontend/src/components/collaboration/visualization/page-setup/sidebar/customizationbar/collaboration/collaboration-opener';
import VscodeExtensionOpener from 'explorviz-frontend/src/components/collaboration/visualization/page-setup/sidebar/customizationbar/vscode/vscode-extension-settings-opener';
import RestructureOpener from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/restructure/restructure-opener';
import SettingsOpener from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/settings-opener';
import SnapshotOpener from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/snapshot/snapshot-opener';
import TraceReplayerOpener from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/trace-replayer/trace-replayer-opener';
import ApplicationSearchOpener from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/application-search/application-search-opener';
import EntityFilteringOpener from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/entity-filtering/entity-filtering-opener';
import HeatmapInfo from 'explorviz-frontend/src/components/heatmap/heatmap-info';
import VscodeExtensionSettings from 'explorviz-frontend/src/components/collaboration/visualization/page-setup/sidebar/customizationbar/vscode/vscode-extension-settings';
import ApplicationSearch from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/application-search/application-search';
import { DynamicLandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/dynamic-data';
import { StructureLandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';

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
import Settings from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/settings';
import useLandscapeDataWatcher from '../../../hooks/landscape-data-watcher';
import useSyncState from '../../../hooks/sync-state';
import useHeatmapRenderer from '../../../hooks/heatmap-renderer';
import useCollaborativeModifier from '../../../hooks/collaborative-modifier';
import eventEmitter from '../../../utils/event-emitter';
import { useRenderingServiceStore } from '../../../stores/rendering-service';
import CanvasWrapper from 'explorviz-frontend/src/components/visualization/rendering/canvas-wrapper';
import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import { getAllApplicationsInLandscape } from 'explorviz-frontend/src/utils/landscape-structure-helpers';
import { getAllPackagesInApplication } from 'explorviz-frontend/src/utils/application-helpers';

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
  id,
  landscapeData,
  landscapeToken,
  userApiTokens,
  visualizationPaused,
  isDisplayed,
  snapshot,
  snapshotReload,
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

  const authState = useAuthStore(
    useShallow((state) => ({
      user: state.user,
    }))
  );

  const userSettingsState = useUserSettingsStore(
    useShallow((state) => ({
      visualizationSettings: state.visualizationSettings,
      colors: state.colors,
    }))
  );
  const userSettingsActions = useUserSettingsStore(
    useShallow((state) => ({
      updateSetting: state.updateSetting,
      applyDefaultSettings: state.applyDefaultSettings,
    }))
  );

  const configurationState = useConfigurationStore(
    useShallow((state) => ({
      isCommRendered: state.isCommRendered,
    }))
  );
  const configurationActions = useConfigurationStore(
    useShallow((state) => ({
      setIsCommRendered: state.setIsCommRendered,
      setSemanticZoomEnabled: state.setSemanticZoomEnabled,
    }))
  );

  const sceneRepositoryActions = useSceneRepositoryStore(
    useShallow((state) => ({
      getScene: state.getScene,
    }))
  );

  const landscapeRestructureActions = useLandscapeRestructureStore(
    useShallow((state) => ({
      setCanvas: state.setCanvas,
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

  const popupHandlerState = usePopupHandlerStore(
    useShallow((state) => ({
      popupData: state.popupData,
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

  const heatmapConfigurationState = useHeatmapConfigurationStore(
    useShallow((state) => ({
      heatmapActive: state.heatmapActive,
    }))
  );
  const heatmapConfigurationActions = useHeatmapConfigurationStore(
    useShallow((state) => ({
      setActiveApplication: state.setActiveApplication,
      cleanup: state.cleanup,
    }))
  );

  const {
    setClassState,
    removeAllClassStates,
    setComponentState,
    removeAllComponentStates,
  } = useVisualizationStore(
    useShallow((state) => ({
      setClassState: state.actions.setClassState,
      removeAllClassStates: state.actions.removeAllClassStates,
      setComponentState: state.actions.setComponentState,
      removeAllComponentStates: state.actions.removeAllComponentStates,
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

  const getRaycastObjects = () => scene.children;

  const tick = async (delta: number) => {
    useCollaborationSessionStore
      .getState()
      .idToRemoteUser.forEach((remoteUser) => {
        remoteUser.update(delta);
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
    userSettingsActions.updateSetting(
      'semanticZoomState',
      SemanticZoomManager.instance.isEnabled
    );
    configurationActions.setSemanticZoomEnabled(
      SemanticZoomManager.instance.isEnabled
    );
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
      userSettingsState.visualizationSettings.cameraFov.value,
      aspectRatio,
      userSettingsState.visualizationSettings.cameraNear.value,
      userSettingsState.visualizationSettings.cameraFar.value
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

    minimapActions.initializeMinimap(
      scene,
      landscape3D,
      cameraControls.current
    );
    minimapActions.setRaycaster(new Raycaster(localUserState.minimapCamera));
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
      camera: localUserState.camera,
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
            userSettingsState.visualizationSettings.semanticZoomState.value ==
              true
          ) {
            SemanticZoomManager.instance.activate();
            configurationActions.setSemanticZoomEnabled(
              SemanticZoomManager.instance.isEnabled
            );
          }
        }, 200);
        initDone.current = true;
      }

      if (snapshot || snapshotReload) {
        if (!initDone.current && landscape3D.children.length > 0) {
          setTimeout(() => {
            applicationRendererActions.getOpenApplications();
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
      ideWebsocket.jumpToLocation(intersection.object);
      ideCrossCommunication.jumpToLocation(intersection.object);
    } else {
      removeAllHighlighting();
    }
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

  const handleSingleClickOnMesh = (mesh: THREE.Object3D) => {
    if (
      mesh instanceof FoundationMesh &&
      mesh.parent instanceof ApplicationObject3D
    ) {
      selectActiveApplication(mesh.parent);
    }

    if (isEntityMesh(mesh) && !heatmapConfigurationState.heatmapActive) {
      highlightingActions.toggleHighlight(mesh, { sendMessage: true });
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
    highlightingActions.updateHighlightingOnHover(true);
  };

  const handleAltUp = () => {
    highlightingActions.updateHighlightingOnHover(false);
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
        dynamic:
          useRenderingServiceStore.getState()._landscapeData
            ?.dynamicLandscapeData, // getState is necessary to ensure newest version of data
      };

      worker.onmessage = (e) => {
        calculateHeatmap(
          applicationObject3D.dataModel.applicationMetrics,
          e.data
        );
      };
      worker.postMessage(workerPayload);
    }

    if (getSelectedApplicationObject3D() !== applicationObject3D) {
      setSelectedApplicationId(applicationObject3D.getModelId());
    }

    heatmapConfigurationActions.setActiveApplication(applicationObject3D);

    applicationObject3D.updateMatrixWorld();
    // TODO: Update links (make them invisible?)
  };

  const handleDoubleClickOnMeshIDEAPI = (meshID: string) => {
    const mesh = applicationRendererActions.getMeshById(meshID);
    if (mesh?.isObject3D) {
      handleDoubleClickOnMesh(mesh);
    }
  };

  const handleDoubleClickOnMesh = (mesh: THREE.Object3D) => {
    if (mesh instanceof ComponentMesh || mesh instanceof FoundationMesh) {
      if (
        !userSettingsState.visualizationSettings.keepHighlightingOnOpenOrClose
          .value
      ) {
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
        applicationRendererActions.toggleComponent(mesh, applicationObject3D);
      }
      // Close all components since foundation shall never be closed itself
    } else if (mesh instanceof FoundationMesh) {
      const applicationObject3D = mesh.parent;
      if (applicationObject3D instanceof ApplicationObject3D) {
        applicationRendererActions.closeAllComponents(applicationObject3D);
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
    popupHandlerActions.handleMouseMove(event);
    annotationHandlerActions.handleMouseMove(event);

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

    popupHandlerActions.handleHoverOnMesh(intersection?.object);
    annotationHandlerActions.handleHoverOnMesh(intersection?.object);

    if (!event.altKey) {
      highlightingActions.updateHighlightingOnHover(
        isEntityMesh(intersection?.object) && intersection.object.highlighted
      );
    }
  };

  const showApplication = (appId: string) => {
    removePopup(appId);
    const applicationObject3D =
      applicationRendererActions.getApplicationById(appId);
    if (applicationObject3D) {
      cameraControls.current!.focusCameraOn(0.8, applicationObject3D);
    }
  };

  const handleMouseMoveOnMesh = (mesh: THREE.Object3D | undefined) => {
    const { value: enableAppHoverEffects } =
      userSettingsState.visualizationSettings.enableHoverEffects;

    // Update hover effect
    if (
      isEntityMesh(mesh) &&
      enableAppHoverEffects &&
      !heatmapConfigurationState.heatmapActive
    ) {
      hoveredObject.current?.resetHoverEffect();
      hoveredObject.current = mesh;
      mesh.applyHoverEffect();
    }
  };

  const addAnnotationForPopup = (popup: PopupData) => {
    const mesh = applicationRendererActions.getMeshById(popup.entity.id);
    if (!mesh) return;

    annotationHandlerActions.addAnnotation({
      annotationId: undefined,
      mesh: mesh,
      position: { x: popup.mouseX + 400, y: popup.mouseY },
      hovered: true,
      annotationTitle: '',
      annotationText: '',
      sharedBy: '',
      owner: authState.user!.name.toString(),
      shared: false,
      inEdit: true,
      lastEditor: undefined,
      wasMoved: true,
    });
  };

  const removePopup = (entityId: string) => {
    popupHandlerActions.removePopup(entityId);

    // remove potential toggle effect
    const mesh = applicationRendererActions.getMeshById(entityId);
    if (mesh?.isHovered) {
      mesh.resetHoverEffect();
    }
  };

  const removeAnnotation = (annotationId: number) => {
    if (
      !userSettingsState.visualizationSettings.enableCustomAnnotationPosition
        .value
    ) {
      annotationHandlerActions.clearAnnotations();
    } else {
      annotationHandlerActions.removeAnnotation(annotationId);
    }
  };

  const handleMouseOut = (/*event: React.PointerEvent*/) => {
    popupHandlerActions.handleHoverOnMesh();
    annotationHandlerActions.handleHoverOnMesh();
  };

  const handleMouseStop = (
    intersection: THREE.Intersection | null,
    mouseOnCanvas: Position2D
  ) => {
    if (intersection) {
      popupHandlerActions.addPopup({
        mesh: intersection.object,
        position: mouseOnCanvas,
        hovered: true,
      });

      annotationHandlerActions.addAnnotation({
        annotationId: undefined,
        mesh: intersection.object,
        position: { x: mouseOnCanvas.x + 250, y: mouseOnCanvas.y },
        hovered: true,
        annotationTitle: '',
        annotationText: '',
        sharedBy: '',
        owner: authState.user!.name,
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
    updateColors(scene, userSettingsState.colors!);
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
    if (!outerDiv.current || !landscape3D) {
      console.error('Outer div ref was not assigned');
      return;
    }

    const width = outerDiv.current.clientWidth;
    const height = outerDiv.current.clientHeight;

    const newAspectRatio = width / height;

    // Update renderer and cameras according to canvas size
    renderer.current!.setSize(width, height);
    localUserState.camera.aspect = newAspectRatio;
    localUserState.camera.updateProjectionMatrix();

    // Gamepad controls
    gamepadControls.current = new GamepadControls(
      localUserState.camera,
      scene,
      cameraControls.current!.perspectiveCameraControls,
      {
        lookAt: handleMouseMove,
        select: handleSingleClick,
        interact: handleDoubleClick,
        inspect: handleMouseStop,
        ping: localUserActions.ping,
      }
    );
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
  const [updateLayout, setUpdateLayout] = useState<boolean>(false);
  const [scene] = useState<THREE.Scene>(() =>
    sceneRepositoryActions.getScene('browser', true)
  );
  const [mousePosition, setMousePosition] = useState<Vector3>(
    new Vector3(0, 0, 0)
  );
  const [selectedApplicationId, setSelectedApplicationId] =
    useState<string>('');

  const [ideWebsocket] = useState<IdeWebsocket>(
    () => new IdeWebsocket(handleDoubleClickOnMeshIDEAPI, lookAtMesh)
  );
  const [ideCrossCommunication] = useState<IdeCrossCommunication>(
    () => new IdeCrossCommunication(handleDoubleClickOnMeshIDEAPI, lookAtMesh)
  );
  const [worker] = useState<Worker>(
    () =>
      new Worker(new URL('../../../workers/metrics-worker.js', import.meta.url))
  );

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

  // MARK: Effects and hooks

  useEffect(() => {
    if (landscapeData) {
      const allPackages = getAllApplicationsInLandscape(
        landscapeData.structureLandscapeData
      )
        .map((app) => getAllPackagesInApplication(app))
        .flat();
      allPackages.forEach((pkg) => {
        setComponentState(pkg.id, {
          id: pkg.id,
          isOpen: true,
          isVisible: true,
          isHighlighted: false,
          isHovered: false,
        });
        pkg.classes.forEach((classInPckg) => {
          setClassState(classInPckg.id, {
            id: classInPckg.id,
            isVisible: true,
            isHighlighted: false,
            isHovered: false,
          });
        });
      });
    }
    return () => {
      removeAllComponentStates();
      removeAllClassStates();
    };
  }, [landscapeData]);

  useEffect(
    function initialize() {
      if (!landscape3D) return;

      scene.background = userSettingsState.colors!.backgroundColor;

      useLocalUserStore
        .getState()
        .setDefaultCamera(new THREE.PerspectiveCamera());

      configurationActions.setSemanticZoomEnabled(
        SemanticZoomManager.instance.isEnabled
      );

      // scene.add(landscape3D);
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
        applicationRendererActions.getOpenApplications().forEach((ap) => {
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
        userSettingsState.visualizationSettings.autoOpenCloseFeature.value
      );

      // useApplicationRendererStore.getState().setLandscape3D(landscape3D);

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

        ideWebsocket.dispose();

        heatmapConfigurationActions.cleanup();
        // renderingLoop.current?.stop();
        configurationActions.setIsCommRendered(true);
        popupHandlerActions.cleanup();
        annotationHandlerActions.cleanup();

        eventEmitter.off('openSettingsSidebar', handleOpenSettingsSidebarEvent);
        eventEmitter.off(
          'restructureComponent',
          handleToggleSettingsSidebarComponentEvent
        );

        // Clean up WebGL rendering context by forcing context loss
        // const gl = canvas.current?.getContext('webgl');
        // if (!gl) {
        //   return;
        // }
        // const glExtension = gl.getExtension('WEBGL_lose_context');
        // if (!glExtension) return;
        // glExtension.loseContext();
      };
    },
    [landscape3D]
  );

  // useEffect(
  //   function handleCanvasInserted() {
  //     if (!landscape3D) return;

  //     if (!canvas.current) {
  //       console.error('Canvas ref was not assigned');
  //       return;
  //     }

  //     landscapeRestructureActions.setCanvas(canvas.current);
  //     canvas.current.oncontextmenu = (e) => {
  //       e.preventDefault();
  //     };

  //     console.log('Init');

  //     // initCameras();
  //     // initRenderer();
  //   },
  //   [landscape3D]
  // );

  // useResizeDetector({
  //   refreshMode: 'debounce',
  //   refreshRate: 100,
  //   targetRef: outerDiv,
  //   onResize: handleResize,
  // });

  useSyncState();
  // useInteractionModifier(
  //   canvas,
  //   getRaycastObjects(),
  //   localUserActions.getCamera(),
  //   {
  //     onSingleClick: handleSingleClick,
  //     onDoubleClick: handleDoubleClick,
  //     onMouseMove: handleMouseMove,
  //     onMouseOut: handleMouseOut,
  //     onMouseStop: handleMouseStop,
  //     onCtrlDown: handleCtrlDown,
  //     onCtrlUp: handleCtrlUp,
  //     onAltDown: handleAltDown,
  //     onAltUp: handleAltUp,
  //     onSpaceDown: handleSpaceBar,
  //   }
  // );
  useHeatmapRenderer(localUserState.camera, scene);

  const { applicationModels, interAppCommunications } = useLandscapeDataWatcher(
    landscapeData,
    landscape3D
  );

  useCollaborativeModifier();

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

          {heatmapConfigurationState.heatmapActive && <HeatmapInfo />}

          <ContextMenu switchToAR={switchToAR}>
            <CanvasWrapper
              landscapeData={landscapeData}
              landscape3D={landscape3D}
            />
          </ContextMenu>
          {/* {loadNewLandscape.isRunning && (
            <div className="position-absolute mt-6 pt-5 ml-3 pointer-events-none">
              <LoadingIndicator text="Loading new Landscape" />
            </div>
          )} */}

          {popupHandlerState.popupData.map((data) => (
            <PopupCoordinator
              key={data.entity.id}
              addAnnotationForPopup={addAnnotationForPopup}
              openParents={applicationRendererActions.openParents}
              pinPopup={popupHandlerActions.pinPopup}
              popupData={data}
              updatePopup={popupHandlerActions.updatePopup}
              removePopup={removePopup}
              sharePopup={popupHandlerActions.sharePopup}
              showApplication={showApplication}
              structureData={landscapeData!.structureLandscapeData}
              toggleHighlightById={highlightingActions.toggleHighlightById}
              updateMeshReference={popupHandlerActions.updateMeshReference}
            />
          ))}

          {annotationHandlerState.annotationData.map((data) => (
            <AnnotationCoordinator
              key={data.annotationId}
              isMovable={
                userSettingsState.visualizationSettings
                  .enableCustomAnnotationPosition.value
              }
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
                      popUpData={popupHandlerState.popupData}
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
                      popUpData={popupHandlerState.popupData}
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
                      popups={popupHandlerState.popupData}
                      redrawCommunication={
                        applicationRendererActions.addCommunicationForAllApplications
                      }
                      resetSettings={userSettingsActions.applyDefaultSettings}
                      showSemanticZoomClusterCenters={
                        showSemanticZoomClusterCenters
                      }
                      updateColors={updateSceneColors}
                      updateHighlighting={
                        highlightingActions.updateHighlighting
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
  callback: (delta: number, frame: XRFrame | undefined) => void | Promise<void>;
};
