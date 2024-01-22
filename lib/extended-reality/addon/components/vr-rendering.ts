import { getOwner } from '@ember/application';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import CollaborationSession from 'collaboration/services/collaboration-session';
import LocalUser from 'collaboration/services/local-user';
import debugLogger from 'ember-debug-logger';
import { LandscapeData } from 'explorviz-frontend/controllers/visualization';
import ForceGraph from 'explorviz-frontend/rendering/application/force-graph';
import RenderingLoop from 'explorviz-frontend/rendering/application/rendering-loop';
import ApplicationRenderer, {
  AddApplicationArgs,
} from 'explorviz-frontend/services/application-renderer';
import ToastMessage, {
  MessageArgs,
} from 'explorviz-frontend/services/toast-message';
import CameraControls from 'explorviz-frontend/utils/application-rendering/camera-controls';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import ClazzCommunicationMesh from 'explorviz-frontend/view-objects/3d/application/clazz-communication-mesh';
import ComponentMesh from 'explorviz-frontend/view-objects/3d/application/component-mesh';
import FoundationMesh from 'explorviz-frontend/view-objects/3d/application/foundation-mesh';
import BaseMesh from 'explorviz-frontend/view-objects/3d/base-mesh';
import HeatmapConfiguration from 'heatmap/services/heatmap-configuration';
import * as THREE from 'three';
import { Intersection } from 'three';
import ThreeForceGraph from 'three-forcegraph';
import { Font } from 'three/examples/jsm/loaders/FontLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import DetachedMenuGroupsService from 'extended-reality/services/detached-menu-groups';
import DetachedMenuRenderer from 'extended-reality/services/detached-menu-renderer';
import GrabbedObjectService from 'extended-reality/services/grabbed-object';
import SpectateUser from 'collaboration/services/spectate-user';
import VrMenuFactoryService from 'extended-reality/services/vr-menu-factory';
import {
  findGrabbableObject,
  GrabbableObjectWrapper,
  isGrabbableObject,
} from 'extended-reality/utils/view-objects/interfaces/grabbable-object';
import ActionIcon from 'extended-reality/utils/view-objects/vr/action-icon';
import CloseIcon from 'extended-reality/utils/view-objects/vr/close-icon';
import FloorMesh from 'extended-reality/utils/view-objects/vr/floor-mesh';
import VRController from 'extended-reality/utils/vr-controller';
import VRControllerBindings from 'extended-reality/utils/vr-controller/vr-controller-bindings';
import VRControllerBindingsList from 'extended-reality/utils/vr-controller/vr-controller-bindings-list';
import VRControllerButtonBinding from 'extended-reality/utils/vr-controller/vr-controller-button-binding';
import VRControllerThumbpadBinding from 'extended-reality/utils/vr-controller/vr-controller-thumbpad-binding';
import VrInputManager from 'extended-reality/utils/vr-controller/vr-input-manager';
import {
  EntityMesh,
  isEntityMesh,
} from 'extended-reality/utils/vr-helpers/detail-info-composer';
import InteractiveMenu from 'extended-reality/utils/vr-menus/interactive-menu';
import MenuGroup from 'extended-reality/utils/vr-menus/menu-group';
import MenuQueue from 'extended-reality/utils/vr-menus/menu-queue';
import HintMenu from 'extended-reality/utils/vr-menus/ui-menu/hud/hint-menu';
import ScrollDownButton from 'extended-reality/utils/view-objects/vr/scroll-down-button';
import ScrollUpButton from 'extended-reality/utils/view-objects/vr/scroll-up-button';
import DetailInfoScrollarea from 'extended-reality/utils/view-objects/vr/detail-info-scrollarea';
import KeyboardMesh from 'extended-reality/utils/view-objects/vr/keyboard-mesh';
import ClazzMesh from 'explorviz-frontend/view-objects/3d/application/clazz-mesh';
import SearchListItem from 'extended-reality/utils/view-objects/vr/search-list-item';
import UserListItem from 'extended-reality/utils/view-objects/vr/user-list-item';
import OpenEntityButton from 'extended-reality/utils/view-objects/vr/open-entity-button';
import UserSettings from 'explorviz-frontend/services/user-settings';
import DisconnectButton from 'extended-reality/utils/view-objects/vr/disconnect-button';
import LinkRenderer from 'explorviz-frontend/services/link-renderer';
import SceneRepository from 'explorviz-frontend/services/repos/scene-repository';
import gsap from 'gsap';
import MessageSender from 'collaboration/services/message-sender';
import WebSocketService from 'collaboration/services/web-socket';
import {
  CONTROLLER_1_ID,
  CONTROLLER_2_ID,
  ControllerId,
} from 'collaboration/utils/web-socket-messages/types/controller-id';
import {
  USER_CONTROLLER_CONNECT_EVENT,
  UserControllerConnectMessage,
} from 'extended-reality/utils/vr-web-wocket-messages/sendable/user-controller-connect';
import {
  DETACHED_MENU_CLOSED_EVENT,
  DetachedMenuClosedMessage,
} from 'extended-reality/utils/vr-web-wocket-messages/sendable/request/detached-menu-closed';
import { ForwardedMessage } from 'collaboration/utils/web-socket-messages/receivable/forwarded';
import { MenuDetachedForwardMessage } from 'extended-reality/utils/vr-web-wocket-messages/receivable/menu-detached-forward';
import {
  OBJECT_MOVED_EVENT,
  ObjectMovedMessage,
} from 'extended-reality/utils/vr-web-wocket-messages/sendable/object-moved';
import {
  USER_CONTROLLER_DISCONNECT_EVENT,
  UserControllerDisconnectMessage,
} from 'extended-reality/utils/vr-web-wocket-messages/sendable/user-controller-disconnect';
import {
  PING_UPDATE_EVENT,
  PingUpdateMessage,
} from 'collaboration/utils/web-socket-messages/sendable/ping-update';
import { JOIN_VR_EVENT } from 'extended-reality/utils/vr-web-wocket-messages/sendable/join-vr';
import { MENU_DETACHED_EVENT } from 'extended-reality/utils/vr-web-wocket-messages/sendable/request/menu-detached';

