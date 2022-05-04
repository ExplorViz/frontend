import { getOwner } from '@ember/application';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import CollaborationSession from 'collaborative-mode/services/collaboration-session';
import LocalUser from 'collaborative-mode/services/local-user';
import { perform, taskFor } from 'ember-concurrency-ts';
import debugLogger from 'ember-debug-logger';
import { LandscapeData } from 'explorviz-frontend/controllers/visualization';
import RenderingLoop from 'explorviz-frontend/rendering/application/rendering-loop';
import ApplicationRenderer, { AddApplicationArgs } from 'explorviz-frontend/services/application-renderer';
import Configuration from 'explorviz-frontend/services/configuration';
import EntityManipulation from 'explorviz-frontend/services/entity-manipulation';
import HighlightingService from 'explorviz-frontend/services/highlighting-service';
import LandscapeRenderer, { LandscapeRendererSettings } from 'explorviz-frontend/services/landscape-renderer';
import { Timestamp } from 'explorviz-frontend/services/repos/timestamp-repository';
import ToastMessage from 'explorviz-frontend/services/toast-message';
import AlertifyHandler from 'explorviz-frontend/utils/alertify-handler';
import { addSpheres } from 'explorviz-frontend/utils/application-rendering/spheres';
import {
  Application, Class, Node, Package,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import { light, spotlight } from 'explorviz-frontend/utils/lights';
import Raycaster from 'explorviz-frontend/utils/raycaster';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import ClazzCommunicationMesh from 'explorviz-frontend/view-objects/3d/application/clazz-communication-mesh';
import ClazzMesh from 'explorviz-frontend/view-objects/3d/application/clazz-mesh';
import ComponentMesh from 'explorviz-frontend/view-objects/3d/application/component-mesh';
import FoundationMesh from 'explorviz-frontend/view-objects/3d/application/foundation-mesh';
import ClazzCommuMeshDataModel from 'explorviz-frontend/view-objects/3d/application/utils/clazz-communication-mesh-data-model';
import LabelMesh from 'explorviz-frontend/view-objects/3d/label-mesh';
import ApplicationMesh from 'explorviz-frontend/view-objects/3d/landscape/application-mesh';
import LandscapeObject3D from 'explorviz-frontend/view-objects/3d/landscape/landscape-object-3d';
import NodeMesh from 'explorviz-frontend/view-objects/3d/landscape/node-mesh';
import LogoMesh from 'explorviz-frontend/view-objects/3d/logo-mesh';
import HeatmapConfiguration from 'heatmap/services/heatmap-configuration';
import THREE from 'three';
import ArSettings from 'virtual-reality/services/ar-settings';
import DeltaTime from 'virtual-reality/services/delta-time';
import VrMessageSender from 'virtual-reality/services/vr-message-sender';
import WebSocketService from 'virtual-reality/services/web-socket';
import ArZoomHandler from 'virtual-reality/utils/ar-helpers/ar-zoom-handler';
import CloseIcon from 'virtual-reality/utils/view-objects/vr/close-icon';
import * as VrPoses from 'virtual-reality/utils/vr-helpers/vr-poses';

interface Args {
  readonly landscapeData: LandscapeData;
  readonly font: THREE.Font;
  readonly components: string[];
  readonly showDataSelection: boolean;
  readonly selectedTimestampRecords: Timestamp[];
  openLandscapeView(): void
  showApplication(applicationId: string): string;
  addComponent(componentPath: string): void; // is passed down to the viz navbar
  removeComponent(component: string): void;
  openDataSelection(): void;
  closeDataSelection(): void;

  applicationArgs: Map<string, AddApplicationArgs>,
}

type DataModel = Node | Application | Package | Class | ClazzCommuMeshDataModel;

type PopupData = {
  id: number,
  posX: number,
  posY: number,
  isPinned: boolean,
  entity: DataModel
};

export const landscapeRendererSettings: LandscapeRendererSettings = {
  landscapeScalar: 0.3,
  landscapeDepth: 0.7,
  z_depth: 0.2,
  commLineMinSize: 0.004,
  commLineScalar: 0.028,
  z_offset: 0.7 / 2 + 0.25,
  z_pos_application: 0.3,
};

declare const THREEx: any;

export default class ArRendering extends Component<Args> {
  // #region CLASS FIELDS AND GETTERS

  @service('toast-message')
  toastMessage!: ToastMessage;

  @service('configuration')
  configuration!: Configuration;

  @service('collaboration-session')
  collaborationSession!: CollaborationSession;

  @service('local-user')
  localUser!: LocalUser;

  @service('delta-time')
  deltaTimeService!: DeltaTime;

  @service('heatmap-configuration')
  heatmapConf!: HeatmapConfiguration;

  @service('highlighting-service')
  private highlightingService!: HighlightingService;

  @service('ar-settings')
  arSettings!: ArSettings;

  @service('vr-message-sender')
  private sender!: VrMessageSender;

  @service('application-renderer')
  private applicationRenderer!: ApplicationRenderer;

  @service('web-socket')
  private webSocket!: WebSocketService;

  @service('landscape-renderer')
  private landscapeRenderer!: LandscapeRenderer;

  @service('entity-manipulation')
  private entityManipulation!: EntityManipulation;

  @service()
  worker!: any;

  debug = debugLogger('ArRendering');

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
  showSettings = false;

  localPing: { obj: THREE.Object3D, time: number } | undefined | null;

  @tracked
  scene: THREE.Scene;

  private renderer!: THREE.WebGLRenderer;

  updatables: any[] = [];

  private raycaster: Raycaster = new Raycaster();

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

    this.landscapeRenderer.setLargestSide(2);
    this.scene = new THREE.Scene();
    this.scene.add(this.landscapeRenderer.landscapeObject3D);
    this.landscapeRenderer.resetAndAddToScene(this.scene, landscapeRendererSettings);
    this.applicationRenderer.resetAndAddToScene('ar', this.scene, this.updatables);
    this.toastMessage.init();
    this.scene.add(light());
    this.scene.add(spotlight());
    this.scene.background = null;

    AlertifyHandler.setAlertifyPosition('bottom-center');
    document.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  get camera() {
    return this.localUser.defaultCamera;
  }

  // #region COMPONENT AND SCENE INITIALIZATION
  //
  renderingLoop!: RenderingLoop;

  // webglrenderer!: THREE.WebGLRenderer;

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
    this.renderingLoop = RenderingLoop.create(getOwner(this).ownerInjection(),
      {
        camera: this.camera,
        scene: this.scene,
        renderer: this.renderer,
        updatables: this.updatables,
        mapControls: false,
      });
    addSpheres('skyblue', this.mousePosition, this.scene, this.updatables);
    this.renderingLoop.updatables.push(this);
    this.renderingLoop.start();
    this.initCameraCrosshair();
    this.initInteraction();
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
    // this.remoteUsers.displayHmd = false;
    this.landscapeRenderer.arMode = true;
  }

  /**
     * Creates a PerspectiveCamera according to canvas size and sets its initial position
     */
  private initCamera() {
    // Set camera properties
    this.localUser.defaultCamera = new THREE.PerspectiveCamera();
    this.scene.add(this.localUser.defaultCamera);

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

  handlePinching(intersection: THREE.Intersection, delta: number) {
    const object = intersection.object?.parent;
    if (object) {
      object.scale.copy(object.scale.multiplyScalar(delta));
    }
  }

  handleRotating(intersection: THREE.Intersection, delta: number) {
    const object = intersection.object?.parent;
    if (object) {
      // AlertifyHandler.showAlertifyMessage('Rotating' + delta);
      // object.scale.copy(object.scale.multiplyScalar(delta));
      if (object instanceof LandscapeObject3D) {
        object.rotation.z += delta;
        // object.rotation.z += delta * MathUtils.DEG2RAD;
      } else if (object instanceof ApplicationObject3D) {
        object.rotation.y += delta;
        // object.rotation.y += delta * MathUtils.DEG2RAD;
      }
    }
  }

  handlePanning(intersection: THREE.Intersection, x: number, y: number) {
    const object = intersection.object?.parent;
    if (object) {
      if (!(object instanceof LandscapeObject3D)
        && !(object instanceof ApplicationObject3D)) {
        return;
      }

      const deltaVector = new THREE.Vector3(x, 0, y);
      deltaVector.multiplyScalar(0.0025);

      deltaVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), object.parent!.rotation.z);

      object.position.add(deltaVector);
    }
  }

  /**
  * Initiates a WebGLRenderer
  */
  private initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      canvas: this.canvas,
    });

    this.renderer.setClearColor(new THREE.Color('lightgrey'), 0);
    this.renderer.setSize(this.outerDiv.clientWidth, this.outerDiv.clientHeight);
  }

  /**
   * Binds this context to all event handling functions and
   * passes them to a newly created Interaction object
   */
  private initInteraction() {
    // Add key listener for room positioning
    window.onkeydown = (event: any) => {
      this.handleKeyboard(event);
    };
  }

  private configureScene() {
  }

  get intersectableObjects() {
    return [this.landscapeRenderer.landscapeObject3D,
      ...this.applicationRenderer.applicationMarkers];
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

    this.landscapeMarker.add(this.landscapeRenderer.landscapeObject3D);
    this.scene.add(this.landscapeMarker);

    // Init controls for camera
    // eslint-disable-next-line
    new THREEx.ArMarkerControls(this.arToolkitContext, this.landscapeMarker, {
      type: 'pattern',
      patternUrl: 'ar_data/marker_patterns/pattern-angular_L_thick.patt',
    });

    const applicationMarkerNames = ['pattern-angular_1', 'pattern-angular_2', 'pattern-angular_3', 'pattern-angular_4', 'pattern-angular_5'];

    let i = 0;
    for (const applicationMarker of this.applicationRenderer.applicationMarkers) {
      // Init controls for camera
      // eslint-disable-next-line
      new THREEx.ArMarkerControls(this.arToolkitContext, applicationMarker, {
        type: 'pattern',
        patternUrl: `ar_data/marker_patterns/${applicationMarkerNames[i++]}.patt`,
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
    this.renderer.setSize(
      outerDiv.clientWidth * this.rendererResolutionMultiplier,
      outerDiv.clientHeight * this.rendererResolutionMultiplier,
    );
    if (!this.arToolkitContext) return;

    this.arToolkitSource.onResizeElement();
    this.arToolkitSource.copyElementSizeTo(this.renderer.domElement);

    if (this.arToolkitContext.arController !== null) {
      this.arToolkitSource.copyElementSizeTo(this.arToolkitContext.arController.canvas);
    }
    // this.camera.updateProjectionMatrix();
  }

  @action
  resetView() {
    this.landscapeRenderer.setLargestSide(2);
    this.landscapeRenderer.landscapeObject3D.position.set(0, 0, 0);
    this.landscapeRenderer.resetRotation();

    this.applicationRenderer.getOpenApplications().forEach((application) => {
      application.position.set(0, 0, 0);
      application.setLargestSide(1.5);
      application.setRotationFromAxisAngle(new THREE.Vector3(0, 1, 0),
        90 * THREE.MathUtils.DEG2RAD);
    });
  }

  @action
  removeAllApplications() {
    this.applicationRenderer.removeAllApplications();
  }

  @action
  toggleCommunication() {
    const oldValue = this.arSettings.renderCommunication;
    this.arSettings.renderCommunication = !oldValue;

    this.applicationRenderer.updateCommunication();
  }

  @action
  updateRendererResolution(resolutionMultiplier: number) {
    this.rendererResolutionMultiplier = resolutionMultiplier;
    this.resize(this.outerDiv);
  }

  @action
  handlePrimaryCrosshairInteraction() {
    const intersection = this.raycastCenter();

    if (intersection) {
      this.handlePrimaryInputOn(intersection);
    }
  }

  @action
  handleSecondaryCrosshairInteraction() {
    const intersection = this.raycastCenter();

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

    const intersection = this.raycastCenter();

    if (!(intersection?.object.parent instanceof ApplicationObject3D)) {
      return;
    }

    const applicationObject3D = intersection.object.parent;

    this.applicationRenderer.openAllComponents(applicationObject3D);
  }

  @action
  async handlePing() {
    if (!this.collaborationSession.isOnline) {
      AlertifyHandler.showAlertifyWarning('Offline. <br> Join session with users to ping.');
      return;
    }

    const intersection = this.raycastCenter();

    if (!(intersection?.object.parent instanceof ApplicationObject3D)
      && !(intersection?.object.parent instanceof LandscapeObject3D)) {
      return;
    }

    const parentObj = intersection.object.parent;
    const pingPosition = intersection.point;
    parentObj.worldToLocal(pingPosition);

    taskFor(this.localUser.mousePing.ping).perform({ parentObj, position: pingPosition });

    if (this.collaborationSession.isOnline) {
      if (parentObj instanceof ApplicationObject3D) {
        this.sender.sendMousePingUpdate(parentObj.dataModel.id, true, pingPosition);
      } else {
        this.sender.sendMousePingUpdate('landscape', false, pingPosition);
      }
    }
  }

  @action
  async handleHeatmapToggle() {
    const intersection = this.raycastCenter();
    if (intersection && intersection.object.parent instanceof ApplicationObject3D) {
      const applicationObject3D = intersection.object.parent;
      if (this.heatmapConf.currentApplication === applicationObject3D
        && this.heatmapConf.heatmapActive) {
        this.heatmapConf.heatmapActive = false;
        this.heatmapConf.currentApplication = null;
        return;
      }
      this.heatmapConf.setActiveApplication(applicationObject3D);
      this.heatmapConf.heatmapActive = true;
    } else if (intersection && intersection.object.parent instanceof LandscapeObject3D) {
      AlertifyHandler.showAlertifyWarning('Heat Map only available for applications.');
    }
  }

  @action
  handleInfoInteraction() {
    // Do not add popup if user long pressed popup button to remove all popups
    if (Date.now() - this.lastPopupClear < 10) return;

    const intersection = this.raycastCenter();

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

  @tracked
  mousePosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  @action
  handleSingleClick(intersection: THREE.Intersection | null) {
    if (!intersection) return;

    this.mousePosition.copy(intersection.point);

    this.handleSecondaryInputOn(intersection);
  }

  @action
  handleMouseWheel(delta: number) {
    const intersection = this.raycastCenter();

    if (intersection && (
      intersection.object.parent instanceof ApplicationObject3D
      || intersection.object.parent instanceof LandscapeObject3D)) {
      const object = intersection.object.parent;

      // Scale hit object with respect to scroll direction and scroll distance
      object.scale.copy(object.scale.multiplyScalar(1 - (delta / 25)));
    }
  }

  private raycastCenter() {
    const possibleObjects = this.intersectableObjects;
    return this.raycaster.raycasting({ x: 0, y: 0 }, this.camera,
      possibleObjects);
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
  private sendKeepAliveMessage(delta: number, interval = 1) {
    if (delta > interval) {
      // Send camera pose as dummy message
      const cameraPose = VrPoses.getCameraPose(this.localUser.defaultCamera);
      this.sender.sendPoseUpdate(cameraPose);
    }
  }

  tick(delta: number) {
    if (this.webSocket.isWebSocketOpen()) {
      this.sendKeepAliveMessage(delta);
    }

    // this.remoteUsers.updateRemoteUsers(delta);
    this.arZoomHandler?.renderZoomCamera(this.renderer, this.scene,
      this.resize);

    this.updateArToolkit();

    // this.render();

    // this.renderer.render(this.sceneService.scene, this.localUser.defaultCamera);
  }

  // #endregion RENDERING

  // #region APLICATION RENDERING

  @action
  initializeNewApplication(applicationObject3D: ApplicationObject3D) {
    applicationObject3D.setLargestSide(1.5);
    applicationObject3D.setRotationFromAxisAngle(new THREE.Vector3(0, 1, 0),
      90 * THREE.MathUtils.DEG2RAD);

    applicationObject3D.setOpacity(this.arSettings.applicationOpacity);

    this.heatmapConf.currentApplication = applicationObject3D;
  }

  // #endregion APPLICATION RENDERING

  // #region UTILS

  private handlePrimaryInputOn(intersection: THREE.Intersection) {
    const self = this;
    const { object } = intersection;

    function handleApplicationObject(appObject: THREE.Object3D) {
      if (!(appObject.parent instanceof ApplicationObject3D)
        || Date.now() - self.lastOpenAllComponents < 20) return;

      if (appObject instanceof ComponentMesh) {
        self.applicationRenderer.toggleComponent(
          appObject,
          appObject.parent,
        );
      } else if (appObject instanceof CloseIcon) {
        appObject.close().then((closedSuccessfully: boolean) => {
          if (appObject.parent === self.heatmapConf.currentApplication) {
            self.heatmapConf.currentApplication = null;
          }
          if (!closedSuccessfully) AlertifyHandler.showAlertifyError('Application could not be closed');
        });
      } else if (appObject instanceof FoundationMesh) {
        self.applicationRenderer.closeAllComponents(appObject.parent);
      }
    }

    if (object instanceof ApplicationMesh) {
      this.showApplication(object.dataModel.id);
      // Handle application hits
    } else if (object.parent instanceof ApplicationObject3D) {
      handleApplicationObject(object);
    }
  }

  private showApplication(appId: string) {
    perform(
      this.applicationRenderer.openApplicationTask,
      appId,
    );
  }

  private handleSecondaryInputOn(intersection: THREE.Intersection) {
    const { object } = intersection;

    if (object instanceof ComponentMesh || object instanceof ClazzMesh
      || object instanceof ClazzCommunicationMesh) {
      this.highlightingService.highlight(object);
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
    super.willDestroy();

    this.debug('cleanup ar rendering');

    this.renderingLoop.stop();
    // this.landscapeRenderer.resetService();
    // this.applicationRenderer.removeAllApplicationsLocally();
    // this.sceneService.addSkylight();
    this.debug('cleanup destorying controller');

    // Remove event listers.
    this.willDestroyController.abort();

    // Reset AR and position of alerts
    ArRendering.cleanUpAr();

    AlertifyHandler.setAlertifyPosition('bottom-right');
  }

  @action
  updateColors() {
    this.entityManipulation.updateColors(this.scene);
  }

  // #endregion UTILS
}
