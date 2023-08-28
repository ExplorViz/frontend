import { getOwner } from '@ember/application';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import CollaborationSession from 'collaborative-mode/services/collaboration-session';
import LocalUser from 'collaborative-mode/services/local-user';
import debugLogger from 'ember-debug-logger';
import { LandscapeData } from 'explorviz-frontend/controllers/visualization';
import ForceGraph from 'explorviz-frontend/rendering/application/force-graph';
import PopupHandler from 'explorviz-frontend/rendering/application/popup-handler';
import RenderingLoop from 'explorviz-frontend/rendering/application/rendering-loop';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import Configuration from 'explorviz-frontend/services/configuration';
import EntityManipulation from 'explorviz-frontend/services/entity-manipulation';
import HighlightingService from 'explorviz-frontend/services/highlighting-service';
import { Timestamp } from 'explorviz-frontend/services/repos/timestamp-repository';
import ToastMessage from 'explorviz-frontend/services/toast-message';
import UserSettings from 'explorviz-frontend/services/user-settings';
import AlertifyHandler from 'explorviz-frontend/utils/alertify-handler';
import { addSpheres } from 'explorviz-frontend/utils/application-rendering/spheres';
import hitTest from 'explorviz-frontend/utils/hit-test';
import Raycaster from 'explorviz-frontend/utils/raycaster';
import { defaultScene } from 'explorviz-frontend/utils/scene';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import ClazzCommunicationMesh from 'explorviz-frontend/view-objects/3d/application/clazz-communication-mesh';
import ClazzMesh from 'explorviz-frontend/view-objects/3d/application/clazz-mesh';
import ComponentMesh from 'explorviz-frontend/view-objects/3d/application/component-mesh';
import FoundationMesh from 'explorviz-frontend/view-objects/3d/application/foundation-mesh';
import HeatmapConfiguration from 'heatmap/services/heatmap-configuration';
import * as THREE from 'three';
import ThreeForceGraph from 'three-forcegraph';
import ArSettings from 'virtual-reality/services/ar-settings';
import VrMessageSender from 'virtual-reality/services/vr-message-sender';
import ArZoomHandler from 'virtual-reality/utils/ar-helpers/ar-zoom-handler';
import {
  EntityMesh,
  isEntityMesh,
} from 'virtual-reality/utils/vr-helpers/detail-info-composer';

interface Args {
  readonly landscapeData: LandscapeData;
  readonly components: string[];
  readonly showSettingsSidebar: boolean;
  readonly selectedTimestampRecords: Timestamp[];
  readonly visualizationPaused: boolean;
  openLandscapeView(): void;
  toggleSettingsSidebarComponent(componentPath: string): void; // is passed down to the viz navbar
  openSettingsSidebar(): void;
  closeDataSelection(): void;
  toggleVisualizationUpdating(): void;
}

export default class ArRendering extends Component<Args> {
  // #region CLASS FIELDS AND GETTERS

  @service('toast-message')
  private toastMessage!: ToastMessage;

  @service('collaboration-session')
  private collaborationSession!: CollaborationSession;

  @service('local-user')
  private localUser!: LocalUser;

  @service('heatmap-configuration')
  private heatmapConf!: HeatmapConfiguration;

  @service('highlighting-service')
  private highlightingService!: HighlightingService;

  @service('ar-settings')
  private arSettings!: ArSettings;

  @service('vr-message-sender')
  private sender!: VrMessageSender;

  @service('application-renderer')
  private applicationRenderer!: ApplicationRenderer;

  @service('entity-manipulation')
  private entityManipulation!: EntityManipulation;

  debug = debugLogger('ArRendering');

  outerDiv!: HTMLElement;

  canvas!: HTMLCanvasElement;

  popupHandler: PopupHandler;

  currentSession: XRSession | null = null;

  @tracked
  arZoomHandler: ArZoomHandler | undefined;

  landscapeMarker = new THREE.Group();

  applicationMarkers: THREE.Group[] = [];

  private willDestroyController: AbortController = new AbortController();

  @tracked
  rendererResolutionMultiplier = 2;

  lastPopupClear = 0;

  lastOpenAllComponents = 0;

  @tracked
  showSettings = false;

