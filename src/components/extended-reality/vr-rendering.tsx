import { ReplyIcon } from '@primer/octicons-react';
import gsap from 'gsap';
import React, { useEffect, useRef, useState } from 'react';
import { Button } from 'react-bootstrap';
import { useResizeDetector } from 'react-resize-detector';
import * as THREE from 'three';
import { GLTFLoader } from 'three-stdlib';
import { useShallow } from 'zustand/react/shallow';
import useCollaborativeModifier from '../../hooks/collaborative-modifier';
import useInteractionModifier from '../../hooks/interaction-modifier';
import useLandscapeDataWatcher from '../../hooks/landscape-data-watcher';
import { ImmersiveView } from '../../rendering/application/immersive-view';
import RenderingLoop from '../../rendering/application/rendering-loop';
import { useCollaborationSessionStore } from '../../stores/collaboration/collaboration-session';
import { useLocalUserStore } from '../../stores/collaboration/local-user';
import { useMessageSenderStore } from '../../stores/collaboration/message-sender';
import { useSpectateUserStore } from '../../stores/collaboration/spectate-user';
import { useDetachedMenuGroupsStore } from '../../stores/extended-reality/detached-menu-groups';
import { useDetachedMenuRendererStore } from '../../stores/extended-reality/detached-menu-renderer';
import { useGrabbedObjectStore } from '../../stores/extended-reality/grabbed-object';
import { useVrMenuFactoryStore } from '../../stores/extended-reality/vr-menu-factory';
import { useHeatmapConfigurationStore } from '../../stores/heatmap/heatmap-configuration';
import { useSceneRepositoryStore } from '../../stores/repos/scene-repository';
import { useUserSettingsStore } from '../../stores/user-settings';
import { ForwardedMessage } from '../../utils/collaboration/web-socket-messages/receivable/forwarded';
import {
  PING_UPDATE_EVENT,
  PingUpdateMessage,
} from '../../utils/collaboration/web-socket-messages/sendable/ping-update';
import {
  CONTROLLER_1_ID,
  CONTROLLER_2_ID,
  ControllerId,
} from '../../utils/collaboration/web-socket-messages/types/controller-id';
import eventEmitter from '../../utils/event-emitter';
import {
  findGrabbableObject,
  GrabbableObjectWrapper,
  isGrabbableObject,
} from '../../utils/extended-reality/view-objects/interfaces/grabbable-object';
import ActionIcon from '../../utils/extended-reality/view-objects/vr/action-icon';
import CloseIcon from '../../utils/extended-reality/view-objects/vr/close-icon';
import DetailInfoScrollarea from '../../utils/extended-reality/view-objects/vr/detail-info-scrollarea';
import DisconnectButton from '../../utils/extended-reality/view-objects/vr/disconnect-button';
import FloorMesh from '../../utils/extended-reality/view-objects/vr/floor-mesh';
import KeyboardMesh from '../../utils/extended-reality/view-objects/vr/keyboard-mesh';
import OpenEntityButton from '../../utils/extended-reality/view-objects/vr/open-entity-button';
import ScrollDownButton from '../../utils/extended-reality/view-objects/vr/scroll-down-button';
import ScrollUpButton from '../../utils/extended-reality/view-objects/vr/scroll-up-button';
import SearchListItem from '../../utils/extended-reality/view-objects/vr/search-list-item';
import UserListItem from '../../utils/extended-reality/view-objects/vr/user-list-item';
import VRController from '../../utils/extended-reality/vr-controller';
import VRControllerBindings from '../../utils/extended-reality/vr-controller/vr-controller-bindings';
import VRControllerBindingsList from '../../utils/extended-reality/vr-controller/vr-controller-bindings-list';
import VRControllerButtonBinding from '../../utils/extended-reality/vr-controller/vr-controller-button-binding';
import VRControllerThumbpadBinding from '../../utils/extended-reality/vr-controller/vr-controller-thumbpad-binding';
import VrInputManager from '../../utils/extended-reality/vr-controller/vr-input-manager';
import {
  EntityMesh,
  isEntityMesh,
} from '../../utils/extended-reality/vr-helpers/detail-info-composer';
import InteractiveMenu from '../../utils/extended-reality/vr-menus/interactive-menu';
import MenuGroup from '../../utils/extended-reality/vr-menus/menu-group';
import MenuQueue from '../../utils/extended-reality/vr-menus/menu-queue';
import HintMenu from '../../utils/extended-reality/vr-menus/ui-menu/hud/hint-menu';
import { MenuDetachedForwardMessage } from '../../utils/extended-reality/vr-web-wocket-messages/receivable/menu-detached-forward';
import { JOIN_VR_EVENT } from '../../utils/extended-reality/vr-web-wocket-messages/sendable/join-vr';
import {
  OBJECT_MOVED_EVENT,
  ObjectMovedMessage,
} from '../../utils/extended-reality/vr-web-wocket-messages/sendable/object-moved';
import {
  DETACHED_MENU_CLOSED_EVENT,
  DetachedMenuClosedMessage,
} from '../../utils/extended-reality/vr-web-wocket-messages/sendable/request/detached-menu-closed';
import { MENU_DETACHED_EVENT } from '../../utils/extended-reality/vr-web-wocket-messages/sendable/request/menu-detached';
import {
  USER_CONTROLLER_CONNECT_EVENT,
  UserControllerConnectMessage,
} from '../../utils/extended-reality/vr-web-wocket-messages/sendable/user-controller-connect';
import {
  USER_CONTROLLER_DISCONNECT_EVENT,
  UserControllerDisconnectMessage,
} from '../../utils/extended-reality/vr-web-wocket-messages/sendable/user-controller-disconnect';
import { LandscapeData } from '../../utils/landscape-schemes/landscape-data';
import ClazzCommunicationMesh from '../../view-objects/3d/application/clazz-communication-mesh';
import BaseMesh from '../../view-objects/3d/base-mesh';
import { TickCallback } from '../visualization/rendering/browser-rendering';
import VrButton from './vr-button';
import VrDropArea from './vr-drop-area';

