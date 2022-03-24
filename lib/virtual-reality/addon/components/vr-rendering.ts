import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import debugLogger from 'ember-debug-logger';
import { LandscapeData } from 'explorviz-frontend/controllers/visualization';
import Configuration from 'explorviz-frontend/services/configuration';
import LandscapeRenderer from 'explorviz-frontend/services/landscape-renderer';
import LocalVrUser from 'explorviz-frontend/services/local-vr-user';
import RemoteVrUserService from 'explorviz-frontend/services/remote-vr-users';
import TimestampRepository, { Timestamp } from 'explorviz-frontend/services/repos/timestamp-repository';
import HammerInteraction from 'explorviz-frontend/utils/hammer-interaction';
import { Application } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import ComponentMesh from 'explorviz-frontend/view-objects/3d/application/component-mesh';
import FoundationMesh from 'explorviz-frontend/view-objects/3d/application/foundation-mesh';
import BaseMesh from 'explorviz-frontend/view-objects/3d/base-mesh';
import ApplicationMesh from 'explorviz-frontend/view-objects/3d/landscape/application-mesh';
import THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import DeltaTimeService from 'virtual-reality/services/delta-time';
import DetachedMenuGroupsService from 'virtual-reality/services/detached-menu-groups';
import GrabbedObjectService from 'virtual-reality/services/grabbed-object';
import SpectateUserService from 'virtual-reality/services/spectate-user';
import ApplicationRenderer, { AddApplicationArgs } from 'explorviz-frontend/services/application-renderer';
import VrAssetRepository from 'virtual-reality/services/vr-asset-repo';
import VrMenuFactoryService from 'virtual-reality/services/vr-menu-factory';
import VrMessageReceiver, { VrMessageListener } from 'virtual-reality/services/vr-message-receiver';
import VrMessageSender from 'virtual-reality/services/vr-message-sender';
import VrSceneService from 'virtual-reality/services/vr-scene';
import VrTimestampService from 'virtual-reality/services/vr-timestamp';
import WebSocketService from 'virtual-reality/services/web-socket';
import { findGrabbableObject, GrabbableObjectWrapper, isGrabbableObject } from 'virtual-reality/utils/view-objects/interfaces/grabbable-object';
import CloseIcon from 'virtual-reality/utils/view-objects/vr/close-icon';
import FloorMesh from 'virtual-reality/utils/view-objects/vr/floor-mesh';
import VRController from 'virtual-reality/utils/vr-controller';
import VRControllerBindings from 'virtual-reality/utils/vr-controller/vr-controller-bindings';
import VRControllerBindingsList from 'virtual-reality/utils/vr-controller/vr-controller-bindings-list';
import VRControllerButtonBinding from 'virtual-reality/utils/vr-controller/vr-controller-button-binding';
import VRControllerThumbpadBinding, { VRControllerThumbpadVerticalDirection } from 'virtual-reality/utils/vr-controller/vr-controller-thumbpad-binding';
import VrInputManager from 'virtual-reality/utils/vr-controller/vr-input-manager';
import { EntityMesh, isEntityMesh } from 'virtual-reality/utils/vr-helpers/detail-info-composer';
import * as VrPoses from 'virtual-reality/utils/vr-helpers/vr-poses';
import InteractiveMenu from 'virtual-reality/utils/vr-menus/interactive-menu';
import MenuGroup from 'virtual-reality/utils/vr-menus/menu-group';
import MenuQueue from 'virtual-reality/utils/vr-menus/menu-queue';
import HintMenu from 'virtual-reality/utils/vr-menus/ui-menu/hud/hint-menu';
import { ForwardedMessage, FORWARDED_EVENT } from 'virtual-reality/utils/vr-message/receivable/forwarded';
import { InitialLandscapeMessage } from 'virtual-reality/utils/vr-message/receivable/landscape';
import { MenuDetachedForwardMessage } from 'virtual-reality/utils/vr-message/receivable/menu-detached-forward';
import { SelfConnectedMessage } from 'virtual-reality/utils/vr-message/receivable/self_connected';
import { UserConnectedMessage, USER_CONNECTED_EVENT } from 'virtual-reality/utils/vr-message/receivable/user_connected';
import { UserDisconnectedMessage } from 'virtual-reality/utils/vr-message/receivable/user_disconnect';
import { AppOpenedMessage } from 'virtual-reality/utils/vr-message/sendable/app_opened';
import { ComponentUpdateMessage } from 'virtual-reality/utils/vr-message/sendable/component_update';
import { HighlightingUpdateMessage } from 'virtual-reality/utils/vr-message/sendable/highlighting_update';
import { ObjectMovedMessage } from 'virtual-reality/utils/vr-message/sendable/object_moved';
import { PingUpdateMessage } from 'virtual-reality/utils/vr-message/sendable/ping_update';
import { AppClosedMessage } from 'virtual-reality/utils/vr-message/sendable/request/app_closed';
import { DetachedMenuClosedMessage } from 'virtual-reality/utils/vr-message/sendable/request/detached_menu_closed';
import { SpectatingUpdateMessage } from 'virtual-reality/utils/vr-message/sendable/spectating_update';
import { TimestampUpdateMessage } from 'virtual-reality/utils/vr-message/sendable/timetsamp_update';
import { UserPositionsMessage } from 'virtual-reality/utils/vr-message/sendable/user_positions';
import RemoteVrUser from 'virtual-reality/utils/vr-multi-user/remote-vr-user';
import WebXRPolyfill from 'webxr-polyfill';
import VrHighlightingService from '../services/vr-highlighting';
import VrRoomSerializer from '../services/vr-room-serializer';
import { UserControllerConnectMessage, USER_CONTROLLER_CONNECT_EVENT } from '../utils/vr-message/sendable/user_controller_connect';
import { UserControllerDisconnectMessage } from '../utils/vr-message/sendable/user_controller_disconnect';
import { ControllerId, CONTROLLER_1_ID, CONTROLLER_2_ID } from '../utils/vr-message/util/controller_id';