  localPing: { obj: THREE.Object3D; time: number } | undefined | null;

  @tracked
  scene: THREE.Scene;

  @tracked
  readonly graph: ThreeForceGraph;

  private renderer!: THREE.WebGLRenderer;

  updatables: any[] = [];

  private raycaster: Raycaster = new Raycaster();

  reticle!: THREE.Mesh;

  @service('user-settings')
  userSettings!: UserSettings;

  @service('configuration')
  configuration!: Configuration;

  get appSettings() {
    return this.userSettings.applicationSettings;
  }

  get rightClickMenuItems() {
    const pauseItemtitle = this.args.visualizationPaused
      ? 'Resume Visualization'
      : 'Pause Visualization';
    const commButtonTitle = this.configuration.isCommRendered
      ? 'Hide Communication'
      : 'Add Communication';
    return [
      { title: 'Leave AR View', action: this.leaveArView },
      { title: 'Remove Popups', action: this.removeAllPopups },
      { title: 'Reset View', action: this.resetView },
      { title: pauseItemtitle, action: this.args.toggleVisualizationUpdating },
      {
        title: 'Open All Components',
        action: this.applicationRenderer.openAllComponentsOfAllApplications,
      },
      {
        title: commButtonTitle,
        action: this.applicationRenderer.toggleCommunicationRendering,
      },
    ];
  }

  @action
  leaveArView() {
    this.currentSession?.end();
    this.args.openLandscapeView();
  }

  // #endregion CLASS FIELDS AND GETTERS

  constructor(owner: any, args: Args) {
    super(owner, args);
    this.debug('Constructor called');

    this.scene = defaultScene();
    this.scene.background = null;

    this.applicationRenderer.getOpenApplications().clear();
    const forceGraph = new ForceGraph(getOwner(this)!, 0.02);
    this.graph = forceGraph.graph;
    this.graph.visible = false;
    this.scene.add(forceGraph.graph);
    this.updatables.push(forceGraph);
    this.updatables.push(this.localUser);

    this.toastMessage.init();

    AlertifyHandler.setAlertifyPosition('bottom-center');
    document.addEventListener('contextmenu', (event) => event.preventDefault());

    this.popupHandler = new PopupHandler(getOwner(this));
    this.applicationRenderer.forceGraph = this.graph;
  }

  get camera() {
    return this.localUser.defaultCamera;
  }

  @tracked
  xcamera: any;

  // #region COMPONENT AND SCENE INITIALIZATION
  //
  renderingLoop!: RenderingLoop;

  /**
   * Calls all three related init functions and adds the three
   * performance panel if it is activated in user settings
   */
  private initRendering() {
    this.initCamera();
    this.initRenderer();
    this.initAr();

    this.arZoomHandler = new ArZoomHandler(
      this.localUser.camera,
      this.arSettings
    );
    this.renderingLoop = new RenderingLoop(getOwner(this), {
      camera: this.camera,
      orthographicCamera: undefined,
      scene: this.scene,
      renderer: this.renderer,
      updatables: this.updatables,
      zoomHandler: this.arZoomHandler!,
    });
    const controller = this.renderer.xr.getController(0);
    // https://immersive-web.github.io/webxr/input-explainer.html
    // controller.addEventListener('select', this.onSelect);
    this.scene.add(controller);

    window.addEventListener('resize', () => {
      this.resize();
    });

    addSpheres('skyblue', this.mousePosition, this.scene, this.updatables);
    this.renderingLoop.updatables.push(this);
    this.renderingLoop.start();
    this.initCameraCrosshair();

    // cannot be resized after session started
    this.resize();

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
      .then(this.onSessionStarted);
  }

  /**
   * Creates a PerspectiveCamera according to canvas size and sets its initial position
   */
  private initCamera() {
    // Set camera properties
    this.localUser.defaultCamera = new THREE.PerspectiveCamera(
      65,
      document.body.clientWidth / document.body.clientHeight,
      0.01,
      20
    );
    this.scene.add(this.localUser.defaultCamera);
  }

  private initCameraCrosshair() {
    const geometry = new THREE.RingGeometry(0.0001, 0.0003, 30);
    const material = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const crosshairMesh = new THREE.Mesh(geometry, material);

    this.localUser.defaultCamera.add(crosshairMesh);
    // Position just in front of camera
    crosshairMesh.position.z = -0.1;
  }