interface VrRenderingArgs {
  readonly id: string;
  readonly landscapeData: LandscapeData;
  readonly switchToOnScreenMode: () => void;
  debugMode: boolean;
}

const THUMBPAD_THRESHOLD = 0.5;
const MOUSE_MOVE_SPEED = 3.0;
const MOUSE_ROTATION_SPEED = Math.PI;

export default function VrRendering({
  id,
  landscapeData,
  switchToOnScreenMode,
  debugMode,
}: VrRenderingArgs) {
  // #region state values
  const collabSession = useCollaborationSessionStore(
    useShallow((state) => ({
      remoteUserGroup: state.remoteUserGroup,
      idToRemoteUser: state.idToRemoteUser,
      setIdToRemoteUser: state.setIdToRemoteUser,
      lookupRemoteUserById: state.lookupRemoteUserById,
    }))
  );
  const detachedMenuGroups = useDetachedMenuGroupsStore(
    useShallow((state) => ({
      container: state.container,
      removeAllDetachedMenusLocally: state.removeAllDetachedMenusLocally,
      updateDetachedMenus: state.updateDetachedMenus,
      removeDetachedMenuLocallyById: state.removeDetachedMenuLocallyById,
    }))
  );
  const detachedMenuRenderer = useDetachedMenuRendererStore(
    useShallow((state) => ({
      restoreDetachedMenu: state.restoreDetachedMenu,
    }))
  );
  const heatmapConf = useHeatmapConfigurationStore(
    useShallow((state) => ({
      heatmapActive: state.heatmapActive,
      setActiveApplication: state.setActiveApplication,
    }))
  );
  const grabbedObject = useGrabbedObjectStore(
    useShallow((state) => ({
      sendObjectPositions: state.sendObjectPositions,
    }))
  );
  const localUser = useLocalUserStore(
    useShallow((state) => ({
      color: state.color,
      userGroup: state.userGroup,
      defaultCamera: state.defaultCamera,
      controller1: state.controller1,
      controller2: state.controller2,
      setDefaultCamera: state.setDefaultCamera,
      setXr: state.setXr,
      teleportToPosition: state.teleportToPosition,
      setController1: state.setController1,
      setController2: state.setController2,
      reset: state.reset,
      setVisualizationMode: state.setVisualizationMode,
      setPanoramaSphere: state.setPanoramaSphere,
      updateControllers: state.updateControllers,
      moveInCameraDirection: state.moveInCameraDirection,
      rotateCamera: state.rotateCamera,
      getCameraHeight: state.getCameraHeight,
      setCameraHeight: state.setCameraHeight,
      getCamera: state.getCamera,
    }))
  );
  const messageSender = useMessageSenderStore(
    useShallow((state) => ({
      sendJoinVr: state.sendJoinVr,
      sendControllerConnect: state.sendControllerConnect,
      sendControllerDisconnect: state.sendControllerDisconnect,
      sendMousePingUpdate: state.sendPingUpdate,
    }))
  );
  const userSettings = useUserSettingsStore(
    useShallow((state) => ({
      colors: state.colors,
      visualizationSettings: state.visualizationSettings,
      setVisualizationSettings: state.setVisualizationSettings,
    }))
  );
  const sceneRepoState = useSceneRepositoryStore(
    useShallow((state) => ({
      getScene: state.getScene,
    }))
  );
  const spectateUser = useSpectateUserStore(
    useShallow((state) => ({
      isActive: state.isActive,
      tick: state.tick,
    }))
  );
  const vrMenuFactory = useVrMenuFactoryStore(
    useShallow((state) => ({
      buildGrabMenu: state.buildGrabMenu,
      buildHintMenu: state.buildHintMenu,
      buildInfoMenu: state.buildInfoMenu,
      buildToolMenu: state.buildToolMenu,
      setScene: state.setScene,
      setRenderer: state.setRenderer,
    }))
  );

  // #endregion state values

  // #region states & refs
  const renderingRef = useRef<HTMLDivElement | null>(null);
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const raycaster = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouse = useRef<THREE.Vector2>(new THREE.Vector2());

  const renderingLoop = useRef<RenderingLoop | null>(null);
  const debugMenuGroup = useRef<MenuGroup | null>(null);
  const hintMenuQueue = useRef<MenuQueue | null>(null);
  const messageMenuQueue = useRef<MenuQueue | null>(null);
  const primaryInputManager = useRef<VrInputManager>(new VrInputManager());
  const secondaryInputManager = useRef<VrInputManager>(new VrInputManager());
  const vrSessionActive = useRef<boolean>(false);
  const willDestroyController = useRef<AbortController>(new AbortController());
  const mouseIntersection = useRef<THREE.Intersection | undefined>(undefined);
  const renderer = useRef<THREE.WebGLRenderer | null>(null);
  const tickCallbacks = useRef<TickCallback[]>([]);
  const initDone = useRef<boolean>(false);
  const session = useRef<XRSession | undefined>(undefined);

  const sceneRef = useRef<THREE.Scene>(sceneRepoState.getScene('vr', true));
  const scene = sceneRef.current;
  const [sceneState, setSceneState] = useState<THREE.Scene>(sceneRef.current);
  const landscape3DRef = useRef<THREE.Group>(new THREE.Group());
  const landscape3D = landscape3DRef.current;
  // #endregion states & refs

  // #region useEffect
  useEffect(() => {
    sceneRef.current.background = userSettings.colors!.backgroundColor;

    let newDefaultCamera = new THREE.PerspectiveCamera(75, 1.0, 0.1, 1000);
    newDefaultCamera.position.set(2, 2, 2);
    localUser.setDefaultCamera(newDefaultCamera);
    sceneRef.current.add(newDefaultCamera);
    sceneRef.current.add(localUser.userGroup);

    sceneRef.current.add(landscape3D);
    tickCallbacks.current.push({
      id: 'local-user',
      callback: useLocalUserStore.getState().tick,
    });

    sceneRef.current.add(detachedMenuGroups.container);

    vrMenuFactory.setScene(sceneRef.current);

    setSceneState(sceneRef.current);

    let newVisSettings = userSettings.visualizationSettings;
    newVisSettings.enableMultipleHighlighting.value = true;
    userSettings.setVisualizationSettings(newVisSettings);
  }, []);

  useEffect(() => {
    const outerDiv = renderingRef.current;
    if (!outerDiv) return;

    // Initialize the component.
    initRendering();
    resize();

    // Start main loop.
    renderingLoop.current = new RenderingLoop({
      camera: localUser.defaultCamera,
      scene: sceneRef.current,
      renderer: renderer.current!,
      tickCallbacks: tickCallbacks.current,
    });
    ImmersiveView.instance.registerRenderingLoop(renderingLoop.current);
    sceneRef.current.add(collabSession.remoteUserGroup);
    renderingLoop.current.tickCallbacks.push({
      id: 'vr-rendering',
      callback: tick,
    });
    renderingLoop.current.start();

    return () => {
      renderingLoop.current!.stop();
      willDestroy();
    };
  }, []);

  // #endregion useEffect

  // #region INITIALIZATION

  /**
   * Calls all init functions.
   */
  function initRendering() {
    initHUD();
    initRenderer();
    initInteraction();
    initPrimaryInput();
    initSecondaryInput();
    initControllers();
    initWebSocket();
    renderer.current!.xr.addEventListener('sessionend', resetLandscape);
  }

  function resetLandscape() {
    onVrSessionEnded();
  }

  /**
   * Creates the menu groups that are attached to the user's camera.
   */
  const initHUD = () => {
    // Menu group for hints.
    hintMenuQueue.current = new MenuQueue({});
    hintMenuQueue.current.position.z = -0.3;
    let newCamera = localUser.defaultCamera;
    newCamera.add(hintMenuQueue.current);

    // Menu group for message boxes.
    messageMenuQueue.current = new MenuQueue({});
    messageMenuQueue.current.rotation.x = 0.45;
    messageMenuQueue.current.position.y = 0.1;
    messageMenuQueue.current.position.z = -0.3;
    newCamera.add(messageMenuQueue.current);

    // Menu group for previewing menus during development.
    debugMenuGroup.current = new MenuGroup();
    debugMenuGroup.current.position.z = -0.35;
    newCamera.add(debugMenuGroup.current);

    localUser.setDefaultCamera(newCamera);
  };

  /**
   * Initiates a WebGLRenderer
   */
  const initRenderer = () => {
    const { width, height } = canvas.current!;
    renderer.current = new THREE.WebGLRenderer({
      antialias: true,
      canvas: canvas.current!,
      powerPreference: 'high-performance',
    });
    renderer.current.setPixelRatio(window.devicePixelRatio);
    renderer.current.setSize(width, height);
    renderer.current.xr.enabled = true;
    localUser.setXr(renderer.current.xr);
    vrMenuFactory.setRenderer(renderer.current);

    initDone.current = true;
  };

  /**
   * Binds this context to all event handling functions and
   * passes them to a newly created Interaction object
   */
  const initInteraction = () => {
    // Add additional event listeners. Since TypeScript does not yet support
    // the signal option  of `addEventListener`, we have to listen for the
    // will destroy signal manually.
    const keydownListener = (event: KeyboardEvent) => handleKeyboard(event);
    window.addEventListener('keydown', keydownListener);
    willDestroyController.current.signal.addEventListener('abort', () => {
      window.removeEventListener('keydown', keydownListener);
    });
  };

  const initPrimaryInput = () => {
    // When any base mash is hovered, highlight it.
    primaryInputManager.current.addInputHandler({
      targetType: BaseMesh,
      hover: (event) => {
        event.target.applyHoverEffect();
      },
      resetHover: (event) => {
        event.target.resetHoverEffect();
      },
    });

    // When a component of an application is clicked, open it.
    primaryInputManager.current.addInputHandler({
      targetType: ComponentMesh,
      triggerDown: (event) => {
        if (event.target.parent instanceof ApplicationObject3D) {
          // appRenderer.toggleComponent(
          //   event.target,
          //   event.target.parent as ApplicationObject3D
          // );
        }
      },
    });

    // When the foundation of an application is clicked, close all components.
    primaryInputManager.current.addInputHandler({
      targetType: FoundationMesh,
      triggerDown: (event) => {
        const application = event.target.parent as ApplicationObject3D;
        if (heatmapConf.heatmapActive) {
          heatmapConf.setActiveApplication(application);
        } else {
          // appRenderer.closeAllComponents(application);
        }
      },
    });

    // When a close icon is clicked, close the corresponding object.
    primaryInputManager.current.addInputHandler({
      targetType: CloseIcon,
      triggerDown: (event) =>
        event.target.close().then((closedSuccessfully: boolean) => {
          if (!closedSuccessfully) showHint('Object could not be closed');
        }),
    });

    primaryInputManager.current.addInputHandler({
      targetType: ActionIcon,
      triggerDown: (event) =>
        event.target.action().then((closedSuccessfully: boolean) => {
          if (!closedSuccessfully) showHint('Action not possible.');
        }),
    });

    // Initialize menu interaction with other controller.
    primaryInputManager.current.addInputHandler({
      targetType: InteractiveMenu,
      triggerDown: (event) => event.target.triggerDown(event.intersection),
      triggerPress: (event) =>
        event.target.triggerPress(event.intersection, event.value),
      triggerUp: (event) => event.target.triggerUp(event.intersection),
      hover: (event) => event.target.hover(event.intersection),
      resetHover: (event) => event.target.resetHoverEffect(),
    });

    primaryInputManager.current.addInputHandler({
      targetType: ScrollUpButton,
      triggerPress: (event) => event.target.triggerPress(),
      hover: (event) => event.target.applyHover(),
      resetHover: (event) => event.target.resetHover(),
    });

    primaryInputManager.current.addInputHandler({
      targetType: ScrollDownButton,
      triggerPress: (event) => event.target.triggerPress(),
      hover: (event) => event.target.applyHover(),
      resetHover: (event) => event.target.resetHover(),
    });

    primaryInputManager.current.addInputHandler({
      targetType: OpenEntityButton,
      triggerDown: (event) => event.target.triggerDown(),
      hover: (event) => event.target.applyHover(),
      resetHover: (event) => event.target.resetHover(),
    });

    primaryInputManager.current.addInputHandler({
      targetType: DetailInfoScrollarea,
      triggerPress: (event) => event.target.triggerPress(event.intersection),
      hover: (event) =>
        event.target.applyHover(
          event.controller,
          event.intersection,
          grabIntersectedObject
        ), // TODO: VrRendering renderer problem :(
      resetHover: (event) => event.target.resetHover(event.controller),
      triggerDown: (event) => event.target.triggerDown(event.intersection),
      triggerUp: (event) => event.target.triggerUp(),
    });

    primaryInputManager.current.addInputHandler({
      targetType: KeyboardMesh,
      triggerDown: (event) => event.target.triggerDown(event.controller),
      triggerUp: (event) => event.target.triggerUp(),
      hover: (event) => event.target.applyHover(event.controller),
      resetHover: (event) => event.target.resetHover(event.controller),
      //TODO: triggerPress which works only for backspace
    });

    primaryInputManager.current.addInputHandler({
      targetType: SearchListItem,
      triggerDown: (event) => event.target.triggerDown(),
      hover: (event) => event.target.applyHover(),
      resetHover: (event) => event.target.resetHover(),
    });

    primaryInputManager.current.addInputHandler({
      targetType: UserListItem,
      triggerDown: (event) => event.target.triggerDown(),
      hover: (event) => event.target.applyHover(),
      resetHover: (event) => event.target.resetHover(),
    });

    primaryInputManager.current.addInputHandler({
      targetType: DisconnectButton,
      triggerPress: (event) => event.target.triggerPress(),
      hover: (event) => event.target.applyHover(),
      resetHover: (event) => event.target.resetHover(),
    });
  };

  const initSecondaryInput = () => {
    secondaryInputManager.current.addInputHandler({
      targetType: FloorMesh,
      triggerDown: (event) =>
        localUser.teleportToPosition(event.intersection.point),
      hover: ({ controller, intersection }) => {
        if (controller?.teleportArea && controller?.ray) {
          controller.teleportArea.showAbovePosition(intersection.point);
          controller.teleportArea.visible =
            controller.ray.visible && controller.enableTeleport;
        }
      },
      resetHover: ({ controller }) => {
        if (controller?.teleportArea) {
          controller.teleportArea.visible = false;
        }
      },
    });

    // secondaryInputManager.current.addInputHandler({
    //   targetType: ApplicationObject3D,
    //   // triggerDown: (event) =>
    //     // highlighting.toggleHighlight(event.intersection.object as EntityMesh, {
    //     //   sendMessage: true,
    //     //   remoteColor: localUser.color,
    //     }),
    // });

    secondaryInputManager.current.addInputHandler({
      targetType: ClazzCommunicationMesh,
      triggerDown: (event) => {
        if (event.target.parent !== null) {
          // in VR parent is null if we handle intern communication links. But they are already handled elsewhere anyway
          // highlighting.toggleHighlight(event.target as EntityMesh, {
          //   sendMessage: true,
          //   remoteColor: localUser.color,
          // });
        }
      },
    });
  };

  const initControllers = () => {
    localUser.setController1(initController({ gamepadIndex: CONTROLLER_1_ID }));
    localUser.setController2(initController({ gamepadIndex: CONTROLLER_2_ID }));
    messageSender.sendJoinVr();
  };

  const initController = ({
    gamepadIndex,
  }: {
    gamepadIndex: ControllerId;
  }): VRController => {
    // Initialize the controller's menu group.
    const menuGroup = new MenuGroup();

    // Initialize controller.
    const controller = new VRController({
      gamepadIndex,
      scene: scene,
      bindings: new VRControllerBindingsList(
        makeControllerBindings(),
        menuGroup.controllerBindings
      ),
      gripSpace: renderer.current!.xr.getControllerGrip(gamepadIndex),
      raySpace: renderer.current!.xr.getController(gamepadIndex),
      color: new THREE.Color('red'),
      menuGroup,
    });
    controller.setToDefaultAppearance();

    // Set camera of the controller's raycaster view-dependent objects such as
    // sprites can be intersected.
    controller.raycaster.camera = localUser.defaultCamera;

    // Add connection event listeners.
    controller.eventCallbacks.connected = () =>
      onControllerConnected(controller);
    controller.eventCallbacks.disconnected = () =>
      onControllerDisconnected(controller);

    // Add hover event listeners.
    controller.eventCallbacks.updateIntersectedObject = () => {
      handleHover(controller.intersectedObject, controller);
    };

    // Position menus above controller at an angle.
    menuGroup.position.y += 0.15;
    menuGroup.position.z -= 0.15;
    menuGroup.rotateX(340 * THREE.MathUtils.DEG2RAD);

    return controller;
  };

  const initWebSocket = async () => {
    eventEmitter.on(USER_CONTROLLER_CONNECT_EVENT, onUserControllerConnect);
    eventEmitter.on(
      USER_CONTROLLER_DISCONNECT_EVENT,
      onUserControllerDisconnect
    );
    eventEmitter.on(PING_UPDATE_EVENT, onPingUpdate);
    eventEmitter.on(OBJECT_MOVED_EVENT, onObjectMoved);
    eventEmitter.on(MENU_DETACHED_EVENT, onMenuDetached);
    eventEmitter.on(DETACHED_MENU_CLOSED_EVENT, onDetachedMenuClosed);
    eventEmitter.on(JOIN_VR_EVENT, onJoinVr);
  };

  // #endregion INITIALIZATION

  // #region DESTRUCTION

  function willDestroy() {
    localUser.setXr(undefined);

    eventEmitter.off(USER_CONTROLLER_CONNECT_EVENT, onUserControllerConnect);
    eventEmitter.off(
      USER_CONTROLLER_DISCONNECT_EVENT,
      onUserControllerDisconnect
    );
    eventEmitter.off(PING_UPDATE_EVENT, onPingUpdate);
    eventEmitter.off(OBJECT_MOVED_EVENT, onObjectMoved);
    eventEmitter.off(MENU_DETACHED_EVENT, onMenuDetached);
    eventEmitter.off(DETACHED_MENU_CLOSED_EVENT, onDetachedMenuClosed);
    eventEmitter.off(JOIN_VR_EVENT, onJoinVr);

    renderingLoop.current!.stop();
    // Reset rendering.
    detachedMenuGroups.removeAllDetachedMenusLocally();

    // Reset services.
    localUser.reset();

    // Remove event listers.
    willDestroyController.current.abort();
  }

  // #endregion DESTRUCTION

  /**
   * Call this whenever the canvas is resized. Updated properties of camera
   * and renderer.
   *
   * @param outerDiv HTML element containing the canvas
   */
  function resize() {
    if (renderer.current!.xr.isPresenting) {
      return;
    }

    const outerDiv = renderingRef.current;
    if (!outerDiv) return;

    const width = outerDiv.clientWidth;
    const height = outerDiv.clientHeight;
    renderer.current!.setSize(width, height);
    let newCamera = localUser.defaultCamera;
    newCamera.aspect = width / height;
    newCamera.updateProjectionMatrix();
    localUser.setDefaultCamera(newCamera);
  }

  const onVrSessionStarted = (session_val: XRSession) => {
    vrSessionActive.current = true;

    session_val.addEventListener('inputsourceschange', (event) => {});
    session.current = session_val;
  };

  const onVrSessionEnded = () => {
    vrSessionActive.current = false;

    if (!userSettings.visualizationSettings.showVrOnClick.value)
      localUser.setVisualizationMode('browser');

    const outerDiv = canvas.current?.parentElement;
    if (outerDiv) {
      resize();
    }
  };

  const onDropFiles = async (files: File[]) => {
    const filesByName = new Map<string, File>();
    files.forEach((file) => filesByName.set(file.name, file));

    // Create a loading manager that converts file names to object URLs.
    const loadingManager = new THREE.LoadingManager();
    const objectURLs: string[] = [];
    loadingManager.setURLModifier((url) => {
      const file = filesByName.get(url);
      if (file) {
        const objectUrl = URL.createObjectURL(file);
        objectURLs.push(objectUrl);
        return objectUrl;
      }
      return url;
    });

    const tasks: Promise<any>[] = [];

    // Load all glTF models.
    files.forEach((file) => {
      if (file.name.endsWith('.gltf') || file.name.endsWith('.glb')) {
        tasks.push(
          new Promise((resolve) => {
            const gltfLoader = new GLTFLoader(loadingManager);
            gltfLoader.load(file.name, (gltf) => {
              const object = new GrabbableObjectWrapper(gltf.scene);
              scene.add(object);
              resolve(null);
            });
          })
        );
      }
    });

    // If a single image file has been dropped, use it as a panorama.
    if (files.length === 1) {
      const file = files[0];
      if (file.name.endsWith('.jpg') || file.name.endsWith('.png')) {
        tasks.push(
          new Promise((resolve) => {
            const loader = new THREE.TextureLoader(loadingManager);
            loader.load(file.name, (texture) => {
              texture.minFilter = THREE.NearestFilter;
              texture.generateMipmaps = false;

              const geometry = new THREE.SphereGeometry(10, 256, 256);
              const material = new THREE.MeshStandardMaterial({
                map: texture,
                side: THREE.BackSide,
                displacementScale: -4.0,
              });
              localUser.setPanoramaSphere(new THREE.Mesh(geometry, material));
              resolve(null);
            });
          })
        );
      }
    }

    // Revoke the object URLs when all loading tasks are done.
    await Promise.all(tasks);
    objectURLs.forEach((url) => URL.revokeObjectURL(url));
  };

  // #endregion ACTIONS

  // #region MAIN LOOP

  /**
   * Updates menus, services and all objects in the scene.
   */
  function tick(delta: number) {
    // Update controllers and menus.
    localUser.updateControllers(delta);
    hintMenuQueue.current!.updateMenu(delta);
    messageMenuQueue.current!.updateMenu(delta);
    debugMenuGroup.current!.updateMenu(delta);
    detachedMenuGroups.updateDetachedMenus(delta);

    // Update services.
    spectateUser.tick();
    grabbedObject.sendObjectPositions();

    let newIdToRemoteUser = collabSession.idToRemoteUser;
    newIdToRemoteUser.forEach((remoteUser) => {
      remoteUser.update(delta);
    });
    collabSession.setIdToRemoteUser(newIdToRemoteUser);

    // Update animations
    gsap.ticker.tick();
  }

  // #endregion MAIN LOOP

  // #region MENUS

  const showHint = (title: string, text: string | undefined = undefined) => {
    // Show the hint only if there is no hint with the text in the queue
    // already. This prevents the same hint to be shown multiple times when
    // the user repeats the action that causes the hint.
    if (
      !hintMenuQueue.current!.hasEnquedOrCurrentMenu(
        (menu) =>
          menu instanceof HintMenu &&
          menu.titleItem.text === title &&
          menu.textItem?.text === text
      )
    ) {
      hintMenuQueue.current!.enqueueMenu(
        vrMenuFactory.buildHintMenu(title, text)
      );
    }
  };

  const openToolMenu = (controller: VRController) => {
    controller.menuGroup.openMenu(vrMenuFactory.buildToolMenu());
  };

  const openInfoMenu = (controller: VRController, object: EntityMesh) => {
    controller.menuGroup.openMenu(vrMenuFactory.buildInfoMenu(object));
  };

  // #endregion MENUS

  // #region INTERACTION
  // executed on enter VR
  const onControllerConnected = async (controller: VRController) => {
    if (session.current) {
      const source = session.current.inputSources[controller.gamepadIndex];
      if (source.gamepad) {
        controller.gamepad = source.gamepad;
      }
    }
    // Set visibilty and rays accordingly
    if (spectateUser.isActive()) controller.setToSpectatingAppearance();
    else controller.setToDefaultAppearance();

    messageSender.sendControllerConnect(controller);
  };

  const onControllerDisconnected = (controller: VRController) => {
    // Close all open menus of the disconnected controller.
    controller.menuGroup.closeAllMenus();

    // Inform other users that the controller disconnected.
    messageSender.sendControllerDisconnect(controller);
  };

  const makeControllerBindings = (): VRControllerBindings => {
    return new VRControllerBindings({
      triggerButton: new VRControllerButtonBinding('Open / Close', {
        onButtonDown: (controller: VRController) => {
          if (!controller.intersectedObject) return;
          primaryInputManager.current.handleTriggerDown(
            controller.intersectedObject,
            controller
          );
        },
        onButtonPress: (controller: VRController, value: number) => {
          if (!controller.intersectedObject) return;
          primaryInputManager.current.handleTriggerPress(
            controller.intersectedObject,
            value,
            controller
          );
        },
        onButtonUp: (controller: VRController) => {
          if (!controller.intersectedObject) return;
          primaryInputManager.current.handleTriggerUp(
            controller.intersectedObject,
            controller
          );
        },
      }),

      menuButton: new VRControllerButtonBinding('Highlight', {
        onButtonDown: (controller) => {
          if (controller.intersectedObject) {
            secondaryInputManager.current.handleTriggerDown(
              controller.intersectedObject
            );
          }
        },
      }),

      bButton: new VRControllerButtonBinding('Ping', {
        onButtonDown: (controller) => {
          if (controller.intersectedObject) {
            ping(controller.intersectedObject);
          }
        },
      }),

      gripButton: new VRControllerButtonBinding('Grab Object', {
        onButtonDown: (controller) => grabIntersectedObject(controller),
      }),

      thumbpad: new VRControllerThumbpadBinding(
        {
          labelUp: 'Teleport / Highlight',
          labelDown: 'Show Details',
        },
        {
          onThumbpadDown: (controller, axes) => {
            const direction = VRControllerThumbpadBinding.getVerticalDirection(
              axes,
              {
                threshold: THUMBPAD_THRESHOLD,
              }
            );
            switch (direction) {
              // case VRControllerThumbpadVerticalDirection.NONE:
              //   this.openToolMenu(controller)
              //   break;
              default:
                if (controller.intersectedObject) {
                  const { object } = controller.intersectedObject;
                  if (isEntityMesh(object)) {
                    openInfoMenu(controller, object);
                  } else {
                    openToolMenu(controller);
                  }
                } else {
                  openToolMenu(controller);
                }
                break;
            }
          },
        }
      ),
    });
  };

  const grabIntersectedObject = (controller: VRController) => {
    if (!controller.intersectedObject || !controller.ray) return;

    let current: THREE.Object3D | null = controller.intersectedObject.object;
    while (current) {
      if (isGrabbableObject(current)) {
        controller.menuGroup.openMenu(vrMenuFactory.buildGrabMenu(current));
        break;
      } else {
        current = current.parent;
      }
    }
  };

  const handleDoubleClick = (
    intersection: THREE.Intersection | null | undefined
  ) => {
    if (vrSessionActive.current || !intersection) return;
    primaryInputManager.current.handleTriggerDown(intersection);
  };

  const handleSingleClick = (
    intersection: THREE.Intersection | null | undefined
  ) => {
    if (vrSessionActive.current || !intersection) return;
    secondaryInputManager.current.handleTriggerDown(intersection);
  };

  const handlePanning = (
    delta: { x: number; y: number },
    button: 1 | 2 | 3
  ) => {
    if (vrSessionActive.current) return;

    const LEFT_MOUSE_BUTTON = 1;
    const RIGHT_MOUSE_BUTTON = 3;

    const x = delta.x / canvas.current!.width;
    const y = delta.y / canvas.current!.height;

    switch (button) {
      case LEFT_MOUSE_BUTTON:
        // Move user.
        localUser.moveInCameraDirection(
          new THREE.Vector3(-x * MOUSE_MOVE_SPEED, 0, -y * MOUSE_MOVE_SPEED),
          { enableY: false }
        );
        break;
      case RIGHT_MOUSE_BUTTON:
        // Rotate camera to look around.
        localUser.rotateCamera(
          y * MOUSE_ROTATION_SPEED,
          x * MOUSE_ROTATION_SPEED
        );
        break;
      default:
        break;
    }
  };

  const handleMouseWheel = (delta: number) => {
    if (vrSessionActive.current) return;
    localUser.setCameraHeight(localUser.getCameraHeight() + delta * 0.05);
  };

  const handleMouseMove = (
    intersection: THREE.Intersection | null | undefined
  ) => {
    if (vrSessionActive.current) return;
    mouseIntersection.current = intersection!;
    handleHover(intersection!, null);
  };

  const handleHover = (
    intersection: THREE.Intersection | undefined,
    controller: VRController | null
  ) => {
    if (intersection) {
      primaryInputManager.current.handleHover(intersection, controller);
      secondaryInputManager.current.handleHover(intersection, controller);
    } else {
      primaryInputManager.current.resetHover(controller);
      secondaryInputManager.current.resetHover(controller);
    }
  };

  const handleKeyboard = (event: KeyboardEvent) => {
    switch (event.key) {
      case 'Escape':
        if (!vrSessionActive.current) {
          // Close current debug menu or open tool menu if no menu is debugged.
          if (debugMenuGroup.current!.currentMenu) {
            debugMenuGroup.current!.closeMenu();
          } else {
            debugMenuGroup.current!.openMenu(vrMenuFactory.buildToolMenu());
          }
        }
        break;
      case 'f':
        // open/close component
        if (localUser.controller2?.intersectedObject) {
          primaryInputManager.current.handleTriggerDown(
            localUser.controller2?.intersectedObject!,
            localUser.controller2
          );
        }
        break;
      case 'g':
        // highlight entity
        if (localUser.controller2?.intersectedObject) {
          secondaryInputManager.current.handleTriggerDown(
            localUser.controller2?.intersectedObject!
          );
        }
        break;
      case 'i':
        if (vrSessionActive.current) {
          // show info popup
          if (localUser.controller1?.intersectedObject) {
            const { object } = localUser.controller1?.intersectedObject!;
            if (isEntityMesh(object)) {
              openInfoMenu(localUser.controller1!, object);
            }
          }
        } else if (mouseIntersection.current) {
          const { object } = mouseIntersection.current;
          if (isEntityMesh(object)) {
            debugMenuGroup.current!.openMenu(
              vrMenuFactory.buildInfoMenu(object)
            );
          } else {
            debugMenuGroup.current!.closeAllMenus();
          }
        }
        break;
      default:
        break;
    }
  };

  const ping = (intersectedViewObj: THREE.Intersection) => {
    // ToDo
  };

  // #endregion INTERACTION

  // #region HANDLING MESSAGES

  /**
   * Updates whether the given user is pinging with the specified controller or not.
   */
  const onPingUpdate = ({
    userId,
    originalMessage: { controllerId, isPinging },
  }: ForwardedMessage<PingUpdateMessage>): void => {
    const remoteUser = collabSession.lookupRemoteUserById(userId);

    if (remoteUser) {
      remoteUser.togglePing(controllerId, isPinging);
    }
  };

  const onUserControllerConnect = ({
    userId,
    originalMessage: {
      controller: {
        controllerId,
        assetUrl,
        position,
        quaternion,
        intersection,
      },
    },
  }: ForwardedMessage<UserControllerConnectMessage>): void => {
    const remoteUser = collabSession.lookupRemoteUserById(userId);
    if (!remoteUser) return;

    remoteUser.initController(controllerId, assetUrl, {
      position,
      quaternion,
      intersection,
    });
  };

  const onUserControllerDisconnect = ({
    userId,
    originalMessage: { controllerId },
  }: ForwardedMessage<UserControllerDisconnectMessage>): void => {
    const remoteUser = collabSession.lookupRemoteUserById(userId);

    if (remoteUser) {
      remoteUser.removeController(controllerId);
    }
  };

  const onJoinVr = (): void => {
    if (localUser.controller1)
      messageSender.sendControllerConnect(localUser.controller1);
    if (localUser.controller2)
      messageSender.sendControllerConnect(localUser.controller2);
  };

  const onObjectMoved = ({
    originalMessage: { objectId, position, quaternion, scale },
  }: ForwardedMessage<ObjectMovedMessage>): void => {
    // Find moved object in the scene.
    const movedObject = findGrabbableObject(scene, objectId);
    if (!movedObject) {
      return;
    }

    movedObject.position.fromArray(position);
    movedObject.quaternion.fromArray(quaternion);
    movedObject.scale.fromArray(scale);
  };

  const onMenuDetached = ({
    objectId,
    userId,
    entityType,
    detachId,
    position,
    /** quaternion, */
    scale,
  }: MenuDetachedForwardMessage) => {
    const x = new THREE.Vector3();
    x.fromArray(position);
    x.y += 15;
    landscape3D.localToWorld(x);
    detachedMenuRenderer.restoreDetachedMenu({
      objectId,
      entityType,
      userId,
      // TODO align the naming with SerializedDetachedMenu
      entityId: detachId,
      position: x.toArray(),
      quaternion: localUser.getCamera().quaternion.toArray(),
      scale,
    });
  };

  const onDetachedMenuClosed = ({
    originalMessage: { menuId },
  }: ForwardedMessage<DetachedMenuClosedMessage>): void => {
    detachedMenuGroups.removeDetachedMenuLocallyById(menuId);
  };

  // #endregion HANDLING MESSAGES

  useInteractionModifier(canvas, scene, localUser.defaultCamera, {
    onSingleClick: handleSingleClick,
    onDoubleClick: handleDoubleClick,
    onMouseMove: handleMouseMove,
  });

  useLandscapeDataWatcher(landscapeData);

  useCollaborativeModifier();

  useResizeDetector({
    refreshMode: 'debounce',
    refreshRate: 100,
    targetRef: canvas,
    onResize: resize,
  });

  // Converts mouse event to THREE.js intersection
  const getIntersections = (event: React.MouseEvent) => {
    if (!canvas.current || localUser.defaultCamera || !scene) return null;

    const rect = canvas.current.getBoundingClientRect();
    mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.current.setFromCamera(mouse.current, localUser.defaultCamera);
    const intersections = raycaster.current.intersectObjects(
      scene.children,
      true
    );

    return intersections.length > 0 ? intersections[0] : null;
  };

  const handleMouseClick = (
    event: React.MouseEvent,
    callback: (intersection: THREE.Intersection | null | undefined) => void
  ) => {
    const intersection = getIntersections(event);
    if (intersection) callback(intersection);
  };

  return (
    <>
      <VrDropArea onDropFiles={onDropFiles}>
        <>
          <div id="rendering" ref={renderingRef}>
            <>
              <canvas
                id="three-js-canvas"
                className={`webgl ${debugMode ? '' : 'hidden'}`}
                ref={canvas}
                onClick={(event) => handleMouseClick(event, handleSingleClick)}
                onDoubleClick={(event) =>
                  handleMouseClick(event, handleDoubleClick)
                }
                onMouseMove={(event) =>
                  handleMouseClick(event, handleMouseMove)
                }
              ></canvas>
              {/* FIXME: No clue where loadNewLandscape and addApplication come from */}
              {/* {loadNewLandscape.isRunning ? (
                <LoadingIndicator text="Loading New Landscape" />
              ) : (
                addApplication.isRunning && (
                  <LoadingIndicator text="Loading New Application" />
                )
              )} */}
            </>
          </div>
          <VrButton
            renderer={renderer.current!}
            onSessionStartedCallback={onVrSessionStarted}
            onSessionEndedCallback={onVrSessionEnded}
            debugMode={debugMode}
          />
        </>
      </VrDropArea>
      {userSettings.visualizationSettings.showVrOnClick.value && (
        <div className="position-absolute mt-6 ml-3" style={{ zIndex: 12000 }}>
          <Button
            id="backToLandscapeButton"
            onClick={switchToOnScreenMode}
            variant="outline-secondary"
            title="Back to Landscape View"
          >
            <ReplyIcon size="small" className="align-middle" />
          </Button>
        </div>
      )}
    </>
  );
}