interface Args {
  debugMode: boolean;
  readonly id: string;
  readonly landscapeData: LandscapeData;
  readonly font: Font;
  applicationArgs: Map<string, AddApplicationArgs>;
}

const THUMBPAD_THRESHOLD = 0.5;
const MOUSE_MOVE_SPEED = 3.0;
const MOUSE_ROTATION_SPEED = Math.PI;

export default class VrRendering extends Component<Args> {
  // #region SERVICES
  @service('toast-message')
  private toastMessage!: ToastMessage;

  @service('detached-menu-groups')
  private detachedMenuGroups!: DetachedMenuGroupsService;

  @service('grabbed-object')
  private grabbedObjectService!: GrabbedObjectService;

  @service('local-user')
  private localUser!: LocalUser;

  @service('spectate-user')
  private spectateUserService!: SpectateUser;

  @service('application-renderer')
  private applicationRenderer!: ApplicationRenderer;

  @service('vr-menu-factory')
  private menuFactory!: VrMenuFactoryService;

  @service('vr-message-sender')
  private sender!: MessageSender;

  @service('web-socket')
  private webSocket!: WebSocketService;

  @service('detached-menu-renderer')
  private detachedMenuRenderer!: DetachedMenuRenderer;

  @service('collaboration-session')
  private collaborationSession!: CollaborationSession;

  @service('heatmap-configuration')
  heatmapConf!: HeatmapConfiguration;

  @service('user-settings')
  userSettings!: UserSettings;

  @service('link-renderer')
  linkRenderer!: LinkRenderer;

  @service('repos/scene-repository')
  sceneRepo!: SceneRepository;

  // #endregion SERVICES

  // #region CLASS FIELDS
  //
  private renderingLoop!: RenderingLoop;

  @tracked
  private canvas!: HTMLCanvasElement;

  private debug = debugLogger('VrRendering');

  private debugMenuGroup!: MenuGroup;

  private hintMenuQueue!: MenuQueue;

  private messageMenuQueue!: MenuQueue;

  private primaryInputManager = new VrInputManager();

  private secondaryInputManager = new VrInputManager();

  private vrSessionActive: boolean = false;

  private willDestroyController: AbortController = new AbortController();

  private mouseIntersection: THREE.Intersection | undefined = undefined;

  private renderer!: THREE.WebGLRenderer;

  cameraControls!: CameraControls;

  updatables: any[] = [];

  initDone = false;

  @tracked
  scene: THREE.Scene;

  @tracked
  readonly graph: ThreeForceGraph;

  // #endregion CLASS FIELDS
  //
  constructor(owner: any, args: Args) {
    console.log('VrRendering constructor');
    super(owner, args);

    this.toastMessage.info = (message) => this.showHint(message);
    this.toastMessage.message = (message) => this.showMessage(message);
    this.toastMessage.success = (message) => this.showHint(message);
    this.toastMessage.error = (message) => this.showHint(message);

    this.scene = this.sceneRepo.getScene('vr', true);
    this.scene.background = this.userSettings.applicationColors.backgroundColor;

    this.localUser.defaultCamera = new THREE.PerspectiveCamera(
      75,
      1.0,
      0.1,
      1000
    );
    this.localUser.defaultCamera.position.set(2, 2, 2);
    this.scene.add(this.localUser.defaultCamera);
    //this.localUser.userGroup.add(this.localUser.defaultCamera);
    this.scene.add(this.localUser.userGroup);

    this.applicationRenderer.getOpenApplications().clear();

    const forceGraph = new ForceGraph(getOwner(this), 0.02);
    this.graph = forceGraph.graph;
    this.scene.add(forceGraph.graph);
    this.updatables.push(forceGraph);
    this.updatables.push(this.localUser);

    this.menuFactory.scene = this.scene;

    this.scene.add(this.detachedMenuGroups.container);

    this.userSettings.applicationSettings.enableMultipleHighlighting.value =
      true;
  }

