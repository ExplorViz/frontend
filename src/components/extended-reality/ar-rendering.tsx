import { useRef, useState, useEffect } from 'react';
import { useCollaborationSessionStore } from 'explorviz-frontend/src/stores/collaboration/collaboration-session';
import { useLocalUserStore } from 'explorviz-frontend/src/stores/collaboration/local-user';
import { useMessageSenderStore } from 'explorviz-frontend/src/stores/collaboration/message-sender';
import { LandscapeData } from 'explorviz-frontend/src/utils/landscape-schemes/landscape-data';
import { usePopupHandlerStore } from 'explorviz-frontend/src/stores/popup-handler';
import RenderingLoop from 'explorviz-frontend/src/rendering/application/rendering-loop';
import { useApplicationRendererStore } from 'explorviz-frontend/src/stores/application-renderer';
import { useHighlightingStore } from 'explorviz-frontend/src/stores/highlighting';
import { useSceneRepositoryStore } from 'explorviz-frontend/src/stores/repos/scene-repository';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import {
  closeAllComponentsInApplication,
  moveCameraTo,
} from 'explorviz-frontend/src/utils/application-rendering/entity-manipulation';
import { addSpheres } from 'explorviz-frontend/src/utils/application-rendering/spheres';
import hitTest from 'explorviz-frontend/src/utils/hit-test';
import Raycaster from 'explorviz-frontend/src/utils/raycaster';
import ApplicationObject3D from 'explorviz-frontend/src/view-objects/3d/application/application-object-3d';
import ClazzCommunicationMesh from 'explorviz-frontend/src/view-objects/3d/application/clazz-communication-mesh';
import ClazzMesh from 'explorviz-frontend/src/view-objects/3d/application/clazz-mesh';
import ComponentMesh from 'explorviz-frontend/src/view-objects/3d/application/component-mesh';
import FoundationMesh from 'explorviz-frontend/src/view-objects/3d/application/foundation-mesh';
import * as THREE from 'three';
import { useARSettingsStore } from 'explorviz-frontend/src/stores/extended-reality/ar-settings';
import ArZoomHandler from 'explorviz-frontend/src/utils/extended-reality/ar-helpers/ar-zoom-handler';
import {
  EntityMesh,
  isEntityMesh,
} from 'explorviz-frontend/src/utils/extended-reality/vr-helpers/detail-info-composer';
import { useHeatmapConfigurationStore } from 'explorviz-frontend/src/stores/heatmap/heatmap-configuration';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import { ImmersiveView } from 'explorviz-frontend/src/rendering/application/immersive-view';
import Landscape3D from 'explorviz-frontend/src/view-objects/3d/landscape/landscape-3d';
import LoadingIndicator from 'explorviz-frontend/src/components/visualization/rendering/loading-indicator.tsx';
import ArSettingsOpener from 'explorviz-frontend/src/components/extended-reality/visualization/page-setup/navbar/ar-settings-opener.tsx';
import CollaborationOpener from 'explorviz-frontend/src/components/collaboration/visualization/page-setup/sidebar/customizationbar/collaboration/collaboration-opener.tsx';
import SettingsOpener from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/settings-opener.tsx';
import HeatmapInfo from 'explorviz-frontend/src/components/heatmap/heatmap-info.tsx';
import { useConfigurationStore } from 'explorviz-frontend/src/stores/configuration';
import { useResizeDetector } from 'react-resize-detector';
import PopupCoordinator from 'explorviz-frontend/src/components/visualization/rendering/popups/popup-coordinator.tsx';
import PopupButton from 'explorviz-frontend/src/components/extended-reality/visualization/page-setup/ar-buttons/popup-button.tsx';
import HeatmapButton from 'explorviz-frontend/src/components/extended-reality/visualization/page-setup/ar-buttons/heatmap-button';
import ZoomButton from 'explorviz-frontend/src/components/extended-reality/visualization/page-setup/ar-buttons/zoom-button';
import PrimaryInteractionButton from 'explorviz-frontend/src/components/extended-reality/visualization/page-setup/ar-buttons/primary-interaction-button';
import SecondaryInteractionButton from 'explorviz-frontend/src/components/extended-reality/visualization/page-setup/ar-buttons/secondary-interaction-button';
import PingButton from 'explorviz-frontend/src/components/extended-reality/visualization/page-setup/ar-buttons/ping-button';
import {
  PlusIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  DashIcon,
  GearIcon,
  ThreeBarsIcon,
} from '@primer/octicons-react';
import { Button } from 'react-bootstrap';
import { useShallow } from 'zustand/react/shallow';
import SettingsSidebar from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings-sidebar.tsx';
import SidebarComponent from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/sidebar-component.tsx';
import CollaborationControls from 'explorviz-frontend/src/components/collaboration/visualization/page-setup/sidebar/customizationbar/collaboration/collaboration-controls.tsx';
import ArSettingsSelector from 'explorviz-frontend/src/components/extended-reality/visualization/page-setup/sidebar/ar-settings-selector.tsx';
import TraceSelectionAndReplayer from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/trace-replayer/trace-selection-and-replayer.tsx';
import Settings from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/customizationbar/settings/settings';
import eventEmitter from 'explorviz-frontend/src/utils/event-emitter';
import { TickCallback } from 'explorviz-frontend/src/components/visualization/rendering/browser-rendering';
import PopupData from '../visualization/rendering/popups/popup-data';
import { useAnnotationHandlerStore } from 'explorviz-frontend/src/stores/annotation-handler';
import { useAuthStore } from 'explorviz-frontend/src/stores/auth';
import { Trace } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/dynamic-data';
import ApplicationData from 'explorviz-frontend/src/utils/application-data';
import useHeatmapRenderer from '../../hooks/heatmap-renderer';
import ContextMenu from '../context-menu';
import useInteractionModifier from '../../hooks/interaction-modifier';
import useLandscapeDataWatcher from '../../hooks/landscape-data-watcher';
import useCollaborativeModifier from '../../hooks/collaborative-modifier';