  @action
  handlePinching(_intersection: THREE.Intersection, delta: number) {
    this.graph.scale.multiplyScalar(delta);
  }

  @action
  handleRotate(_intersection: THREE.Intersection, delta: number) {
    this.graph.rotateY(delta);
  }

  @action
  increaseSize() {
    this.graph.scale.multiplyScalar(1.1);
  }

  @action
  decreaseSize() {
    this.graph.scale.multiplyScalar(0.9);
  }

  @action
  rotateLeft() {
    this.graph.rotateY((12.5 * Math.PI) / 180);
  }

  @action
  rotateRight() {
    this.graph.rotateY((-12.5 * Math.PI) / 180);
  }

  @action
  openMenu() {
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
    this.canvas.dispatchEvent(evt);
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
    this.renderer.xr.enabled = true;

    this.renderer.setClearColor(new THREE.Color('lightgrey'), 0);
  }

  private initAr() {
    const reticle = new THREE.Mesh(
      new THREE.RingGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial()
    );
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    this.reticle = reticle;
    this.scene.add(reticle);
    // const button = ARButton.createButton(this.renderer, {
    //   requiredFeatures: ['hit-test'],
    //   optionalFeatures: ['dom-overlay', 'dom-overlay-for-handheld-ar'],
    //   domOverlay: { root: document.body }
    // });
    // button.style.bottom = '70px'
    // this.outerDiv.appendChild(button);
    // this.resize(this.outerDiv)
  }

  @action
  async onSessionStarted(session: XRSession) {
    session.addEventListener('end', this.onSessionEnded);

    this.renderer.xr.setReferenceSpaceType('local');

    await this.renderer.xr.setSession(session);
    this.currentSession = session;
  }

  @action
  onSessionEnded(/* event */) {
    this.currentSession?.removeEventListener('end', this.onSessionEnded);
    this.currentSession = null;
    this.leaveArView();
  }

  get intersectableObjects() {
    return this.scene.children;
  }

  // #endregion COMPONENT AND SCENE INITIALIZATION

  // #region ACTIONS