  // #region INITIALIZATION

  /**
   * Calls all init functions.
   */
  private initRendering() {
    this.initHUD();
    this.initRenderer();
    this.initInteraction();
    this.initPrimaryInput();
    this.initSecondaryInput();
    this.initControllers();
    this.initWebSocket();
    this.renderer.xr.addEventListener(
      'sessionend',
      this.resetLandscape.bind(this)
    );
  }

  private resetLandscape() {
    //if (!this.args.debugMode) this.localUser.visualizationMode = 'browser';
    this.onVrSessionEnded();
  }

  /**
   * Creates the menu groups that are attached to the user's camera.
   */
  private initHUD() {
    this.debug('Initializing head-up display menus...');

    // Menu group for hints.
    this.hintMenuQueue = new MenuQueue({
      detachedMenuGroups: this.detachedMenuGroups,
    });
    this.hintMenuQueue.position.z = -0.3;
    this.localUser.defaultCamera.add(this.hintMenuQueue);

    // Menu group for message boxes.
    this.messageMenuQueue = new MenuQueue({
      detachedMenuGroups: this.detachedMenuGroups,
    });
    this.messageMenuQueue.rotation.x = 0.45;
    this.messageMenuQueue.position.y = 0.1;
    this.messageMenuQueue.position.z = -0.3;
    this.localUser.defaultCamera.add(this.messageMenuQueue);

    // Menu group for previewing menus during development.
    this.debugMenuGroup = new MenuGroup({
      detachedMenuGroups: this.detachedMenuGroups,
    });
    this.debugMenuGroup.position.z = -0.35;
    this.localUser.defaultCamera.add(this.debugMenuGroup);
  }