interface ArRenderingArgs {
  readonly id: string;
  readonly landscapeData: LandscapeData;
  readonly visualizationPaused: boolean;
  switchToOnScreenMode(): void;
  toggleVisualizationUpdating(): void;
}

export default function ArRendering(arRenderingArgs: ArRenderingArgs) {
  // MARK: Stores

  const sceneRepositoryActions = useSceneRepositoryStore(
    useShallow((state) => ({
      getScene: state.getScene,
    }))
  );

  const localUserState = useLocalUserStore(
    useShallow((state) => ({
      defaultCamera: state.defaultCamera,
    }))
  );

  const localUserActions = useLocalUserStore(
    useShallow((state) => ({
      getCamera: state.getCamera,
      setDefaultCamera: state.setDefaultCamera,
      ping: state.ping,
      tick: state.tick,
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
      updatePopup: state.updatePopup,
      updateMeshReference: state.updateMeshReference,
      removePopup: state.removePopup,
      clearPopups: state.clearPopups,
      pinPopup: state.pinPopup,
      sharePopup: state.sharePopup,
      handleHoverOnMesh: state.handleHoverOnMesh,
      removeUnpinnedPopups: state.removeUnpinnedPopups,
    }))
  );

  const applicationRendererActions = useApplicationRendererStore(
    useShallow((state) => ({
      getMeshById: state.getMeshById,
      getApplicationById: state.getApplicationById,
      addCommunicationForAllApplications:
        state.addCommunicationForAllApplications,
      openAllComponentsOfAllApplications:
        state.openAllComponentsOfAllApplications,
      openParents: state.openParents,
      toggleCommunicationRendering: state.toggleCommunicationRendering,
      setOpenApplicationsMap: state.setOpenApplicationsMap,
      setLandscape3D: state.setLandscape3D,
      openAllComponents: state.openAllComponents,
      closeAllComponents: state.closeAllComponents,
      toggleComponent: state.toggleComponent,
    }))
  );

  const annotationHandlerActions = useAnnotationHandlerStore(
    useShallow((state) => ({
      addAnnotation: state.addAnnotation,
    }))
  );

  const authState = useAuthStore(
    useShallow((state) => ({
      user: state.user,
    }))
  );

  const userSettingsState = useUserSettingsStore(
    useShallow((state) => ({
      colors: state.colors,
    }))
  );

  const userSettingsActions = useUserSettingsStore(
    useShallow((state) => ({
      applyDefaultSettings: state.applyDefaultSettings,
    }))
  );

  const configurationState = useConfigurationStore(
    useShallow((state) => ({
      isCommRendered: state.isCommRendered,
    }))
  );

  const highlightingActions = useHighlightingStore(
    useShallow((state) => ({
      updateHighlighting: state.updateHighlighting,
      removeHighlightingForAllApplications:
        state.removeHighlightingForAllApplications,
      toggleHighlight: state.toggleHighlight,
      toggleHighlightById: state.toggleHighlightById,
    }))
  );

  const collaborationSessionState = useCollaborationSessionStore(
    useShallow((state) => ({
      connectionStatus: state.connectionStatus,
    }))
  );

  const collaborationSessionActions = useCollaborationSessionStore(
    useShallow((state) => ({
      idToRemoteUser: state.idToRemoteUser,
    }))
  );

  const messageSenderActions = useMessageSenderStore(
    useShallow((state) => ({
      sendMousePingUpdate: state.sendMousePingUpdate,
    }))
  );

  const heatmapConfigurationState = useHeatmapConfigurationStore(
    useShallow((state) => ({
      heatmapActive: state.heatmapActive,
      currentApplication: state.currentApplication,
    }))
  );

  const heatmapConfigurationActions = useHeatmapConfigurationStore(
    useShallow((state) => ({
      setActive: state.setActive,
      setActiveApplication: state.setActiveApplication,
    }))
  );

  const toastHandlerActions = useToastHandlerStore();

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

  const [rendererResolutionMultiplier, setRendererResolutionMultiplier] =
    useState<number>(2);

  const [scene] = useState<THREE.Scene>(() =>
    sceneRepositoryActions.getScene('ar', true)
  );

  const [landscape3D] = useState<Landscape3D>(() => new Landscape3D());

  const [mousePosition, setMousePosition] = useState<THREE.Vector3>(
    new THREE.Vector3(0, 0, 0)
  );

  // MARK: Refs

  const outerDivRef = useRef<HTMLDivElement>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const currentSession = useRef<XRSession | null>(null);

  const landscapeMarker = useRef<THREE.Group>(new THREE.Group());

  const applicationMarkers = useRef<THREE.Group[]>([]);

  const willDestroyController = useRef<AbortController>(new AbortController());

  const lastPopupClear = useRef<number>(0);

  const lastOpenAllComponents = useRef<number>(0);

  const [showSettings, setShowSettings] = useState<boolean>(false);

  const localPing = useRef<
    { obj: THREE.Object3D; time: number } | undefined | null
  >(undefined);

  const renderer = useRef<THREE.WebGLRenderer | null>(null);

  const tickCallbacks = useRef<TickCallback[]>([]);

  const raycaster = useRef<Raycaster>(new Raycaster());

  const reticle = useRef<THREE.Mesh | null>(null);

  const arZoomHandler = useRef<ArZoomHandler | undefined>(undefined);

  const renderingLoop = useRef<RenderingLoop | null>(null);

  const hoveredObject = useRef<EntityMesh | null>(null);

  // MARK Constants

  const camera = localUserState.defaultCamera;
  const intersectableObjects = scene.children;

  // MARK Event handlers

  const leaveArView = () => {
    currentSession.current?.end();
    arRenderingArgs.switchToOnScreenMode();
  };

  /**
   * Calls all three related init functions and adds the three
   * performance panel if it is activated in user settings
   * Private function
   */
  const initRendering = () => {
    initCamera();
    initRenderer();
    initAr();

    arZoomHandler.current = new ArZoomHandler(localUserActions.getCamera());

    renderingLoop.current = new RenderingLoop({
      camera: camera,
      scene: scene,
      renderer: renderer.current!,
      tickCallbacks: tickCallbacks.current,
      zoomHandler: arZoomHandler.current!,
    });
    ImmersiveView.instance.registerRenderingLoop(renderingLoop.current);
    const controller = renderer.current!.xr.getController(0);
    // https://immersive-web.github.io/webxr/input-explainer.html
    // controller.addEventListener('select', this.onSelect);
    scene.add(controller);

    window.addEventListener('resize', resize);

    addSpheres('skyblue', mousePosition, scene, tickCallbacks.current);
    tickCallbacks.current.push({
      id: 'ar-rendering',
      callback: tick,
    });

    renderingLoop.current.start();
    initCameraCrosshair();

    // cannot be resized after session started
    resize();

    if (!navigator.xr) {
      console.error('XR not available in navigator.');
      return;
    }

    navigator.xr
      .requestSession('immersive-ar', {
        requiredFeatures: ['hit-test'],
        optionalFeatures: ['dom-overlay', 'dom-overlay-for-handheld-ar'],
        // use document body to display all overlays
        domOverlay: { root: document.body },
      })
      .then(onSessionStarted);
  };

  /**
   * Creates a PerspectiveCamera according to canvas size and sets its initial position
   */
  const initCamera = () => {
    // Set camera properties
    localUserActions.setDefaultCamera(
      new THREE.PerspectiveCamera(
        65,
        document.body.clientWidth / document.body.clientHeight,
        0.01,
        20
      )
    );
    scene.add(useLocalUserStore.getState().defaultCamera);
  };

  const initCameraCrosshair = () => {
    const geometry = new THREE.RingGeometry(0.0001, 0.0003, 30);
    const material = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const crosshairMesh = new THREE.Mesh(geometry, material);

    localUserState.defaultCamera.add(crosshairMesh);
    // Position just in front of camera
    crosshairMesh.position.z = -0.1;
  };

  const handlePinching = (_intersection: THREE.Intersection, delta: number) => {
    landscape3D.scale.multiplyScalar(delta);
  };

  const handleRotate = (_intersection: THREE.Intersection, delta: number) => {
    landscape3D.rotateY(delta);
  };

  const increaseSize = () => {
    landscape3D.scale.multiplyScalar(1.1);
  };

  const decreaseSize = () => {
    landscape3D.scale.multiplyScalar(0.9);
  };

  const rotateLeft = () => {
    landscape3D.rotateY((12.5 * Math.PI) / 180);
  };

  const rotateRight = () => {
    landscape3D.rotateY((-12.5 * Math.PI) / 180);
  };

  const openMenu = () => {
    const position = {
      clientX: 100,
      clientY: window.innerHeight - 200,
      preventDefault: () => {
        // not used atm
      },
    };
    const evt = new CustomEvent('openmenu', {
      detail: {
        srcEvent: position,
      },
      bubbles: true,
      cancelable: true,
    });
    canvasRef.current!.dispatchEvent(evt);
  };

  /**
   * Initiates a WebGLRenderer
   * Private function
   */
  const initRenderer = () => {
    renderer.current = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      canvas: canvasRef.current!,
      powerPreference: 'high-performance',
    });
    renderer.current.xr.enabled = true;

    renderer.current.setClearColor(new THREE.Color('lightgrey'), 0);
  };

  const initAr = () => {
    reticle.current = new THREE.Mesh(
      new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial()
    );
    reticle.current.matrixAutoUpdate = false;
    reticle.current.visible = false;
    scene.add(reticle.current);
  };

  const onSessionStarted = async (session: XRSession) => {
    session.addEventListener('end', onSessionEnded);

    renderer.current!.xr.setReferenceSpaceType('local');

    await renderer.current!.xr.setSession(session);
    currentSession.current = session;
  };

  const onSessionEnded = (/* event */) => {
    currentSession.current?.removeEventListener('end', onSessionEnded);
    currentSession.current = null;
    leaveArView();
  };

  /**
   * Call this whenever the canvas is resized. Updated properties of camera
   * and renderer.
   *
   * @param outerDiv HTML element containing the canvas
   */
  const resize = (/* outerDiv: HTMLElement */) => {
    // AR view will be fullscreen
    // const { width } = window.screen;
    // const { height } = window.screen;
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.current!.setSize(
      width * rendererResolutionMultiplier,
      height * rendererResolutionMultiplier
    );

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  const resetView = () => {
    landscape3D.scale.setScalar(0.02);
    landscape3D.visible = false;
  };

  const updateRendererResolution = (resolutionMultiplier: number) => {
    setRendererResolutionMultiplier(resolutionMultiplier);
    resize();
  };

  const updateCameraResolution = (width: number, height: number) => {
    // Wild guess at what this function is supposed to do
    const aspect = width / height;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
  };

  const handlePrimaryCrosshairInteraction = () => {
    const intersection = raycastCenter();
    if (intersection) {
      handlePrimaryInputOn(intersection);
    } else if (reticle.current!.visible && !landscape3D.visible) {
      const mesh = landscape3D;
      reticle.current!.matrix.decompose(
        mesh.position,
        mesh.quaternion,
        new THREE.Vector3()
      );
      mesh.visible = true;
      reticle.current!.visible = false;
    }
  };

  const handleSecondaryCrosshairInteraction = () => {
    const intersection = raycastCenter();

    if (intersection) {
      handleSecondaryInputOn(intersection);
    } else {
      highlightingActions.removeHighlightingForAllApplications(true);
    }
  };

  const handleOpenAllComponents = async () => {
    lastOpenAllComponents.current = Date.now();

    const intersection = raycastCenter();

    if (!(intersection?.object.parent instanceof ApplicationObject3D)) {
      return;
    }

    const applicationObject3D = intersection.object.parent;

    applicationRendererActions.openAllComponents(applicationObject3D);
  };

  const handlePing = async () => {
    if (collaborationSessionState.connectionStatus !== 'online') {
      toastHandlerActions.showInfoToastMessage(
        'Offline.\nJoin session with users to ping.'
      );
      return;
    }

    const intersection = raycastCenter();

    if (!(intersection?.object.parent instanceof ApplicationObject3D)) {
      return;
    }

    const parentObj = intersection.object.parent;
    const pingPosition = intersection.point;
    parentObj.worldToLocal(pingPosition);

    localUserActions.ping(parentObj, pingPosition);

    if (!useCollaborationSessionStore.getState().isOnline) {
      if (parentObj instanceof ApplicationObject3D) {
        messageSenderActions.sendMousePingUpdate(
          parentObj.getModelId(),
          true,
          pingPosition
        );
      } else {
        messageSenderActions.sendMousePingUpdate(
          'landscape',
          false,
          pingPosition
        );
      }
    }
  };

  const handleHeatmapToggle = async () => {
    const intersection = raycastCenter();
    if (
      intersection &&
      intersection.object.parent instanceof ApplicationObject3D
    ) {
      const applicationObject3D = intersection.object.parent;
      if (
        heatmapConfigurationState.currentApplication === applicationObject3D &&
        heatmapConfigurationState.heatmapActive
      ) {
        heatmapConfigurationActions.setActive(false);
        return;
      }
      heatmapConfigurationActions.setActiveApplication(applicationObject3D);
      heatmapConfigurationActions.setActive(false);
    }
  };

  const handleInfoInteraction = () => {
    // Do not add popup if user long pressed popup button to remove all popups
    if (Date.now() - lastPopupClear.current < 10) return;

    const intersection = raycastCenter();

    if (!intersection) {
      removeUnpinnedPopups();
      return;
    }

    const mesh = intersection.object;
    const position = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    popupHandlerActions.addPopup({
      mesh,
      position,
      hovered: true,
    });
  };

  const toggleSettingsPane = () => {
    setShowSettingsSidebar((showSettingsSidebar) => !showSettingsSidebar);
  };

  const removeAllPopups = () => {
    lastPopupClear.current = Date.now();
    popupHandlerActions.clearPopups();
  };

  const handleDoubleClick = (intersection: THREE.Intersection | null) => {
    if (!intersection) return;

    handlePrimaryInputOn(intersection);
  };

  const handleSingleClick = (intersection: THREE.Intersection | null) => {
    if (!intersection) return;

    setMousePosition(intersection.point.clone());

    handleSecondaryInputOn(intersection);
  };

  const raycastCenter = () => {
    const possibleObjects = intersectableObjects;
    return raycaster.current.raycasting(
      { x: 0, y: 0 },
      camera,
      possibleObjects
    );
  };

  const tick = (delta: number, frame: XRFrame) => {
    const intersection = raycastCenter();
    popupHandlerActions.handleHoverOnMesh(intersection?.object);
    if (intersection) {
      const mesh = intersection.object;
      if (isEntityMesh(mesh)) {
        hoveredObject.current = mesh;
        mesh.applyHoverEffect();
      }
    } else {
      if (isEntityMesh(hoveredObject)) {
        hoveredObject.applyHoverEffect();
      }
      hoveredObject.current = null;
    }

    if (renderer.current!.xr.enabled) {
      if (!landscape3D.visible || reticle.current!.visible) {
        hitTest(renderer.current!, reticle.current!, frame);
      }
    }
    collaborationSessionActions.idToRemoteUser.forEach((remoteUser) => {
      remoteUser.update(delta);
    });
  };

  const handlePrimaryInputOn = (intersection: THREE.Intersection) => {
    const { object } = intersection;

    function handleApplicationObject(appObject: THREE.Object3D) {
      if (
        !(appObject.parent instanceof ApplicationObject3D) ||
        Date.now() - lastOpenAllComponents.current < 20
      )
        return;

      if (appObject instanceof ComponentMesh) {
        applicationRendererActions.toggleComponent(appObject, appObject.parent);
      } else if (appObject instanceof FoundationMesh) {
        applicationRendererActions.closeAllComponents(appObject.parent);
      }
    }

    // Handle application hits
    if (object.parent instanceof ApplicationObject3D) {
      handleApplicationObject(object);
    }
  };

  const handleSecondaryInputOn = (intersection: THREE.Intersection) => {
    const { object } = intersection;

    if (
      object instanceof ComponentMesh ||
      object instanceof ClazzMesh ||
      object instanceof ClazzCommunicationMesh
    ) {
      highlightingActions.toggleHighlight(object, {
        sendMessage: true,
      });
    }
  };

  const removeUnpinnedPopups = popupHandlerActions.removeUnpinnedPopups;

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

  const enterFullscreen = () => {
    if (!canvasRef.current) {
      console.error('Unable to enter fullscreen: Canvas ref is not set');
      return;
    }
    canvasRef.current.requestFullscreen();
  };

  const removePopup = (entityId: string) => {
    popupHandlerActions.removePopup(entityId);

    // remove potential toggle effect
    const mesh = applicationRendererActions.getMeshById(entityId);
    if (mesh?.isHovered) {
      mesh.resetHoverEffect();
    }
  };

  const showApplication = (appId: string) => {
    removePopup(appId);
    // const applicationObject3D =
    //   applicationRendererActions.getApplicationById(appId);
    // if (applicationObject3D) {
    //   cameraControls.current!.focusCameraOn(0.8, applicationObject3D);
    // }
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

  // MARK: Variables

  const rightClickMenuItems = [
    { title: 'Leave AR View', action: leaveArView },
    { title: 'Remove Popups', action: removeAllPopups },
    { title: 'Reset View', action: resetView },
    {
      title: arRenderingArgs.visualizationPaused
        ? 'Resume Visualization'
        : 'Pause Visualization',
      action: arRenderingArgs.toggleVisualizationUpdating,
    },
    {
      title: 'Open All Components',
      action: applicationRendererActions.openAllComponentsOfAllApplications,
    },
    {
      title: configurationState.isCommRendered
        ? 'Hide Communication'
        : 'Add Communication',
      action: applicationRendererActions.toggleCommunicationRendering,
    },
  ];

  // MARK: Effects

  useEffect(function init() {
    scene.background = null;

    applicationRendererActions.setOpenApplicationsMap(new Map());

    scene.add(landscape3D);
    tickCallbacks.current.push({
      id: 'local-user',
      callback: localUserActions.tick,
    });

    const onContextMenu = (event: MouseEvent) => event.preventDefault();

    document.addEventListener('contextmenu', onContextMenu);
    applicationRendererActions.setLandscape3D(landscape3D);

    initRendering();

    if (!canvasRef.current) {
      console.error('Canvas ref is not set');
      return;
    }

    canvasRef.current.oncontextmenu = (e) => {
      e.preventDefault();
    };

    return function cleanup() {
      renderingLoop.current!.stop();

      // Remove event listers.
      document.removeEventListener('contextmenu', onContextMenu);
      willDestroyController.current.abort();
    };
  }, []);

  // MARK: Hooks

  useInteractionModifier(
    canvasRef,
    intersectableObjects,
    camera,
    {
      onDoubleClick: handleDoubleClick,
      onSingleClick: handleSingleClick,
      onPinch: handlePinching,
      onRotate: handleRotate,
    },
    rendererResolutionMultiplier
  );

  useHeatmapRenderer(camera, scene);

  useLandscapeDataWatcher(arRenderingArgs.landscapeData, landscape3D);

  useCollaborativeModifier();

  useResizeDetector({
    refreshMode: 'debounce',
    refreshRate: 100,
    targetRef: outerDivRef,
    onResize: resize,
  });

  // MARK: JSX

  return (
    <div className="row" style={{ height: '100%' }}>
      <div
        className="d-flex col-12"
        style={{ flexDirection: 'column', height: '100%' }}
      >
        <div id="rendering" ref={outerDivRef}>
          {heatmapConfigurationState.heatmapActive && <HeatmapInfo />}

          {/* {loadNewLandscape.isRunning ? (
            <LoadingIndicator text="Loading New Landscape" />
          ) : {addApplication.isRunning && (
            <LoadingIndicator text="Loading New Application" />
          )} */}

          {!showSettingsSidebar && (
            <div className="ar-right-relative foreground mt-6">
              <Button
                id="arSettingsOpener"
                onClick={toggleSettingsPane}
                variant="outline-secondary"
                title="Settings"
              >
                <GearIcon size="small" className="align-middle" />
              </Button>
            </div>
          )}
          {popupHandlerState.popupData.map((d) => (
            <PopupCoordinator
              key={d.entity.id}
              popupData={d}
              pinPopup={popupHandlerActions.pinPopup}
              sharePopup={popupHandlerActions.sharePopup}
              removePopup={popupHandlerActions.removePopup}
              updatePopup={popupHandlerActions.updatePopup}
              updateMeshReference={popupHandlerActions.updateMeshReference}
              structureData={
                arRenderingArgs.landscapeData.structureLandscapeData
              }
              toggleHighlightById={highlightingActions.toggleHighlightById}
              openParents={applicationRendererActions.openParents}
              addAnnotationForPopup={addAnnotationForPopup}
              showApplication={showApplication}
            />
          ))}

          <ContextMenu items={rightClickMenuItems}>
            <canvas
              id="threejs-canvas"
              className="webgl position-absolute"
              ref={canvasRef}
            />
          </ContextMenu>

          <div className="ar-left-button-container">
            <PopupButton
              handleInfoInteraction={handleInfoInteraction}
              removeAllPopups={removeAllPopups}
            />

            <HeatmapButton toggleHeatmap={handleHeatmapToggle} />

            <ZoomButton />

            <div id="ar-minus-interaction-container">
              <Button
                variant="primary"
                className="half-transparent"
                onClick={decreaseSize}
              >
                <DashIcon size="small" className="align-middle ar-button-svg" />
              </Button>
            </div>

            <div id="ar-left-interaction-container">
              <Button
                variant="primary"
                className="half-transparent"
                onClick={rotateLeft}
              >
                <ArrowLeftIcon
                  size="small"
                  className="align-middle ar-button-svg"
                />
              </Button>
            </div>
          </div>

          <div className="ar-right-button-container">
            <div id="ar-three-bars-interaction-container">
              <Button
                variant="primary"
                className="half-transparent"
                onClick={openMenu}
              >
                <ThreeBarsIcon
                  size="small"
                  className="octicon align-middle ar-button-svg"
                />
              </Button>
            </div>

            <PrimaryInteractionButton
              handlePrimaryCrosshairInteraction={
                handlePrimaryCrosshairInteraction
              }
              openAllComponents={handleOpenAllComponents}
            />

            <SecondaryInteractionButton
              handleSecondaryCrosshairInteraction={
                handleSecondaryCrosshairInteraction
              }
            />

            <PingButton handlePing={handlePing} />

            <div id="ar-plus-interaction-container">
              <Button
                variant="primary"
                className="half-transparent"
                onClick={increaseSize}
              >
                <PlusIcon size="small" className="align-middle ar-button-svg" />
              </Button>
            </div>

            <div id="ar-right-interaction-container">
              <Button
                variant="primary"
                className="half-transparent"
                onClick={rotateRight}
              >
                <ArrowRightIcon
                  size="small"
                  className="align-middle ar-button-svg"
                />
              </Button>
            </div>
          </div>
        </div>
      </div>
      {showSettingsSidebar && (
        <div className="sidebar right col-8" id="settingsSidebar">
          <div className="mt-6 d-flex flex-row w-100">
            <SettingsSidebar
              closeSettingsSidebar={() => setShowSettingsSidebar(false)}
            >
              <div className="explorviz-visualization-navbar">
                <ul className="nav justify-content-center">
                  <ArSettingsOpener
                    openedComponent={openedSettingComponent}
                    toggleSettingsSidebarComponent={
                      toggleSettingsSidebarComponent
                    }
                  />

                  <CollaborationOpener
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
                    <CollaborationControls />
                  )}
                  {openedSettingComponent === 'AR-Settings' && (
                    <ArSettingsSelector
                      updateCameraResolution={updateCameraResolution}
                      updateRendererResolution={updateRendererResolution}
                    />
                  )}
                  {openedSettingComponent === 'trace-selection' && (
                    <TraceSelectionAndReplayer
                      highlightTrace={() => {}}
                      removeHighlighting={() => {}}
                      dynamicData={
                        arRenderingArgs.landscapeData.dynamicLandscapeData
                      }
                      structureData={
                        arRenderingArgs.landscapeData.structureLandscapeData
                      }
                      renderingLoop={renderingLoop.current!}
                      landscapeData={arRenderingArgs.landscapeData}
                      moveCameraTo={moveCameraTo}
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
                      setGamepadSupport={() => {}}
                      updateHighlighting={
                        highlightingActions.updateHighlighting
                      }
                      showSemanticZoomClusterCenters={() => {}}
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