  @action
  async outerDivInserted(outerDiv: HTMLElement) {
    this.debug('Outer Div inserted');

    this.outerDiv = outerDiv;

    this.initRendering();
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
  resize(/* outerDiv: HTMLElement */) {
    // AR view will be fullscreen
    // const { width } = window.screen;
    // const { height } = window.screen;
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setSize(
      width * this.rendererResolutionMultiplier,
      height * this.rendererResolutionMultiplier
    );

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  @action
  resetView() {
    this.graph.scale.setScalar(0.02);
    this.graph.visible = false;
  }

  @action
  updateRendererResolution(resolutionMultiplier: number) {
    this.rendererResolutionMultiplier = resolutionMultiplier;
    this.resize();
  }

  @action
  handlePrimaryCrosshairInteraction() {
    const intersection = this.raycastCenter();
    if (intersection) {
      this.handlePrimaryInputOn(intersection);
    } else if (this.reticle.visible && !this.graph.visible) {
      const mesh = this.graph;
      this.reticle.matrix.decompose(
        mesh.position,
        mesh.quaternion,
        new THREE.Vector3()
      );
      mesh.visible = true;
      this.reticle.visible = false;
    }
  }

  @action
  handleSecondaryCrosshairInteraction() {
    const intersection = this.raycastCenter();

    if (intersection) {
      this.handleSecondaryInputOn(intersection);
    } else {
      this.highlightingService.removeHighlightingForAllApplications(true);
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
      AlertifyHandler.showAlertifyWarning(
        'Offline. <br> Join session with users to ping.'
      );
      return;
    }

    const intersection = this.raycastCenter();

    if (!(intersection?.object.parent instanceof ApplicationObject3D)) {
      return;
    }

    const parentObj = intersection.object.parent;
    const pingPosition = intersection.point;
    parentObj.worldToLocal(pingPosition);

    this.localUser.mousePing.ping.perform({
      parentObj,
      position: pingPosition,
    });

    if (this.collaborationSession.isOnline) {
      if (parentObj instanceof ApplicationObject3D) {
        this.sender.sendMousePingUpdate(
          parentObj.getModelId(),
          true,
          pingPosition
        );
      } else {
        this.sender.sendMousePingUpdate('landscape', false, pingPosition);
      }
    }
  }

  @action
  async handleHeatmapToggle() {
    const intersection = this.raycastCenter();
    if (
      intersection &&
      intersection.object.parent instanceof ApplicationObject3D
    ) {
      const applicationObject3D = intersection.object.parent;
      if (
        this.heatmapConf.currentApplication === applicationObject3D &&
        this.heatmapConf.heatmapActive
      ) {
        this.heatmapConf.heatmapActive = false;
        return;
      }
      this.heatmapConf.setActiveApplication(applicationObject3D);
      this.heatmapConf.heatmapActive = true;
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
    const position = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    this.popupHandler.addPopup({
      mesh,
      position,
      replace: !this.arSettings.stackPopups,
      hovered: true,
    });
  }

  @action
  toggleSettingsPane() {
    this.args.openSettingsSidebar();
  }

  @action
  removeAllPopups() {
    this.lastPopupClear = Date.now();
    this.popupHandler.clearPopups();
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

    if (
      intersection &&
      intersection.object.parent instanceof ApplicationObject3D
    ) {
      const object = intersection.object.parent;

      // Scale hit object with respect to scroll direction and scroll distance
      object.scale.copy(object.scale.multiplyScalar(1 - delta / 25));
    }
  }

  private raycastCenter() {
    const possibleObjects = this.intersectableObjects;
    return this.raycaster.raycasting(
      { x: 0, y: 0 },
      this.camera,
      possibleObjects
    );
  }

  // #endregion MOUSE & KEYBOARD EVENT HANDLER

  // #region RENDERING

  hoveredObject: EntityMesh | null = null;

  tick(delta: number, frame: XRFrame) {
    const intersection = this.raycastCenter();
    this.popupHandler.hover(intersection?.object);
    if (intersection) {
      const mesh = intersection.object;
      if (isEntityMesh(mesh)) {
        this.hoveredObject = mesh;
        mesh.applyHoverEffect();
      }
    } else {
      if (isEntityMesh(this.hoveredObject)) {
        this.hoveredObject.applyHoverEffect();
      }
      this.hoveredObject = null;
    }

    if (this.renderer.xr.enabled) {
      if (!this.graph.visible || this.reticle.visible) {
        hitTest(this.renderer, this.reticle, frame);
      }
    }
    this.collaborationSession.idToRemoteUser.forEach((remoteUser) => {
      remoteUser.update(delta);
    });
  }

  // #endregion RENDERING

  // #region UTILS

  private handlePrimaryInputOn(intersection: THREE.Intersection) {
    const self = this;
    const { object } = intersection;

    function handleApplicationObject(appObject: THREE.Object3D) {
      if (
        !(appObject.parent instanceof ApplicationObject3D) ||
        Date.now() - self.lastOpenAllComponents < 20
      )
        return;

      if (appObject instanceof ComponentMesh) {
        self.applicationRenderer.toggleComponent(appObject, appObject.parent);
      } else if (appObject instanceof FoundationMesh) {
        self.applicationRenderer.closeAllComponents(appObject.parent);
      }
    }

    // Handle application hits
    if (object.parent instanceof ApplicationObject3D) {
      handleApplicationObject(object);
    }
  }

  private handleSecondaryInputOn(intersection: THREE.Intersection) {
    const { object } = intersection;

    if (
      object instanceof ComponentMesh ||
      object instanceof ClazzMesh ||
      object instanceof ClazzCommunicationMesh
    ) {
      this.highlightingService.highlight(object, true);
    }
  }

  removeUnpinnedPopups() {
    this.popupHandler.removeUnpinnedPopups();
  }

  willDestroy() {
    super.willDestroy();
    this.debug('cleanup ar rendering');

    this.renderingLoop.stop();
    this.debug('cleanup destorying controller');

    // Remove event listers.
    this.willDestroyController.abort();

    AlertifyHandler.setAlertifyPosition('bottom-right');
  }

  @action
  updateColors() {
    this.entityManipulation.updateColors(this.scene);
  }

  // #endregion UTILS
}