interface Args {
  readonly id: string;
  readonly landscapeData: LandscapeData;
  readonly selectedTimestampRecords: Timestamp[];
  readonly font: THREE.Font;
}

const THUMBPAD_THRESHOLD = 0.5;
const MOUSE_MOVE_SPEED = 3.0;
const MOUSE_ROTATION_SPEED = Math.PI;

export default class VrRendering
  extends Component<Args>
  implements VrMessageListener {
  // #region SERVICES

  @service('configuration')
  private configuration!: Configuration;

  @service('delta-time')
  private deltaTimeService!: DeltaTimeService;

  @service('detached-menu-groups')
  private detachedMenuGroups!: DetachedMenuGroupsService;

  @service('grabbed-object')
  private grabbedObjectService!: GrabbedObjectService;

  @service('local-vr-user')
  private localUser!: LocalVrUser;

  @service('remote-vr-users')
  private remoteUsers!: RemoteVrUserService;

  @service('repos/timestamp-repository')
  private timestampRepo!: TimestampRepository;

  @service('spectate-user')
  private spectateUserService!: SpectateUserService;

  @service('application-renderer')
  private applicationRenderer!: ApplicationRenderer;

  @service('vr-asset-repo')
  private assetRepo!: VrAssetRepository;

  @service('vr-highlighting')
  private highlightingService!: VrHighlightingService;

  @service('landscape-renderer')
  private landscapeRenderer!: LandscapeRenderer;

  @service('vr-menu-factory')
  private menuFactory!: VrMenuFactoryService;

  @service('vr-message-receiver')
  private receiver!: VrMessageReceiver;

  @service('vr-message-sender')
  private sender!: VrMessageSender;

  @service('vr-room-serializer')
  private roomSerializer!: VrRoomSerializer;

  @service('vr-scene')
  private sceneService!: VrSceneService;

  @service('vr-timestamp')
  private timestampService!: VrTimestampService;

  @service('web-socket')
  private webSocket!: WebSocketService;

  // #endregion SERVICES

  // #region CLASS FIELDS

  private canvas!: HTMLCanvasElement;

  private debug = debugLogger('VrRendering');

  private debugMenuGroup!: MenuGroup;

  private hintMenuQueue!: MenuQueue;

  private messageMenuQueue!: MenuQueue;

  private primaryInputManager = new VrInputManager();

  private secondaryInputManager = new VrInputManager();

  private vrSessionActive: boolean = false;

  private willDestroyController: AbortController = new AbortController();

  @tracked
  hammerInteraction: HammerInteraction = HammerInteraction.create();

  // #endregion CLASS FIELDS

  // #region INITIALIZATION

  /**
   * Calls all init functions.
   */
  private initRendering() {
    this.initHUD();
    this.initRenderer();
    this.sceneService.addFloor();
    this.sceneService.addLight();
    this.sceneService.addSpotlight();
    this.remoteUsers.displayHmd = true;
    this.landscapeRenderer.landscape_depth = 0.7
    this.landscapeRenderer.z_depth = 0.2
    this.landscapeRenderer.commLineMinSize = 0.004
    this.landscapeRenderer.commLineScalar = 0.028
    this.landscapeRenderer.z_offset = 0.7 / 2 + 0.25
    this.landscapeRenderer.z_pos_application = 0.3
    this.initServices();
    this.initInteraction();
    this.initPrimaryInput();
    this.initSecondaryInput();
    this.initControllers();
    this.initWebSocket();
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
    this.localUser.renderer = new THREE.WebGLRenderer({
      antialias: true,
      canvas: this.canvas,
    });
    this.localUser.renderer.setPixelRatio(window.devicePixelRatio);
    this.localUser.renderer.setSize(width, height);
    this.localUser.renderer.xr.enabled = true;

    const polyfill = new WebXRPolyfill();
    if (polyfill) {
      this.debug('Polyfill enabled');
    }
  }

  private initServices() {
    this.debug('Initializing services...');

    // Use given font for landscape and application rendering.
    this.assetRepo.font = this.args.font;
    this.applicationRenderer.font = this.assetRepo.font;
    this.landscapeRenderer.arMode = true
    this.applicationRenderer.arMode = true

    // Initialize timestamp and landscape data. If no timestamp is selected,
    // the latest timestamp is used. When there is no timestamp, we fall back
    // to the current time.
    if (this.args.landscapeData) {
      const { landscapeToken } = this.args.landscapeData.structureLandscapeData;
      const timestamp = this.args.selectedTimestampRecords[0]?.timestamp
        || this.timestampRepo.getLatestTimestamp(landscapeToken)?.timestamp
        || new Date().getTime();
      this.timestampService.setTimestampLocally(
        timestamp,
        this.args.landscapeData.structureLandscapeData,
        this.args.landscapeData.dynamicLandscapeData,
      );
    } else {
      this.debug('No landscape data found.');
    }
  }

  /**
   * Binds this context to all event handling functions and
   * passes them to a newly created Interaction object
   */
  private initInteraction() {
    this.debug('Initializing interaction...');
    this.hammerInteraction.setupHammer(this.canvas);

    // Add additional event listeners. Since TypeScript does not yet support
    // the signal option  of `addEventListener`, we have to listen for the
    // will destroy signal manually.
    const keydownListener = (event: KeyboardEvent) => this.handleKeyboard(event);
    window.addEventListener('keydown', keydownListener);
    this.willDestroyController.signal.addEventListener('abort', () => {
      window.removeEventListener('keydown', keydownListener);
    });
  }

  private initPrimaryInput() {
    // When any base mash is hovered, highlight it.
    this.primaryInputManager.addInputHandler({
      targetType: BaseMesh,
      hover: (event) => event.target.applyHoverEffect(),
      resetHover: (event) => event.target.resetHoverEffect(),
    });

    // When an application on the landscape is clicked, open the application.
    this.primaryInputManager.addInputHandler<ApplicationMesh>({
      targetType: ApplicationMesh,
      triggerDown: (event) => this.addApplicationOrShowHint(event.target.dataModel, {
        position: event.intersection.point,
        quaternion: new THREE.Quaternion()
          .setFromEuler(
            new THREE.Euler(
              90 * THREE.MathUtils.DEG2RAD,
              90 * THREE.MathUtils.DEG2RAD,
              0,
            ),
          )
          .premultiply(this.landscapeRenderer.landscapeObject3D.quaternion),
      }),
    });

    // When a component of an application is clicked, open it.
    this.primaryInputManager.addInputHandler({
      targetType: ComponentMesh,
      triggerDown: (event) => {
        if (event.target.parent instanceof ApplicationObject3D) {
          this.applicationRenderer.toggleComponent(
            event.target,
            event.target.parent,
          );
        }
      },
    });

    // When the foundation of an application is clicked, close all components.
    this.primaryInputManager.addInputHandler({
      targetType: FoundationMesh,
      triggerDown: (event) => {
        if (event.target.parent instanceof ApplicationObject3D) {
          this.applicationRenderer.closeAllComponents(event.target.parent);
        }
      },
    });

    // When a close icon is clicked, close the corresponding object.
    this.primaryInputManager.addInputHandler({
      targetType: CloseIcon,
      triggerDown: (event) => event.target.close().then((closedSuccessfully: boolean) => {
        if (!closedSuccessfully) this.showHint('Object could not be closed');
      }),
    });

    // Initialize menu interaction with other controller.
    this.primaryInputManager.addInputHandler({
      targetType: InteractiveMenu,
      triggerDown: (event) => event.target.triggerDown(event.intersection),
      triggerPress: (event) => event.target.triggerPress(event.intersection, event.value),
      triggerUp: (event) => event.target.triggerUp(event.intersection),
      hover: (event) => event.target.hover(event.intersection),
      resetHover: (event) => event.target.resetHoverEffect(),
    });
  }

  private initSecondaryInput() {
    this.secondaryInputManager.addInputHandler({
      targetType: FloorMesh,
      triggerDown: (event) => this.localUser.teleportToPosition(event.intersection.point),
      hover: ({ controller, intersection }) => {
        if (controller?.teleportArea && controller?.ray) {
          controller.teleportArea.showAbovePosition(intersection.point);
          controller.teleportArea.visible = controller.ray.visible && controller.enableTeleport;
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
      triggerDown: (event) => this.highlightingService.highlightComponent(
        event.target,
        event.intersection.object,
      ),
    });
  }

  private initControllers() {
    this.debug('Initializing controllers...');

    this.localUser.setController1(
      this.initController({ gamepadIndex: CONTROLLER_1_ID }),
    );
    this.localUser.setController2(
      this.initController({ gamepadIndex: CONTROLLER_2_ID }),
    );
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
      scene: this.sceneService.scene,
      bindings: new VRControllerBindingsList(
        this.makeControllerBindings(),
        menuGroup.controllerBindings,
      ),
      gripSpace: this.localUser.renderer.xr.getControllerGrip(gamepadIndex),
      raySpace: this.localUser.renderer.xr.getController(gamepadIndex),
      color: new THREE.Color('red'),
      menuGroup,
    });
    controller.setToDefaultAppearance();

    // Set camera of the controller's raycaster view-dependent objects such as
    // sprites can be intersected.
    controller.raycaster.camera = this.localUser.defaultCamera;

    // Add connection event listeners.
    controller.eventCallbacks.connected = () => this.onControllerConnected(controller);
    controller.eventCallbacks.disconnected = () => this.onControllerDisconnected(controller);

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

    // this.webSocket.socketCloseCallback = () => this.onSelfDisconnected();
    // this.receiver.addMessageListener(this);
  }

  // #endregion INITIALIZATION

  // #region DESTRUCTION

  willDestroy() {
    // Reset rendering.
    this.applicationRenderer.removeAllApplicationsLocally();
    this.landscapeRenderer.cleanUpLandscape();
    this.detachedMenuGroups.removeAllDetachedMenusLocally();

    // Reset services.
    this.localUser.reset();
    this.spectateUserService.reset();

    // Remove event listers.
    // this.receiver.removeMessageListener(this);
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

  @action
  async outerDivInserted(outerDiv: HTMLElement) {
    this.debug('Outer Div inserted');

    // Initialize the component.
    this.initRendering();
    this.resize(outerDiv);

    // Start main loop.
    this.localUser.renderer.setAnimationLoop(() => this.tick());
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
    this.localUser.updateCameraAspectRatio(width, height);
  }

  @action
  onVrSessionStarted(/* session: XRSession */) {
    this.debug('WebXRSession started');
    this.vrSessionActive = true;
  }

  @action
  onVrSessionEnded() {
    this.debug('WebXRSession ended');
    this.vrSessionActive = false;
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
              this.sceneService.scene.add(object);
              resolve(null);
            });
          }),
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
                new THREE.Mesh(geometry, material),
              );
              resolve(null);
            });
          }),
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
   * Main loop that is called once per frame.
   */
  private tick() {
    if (this.isDestroyed) {
      return;
    }

    // Compute time since last tick.
    this.deltaTimeService.update();
    const delta = this.deltaTimeService.getDeltaTime();

    this.update(delta);

    this.render();

    // Send position update to backend. This must happen after the scene has
    // been rendered such that the camera position is not corrupted.
    this.sendPoses();
  }

  /**
   * Updates menus, services and all objects in the scene.
   */
  private update(delta: number) {
    // Update controllers and menus.
    this.localUser.updateControllers(delta);
    this.hintMenuQueue.updateMenu(delta);
    this.messageMenuQueue.updateMenu(delta);
    this.debugMenuGroup.updateMenu(delta);
    this.detachedMenuGroups.updateDetachedMenus(delta);

    // Update services.
    this.spectateUserService.update();
    this.grabbedObjectService.sendObjectPositions();
    this.remoteUsers.updateRemoteUsers(delta);

    // update applications' globe animation
    this.applicationRenderer.updateAllApplicationGlobes(this.deltaTimeService.getDeltaTime());
  }

  /**
   * Renders the scene.
   */
  private render() {
    this.localUser.renderer.render(
      this.sceneService.scene,
      this.localUser.defaultCamera,
    );
  }

  // #endregion MAIN LOOP

  // #region APPLICATION RENDERING

  private async addApplicationOrShowHint(
    applicationModel: Application,
    args: AddApplicationArgs,
  ): Promise<ApplicationObject3D | null> {
    if (applicationModel.packages.length === 0) {
      this.showHint('No data available');
      return Promise.resolve(null);
    }

    if (
      this.applicationRenderer.isApplicationOpen(applicationModel.id)
    ) {
      this.showHint('Application already opened');
      return Promise.resolve(null);
    }

    return this.applicationRenderer.addApplication(applicationModel, args);
  }

  // #endregion APPLICATION RENDERING

  // #region MENUS

  private showHint(title: string, text: string | undefined = undefined) {
    // Show the hint only if there is no hint with the text in the queue
    // already. This prevents the same hint to be shown multiple times when
    // the user repeats the action that causes the hint.
    if (
      !this.hintMenuQueue.hasEnquedOrCurrentMenu(
        (menu) => menu instanceof HintMenu
          && menu.titleItem.text === title
          && menu.textItem?.text === text,
      )
    ) {
      this.hintMenuQueue.enqueueMenu(
        this.menuFactory.buildHintMenu(title, text),
      );
    }
  }

  private openToolMenu(controller: VRController) {
    controller.menuGroup.openMenu(this.menuFactory.buildToolMenu());
  }

  private openInfoMenu(controller: VRController, object: EntityMesh) {
    controller.menuGroup.openMenu(this.menuFactory.buildInfoMenu(object));
  }

  // #endregion MENUS

  // #region INTERACTION

  private async onControllerConnected(controller: VRController) {
    // Set visibilty and rays accordingly
    if (this.spectateUserService.isActive) controller.setToSpectatingAppearance();
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
            controller,
          );
        },
        onButtonPress: (controller: VRController, value: number) => {
          if (!controller.intersectedObject) return;
          this.primaryInputManager.handleTriggerPress(
            controller.intersectedObject,
            value,
            controller,
          );
        },
        onButtonUp: (controller: VRController) => {
          if (!controller.intersectedObject) return;
          this.primaryInputManager.handleTriggerUp(
            controller.intersectedObject,
            controller,
          );
        },
      }),

      menuButton: new VRControllerButtonBinding('Menu', {
        onButtonDown: (controller) => this.openToolMenu(controller),
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
            const direction = VRControllerThumbpadBinding.getVerticalDirection(axes, {
              threshold: THUMBPAD_THRESHOLD,
            });
            switch (direction) {
              case VRControllerThumbpadVerticalDirection.UP:
                if (controller.intersectedObject) {
                  this.secondaryInputManager.handleTriggerDown(
                    controller.intersectedObject,
                  );
                }
                break;
              case VRControllerThumbpadVerticalDirection.DOWN:
                if (controller.intersectedObject) {
                  const { object } = controller.intersectedObject;
                  if (isEntityMesh(object)) {
                    this.openInfoMenu(controller, object);
                  }
                }
                break;
              default:
                break;
            }
          },
        },
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
          { enableY: false },
        );
        break;
      case RIGHT_MOUSE_BUTTON:
        // Rotate camera to look around.
        this.localUser.rotateCamera(y * MOUSE_ROTATION_SPEED, x * MOUSE_ROTATION_SPEED);
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
  handleMouseMove(intersection: THREE.Intersection | null) {
    if (this.vrSessionActive) return;
    this.handleHover(intersection, null);
  }

  private handleHover(
    intersection: THREE.Intersection | null,
    controller: VRController | null,
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
      default:
        break;
    }
  }

  // #endregion INTERACTION

  // #region SENDING MESSAGES

  private sendPoses() {
    const poses = VrPoses.getPoses(
      this.localUser.camera,
      this.localUser.controller1,
      this.localUser.controller2,
    );
    this.sender.sendPoseUpdate(
      poses.camera,
      poses.controller1,
      poses.controller2,
    );
  }

  private sendInitialControllerConnectState() {
    this.sender.sendControllerConnect(this.localUser.controller1);
    this.sender.sendControllerConnect(this.localUser.controller2);
  }

  // #endregion SENDING MESSAGES

  // #region HANDLING MESSAGES

  private onSelfDisconnected(event?: any) {
    if (this.localUser.isConnecting) {
      this.showHint('VR service not responding');
    } else if (event) {
      switch (event.code) {
        case 1000: // Normal Closure
          this.showHint('Successfully disconnected');
          break;
        case 1006: // Abnormal closure
          this.showHint('VR service closed abnormally');
          break;
        default:
          this.showHint('Unexpected disconnect');
      }
    }

    // Remove remote users.
    this.remoteUsers.removeAllRemoteUsers();

    // Reset highlighting colors.
    this.applicationRenderer.getOpenApplications().forEach((application) => {
      application.setHighlightingColor(
        this.configuration.applicationColors.highlightedEntityColor,
      );
    });

    this.localUser.disconnect();
  }

  /**
   * After succesfully connecting to the backend, create and spawn other users.
   */
  onSelfConnected({ self, users }: SelfConnectedMessage): void {
    // Create User model for all users and add them to the users map by
    // simulating the event of a user connecting.
    for (let i = 0; i < users.length; i++) {
      const userData = users[i];
      this.onUserConnected(
        {
          event: USER_CONNECTED_EVENT,
          id: userData.id,
          name: userData.name,
          color: userData.color,
          position: userData.position,
          quaternion: userData.quaternion,
        },
        false,
      );
      userData.controllers.forEach((controller) => {
        this.onUserControllerConnect({
          event: FORWARDED_EVENT,
          userId: userData.id,
          originalMessage: {
            event: USER_CONTROLLER_CONNECT_EVENT,
            controller,
          },
        });
      });
    }

    // Initialize local user.
    this.localUser.connected({
      id: self.id,
      name: self.name,
      color: new THREE.Color(...self.color),
    });

    // Send controllers.
    this.sendInitialControllerConnectState();
  }

  onUserConnected(
    {
      id, name, color, position, quaternion,
    }: UserConnectedMessage,
    showConnectMessage = true,
  ): void {
    const remoteUser = new RemoteVrUser({
      userName: name,
      userId: id,
      color: new THREE.Color(...color),
      state: 'online',
      localUser: this.localUser,
    });
    this.remoteUsers.addRemoteUser({ remoteUser, initialPose: { position, quaternion } });

    if (showConnectMessage) {
      this.messageMenuQueue.enqueueMenu(
        this.menuFactory.buildMessageBoxMenu({
          title: 'User connected',
          text: remoteUser.userName,
          color: `#${remoteUser.color.getHexString()}`,
          time: 3.0,
        }),
      );
    }
  }

  /**
   * Updates the specified user's camera and controller positions.
   */
  onUserPositions({
    userId,
    originalMessage: { camera, controller1, controller2 },
  }: ForwardedMessage<UserPositionsMessage>): void {
    const remoteUser = this.remoteUsers.lookupRemoteUserById(userId);
    if (!remoteUser) return;

    if (controller1) remoteUser.updateController(CONTROLLER_1_ID, controller1);
    if (controller2) remoteUser.updateController(CONTROLLER_2_ID, controller2);
    if (camera) remoteUser.updateCamera(camera);
  }

  /**
   * Updates whether the given user is pinging with the specified controller or not.
   */
  onPingUpdate({
    userId,
    originalMessage: { controllerId, isPinging },
  }: ForwardedMessage<PingUpdateMessage>): void {
    const remoteUser = this.remoteUsers.lookupRemoteUserById(userId);
    if (!remoteUser) return;

    remoteUser.togglePing(controllerId, isPinging);
  }

  onMousePingUpdate() { }

  onTimestampUpdate({
    originalMessage: { timestamp },
  }: ForwardedMessage<TimestampUpdateMessage>): void {
    this.roomSerializer.preserveRoom(
      () => this.timestampService.updateTimestampLocally(timestamp),
      {
        restoreLandscapeData: false,
      },
    );
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
    const remoteUser = this.remoteUsers.lookupRemoteUserById(userId);
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
    const remoteUser = this.remoteUsers.lookupRemoteUserById(userId);
    if (!remoteUser) return;

    remoteUser.removeController(controllerId);
  }

  /**
   * Removes the user that disconnected and informs our user about it.
   *
   * @param {JSON} data - Contains the id of the user that disconnected.
   */
  onUserDisconnect({ id }: UserDisconnectedMessage) {
    // Remove user and show disconnect notification.
    // TODO this should be triggered by event, the session handles most of the disconnect
    const removedUser = this.remoteUsers.removeRemoteUserById(id);
    if (removedUser) {
      this.messageMenuQueue.enqueueMenu(
        this.menuFactory.buildMessageBoxMenu({
          title: 'User disconnected',
          text: removedUser.userName,
          color: `#${removedUser.color.getHexString()}`,
          time: 3.0,
        }),
      );
    }
  }

  async onInitialLandscape({
    landscape,
    openApps,
    detachedMenus,
  }: InitialLandscapeMessage): Promise<void> {
    this.roomSerializer.restoreRoom({ landscape, openApps, detachedMenus });
  }

  onAppOpened({
    originalMessage: {
      id, position, quaternion, scale,
    },
  }: ForwardedMessage<AppOpenedMessage>): void {
    const application = this.applicationRenderer.getApplicationInCurrentLandscapeById(
      id,
    );
    if (application) {
      this.applicationRenderer.addApplicationLocally(application, {
        position: new THREE.Vector3(...position),
        quaternion: new THREE.Quaternion(...quaternion),
        scale: new THREE.Vector3(...scale),
      });
    }
  }

  onAppClosed({
    originalMessage: { appId },
  }: ForwardedMessage<AppClosedMessage>): void {
    const application = this.applicationRenderer.getApplicationById(appId);
    if (application) this.applicationRenderer.removeApplicationLocally(application);
  }

  onObjectMoved({
    originalMessage: {
      objectId, position, quaternion, scale,
    },
  }: ForwardedMessage<ObjectMovedMessage>): void {
    // Find moved object in the scene.
    const movedObject = findGrabbableObject(this.sceneService.scene, objectId);
    if (!movedObject) {
      this.debug('Could not find moved object', objectId);
      return;
    }

    movedObject.position.fromArray(position);
    movedObject.quaternion.fromArray(quaternion);
    movedObject.scale.fromArray(scale);
  }

  onComponentUpdate({
    originalMessage: { isFoundation, appId, componentId },
  }: ForwardedMessage<ComponentUpdateMessage>): void {
    const applicationObject3D = this.applicationRenderer.getApplicationById(
      appId,
    );
    if (!applicationObject3D) return;

    const componentMesh = applicationObject3D.getBoxMeshbyModelId(componentId);

    if (isFoundation) {
      this.applicationRenderer.closeAllComponentsLocally(applicationObject3D);
    } else if (componentMesh instanceof ComponentMesh) {
      this.applicationRenderer.toggleComponentLocally(
        componentMesh,
        applicationObject3D,
      );
    }
  }

  onHighlightingUpdate({
    userId,
    originalMessage: {
      isHighlighted, appId, entityType, entityId,
    },
  }: ForwardedMessage<HighlightingUpdateMessage>): void {
    const application = this.applicationRenderer.getApplicationById(appId);
    if (!application) return;

    const user = this.remoteUsers.lookupRemoteUserById(userId);
    if (!user) return;

    if (isHighlighted) {
      this.highlightingService.hightlightComponentLocallyByTypeAndId(
        application,
        {
          entityType,
          entityId,
          color: user.color,
        },
      );
    } else {
      this.highlightingService.removeHighlightingLocally(application);
    }
  }

  /**
   * Updates the state of given user to spectating or connected.
   * Hides them if spectating.
   *
   * @param {string} userId - The user's id.
   * @param {boolean} isSpectating - True, if the user is now spectating, else false.
   */
  onSpectatingUpdate({
    userId,
    originalMessage: { isSpectating },
  }: ForwardedMessage<SpectatingUpdateMessage>): void {
    const remoteUser = this.remoteUsers.setRemoteUserSpectatingById(
      userId,
      isSpectating,
    );
    if (!remoteUser) return;

    const remoteUserHexColor = `#${remoteUser.color.getHexString()}`;
    if (isSpectating) {
      this.messageMenuQueue.enqueueMenu(
        this.menuFactory.buildMessageBoxMenu({
          title: remoteUser.userName,
          text: ' is now spectating',
          color: remoteUserHexColor,
          time: 3.0,
        }),
      );
    } else {
      this.messageMenuQueue.enqueueMenu(
        this.menuFactory.buildMessageBoxMenu({
          title: remoteUser.userName,
          text: ' stopped spectating',
          color: remoteUserHexColor,
          time: 3.0,
        }),
      );
    }
  }

  onMenuDetached({
    objectId,
    entityType,
    detachId,
    position,
    quaternion,
    scale,
  }: MenuDetachedForwardMessage) {
    const object = this.sceneService.findMeshByModelId(entityType, detachId);
    if (isEntityMesh(object)) {
      const menu = this.menuFactory.buildInfoMenu(object);
      menu.position.fromArray(position);
      menu.quaternion.fromArray(quaternion);
      menu.scale.fromArray(scale);
      this.detachedMenuGroups.addDetachedMenuLocally(menu, objectId);
    }
  }

  onDetachedMenuClosed({
    originalMessage: { menuId },
  }: ForwardedMessage<DetachedMenuClosedMessage>): void {
    this.detachedMenuGroups.removeDetachedMenuLocallyById(menuId);
  }

  // #endregion HANDLING MESSAGES
}
