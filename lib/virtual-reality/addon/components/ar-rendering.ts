import Component from '@glimmer/component';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import debugLogger from 'ember-debug-logger';
import THREE, { MathUtils } from 'three';
import { tracked } from '@glimmer/tracking';
import AlertifyHandler from 'explorviz-frontend/utils/alertify-handler';
import Configuration from 'explorviz-frontend/services/configuration';
import NodeMesh from 'explorviz-frontend/view-objects/3d/landscape/node-mesh';
import Interaction from 'explorviz-frontend/utils/interaction';
import ApplicationMesh from 'explorviz-frontend/view-objects/3d/landscape/application-mesh';
import {
  Class, Package, Application, Node,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import ClazzMesh from 'explorviz-frontend/view-objects/3d/application/clazz-mesh';
import ComponentMesh from 'explorviz-frontend/view-objects/3d/application/component-mesh';
import FoundationMesh from 'explorviz-frontend/view-objects/3d/application/foundation-mesh';
import LocalVrUser from 'explorviz-frontend/services/local-vr-user';
import CloseIcon from 'virtual-reality/utils/view-objects/vr/close-icon';
import ClazzCommunicationMesh from 'explorviz-frontend/view-objects/3d/application/clazz-communication-mesh';
import LabelMesh from 'explorviz-frontend/view-objects/3d/label-mesh';
import LogoMesh from 'explorviz-frontend/view-objects/3d/logo-mesh';
import DeltaTime from 'virtual-reality/services/delta-time';
import { LandscapeData } from 'explorviz-frontend/controllers/visualization';
import HammerInteraction from 'explorviz-frontend/utils/hammer-interaction';
import BaseMesh from 'explorviz-frontend/view-objects/3d/base-mesh';
import CommunicationArrowMesh from 'explorviz-frontend/view-objects/3d/application/communication-arrow-mesh';
import ArSettings from 'virtual-reality/services/ar-settings';
import VrApplicationRenderer from 'virtual-reality/services/vr-application-renderer';
import VrAssetRepository from 'virtual-reality/services/vr-asset-repo';
import TimestampRepository, { Timestamp } from 'explorviz-frontend/services/repos/timestamp-repository';
import VrTimestampService from 'virtual-reality/services/vr-timestamp';
import VrHighlightingService from 'virtual-reality/services/vr-highlighting';
import ArZoomHandler from 'virtual-reality/utils/ar-helpers/ar-zoom-handler';
import RemoteVrUserService from 'virtual-reality/services/remote-vr-users';
import VrSceneService from 'virtual-reality/services/vr-scene';
import VrLandscapeRenderer from 'virtual-reality/services/vr-landscape-renderer';
import VrMessageReceiver, { VrMessageListener } from 'virtual-reality/services/vr-message-receiver';
import { SelfConnectedMessage } from 'virtual-reality/utils/vr-message/receivable/self_connected';
import { UserConnectedMessage, USER_CONNECTED_EVENT } from 'virtual-reality/utils/vr-message/receivable/user_connected';
import RemoteVrUser from 'virtual-reality/utils/vr-multi-user/remote-vr-user';
import { ForwardedMessage } from 'virtual-reality/utils/vr-message/receivable/forwarded';
import { TimestampUpdateMessage } from 'virtual-reality/utils/vr-message/sendable/timetsamp_update';
import { UserDisconnectedMessage } from 'virtual-reality/utils/vr-message/receivable/user_disconnect';
import { InitialLandscapeMessage } from 'virtual-reality/utils/vr-message/receivable/landscape';
import { AppOpenedMessage } from 'virtual-reality/utils/vr-message/sendable/app_opened';
import { AppClosedMessage } from 'virtual-reality/utils/vr-message/sendable/request/app_closed';
import { ComponentUpdateMessage } from 'virtual-reality/utils/vr-message/sendable/component_update';
import { HighlightingUpdateMessage } from 'virtual-reality/utils/vr-message/sendable/highlighting_update';
import WebSocketService from 'virtual-reality/services/web-socket';
import VrMessageSender from 'virtual-reality/services/vr-message-sender';
import * as VrPoses from 'virtual-reality/utils/vr-helpers/vr-poses';
import LandscapeObject3D from 'explorviz-frontend/view-objects/3d/landscape/landscape-object-3d';
import HeatmapConfiguration, { Metric } from 'heatmap/services/heatmap-configuration';
import applySimpleHeatOnFoundation, { addHeatmapHelperLine, computeHeatMapViewPos, removeHeatmapHelperLines } from 'heatmap/utils/heatmap-helper';
import { simpleHeatmap } from 'heatmap/utils/simple-heatmap';
import { updateHighlighting } from 'explorviz-frontend/utils/application-rendering/highlighting';
import { perform } from 'ember-concurrency-ts';
import { MousePingUpdateMessage } from 'virtual-reality/utils/vr-message/sendable/mouse-ping-update';
import ClazzCommuMeshDataModel from 'explorviz-frontend/view-objects/3d/application/utils/clazz-communication-mesh-data-model';
import VrRoomSerializer from '../services/vr-room-serializer';

interface Args {
  readonly landscapeData: LandscapeData;
  readonly font: THREE.Font;
  readonly components: string[];
  readonly showDataSelection: boolean;
  readonly selectedTimestampRecords: Timestamp[];
  openLandscapeView(): void
  addComponent(componentPath: string): void; // is passed down to the viz navbar
  removeComponent(component: string): void;
  openDataSelection(): void;
  closeDataSelection(): void;
}

type DataModel = Node | Application | Package | Class | ClazzCommuMeshDataModel;

type PopupData = {
  id: number,
  posX: number,
  posY: number,
  isPinned: boolean,
  entity: DataModel
};

declare const THREEx: any;

export default class ArRendering extends Component<Args> implements VrMessageListener {
  // #region CLASS FIELDS AND GETTERS

  @service('configuration')
  configuration!: Configuration;

  @service('local-vr-user')
  localUser!: LocalVrUser;

  @service('delta-time')
  deltaTimeService!: DeltaTime;

  @service('heatmap-configuration')
  heatmapConf!: HeatmapConfiguration;

  @service('vr-highlighting')
  private highlightingService!: VrHighlightingService;

  @service('ar-settings')
  arSettings!: ArSettings;

  @service('vr-message-sender')
  private sender!: VrMessageSender;

  @service('remote-vr-users')
  private remoteUsers!: RemoteVrUserService;

  @service('repos/timestamp-repository')
  private timestampRepo!: TimestampRepository;

  @service('vr-landscape-renderer')
  private vrLandscapeRenderer!: VrLandscapeRenderer;

  @service('vr-message-receiver')
  private receiver!: VrMessageReceiver;

  @service('vr-scene')
  private sceneService!: VrSceneService;

  @service('vr-timestamp')
  private timestampService!: VrTimestampService;

  @service('vr-application-renderer')
  private vrApplicationRenderer!: VrApplicationRenderer;

  @service('vr-asset-repo')
  private assetRepo!: VrAssetRepository;

  @service('vr-room-serializer')
  private roomSerializer!: VrRoomSerializer;

  @service('web-socket')
  private webSocket!: WebSocketService;

  @service()
  worker!: any;

  debug = debugLogger('ArRendering');

  @tracked
  // Used to register (mouse) events
  interaction!: Interaction;

  outerDiv!: HTMLElement;

  canvas!: HTMLCanvasElement;

  @tracked
  arZoomHandler: ArZoomHandler | undefined;

  arToolkitSource: any;

  arToolkitContext: any;

  landscapeMarker = new THREE.Group();

  applicationMarkers: THREE.Group[] = [];

  private willDestroyController: AbortController = new AbortController();

  pinchedObj: THREE.Object3D | ApplicationObject3D | null = null;

  rotatedObj: THREE.Object3D | null | undefined;

  pannedObject: THREE.Object3D | null | undefined;

  rendererResolutionMultiplier = 2;

  @tracked
  popupDataMap: Map<number, PopupData> = new Map();

  lastPopupClear = 0;

  lastOpenAllComponents = 0;

  @tracked
  hammerInteraction: HammerInteraction;

  @tracked
  showSettings = false;

  localPing: { obj: THREE.Object3D, time: number } | undefined | null;

  get rightClickMenuItems() {
    return [
      { title: 'Leave AR View', action: this.args.openLandscapeView },
      { title: 'Remove Popups', action: this.removeAllPopups },
      { title: 'Reset View', action: this.resetView },
      { title: this.arSettings.renderCommunication ? 'Hide Communication' : 'Add Communication', action: this.toggleCommunication },
      { title: 'Close all Applications', action: this.removeAllApplications },
    ];
  }

  // #endregion CLASS FIELDS AND GETTERS

  constructor(owner: any, args: Args) {
    super(owner, args);
    this.debug('Constructor called');

    this.vrLandscapeRenderer.setLargestSide(2);

    this.hammerInteraction = HammerInteraction.create();

    AlertifyHandler.setAlertifyPosition('bottom-center');
    document.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  // #region COMPONENT AND SCENE INITIALIZATION

  /**
     * Calls all three related init functions and adds the three
     * performance panel if it is activated in user settings
     */
  private initRendering() {
    this.initServices();
    this.initRenderer();
    this.initCamera();
    this.configureScene();
    this.initArJs();
    this.initCameraCrosshair();
    this.initHammerJS();
    this.initInteraction();
    this.initWebSocket();
  }

  updateArToolkit() {
    // update artoolkit on every frame
    if (this.arToolkitSource.ready !== false) {
      this.arToolkitContext.update(this.arToolkitSource.domElement);
    }
  }

  private initServices() {
    this.debug('Initializing services...');

    // Use given font for landscape and application rendering.
    this.assetRepo.font = this.args.font;
    this.remoteUsers.displayHmd = false;

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
      AlertifyHandler.showAlertifyWarning('No landscape found!');
    }
  }

  /**
     * Creates a PerspectiveCamera according to canvas size and sets its initial position
     */
  private initCamera() {
    // Set camera properties
    this.localUser.defaultCamera = new THREE.PerspectiveCamera();
    this.sceneService.scene.add(this.localUser.defaultCamera);

    this.arZoomHandler = new ArZoomHandler(this.localUser.defaultCamera, this.outerDiv,
      this.arSettings);
  }

  private initCameraCrosshair() {
    const geometry = new THREE.RingGeometry(0.0001, 0.0003, 30);
    const material = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const crosshairMesh = new THREE.Mesh(geometry, material);

    this.localUser.defaultCamera.add(crosshairMesh);
    // Position just in front of camera
    crosshairMesh.position.z = -0.1;
  }

  private initHammerJS() {
    this.hammerInteraction.setupHammer(this.canvas, 500);

    this.hammerInteraction.on('pinchstart', () => {
      const intersection = this.interaction.raycastCanvasCenter();
      const pinchObject = intersection?.object?.parent;

      if (pinchObject instanceof LandscapeObject3D || pinchObject instanceof ApplicationObject3D) {
        this.pinchedObj = pinchObject;
      }
    });

    this.hammerInteraction.on('pinch', (deltaScaleInPercent: number) => {
      if (!this.pinchedObj) return;

      this.pinchedObj.scale.copy(this.pinchedObj.scale.multiplyScalar(1 + deltaScaleInPercent));
    });

    this.hammerInteraction.on('pinchend', () => {
      this.pinchedObj = null;
    });

    this.hammerInteraction.on('rotatestart', () => {
      const intersection = this.interaction.raycastCanvasCenter();
      this.rotatedObj = intersection?.object?.parent;
    });

    this.hammerInteraction.on('rotate', (deltaRotation: number) => {
      if (this.rotatedObj instanceof LandscapeObject3D) {
        this.rotatedObj.rotation.z += deltaRotation * MathUtils.DEG2RAD;
      } else if (this.rotatedObj instanceof ApplicationObject3D) {
        this.rotatedObj.rotation.y += deltaRotation * MathUtils.DEG2RAD;
      }
    });

    this.hammerInteraction.on('rotateend', () => {
      this.rotatedObj = null;
    });

    this.hammerInteraction.on('panstart', () => {
      const intersection = this.interaction.raycastCanvasCenter();
      this.pannedObject = intersection?.object?.parent;
    });

    this.hammerInteraction.on('panning', (delta: { x: number, y: number }) => {
      if (!(this.pannedObject instanceof LandscapeObject3D)
      && !(this.pannedObject instanceof ApplicationObject3D)) {
        return;
      }

      const deltaVector = new THREE.Vector3(delta.x, 0, delta.y);
      deltaVector.multiplyScalar(0.0025);

      deltaVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.pannedObject.parent!.rotation.z);

      this.pannedObject.position.add(deltaVector);
    });
  }

  /**
  * Initiates a WebGLRenderer
  */
  private initRenderer() {
    this.localUser.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      canvas: this.canvas,
    });

    this.localUser.renderer.setClearColor(new THREE.Color('lightgrey'), 0);
    this.localUser.renderer.setSize(this.outerDiv.clientWidth, this.outerDiv.clientHeight);
  }

  /**
   * Binds this context to all event handling functions and
   * passes them to a newly created Interaction object
   */
  private initInteraction() {
    this.interaction = new Interaction(this.canvas, this.localUser.defaultCamera,
      this.localUser.renderer,
      this.getIntersectableObjects(), {}, ArRendering.raycastFilter);

    // Add key listener for room positioning
    window.onkeydown = (event: any) => {
      this.handleKeyboard(event);
    };
  }

  private configureScene() {
    this.sceneService.setSceneTransparent();
    this.sceneService.removeSkylight();
  }

  private async initWebSocket() {
    this.debug('Initializing websocket...');

    this.webSocket.socketCloseCallback = () => this.onSelfDisconnected();
    this.receiver.addMessageListener(this);
  }

  private getIntersectableObjects() {
    return [this.vrLandscapeRenderer.landscapeObject3D, ...this.applicationMarkers];
  }

  static raycastFilter(intersection: THREE.Intersection) {
    return !(intersection.object instanceof LabelMesh || intersection.object instanceof LogoMesh);
  }

  @action
  initArJs(width = 640, height = 480, isSpectating = false) {
    this.initArJsCamera(width, height, isSpectating);

    // handle resize event
    window.addEventListener('resize', () => {
      this.resize(this.outerDiv);
    });

    /// /////////////////////////////////////////////////////////
    // setup arToolkitContext
    /// /////////////////////////////////////////////////////////

    this.landscapeMarker.add(this.vrLandscapeRenderer.landscapeObject3D);
    this.sceneService.scene.add(this.landscapeMarker);

    // Init controls for camera
    // eslint-disable-next-line
    new THREEx.ArMarkerControls(this.arToolkitContext, this.landscapeMarker, {
      type: 'pattern',
      patternUrl: 'ar_data/marker_patterns/pattern-angular_L_thick.patt',
    });

    const applicationMarkerNames = ['pattern-angular_1', 'pattern-angular_2', 'pattern-angular_3', 'pattern-angular_4', 'pattern-angular_5'];

    for (let i = 0; i < applicationMarkerNames.length; i++) {
      let applicationMarker: THREE.Group;

      if (this.applicationMarkers.length <= i) {
        applicationMarker = new THREE.Group();
        this.sceneService.scene.add(applicationMarker);
        this.applicationMarkers = [...this.applicationMarkers, applicationMarker];
      } else {
        applicationMarker = this.applicationMarkers[i];
      }

      // Init controls for camera
      // eslint-disable-next-line
      new THREEx.ArMarkerControls(this.arToolkitContext, applicationMarker, {
        type: 'pattern',
        patternUrl: `ar_data/marker_patterns/${applicationMarkerNames[i]}.patt`,
      });
    }
  }

  private initArJsCamera(width = 640, height = 480, isSpectating = false) {
    ArRendering.cleanUpAr();

    if (isSpectating) {
      this.arToolkitSource = new THREEx.ArToolkitSource({
        sourceType: 'image',
        sourceUrl: 'ar_data/marker_images/marker_overview.png',
        sourceWidth: width,
        sourceHeight: height,
      });
    } else {
      this.arToolkitSource = new THREEx.ArToolkitSource({
        sourceType: 'webcam',
        sourceWidth: width,
        sourceHeight: height,
      });
    }

    this.arToolkitSource.init(() => {
      setTimeout(() => {
        this.resize(this.outerDiv);
      }, 1000);
    });

    let cameraParametersUrl: string;
    const aspectRatio = width / height;
    if (aspectRatio > 1.5) {
      cameraParametersUrl = 'ar_data/camera_configurations/camera_para_1280_720.dat';
    } else {
      cameraParametersUrl = 'ar_data/camera_configurations/camera_para_640_480.dat';
    }

    // create atToolkitContext
    this.arToolkitContext = new THREEx.ArToolkitContext({
      cameraParametersUrl,
      detectionMode: 'mono',
    });

    // copy projection matrix to camera when initialization complete
    this.arToolkitContext.init(() => {
      this.localUser.defaultCamera.projectionMatrix.copy(
        this.arToolkitContext.getProjectionMatrix(),
      );
      // The properties in the following section need to be set manually since otherwise
      // text would be flickering
      this.localUser.defaultCamera.aspect = width / height;

      if (aspectRatio > 1.5) {
        this.localUser.defaultCamera.fov = 34.25;
      } else {
        this.localUser.defaultCamera.fov = 44;
      }
      this.localUser.defaultCamera.updateProjectionMatrix();
    });
  }
  // #endregion COMPONENT AND SCENE INITIALIZATION

  // #region ACTIONS

  @action
  async outerDivInserted(outerDiv: HTMLElement) {
    this.debug('Outer Div inserted');

    this.outerDiv = outerDiv;

    this.initRendering();

    this.resize(outerDiv);

    // Initiate rendering
    this.animate = this.animate.bind(this);
    this.animate();
  }

  @action
  canvasInserted(canvas: HTMLCanvasElement) {
    this.debug('Canvas inserted');

    this.canvas = canvas;

    canvas.oncontextmenu = (e) => {
      e.preventDefault();
    };
  }

  /**
     * Call this whenever the canvas is resized. Updated properties of camera
     * and renderer.
     *
     * @param outerDiv HTML element containing the canvas
     */
  @action
  resize(outerDiv: HTMLElement) {
    this.localUser.renderer.setSize(
      outerDiv.clientWidth * this.rendererResolutionMultiplier,
      outerDiv.clientHeight * this.rendererResolutionMultiplier,
    );
    if (!this.arToolkitContext) return;

    this.arToolkitSource.onResizeElement();
    this.arToolkitSource.copyElementSizeTo(this.localUser.renderer.domElement);

    if (this.arToolkitContext.arController !== null) {
      this.arToolkitSource.copyElementSizeTo(this.arToolkitContext.arController.canvas);
    }
  }

  @action
  resetView() {
    this.vrLandscapeRenderer.setLargestSide(2);
    this.vrLandscapeRenderer.landscapeObject3D.position.set(0, 0, 0);
    this.vrLandscapeRenderer.resetRotation();

    this.vrApplicationRenderer.getOpenApplications().forEach((application) => {
      application.position.set(0, 0, 0);
      application.setLargestSide(1.5);
      application.setRotationFromAxisAngle(new THREE.Vector3(0, 1, 0),
        90 * THREE.MathUtils.DEG2RAD);
    });
  }

  @action
  removeAllApplications() {
    this.vrApplicationRenderer.removeAllApplications();
  }

  @action
  toggleCommunication() {
    const oldValue = this.arSettings.renderCommunication;
    this.arSettings.renderCommunication = !oldValue;

    this.vrApplicationRenderer.updateCommunication();
  }

  @action
  updateRendererResolution(resolutionMultiplier: number) {
    this.rendererResolutionMultiplier = resolutionMultiplier;
    this.resize(this.outerDiv);
  }

  @action
  updateMetric(metric: Metric) {
    this.heatmapConf.set('selectedMetric', metric);
    this.heatmapConf.triggerMetricUpdate();

    this.applyHeatmap();
  }

  @action
  handlePrimaryCrosshairInteraction() {
    const intersection = this.interaction.raycastCanvasCenter();

    if (intersection) {
      this.handlePrimaryInputOn(intersection);
    }
  }

  @action
  handleSecondaryCrosshairInteraction() {
    const intersection = this.interaction.raycastCanvasCenter();

    if (intersection) {
      this.handleSecondaryInputOn(intersection);
    }
  }

  @action
  handleZoomToggle() {
    if (this.arZoomHandler?.zoomEnabled) {
      this.arZoomHandler?.disableZoom();
    } else {
      this.arZoomHandler?.enableZoom();
    }
  }

  @action
  async handleOpenAllComponents() {
    this.lastOpenAllComponents = Date.now();

    const intersection = this.interaction.raycastCanvasCenter();

    if (!(intersection?.object.parent instanceof ApplicationObject3D)) {
      return;
    }

    const applicationObject3D = intersection.object.parent;

    this.vrApplicationRenderer.openAllComponents(applicationObject3D);
  }

  @action
  async handlePing() {
    if (!this.localUser.isOnline) {
      AlertifyHandler.showAlertifyWarning('Offline. <br> Join session with users to ping.');
      return;
    } if (Array.from(this.remoteUsers.getAllRemoteUsers()).length === 0) {
      AlertifyHandler.showAlertifyWarning('You are alone in this room. <br> Wait for other users.');
      return;
    }

    const intersection = this.interaction.raycastCanvasCenter();

    if (!(intersection?.object.parent instanceof ApplicationObject3D)
    && !(intersection?.object.parent instanceof LandscapeObject3D)) {
      return;
    }

    const parentObj = intersection.object.parent;
    const pingPosition = parentObj.worldToLocal(intersection.point);

    if (parentObj instanceof ApplicationObject3D) {
      pingPosition.y += 1;
    } else {
      pingPosition.z += 0.1;
    }

    const color = this.localUser.color ? this.localUser.color
      : this.configuration.applicationColors.highlightedEntityColor;

    this.addPing(parentObj, pingPosition, color);

    if (this.localUser.isOnline) {
      if (parentObj instanceof ApplicationObject3D) {
        this.sender.sendMousePingUpdate(parentObj.dataModel.id, true, pingPosition);
      } else {
        this.sender.sendMousePingUpdate('landscape', false, pingPosition);
      }
    }
  }

  addPing(parentObj: THREE.Object3D, position: THREE.Vector3, color: THREE.Color) {
    if (this.localPing) {
      this.removeLocalPing();
    }

    let size = 2;

    if (parentObj instanceof LandscapeObject3D) {
      size = 0.2;
    }

    const geometry = new THREE.SphereGeometry(size, 32, 32);
    const material = new THREE.MeshBasicMaterial({ color });
    const sphere = new THREE.Mesh(geometry, material);

    sphere.position.copy(position);

    parentObj.add(sphere);

    this.localPing = { obj: sphere, time: Date.now() };
  }

  removeLocalPing() {
    if (this.localPing) {
      this.localPing.obj.parent?.remove(this.localPing.obj);
      this.localPing = null;
    }
  }

  updatePings() {
    const now = Date.now();
    if (this.localPing && now - this.localPing.time > 2000) {
      this.removeLocalPing();
    }

    Array.from(this.remoteUsers.getAllRemoteUsers()).forEach((user) => {
      user.updateMousePing();
    });
  }

  @action
  async handleHeatmapToggle() {
    const currentHeatmapAppId = this.heatmapConf.currentApplication?.id;
    this.removeHeatmap();

    const intersection = this.interaction.raycastCanvasCenter();

    if (intersection && intersection.object.parent instanceof ApplicationObject3D
      && currentHeatmapAppId !== intersection.object.parent.id) {
      const applicationObject3D = intersection.object.parent;
      perform(this.vrApplicationRenderer.calculateHeatmapTask, applicationObject3D, () => {
        this.applyHeatmap();
      });
    } else if (intersection && intersection.object.parent instanceof LandscapeObject3D) {
      AlertifyHandler.showAlertifyWarning('Heat Map only available for applications.');
    }
  }

  @action
  handleInfoInteraction() {
    // Do not add popup if user long pressed popup button to remove all popups
    if (Date.now() - this.lastPopupClear < 10) return;

    const intersection = this.interaction.raycastCanvasCenter();

    if (!intersection) {
      this.removeUnpinnedPopups();
      return;
    }

    const mesh = intersection.object;

    // Show information as popup is mouse stopped on top of a mesh
    if ((mesh instanceof NodeMesh || mesh instanceof ApplicationMesh
      || mesh instanceof ClazzMesh || mesh instanceof ComponentMesh
      || mesh instanceof ClazzCommunicationMesh)) {
      // Remove old popup to move it up front (stacking popups)
      if (this.arSettings.stackPopups) {
        this.popupDataMap.delete(mesh.id);
      }

      // Remove popup if it is already opened at default position
      if (this.popupDataMap.has(mesh.id) && !this.popupDataMap.get(mesh.id)?.isPinned
      && !this.arSettings.stackPopups) {
        this.removeUnpinnedPopups();
      } else {
        this.removeUnpinnedPopups();

        const popupData = {
          id: mesh.id,
          isPinned: false,
          posX: this.canvas.width / 2,
          posY: this.canvas.height / 2,
          entity: mesh.dataModel,
        };

        this.popupDataMap.set(mesh.id, popupData);
        this.popupDataMap = new Map(this.popupDataMap);
      }
    }
  }

  @action
  toggleSettingsPane() {
    this.args.openDataSelection();
  }

  @action
  updateColors() {
    this.sceneService.scene.traverse((object3D) => {
      if (object3D instanceof BaseMesh) {
        object3D.updateColor();
        // Special case because communication arrow is no base mesh
      } else if (object3D instanceof CommunicationArrowMesh) {
        object3D.updateColor(this.configuration.applicationColors.communicationArrowColor);
      }
    });
  }

  @action
  removeAllPopups() {
    this.lastPopupClear = Date.now();
    this.popupDataMap = new Map();
  }

  // #endregion ACTIONS

  // #region MOUSE & KEYBOARD EVENT HANDLER

  @action
  handleDoubleClick(intersection: THREE.Intersection | null) {
    if (!intersection) return;

    this.handlePrimaryInputOn(intersection);
  }

  @action
  handleSingleClick(intersection: THREE.Intersection | null) {
    if (!intersection) return;

    this.handleSecondaryInputOn(intersection);
  }

  @action
  handleMouseWheel(delta: number) {
    const intersection = this.interaction.raycastCanvasCenter();

    if (intersection && (
      intersection.object.parent instanceof ApplicationObject3D
      || intersection.object.parent instanceof LandscapeObject3D)) {
      const object = intersection.object.parent;

      // Scale hit object with respect to scroll direction and scroll distance
      object.scale.copy(object.scale.multiplyScalar(1 - (delta / 25)));
    }
  }

  handleKeyboard(event: any) {
    // Handle keys
    switch (event.key) {
      case 'c':
        this.initArJs(640, 480);
        break;
      case 's':
        this.initArJs(1540, 1080, true);
        break;
      /*
      case 'm':
        this.localUser.defaultCamera.aspect += 0.05;
        this.localUser.defaultCamera.updateProjectionMatrix();
        console.log('Aspect: ', this.localUser.defaultCamera.aspect);
        break;
      case 'n':
        this.localUser.defaultCamera.aspect -= 0.05;
        this.localUser.defaultCamera.updateProjectionMatrix();
        console.log('Aspect: ', this.localUser.defaultCamera.aspect);
        break;
      case 'k':
        this.localUser.defaultCamera.fov += 0.05;
        this.localUser.defaultCamera.updateProjectionMatrix();
        console.log('Fov: ', this.localUser.defaultCamera.fov);
        break;
      case 'j':
        this.localUser.defaultCamera.fov -= 0.05;
        this.localUser.defaultCamera.updateProjectionMatrix();
        console.log('Fov: ', this.localUser.defaultCamera.fov);
        break;
      */
      default:
        break;
    }
  }

  // #endregion MOUSE & KEYBOARD EVENT HANDLER

  // #region RENDERING

  /**
   * Sends a message if a given interval (in seconds) has passed to keep websocket alive
   */
  private sendKeepAliveMessage(interval = 1) {
    if (this.deltaTimeService.getCurrentDeltaTime() > interval) {
      this.deltaTimeService.update();

      // Send camera pose as dummy message
      const cameraPose = VrPoses.getCameraPose(this.localUser.defaultCamera);
      this.sender.sendPoseUpdate(cameraPose);
    }
  }

  render() {
    this.localUser.renderer.render(this.sceneService.scene, this.localUser.defaultCamera);

    this.arZoomHandler?.renderZoomCamera(this.localUser.renderer, this.sceneService.scene,
      this.resize);

    this.updatePings();
  }

  animate() {
    if (this.isDestroyed) {
      return;
    }

    requestAnimationFrame(this.animate);
    // Update time dependent services

    if (this.webSocket.isWebSocketOpen()) {
      this.sendKeepAliveMessage();
    }

    this.remoteUsers.updateRemoteUsers(this.deltaTimeService.getDeltaTime());

    this.updateArToolkit();

    this.render();
  }

  // #endregion RENDERING

  // #region APLICATION RENDERING

  @action
  addApplicationById(applicationId: string) {
    const application = this.vrApplicationRenderer.getApplicationInCurrentLandscapeById(
      applicationId,
    );

    if (application) {
      this.addApplication(application);
    }
  }

  async addApplication(applicationModel: Application) {
    if (applicationModel.packages.length === 0) {
      const message = `Sorry, there is no information for application <b>
        ${applicationModel.name}</b> available.`;

      AlertifyHandler.showAlertifyWarning(message);
    } else if (this.vrApplicationRenderer.isApplicationOpen(applicationModel.id)) {
      // ToDo: Add info about occupied marker
      AlertifyHandler.showAlertifyWarning('Application already opened.');
    } else {
      // data available => open application-rendering
      AlertifyHandler.closeAlertifyMessages();

      for (let i = 0; i < this.applicationMarkers.length; i++) {
        if (this.applicationMarkers[i].children.length === 0) {
          break;
        } else if (i === (this.applicationMarkers.length - 1)) {
          AlertifyHandler.showAlertifyWarning('All markers are occupied.');
          return;
        }
      }

      const applicationObject3D = await this.vrApplicationRenderer
        .addApplication(applicationModel, {});

      this.addLocalApplicationToMarker(applicationObject3D);
    }
  }

  addLocalApplicationToMarker(applicationObject3D: ApplicationObject3D) {
    // Set default scale such that application approximately fits on the printed marker
    applicationObject3D.setLargestSide(1.5);

    this.addApplicationToMarker(applicationObject3D);
  }

  addApplicationToMarker(applicationObject3D: ApplicationObject3D) {
    applicationObject3D.setRotationFromAxisAngle(new THREE.Vector3(0, 1, 0),
      90 * THREE.MathUtils.DEG2RAD);

    if (!applicationObject3D.highlightedEntity) {
      applicationObject3D.setOpacity(this.arSettings.applicationOpacity);
    }

    const applicationModel = applicationObject3D.dataModel;

    for (let i = 0; i < this.applicationMarkers.length; i++) {
      if (this.applicationMarkers[i].children.length === 0) {
        this.applicationMarkers[i].add(applicationObject3D);

        const message = `Application '${applicationModel.name}' successfully opened <br>
          on marker #${i + 1}.`;

        AlertifyHandler.showAlertifySuccess(message);

        break;
      }
    }
  }

  // #endregion APPLICATION RENDERING

  // #region HEATMAP

  @action
  applyHeatmap() {
    const applicationObject3D = this.heatmapConf.currentApplication;

    if (!this.heatmapConf.latestClazzMetricScores
      || !this.heatmapConf.latestClazzMetricScores.firstObject || !applicationObject3D) {
      AlertifyHandler.showAlertifyError('No metrics available.');
      return;
    }

    // Selected first metric if none is selected yet
    if (!this.heatmapConf.selectedMetric) {
      this.heatmapConf.selectedMetric = this.heatmapConf.latestClazzMetricScores.firstObject;
    }

    const { selectedMetric } = this.heatmapConf;

    // Avoid unwanted reflections in heatmap mode
    this.sceneService.setAuxiliaryLightVisibility(false);

    applicationObject3D.setComponentMeshOpacity(0.1);
    applicationObject3D.setCommunicationOpacity(0.1);

    const foundationMesh = applicationObject3D
      .getBoxMeshbyModelId(applicationObject3D.dataModel.id);

    if (!(foundationMesh instanceof FoundationMesh)) {
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = foundationMesh.width;
    canvas.height = foundationMesh.depth;
    const simpleHeatMap = simpleHeatmap(selectedMetric.max, canvas,
      this.heatmapConf.getSimpleHeatGradient(),
      this.heatmapConf.heatmapRadius, this.heatmapConf.blurRadius);

    const foundationWorldPosition = new THREE.Vector3();

    foundationMesh.getWorldPosition(foundationWorldPosition);

    removeHeatmapHelperLines(applicationObject3D);

    const boxMeshes = applicationObject3D.getBoxMeshes();

    boxMeshes.forEach((boxMesh) => {
      if (boxMesh instanceof ClazzMesh) {
        this.heatmapClazzUpdate(applicationObject3D, boxMesh.dataModel, foundationMesh,
          simpleHeatMap);
      }
    });

    simpleHeatMap.draw(0.0);
    applySimpleHeatOnFoundation(foundationMesh, canvas);

    this.heatmapConf.heatmapActive = true;
    this.heatmapConf.currentApplication = applicationObject3D;
  }

  removeHeatmap() {
    const applicationObject3D = this.heatmapConf.currentApplication;
    if (!applicationObject3D) return;

    removeHeatmapHelperLines(applicationObject3D);

    const foundationMesh = applicationObject3D
      .getBoxMeshbyModelId(applicationObject3D.dataModel.id);

    if (foundationMesh && foundationMesh instanceof FoundationMesh) {
      foundationMesh.setDefaultMaterial();
    }

    const comms = this.vrApplicationRenderer.drawableClassCommunications
      .get(applicationObject3D.dataModel.id);
    if (comms) {
      updateHighlighting(applicationObject3D, comms, 1);
    }

    this.heatmapConf.heatmapActive = false;
    this.heatmapConf.currentApplication = null;

    applicationObject3D.setOpacity(this.arSettings.applicationOpacity);

    this.sceneService.addSpotlight();
  }

  heatmapClazzUpdate(applicationObject3D: ApplicationObject3D,
    clazz: Class, foundationMesh: FoundationMesh, simpleHeatMap: any) {
    // Calculate center point of the clazz floor. This is used for computing the corresponding
    // face on the foundation box.
    const clazzMesh = applicationObject3D.getBoxMeshbyModelId(clazz.id) as
          ClazzMesh | undefined;

    if (!clazzMesh || !this.heatmapConf.selectedMetric) {
      return;
    }

    const heatmapValues = this.heatmapConf.selectedMetric.values;
    const heatmapValue = heatmapValues.get(clazz.id);

    if (!heatmapValue) return;

    const raycaster = new THREE.Raycaster();
    const { selectedMode } = this.heatmapConf;

    const clazzPos = clazzMesh.position.clone();
    const viewPos = computeHeatMapViewPos(foundationMesh, this.localUser.defaultCamera);

    clazzPos.y -= clazzMesh.height / 2;

    applicationObject3D.localToWorld(clazzPos);

    // The vector from the viewPos to the clazz floor center point
    const rayVector = clazzPos.clone().sub(viewPos);

    // Following the ray vector from the floor center get the intersection with the foundation.
    raycaster.set(clazzPos, rayVector.normalize());

    const firstIntersection = raycaster.intersectObject(foundationMesh, false)[0];

    const worldIntersectionPoint = firstIntersection.point.clone();
    applicationObject3D.worldToLocal(worldIntersectionPoint);

    if (this.heatmapConf.useHelperLines) {
      addHeatmapHelperLine(applicationObject3D, clazzPos, worldIntersectionPoint);
    }

    // Compute color only for the first intersection point for consistency if one was found.
    if (firstIntersection && firstIntersection.uv) {
      const xPos = firstIntersection.uv.x * foundationMesh.width;
      const zPos = (1 - firstIntersection.uv.y) * foundationMesh.depth;
      if (selectedMode === 'aggregatedHeatmap') {
        simpleHeatMap.add([xPos, zPos, heatmapValues.get(clazz.id)]);
      } else {
        simpleHeatMap.add([xPos, zPos,
          heatmapValue + (this.heatmapConf.largestValue / 2)]);
      }
    }
  }

  // #endregion HEATMAP

  // #region UTILS

  private handlePrimaryInputOn(intersection: THREE.Intersection) {
    const self = this;
    const { object } = intersection;

    function handleApplicationObject(appObject: THREE.Object3D) {
      if (!(appObject.parent instanceof ApplicationObject3D)
      || Date.now() - self.lastOpenAllComponents < 20) return;

      if (appObject instanceof ComponentMesh) {
        self.vrApplicationRenderer.toggleComponent(
          appObject,
          appObject.parent,
        );
      } else if (appObject instanceof CloseIcon) {
        appObject.close().then((closedSuccessfully: boolean) => {
          if (appObject.parent === self.heatmapConf.currentApplication) {
            self.removeHeatmap();
          }
          if (!closedSuccessfully) AlertifyHandler.showAlertifyError('Application could not be closed');
        });
      } else if (appObject instanceof FoundationMesh) {
        self.vrApplicationRenderer.closeAllComponents(appObject.parent);
      }

      if (self.heatmapConf.heatmapActive) {
        appObject.parent.setComponentMeshOpacity(0.1);
        appObject.parent.setCommunicationOpacity(0.1);
      }
    }

    if (object instanceof ApplicationMesh) {
      this.addApplication(object.dataModel);
    // Handle application hits
    } else if (object.parent instanceof ApplicationObject3D) {
      handleApplicationObject(object);
    }
  }

  private handleSecondaryInputOn(intersection: THREE.Intersection) {
    const { object } = intersection;
    if (object.parent instanceof ApplicationObject3D) {
      this.highlightingService.highlightComponent(
        object.parent,
        object,
      );

      if (this.heatmapConf.heatmapActive) {
        object.parent.setComponentMeshOpacity(0.1);
        object.parent.setCommunicationOpacity(0.1);
      }
    }
  }

  static cleanUpAr() {
    // Remove video and stop corresponding stream
    const arJsVideo = document.getElementById('arjs-video');

    if (arJsVideo instanceof HTMLVideoElement) {
      document.body.removeChild(arJsVideo);

      const stream = arJsVideo.srcObject;

      if (stream instanceof MediaStream) {
        const tracks = stream.getTracks();

        tracks.forEach((track) => {
          track.stop();
        });
      }
    } else if (arJsVideo instanceof HTMLImageElement) {
      document.body.removeChild(arJsVideo);
    }
  }

  removeUnpinnedPopups() {
    this.popupDataMap.forEach((value, key) => {
      if (!value.isPinned) {
        this.popupDataMap.delete(key);
      }
    });

    this.popupDataMap = new Map(this.popupDataMap);
  }

  @action
  keepPopupOpen(id: number) {
    const popupData = this.popupDataMap.get(id);
    if (popupData) {
      popupData.isPinned = true;
    }
  }

  @action
  setPopupPosition(id: number, posX: number, posY: number) {
    const popupData = this.popupDataMap.get(id);
    if (popupData) {
      popupData.posX = posX;
      popupData.posY = posY;
    }
  }

  @action
  closePopup(id: number) {
    this.popupDataMap.delete(id);
    this.popupDataMap = new Map(this.popupDataMap);
  }

  willDestroy() {
    // Reset services.
    this.localUser.reset();
    this.vrLandscapeRenderer.resetService();
    this.vrApplicationRenderer.removeAllApplicationsLocally();
    this.sceneService.addSkylight();

    // Remove event listers.
    this.receiver.removeMessageListener(this);
    this.willDestroyController.abort();

    // Reset AR and position of alerts
    ArRendering.cleanUpAr();
    AlertifyHandler.setAlertifyPosition('bottom-right');
  }

  // #endregion UTILS

  // #region HANDLING MESSAGES

  onSelfDisconnected(event?: any) {
    if (this.localUser.isConnecting) {
      AlertifyHandler.showAlertifyMessage('AR backend service not responding');
    } else if (event) {
      switch (event.code) {
        case 1000: // Normal Closure
          AlertifyHandler.showAlertifyMessage('Successfully disconnected');
          break;
        case 1006: // Abnormal closure
          AlertifyHandler.showAlertifyMessage('AR backend service closed abnormally');
          break;
        default:
          AlertifyHandler.showAlertifyMessage('Unexpected disconnect');
      }
    }

    // Remove remote users.
    this.remoteUsers.removeAllRemoteUsers();

    // Reset highlighting colors.
    this.vrApplicationRenderer.getOpenApplications().forEach((application) => {
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
    }

    // Initialize local user.
    this.localUser.connected({
      id: self.id,
      name: self.name,
      color: new THREE.Color(...self.color),
    });
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
    this.remoteUsers.addRemoteUser(remoteUser, { position, quaternion });

    if (showConnectMessage) {
      AlertifyHandler.showAlertifySuccess(`User ${remoteUser.userName} connected.`);
    }
  }

  /**
   * Updates the specified user's camera and controller positions.
   */
  onUserPositions() {}

  /**
   * Updates whether the given user is pinging with the specified controller or not.
   */
  onPingUpdate() {}

  onMousePingUpdate({
    userId,
    originalMessage: { modelId, isApplication, position },
  }: ForwardedMessage<MousePingUpdateMessage>): void {
    const remoteUser = this.remoteUsers.lookupRemoteUserById(userId);
    if (!remoteUser) return;

    const applicationObj = this.vrApplicationRenderer.getApplicationById(modelId);

    if (applicationObj && isApplication) {
      remoteUser.addMousePing(applicationObj, new THREE.Vector3().fromArray(position));
    } else {
      remoteUser.addMousePing(this.vrLandscapeRenderer.landscapeObject3D,
        new THREE.Vector3().fromArray(position));
    }
  }

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

  onUserControllerConnect() {}

  onUserControllerDisconnect() {}

  /**
   * Removes the user that disconnected and informs our user about it.
   *
   * @param {JSON} data - Contains the id of the user that disconnected.
   */
  onUserDisconnect({ id }: UserDisconnectedMessage) {
    // Remove user and show disconnect notification.
    const removedUser = this.remoteUsers.removeRemoteUserById(id);
    if (removedUser) {
      AlertifyHandler.showAlertifyError(`User ${removedUser.userName} disconnected.`);
    }
  }

  async onInitialLandscape({
    landscape,
    openApps,
    detachedMenus,
  }: InitialLandscapeMessage): Promise<void> {
    await this.roomSerializer.restoreRoom({ landscape, openApps, detachedMenus });

    this.landscapeMarker.add(this.vrLandscapeRenderer.landscapeObject3D);
    this.arSettings.updateLandscapeOpacity();

    this.vrApplicationRenderer.getOpenApplications().forEach((applicationObject3D) => {
      this.addApplicationToMarker(applicationObject3D);
    });
  }

  async onAppOpened({
    originalMessage: {
      id, position, quaternion, scale,
    },
  }: ForwardedMessage<AppOpenedMessage>): Promise<void> {
    const application = this.vrApplicationRenderer.getApplicationInCurrentLandscapeById(
      id,
    );
    if (application) {
      const applicationObject3D = await
      this.vrApplicationRenderer.addApplicationLocally(application, {
        position: new THREE.Vector3(...position),
        quaternion: new THREE.Quaternion(...quaternion),
        scale: new THREE.Vector3(...scale),
      });

      this.addApplicationToMarker(applicationObject3D);
    }
  }

  onAppClosed({
    originalMessage: { appId },
  }: ForwardedMessage<AppClosedMessage>): void {
    const application = this.vrApplicationRenderer.getApplicationById(appId);
    if (application) {
      AlertifyHandler.showAlertifyWarning(`Application '${application.dataModel.name}' closed.`);
      this.vrApplicationRenderer.removeApplicationLocally(application);
    }
  }

  onObjectMoved(): void { }

  onComponentUpdate({
    originalMessage: {
      isFoundation, appId, isOpened, componentId,
    },
  }: ForwardedMessage<ComponentUpdateMessage>): void {
    const applicationObject3D = this.vrApplicationRenderer.getApplicationById(
      appId,
    );
    if (!applicationObject3D) return;

    const componentMesh = applicationObject3D.getBoxMeshbyModelId(componentId);

    if (isFoundation) {
      if (isOpened) {
        this.vrApplicationRenderer.openAllComponentsLocally(applicationObject3D);
      } else {
        this.vrApplicationRenderer.closeAllComponentsLocally(applicationObject3D);
      }
    } else if (componentMesh instanceof ComponentMesh) {
      this.vrApplicationRenderer.toggleComponentLocally(
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
    const application = this.vrApplicationRenderer.getApplicationById(appId);
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

  onSpectatingUpdate() {}

  onMenuDetached() { }

  onDetachedMenuClosed() { }

  // #endregion HANDLING MESSAGES
}