  /**
   * Initiates a WebGLRenderer
   */
  private initRenderer() {
    this.debug('Initializing renderer...');

    const { width, height } = this.canvas;
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      canvas: this.canvas,
      powerPreference: 'high-performance',
    });
    this.menuFactory.renderer = this.renderer;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(width, height);
    this.renderer.xr.enabled = true;
    this.localUser.xr = this.renderer.xr;

    this.cameraControls = new CameraControls(
      getOwner(this),
      this.camera,
      undefined,
      this.canvas
    );
    this.updatables.push(this.cameraControls);

    this.initDone = true;
  }

  /**
   * Binds this context to all event handling functions and
   * passes them to a newly created Interaction object
   */
  private initInteraction() {
    this.debug('Initializing interaction...');

    // Add additional event listeners. Since TypeScript does not yet support
    // the signal option  of `addEventListener`, we have to listen for the
    // will destroy signal manually.
    const keydownListener = (event: KeyboardEvent) =>
      this.handleKeyboard(event);
    window.addEventListener('keydown', keydownListener);
    this.willDestroyController.signal.addEventListener('abort', () => {
      window.removeEventListener('keydown', keydownListener);
    });
  }

  private initPrimaryInput() {
    // When any base mash is hovered, highlight it.
    this.primaryInputManager.addInputHandler({
      targetType: BaseMesh,
      hover: (event) => {
        if (
          !(event.intersection.object instanceof ClazzMesh) &&
          !(event.intersection.object instanceof ClazzCommunicationMesh)
        ) {
          // prevents BaseMesh and ClazzMesh/ClazzCommunicationMesh fighting over applying the hover-effect since ClazzMesh/ClazzCommunicationMesh is a subclass of BaseMesh
          event.target.applyHoverEffect();
        }
      },
      resetHover: (event) => {
        if (
          !(event.intersection.object instanceof ClazzMesh) &&
          !(event.intersection.object instanceof ClazzCommunicationMesh)
        ) {
          event.target.resetHoverEffect();
        }
      },
    });

    // When a component of an application is clicked, open it.
    this.primaryInputManager.addInputHandler({
      targetType: ComponentMesh,
      triggerDown: (event) => {
        if (event.target.parent instanceof ApplicationObject3D) {
          this.applicationRenderer.toggleComponent(
            event.target,
            event.target.parent
          );
        }
      },
    });

    // When the foundation of an application is clicked, close all components.
    this.primaryInputManager.addInputHandler({
      targetType: FoundationMesh,
      triggerDown: (event) => {
        const application = event.target.parent as ApplicationObject3D;
        if (this.heatmapConf.heatmapActive) {
          this.heatmapConf.setActiveApplication(application);
        } else {
          this.applicationRenderer.closeAllComponents(application);
        }
      },
    });

    // When a close icon is clicked, close the corresponding object.
    this.primaryInputManager.addInputHandler({
      targetType: CloseIcon,
      triggerDown: (event) =>
        event.target.close().then((closedSuccessfully: boolean) => {
          if (!closedSuccessfully) this.showHint('Object could not be closed');
        }),
    });

    this.primaryInputManager.addInputHandler({
      targetType: ActionIcon,
      triggerDown: (event) =>
        event.target.action().then((closedSuccessfully: boolean) => {
          if (!closedSuccessfully) this.showHint('Action not possible.');
        }),
    });

    // Initialize menu interaction with other controller.
    this.primaryInputManager.addInputHandler({
      targetType: InteractiveMenu,
      triggerDown: (event) => event.target.triggerDown(event.intersection),
      triggerPress: (event) =>
        event.target.triggerPress(event.intersection, event.value),
      triggerUp: (event) => event.target.triggerUp(event.intersection),
      hover: (event) => event.target.hover(event.intersection),
      resetHover: (event) => event.target.resetHoverEffect(),
    });

    this.primaryInputManager.addInputHandler({
      targetType: ScrollUpButton,
      triggerPress: (event) => event.target.triggerPress(),
      hover: (event) => event.target.applyHover(),
      resetHover: (event) => event.target.resetHover(),
    });

    this.primaryInputManager.addInputHandler({
      targetType: ScrollDownButton,
      triggerPress: (event) => event.target.triggerPress(),
      hover: (event) => event.target.applyHover(),
      resetHover: (event) => event.target.resetHover(),
    });

    this.primaryInputManager.addInputHandler({
      targetType: OpenEntityButton,
      triggerDown: (event) => event.target.triggerDown(),
      hover: (event) => event.target.applyHover(),
      resetHover: (event) => event.target.resetHover(),
    });

    this.primaryInputManager.addInputHandler({
      targetType: DetailInfoScrollarea,
      triggerPress: (event) => event.target.triggerPress(event.intersection),
      hover: (event) =>
        event.target.applyHover(event.controller, event.intersection, this),
      resetHover: (event) => event.target.resetHover(event.controller),
      triggerDown: (event) => event.target.triggerDown(event.intersection),
      triggerUp: (event) => event.target.triggerUp(),
    });

    this.primaryInputManager.addInputHandler({
      targetType: KeyboardMesh,
      triggerDown: (event) => event.target.triggerDown(event.controller),
      triggerUp: (event) => event.target.triggerUp(),
      hover: (event) => event.target.applyHover(event.controller),
      resetHover: (event) => event.target.resetHover(event.controller),
      //TODO: triggerPress which works only for backspace
    });

    this.primaryInputManager.addInputHandler({
      targetType: SearchListItem,
      triggerDown: (event) => event.target.triggerDown(),
      hover: (event) => event.target.applyHover(),
      resetHover: (event) => event.target.resetHover(),
    });

    this.primaryInputManager.addInputHandler({
      targetType: UserListItem,
      triggerDown: (event) => event.target.triggerDown(),
      hover: (event) => event.target.applyHover(),
      resetHover: (event) => event.target.resetHover(),
    });

    this.primaryInputManager.addInputHandler({
      targetType: DisconnectButton,
      triggerPress: (event) => event.target.triggerPress(),
      hover: (event) => event.target.applyHover(),
      resetHover: (event) => event.target.resetHover(),
    });
  }

  private initSecondaryInput() {
    this.secondaryInputManager.addInputHandler({
      targetType: FloorMesh,
      triggerDown: (event) =>
        this.localUser.teleportToPosition(event.intersection.point),
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

    this.secondaryInputManager.addInputHandler({
      targetType: ApplicationObject3D,
      triggerDown: (event) =>
        this.applicationRenderer.highlight(
          event.intersection.object,
          event.target,
          this.localUser.color
        ),
    });

    this.secondaryInputManager.addInputHandler({
      targetType: ClazzCommunicationMesh,
      triggerDown: (event) => {
        if (
          event.intersection.object instanceof ClazzCommunicationMesh &&
          event.intersection.object.parent !== null
        ) {
          // in VR parent is null if we handle intern communication links. But they are already handled elsewhere anyway
          this.applicationRenderer.highlightExternLink(
            event.intersection.object,
            true,
            this.localUser.color
          );
        }
      },
      hover: (event) => {
        if (event.intersection.object instanceof ClazzCommunicationMesh) {
          event.target.applyHoverEffect(this.localUser.visualizationMode);
        }
      },
      resetHover: (event) => {
        if (event.intersection.object instanceof ClazzCommunicationMesh) {
          event.target.resetHoverEffect(this.localUser.visualizationMode);
        }
      },
    });

    this.secondaryInputManager.addInputHandler({
      targetType: ClazzMesh,
      hover: (
        event /*{
      if (event.intersection.object instanceof ClazzMesh) {*/
      ) =>
        event.target.applyHoverEffect(this.localUser.visualizationMode) /*}}*/,
      resetHover: (
        event /*{ if (event.intersection.object instanceof ClazzMesh) {*/
      ) =>
        event.target.resetHoverEffect(this.localUser.visualizationMode) /*}}*/,
    });
  }

  private initControllers() {
    this.debug('Initializing controllers...');

    this.localUser.setController1(
      this.initController({ gamepadIndex: CONTROLLER_1_ID })
    );
    this.localUser.setController2(
      this.initController({ gamepadIndex: CONTROLLER_2_ID })
    );
    this.sender.sendJoinVr();
  }

  private initController({
    gamepadIndex,
  }: {
    gamepadIndex: ControllerId;
  }): VRController {
    // Initialize the controller's menu group.
    const menuGroup = new MenuGroup({
      detachedMenuGroups: this.detachedMenuGroups,
    });

    // Initialize controller.
    const controller = new VRController({
      gamepadIndex,
      scene: this.scene,
      bindings: new VRControllerBindingsList(
        this.makeControllerBindings(),
        menuGroup.controllerBindings
      ),
      gripSpace: this.renderer.xr.getControllerGrip(gamepadIndex),
      raySpace: this.renderer.xr.getController(gamepadIndex),
      color: new THREE.Color('red'),
      menuGroup,
    });
    controller.setToDefaultAppearance();

    // Set camera of the controller's raycaster view-dependent objects such as
    // sprites can be intersected.
    controller.raycaster.camera = this.localUser.defaultCamera;

    // Add connection event listeners.
    controller.eventCallbacks.connected = () =>
      this.onControllerConnected(controller);
    controller.eventCallbacks.disconnected = () =>
      this.onControllerDisconnected(controller);

    // Add hover event listeners.
    controller.eventCallbacks.updateIntersectedObject = () => {
      this.handleHover(controller.intersectedObject, controller);
    };

    // Position menus above controller at an angle.
    menuGroup.position.y += 0.15;
    menuGroup.position.z -= 0.15;
    menuGroup.rotateX(340 * THREE.MathUtils.DEG2RAD);

    return controller;
  }

  private async initWebSocket() {
    this.debug('Initializing websocket...');
    this.webSocket.on(
      USER_CONTROLLER_CONNECT_EVENT,
      this,
      this.onUserControllerConnect
    );
    this.webSocket.on(
      USER_CONTROLLER_DISCONNECT_EVENT,
      this,
      this.onUserControllerDisconnect
    );
    this.webSocket.on(PING_UPDATE_EVENT, this, this.onPingUpdate);
    this.webSocket.on(OBJECT_MOVED_EVENT, this, this.onObjectMoved);
    this.webSocket.on(MENU_DETACHED_EVENT, this, this.onMenuDetached);
    this.webSocket.on(
      DETACHED_MENU_CLOSED_EVENT,
      this,
      this.onDetachedMenuClosed
    );
    this.webSocket.on(JOIN_VR_EVENT, this, this.onJoinVr);

    // this.sender.sendJoinVr();
  }

  // #endregion INITIALIZATION

  // #region DESTRUCTION

  willDestroy() {
    super.willDestroy();

    this.localUser.xr = undefined;

    this.webSocket.off(
      USER_CONTROLLER_CONNECT_EVENT,
      this,
      this.onUserControllerConnect
    );
    this.webSocket.off(
      USER_CONTROLLER_DISCONNECT_EVENT,
      this,
      this.onUserControllerDisconnect
    );
    this.webSocket.off(PING_UPDATE_EVENT, this, this.onPingUpdate);
    this.webSocket.off(OBJECT_MOVED_EVENT, this, this.onObjectMoved);
    this.webSocket.off(MENU_DETACHED_EVENT, this, this.onMenuDetached);
    this.webSocket.off(
      DETACHED_MENU_CLOSED_EVENT,
      this,
      this.onDetachedMenuClosed
    );
    this.webSocket.off(JOIN_VR_EVENT, this, this.onJoinVr);

    this.renderingLoop.stop();
    // Reset rendering.
    this.detachedMenuGroups.removeAllDetachedMenusLocally();

    // Reset services.
    this.localUser.reset();

    // Remove event listers.
    this.willDestroyController.abort();
  }

  // #endregion DESTRUCTION

  // #region ACTIONS

  @action
  canvasInserted(canvas: HTMLCanvasElement) {
    this.debug('Canvas inserted');

    this.canvas = canvas;
    canvas.oncontextmenu = (e) => {
      e.preventDefault();
    };
  }

  get camera() {
    return this.localUser.defaultCamera;
  }

  @action
  async outerDivInserted(outerDiv: HTMLElement) {
    this.debug('Outer Div inserted');

    // Initialize the component.
    this.initRendering();
    this.resize(outerDiv);

    // Start main loop.
    this.renderingLoop = new RenderingLoop(getOwner(this), {
      camera: this.camera,
      orthographicCamera: undefined,
      scene: this.scene,
      renderer: this.renderer,
      updatables: this.updatables,
    });
    this.scene.add(this.collaborationSession.remoteUserGroup);
    this.renderingLoop.updatables.push(this);
    this.renderingLoop.start();
  }

  /**
   * Call this whenever the canvas is resized. Updated properties of camera
   * and renderer.
   *
   * @param outerDiv HTML element containing the canvas
   */
  @action
  resize(outerDiv: HTMLElement) {
    const width = outerDiv.clientWidth;
    const height = outerDiv.clientHeight;
    this.renderer.setSize(width, height);
    this.localUser.defaultCamera.aspect = width / height;
    this.localUser.defaultCamera.updateProjectionMatrix();
  }

  session?: XRSession;

  @action
  onVrSessionStarted(session: XRSession) {
    this.debug('WebXRSession started');
    this.session = session;
    this.vrSessionActive = true;

    session.addEventListener('inputsourceschange', (event) => {
      console.log(event);
      for (const inputSource of event.added) {
        console.log('Input source:', inputSource);
      }
    });
  }

  @action
  onVrSessionEnded() {
    this.debug('WebXRSession ended');
    this.vrSessionActive = false;

    if (!this.userSettings.applicationSettings.showVrOnClick.value)
      this.localUser.visualizationMode = 'browser'; // TODO

    const outerDiv = this.canvas?.parentElement;
    if (outerDiv) {
      this.resize(outerDiv);
    }
  }

  @action
  async onDropFiles(files: File[]) {
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
              this.scene.add(object);
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
              this.localUser.setPanoramaShere(
                new THREE.Mesh(geometry, material)
              );
              resolve(null);
            });
          })
        );
      }
    }

    // Revoke the object URLs when all loading tasks are done.
    await Promise.all(tasks);
    objectURLs.forEach((url) => URL.revokeObjectURL(url));
  }

  // #endregion ACTIONS

  // #region MAIN LOOP

  /**
   * Updates menus, services and all objects in the scene.
   */
  tick(delta: number) {
    // Update controllers and menus.
    this.localUser.updateControllers(delta);
    this.hintMenuQueue.updateMenu(delta);
    this.messageMenuQueue.updateMenu(delta);
    this.debugMenuGroup.updateMenu(delta);
    this.detachedMenuGroups.updateDetachedMenus(delta);

    // Update services.
    this.spectateUserService.tick();
    this.grabbedObjectService.sendObjectPositions();

    this.collaborationSession.idToRemoteUser.forEach((remoteUser) => {
      remoteUser.update(delta);
    });

    // Update animations
    gsap.ticker.tick();

    if (this.initDone && this.linkRenderer.flag) {
      this.linkRenderer.flag = false;
    }
  }

  // #endregion MAIN LOOP

  // #region MENUS

  private showHint(title: string, text: string | undefined = undefined) {
    // Show the hint only if there is no hint with the text in the queue
    // already. This prevents the same hint to be shown multiple times when
    // the user repeats the action that causes the hint.
    if (
      !this.hintMenuQueue.hasEnquedOrCurrentMenu(
        (menu) =>
          menu instanceof HintMenu &&
          menu.titleItem.text === title &&
          menu.textItem?.text === text
      )
    ) {
      this.hintMenuQueue.enqueueMenu(
        this.menuFactory.buildHintMenu(title, text)
      );
    }
  }

  private showMessage(message: MessageArgs) {
    this.messageMenuQueue.enqueueMenu(
      this.menuFactory.buildMessageBoxMenu(message)
    );
  }

  private openToolMenu(controller: VRController) {
    controller.menuGroup.openMenu(this.menuFactory.buildToolMenu());
  }

  private openInfoMenu(controller: VRController, object: EntityMesh) {
    controller.menuGroup.openMenu(this.menuFactory.buildInfoMenu(object));
  }

  // #endregion MENUS

  // #region INTERACTION
  // executed on enter VR
  private async onControllerConnected(controller: VRController) {
    if (this.session) {
      const source = this.session.inputSources[controller.gamepadIndex];
      if (source.gamepad) {
        controller.gamepad = source.gamepad;
      }
    }
    // Set visibilty and rays accordingly
    if (this.spectateUserService.isActive)
      controller.setToSpectatingAppearance();
    else controller.setToDefaultAppearance();

    this.sender.sendControllerConnect(controller);
  }

  private onControllerDisconnected(controller: VRController) {
    // Close all open menus of the disconnected controller.
    controller.menuGroup.closeAllMenus();

    // Inform other users that the controller disconnected.
    this.sender.sendControllerDisconnect(controller);
  }

  private makeControllerBindings(): VRControllerBindings {
    return new VRControllerBindings({
      triggerButton: new VRControllerButtonBinding('Open / Close', {
        onButtonDown: (controller: VRController) => {
          if (!controller.intersectedObject) return;
          this.primaryInputManager.handleTriggerDown(
            controller.intersectedObject,
            controller
          );
        },
        onButtonPress: (controller: VRController, value: number) => {
          if (!controller.intersectedObject) return;
          this.primaryInputManager.handleTriggerPress(
            controller.intersectedObject,
            value,
            controller
          );
        },
        onButtonUp: (controller: VRController) => {
          if (!controller.intersectedObject) return;
          this.primaryInputManager.handleTriggerUp(
            controller.intersectedObject,
            controller
          );
        },
      }),

      menuButton: new VRControllerButtonBinding('Highlight', {
        onButtonDown: (controller) => {
          if (controller.intersectedObject) {
            this.secondaryInputManager.handleTriggerDown(
              controller.intersectedObject
            );
          }
        },
      }),

      bButton: new VRControllerButtonBinding('Ping', {
        onButtonDown: (controller) => {
          if (controller.intersectedObject) {
            this.ping(controller.intersectedObject);
          }
        },
      }),

      gripButton: new VRControllerButtonBinding('Grab Object', {
        onButtonDown: (controller) => this.grabIntersectedObject(controller),
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
                    this.openInfoMenu(controller, object);
                  } else {
                    this.openToolMenu(controller);
                  }
                } else {
                  this.openToolMenu(controller);
                }
                break;
            }
          },
        }
      ),
    });
  }

  private grabIntersectedObject(controller: VRController) {
    if (!controller.intersectedObject || !controller.ray) return;

    let current: THREE.Object3D | null = controller.intersectedObject.object;
    while (current) {
      if (isGrabbableObject(current)) {
        controller.menuGroup.openMenu(this.menuFactory.buildGrabMenu(current));
        break;
      } else {
        current = current.parent;
      }
    }
  }

  @action
  handleDoubleClick(intersection: THREE.Intersection | null) {
    if (this.vrSessionActive || !intersection) return;
    this.primaryInputManager.handleTriggerDown(intersection);
  }

  @action
  handleSingleClick(intersection: THREE.Intersection | null) {
    if (this.vrSessionActive || !intersection) return;
    this.secondaryInputManager.handleTriggerDown(intersection);
  }

  @action
  handlePanning(delta: { x: number; y: number }, button: 1 | 2 | 3) {
    if (this.vrSessionActive) return;

    const LEFT_MOUSE_BUTTON = 1;
    const RIGHT_MOUSE_BUTTON = 3;

    const x = delta.x / this.canvas.width;
    const y = delta.y / this.canvas.height;

    switch (button) {
      case LEFT_MOUSE_BUTTON:
        // Move user.
        this.localUser.moveInCameraDirection(
          new THREE.Vector3(-x * MOUSE_MOVE_SPEED, 0, -y * MOUSE_MOVE_SPEED),
          { enableY: false }
        );
        break;
      case RIGHT_MOUSE_BUTTON:
        // Rotate camera to look around.
        this.localUser.rotateCamera(
          y * MOUSE_ROTATION_SPEED,
          x * MOUSE_ROTATION_SPEED
        );
        break;
      default:
        break;
    }
  }

  @action
  handleMouseWheel(delta: number) {
    if (this.vrSessionActive) return;
    this.localUser.cameraHeight += delta * 0.05;
  }

  @action
  handleMouseMove(intersection: THREE.Intersection | undefined) {
    if (this.vrSessionActive) return;
    this.mouseIntersection = intersection;
    this.handleHover(intersection, null);
  }

  private handleHover(
    intersection: THREE.Intersection | undefined,
    controller: VRController | null
  ) {
    if (intersection) {
      this.primaryInputManager.handleHover(intersection, controller);
      this.secondaryInputManager.handleHover(intersection, controller);
    } else {
      this.primaryInputManager.resetHover(controller);
      this.secondaryInputManager.resetHover(controller);
    }
  }

  private handleKeyboard(event: KeyboardEvent) {
    switch (event.key) {
      case 'Escape':
        if (!this.vrSessionActive) {
          // Close current debug menu or open tool menu if no menu is debugged.
          if (this.debugMenuGroup.currentMenu) {
            this.debugMenuGroup.closeMenu();
          } else {
            this.debugMenuGroup.openMenu(this.menuFactory.buildToolMenu());
          }
        }
        break;
      case 'f':
        // open/close component
        if (this.localUser.controller2?.intersectedObject) {
          this.primaryInputManager.handleTriggerDown(
            this.localUser.controller2.intersectedObject,
            this.localUser.controller2
          );
        }
        break;
      case 'g':
        // highlight entity
        if (this.localUser.controller2?.intersectedObject) {
          this.secondaryInputManager.handleTriggerDown(
            this.localUser.controller2.intersectedObject
          );
        }
        break;
      case 'i':
        if (this.vrSessionActive) {
          // show info popup
          if (this.localUser.controller1?.intersectedObject) {
            const { object } = this.localUser.controller1.intersectedObject;
            if (isEntityMesh(object)) {
              this.openInfoMenu(this.localUser.controller1, object);
            }
          }
        } else if (this.mouseIntersection) {
          const { object } = this.mouseIntersection;
          if (isEntityMesh(object)) {
            this.debugMenuGroup.openMenu(
              this.menuFactory.buildInfoMenu(object)
            );
          } else {
            this.debugMenuGroup.closeAllMenus();
          }
        }
        break;
      default:
        break;
    }
  }

  @action
  ping(intersectedViewObj: Intersection) {
    const parentObj = intersectedViewObj.object.parent;
    const pingPosition = intersectedViewObj.point;
    if (parentObj) {
      parentObj.worldToLocal(pingPosition);
      this.localUser.mousePing.ping.perform({
        parentObj,
        position: pingPosition,
      });
      if (parentObj instanceof ApplicationObject3D) {
        this.sender.sendMousePingUpdate(
          parentObj.getModelId(),
          true,
          pingPosition
        );
      }
    }
  }

  // #endregion INTERACTION

  // #region HANDLING MESSAGES

  /**
   * Updates whether the given user is pinging with the specified controller or not.
   */
  onPingUpdate({
    userId,
    originalMessage: { controllerId, isPinging },
  }: ForwardedMessage<PingUpdateMessage>): void {
    const remoteUser = this.collaborationSession.lookupRemoteUserById(userId);

    if (remoteUser) {
      remoteUser.togglePing(controllerId, isPinging);
    }
  }

  onUserControllerConnect({
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
  }: ForwardedMessage<UserControllerConnectMessage>): void {
    const remoteUser = this.collaborationSession.lookupRemoteUserById(userId);
    if (!remoteUser) return;

    remoteUser.initController(controllerId, assetUrl, {
      position,
      quaternion,
      intersection,
    });
  }

  onUserControllerDisconnect({
    userId,
    originalMessage: { controllerId },
  }: ForwardedMessage<UserControllerDisconnectMessage>): void {
    const remoteUser = this.collaborationSession.lookupRemoteUserById(userId);

    if (remoteUser) {
      remoteUser.removeController(controllerId);
    }
  }

  onJoinVr(): void {
    if (this.localUser.controller1)
      this.sender.sendControllerConnect(this.localUser.controller1);
    if (this.localUser.controller2)
      this.sender.sendControllerConnect(this.localUser.controller2);
  }

  onObjectMoved({
    originalMessage: { objectId, position, quaternion, scale },
  }: ForwardedMessage<ObjectMovedMessage>): void {
    // Find moved object in the scene.
    const movedObject = findGrabbableObject(this.scene, objectId);
    if (!movedObject) {
      this.debug('Could not find moved object', objectId);
      return;
    }

    movedObject.position.fromArray(position);
    movedObject.quaternion.fromArray(quaternion);
    movedObject.scale.fromArray(scale);
  }

  onMenuDetached({
    objectId,
    userId,
    entityType,
    detachId,
    position,
    /** quaternion, */
    scale,
  }: MenuDetachedForwardMessage) {
    const x = new THREE.Vector3();
    x.fromArray(position);
    x.y += 15;
    this.graph.localToWorld(x);
    this.detachedMenuRenderer.restoreDetachedMenu({
      objectId,
      entityType,
      userId,
      // TODO align the naming with SerializedDetachedMenu
      entityId: detachId,
      position: x.toArray(),
      quaternion: this.localUser.camera.quaternion.toArray(),
      scale,
    });
  }

  onDetachedMenuClosed({
    originalMessage: { menuId },
  }: ForwardedMessage<DetachedMenuClosedMessage>): void {
    this.detachedMenuGroups.removeDetachedMenuLocallyById(menuId);
  }

  // #endregion HANDLING MESSAGES
}
