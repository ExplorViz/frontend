import { getOwner } from '@ember/application';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import CollaborationSession from 'collaboration/services/collaboration-session';
import LocalUser from 'collaboration/services/local-user';
import debugLogger from 'ember-debug-logger';
import { LandscapeData } from 'explorviz-frontend/utils/landscape-schemes/landscape-data';
import { Position2D } from 'explorviz-frontend/modifiers/interaction-modifier';
import ForceGraph from 'explorviz-frontend/rendering/application/force-graph';
import PopupHandler from 'explorviz-frontend/rendering/application/popup-handler';
import RenderingLoop from 'explorviz-frontend/rendering/application/rendering-loop';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import Configuration from 'explorviz-frontend/services/configuration';
import HighlightingService from 'explorviz-frontend/services/highlighting-service';
import LandscapeRestructure from 'explorviz-frontend/services/landscape-restructure';
import ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';
import UserSettings from 'explorviz-frontend/services/user-settings';
import CameraControls from 'explorviz-frontend/utils/application-rendering/camera-controls';
import {
  moveCameraTo,
  updateColors,
} from 'explorviz-frontend/utils/application-rendering/entity-manipulation';
import {
  Span,
  Trace,
} from 'explorviz-frontend/utils/landscape-schemes/dynamic/dynamic-data';
import { Class } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import ComponentMesh from 'explorviz-frontend/view-objects/3d/application/component-mesh';
import FoundationMesh from 'explorviz-frontend/view-objects/3d/application/foundation-mesh';
import HeatmapConfiguration from 'heatmap/services/heatmap-configuration';
import { Vector3 } from 'three';
import * as THREE from 'three';
import { MapControls } from 'three/examples/jsm/controls/MapControls';
import SpectateUser from 'collaboration/services/spectate-user';
import {
  EntityMesh,
  isEntityMesh,
} from 'extended-reality/utils/vr-helpers/detail-info-composer';
import IdeWebsocket from 'explorviz-frontend/ide/ide-websocket';
import IdeCrossCommunication from 'explorviz-frontend/ide/ide-cross-communication';
import { removeAllHighlightingFor } from 'explorviz-frontend/utils/application-rendering/highlighting';
import LinkRenderer from 'explorviz-frontend/services/link-renderer';
import SceneRepository from 'explorviz-frontend/services/repos/scene-repository';
import RoomSerializer from 'collaboration/services/room-serializer';
import AnnotationHandlerService from 'explorviz-frontend/services/annotation-handler';
import { SnapshotToken } from 'explorviz-frontend/services/snapshot-token';
import Auth from 'explorviz-frontend/services/auth';
import GamepadControls from 'explorviz-frontend/utils/controls/gamepad/gamepad-controls';
import MinimapService from 'explorviz-frontend/services/minimap-service';
import Raycaster from 'explorviz-frontend/utils/raycaster';
import PopupData from './popups/popup-data';

interface BrowserRenderingArgs {
  readonly id: string;
  readonly landscapeData: LandscapeData | null;
  readonly visualizationPaused: boolean;
  readonly isDisplayed: boolean;
  readonly snapshot: boolean | undefined | null;
  readonly snapshotReload: SnapshotToken | undefined | null;
  openSettingsSidebar(): void;
  toggleVisualizationUpdating(): void;
  switchToAR(): void;
}

export default class BrowserRendering extends Component<BrowserRenderingArgs> {
  @service('application-renderer')
  applicationRenderer!: ApplicationRenderer;

  @service('repos/application-repository')
  applicationRepo!: ApplicationRepository;

  @service('configuration')
  configuration!: Configuration;

  @service('landscape-restructure')
  landscapeRestructure!: LandscapeRestructure;

  @service('user-settings')
  userSettings!: UserSettings;

  @service('local-user')
  private localUser!: LocalUser;

  @service('highlighting-service')
  private highlightingService!: HighlightingService;

  @service('spectate-user')
  private spectateUserService!: SpectateUser;

  @service('heatmap-configuration')
  private heatmapConf!: HeatmapConfiguration;

  @service('collaboration-session')
  private collaborationSession!: CollaborationSession;

  @service('link-renderer')
  linkRenderer!: LinkRenderer;

  @service('room-serializer')
  roomSerializer!: RoomSerializer;

  @service('repos/scene-repository')
  sceneRepo!: SceneRepository;

  @service('minimap-service')
  minimapService!: MinimapService;

  @service('annotation-handler')
  annotationHandler!: AnnotationHandlerService;

  @service('auth')
  private auth!: Auth;

  private ideWebsocket: IdeWebsocket;

  private ideCrossCommunication: IdeCrossCommunication;

  @tracked
  readonly graph: ForceGraph;

  @tracked
  readonly scene: THREE.Scene;

  @tracked
  canvas!: HTMLCanvasElement;

  popupHandler: PopupHandler;

  renderer!: THREE.WebGLRenderer;

  updatables: any[] = [];

  renderingLoop!: RenderingLoop;

  hoveredObject: EntityMesh | null = null;

  controls!: MapControls;

  cameraControls!: CameraControls;

  gamepadControls: GamepadControls | null = null;

  initDone: boolean = false;

  @tracked
  mousePosition: Vector3 = new Vector3(0, 0, 0);

  @tracked
  selectedApplicationId: string = '';

  get selectedApplicationObject3D() {
    return this.applicationRenderer.getApplicationById(
      this.selectedApplicationId
    );
  }

  get camera() {
    return this.localUser.defaultCamera;
  }

  get raycastObjects() {
    return this.scene.children;
  }

  get appSettings() {
    return this.userSettings.applicationSettings;
  }

  debug = debugLogger('BrowserRendering');

  constructor(owner: any, args: BrowserRenderingArgs) {
    super(owner, args);

    // Scene
    this.scene = this.sceneRepo.getScene('browser', true);
    this.scene.background = this.userSettings.applicationColors.backgroundColor;

    this.localUser.defaultCamera = new THREE.PerspectiveCamera();

    // Force graph
    const forceGraph = new ForceGraph(getOwner(this), 0.02);
    this.graph = forceGraph;
    this.scene.add(forceGraph.graph);
    this.updatables.push(forceGraph);
    this.updatables.push(this);

    // Spectate
    this.updatables.push(this.spectateUserService);

    // Minimap
    this.updatables.push(this.minimapService);

    this.popupHandler = new PopupHandler(getOwner(this));
    this.applicationRenderer.forceGraph = this.graph.graph;

    // IDE Websocket
    this.ideWebsocket = new IdeWebsocket(
      getOwner(this),
      this.handleDoubleClickOnMeshIDEAPI,
      this.lookAtMesh
    );

    // IDE Cross Communication
    this.ideCrossCommunication = new IdeCrossCommunication(
      getOwner(this),
      this.handleDoubleClickOnMeshIDEAPI,
      this.lookAtMesh
    );
  }

  async tick(delta: number) {
    this.collaborationSession.idToRemoteUser.forEach((remoteUser) => {
      remoteUser.update(delta);
    });
    if (this.initDone && this.linkRenderer.flag) {
      this.linkRenderer.flag = false;
    }
  }

  get rightClickMenuItems() {
    const commButtonTitle = this.configuration.isCommRendered
      ? 'Hide Communication'
      : 'Add Communication';
    const heatmapButtonTitle = this.heatmapConf.heatmapActive
      ? 'Disable Heatmap'
      : 'Enable Heatmap';
    const pauseItemtitle = this.args.visualizationPaused
      ? 'Resume Visualization'
      : 'Pause Visualization';

    return [
      { title: 'Reset View', action: this.resetView },
      {
        title: 'Open All Components',
        action: this.applicationRenderer.openAllComponentsOfAllApplications,
      },
      {
        title: commButtonTitle,
        action: this.applicationRenderer.toggleCommunicationRendering,
      },
      { title: heatmapButtonTitle, action: this.heatmapConf.toggleHeatmap },
      { title: pauseItemtitle, action: this.args.toggleVisualizationUpdating },
      { title: 'Open Sidebar', action: this.args.openSettingsSidebar },
      { title: 'Enter AR', action: this.args.switchToAR },
    ];
  }

  /**
   * Highlights a trace or specified trace step.
   * Opens all component meshes to make whole trace visible.
   *
   * @param trace Trace which shall be highlighted.
   * @param step Step of the trace which shall be highlighted. Default is 1.
   */
  @action
  highlightTrace(trace: Trace, traceStep: string) {
    if (!this.args.landscapeData || !this.selectedApplicationObject3D) {
      return;
    }

    this.highlightingService.highlightTrace(
      trace,
      traceStep,
      this.selectedApplicationObject3D,
      this.args.landscapeData.structureLandscapeData
    );
  }

  @action
  async resetView() {
    this.cameraControls.resetCameraFocusOn(
      1.0,
      ...this.applicationRenderer.getOpenApplications()
    );
  }

  @action
  canvasInserted(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.landscapeRestructure.canvas = canvas;

    canvas.oncontextmenu = (e) => {
      e.preventDefault();
    };
  }

  @action
  resize(outerDiv: HTMLElement) {
    const width = outerDiv.clientWidth;
    const height = outerDiv.clientHeight;

    const newAspectRatio = width / height;

    // Update renderer and cameras according to canvas size
    this.renderer.setSize(width, height);
    this.camera.aspect = newAspectRatio;
    this.camera.updateProjectionMatrix();

    // Gamepad controls
    this.gamepadControls = new GamepadControls(
      this.camera,
      this.scene,
      this.cameraControls.perspectiveCameraControls,
      {
        lookAt: this.handleMouseMove,
        select: this.handleSingleClick,
        interact: this.handleDoubleClick,
        inspect: this.handleMouseStop,
        ping: this.localUser.ping.bind(this.localUser),
      }
    );
  }

  // https://github.com/vasturiano/3d-force-graph/blob/master/example/custom-node-geometry/index.html
  @action
  async outerDivInserted(outerDiv: HTMLElement) {
    this.initCameras();
    this.initRenderer();
    this.resize(outerDiv);
  }

  private initCameras() {
    const aspectRatio = this.canvas.width / this.canvas.height;
    const settings = this.userSettings.applicationSettings;

    // Camera
    this.localUser.defaultCamera = new THREE.PerspectiveCamera(
      settings.cameraFov.value,
      aspectRatio,
      settings.cameraNear.value,
      settings.cameraFar.value
    );
    this.camera.position.set(5, 5, 5);
    this.scene.add(this.camera);

    // Controls
    this.cameraControls = new CameraControls(
      getOwner(this),
      this.camera,
      this.canvas
    );
    this.spectateUserService.cameraControls = this.cameraControls;
    this.localUser.cameraControls = this.cameraControls;
    this.updatables.push(this.localUser);
    this.updatables.push(this.cameraControls);

    // initialize minimap
    this.minimapService.initializeMinimap(
      this.scene,
      this.graph,
      this.cameraControls
    );

    this.minimapService.raycaster = new Raycaster(
      this.localUser.minimapCamera,
      this.minimapService
    );
  }

  /**
   * Initiates a WebGLRenderer
   */
  private initRenderer() {
    const { width, height } = this.canvas;
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      canvas: this.canvas,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height);
    this.debug('Renderer set up');

    this.renderingLoop = new RenderingLoop(getOwner(this), {
      camera: this.camera,
      scene: this.scene,
      renderer: this.renderer,
      updatables: this.updatables,
    });
    this.renderingLoop.start();

    // if snapshot is loaded, set the camera position of the saved camera position of the snapshot
    if (this.args.snapshot || this.args.snapshotReload) {
      this.graph.graph.onFinishUpdate(() => {
        if (!this.initDone && this.graph.graph.graphData().nodes.length > 0) {
          this.debug('initdone!');
          setTimeout(() => {
            this.applicationRenderer.getOpenApplications();
          }, 200);
          this.initDone = true;
        }
      });
    } else {
      this.graph.graph.onFinishUpdate(() => {
        if (!this.initDone && this.graph.graph.graphData().nodes.length > 0) {
          this.debug('initdone!');
          setTimeout(() => {
            this.cameraControls.resetCameraFocusOn(
              1.2,
              ...this.applicationRenderer.getOpenApplications()
            );
          }, 200);
          this.initDone = true;
        }
      });
    }
  }

  @action
  handleSingleClick(intersection: THREE.Intersection) {
    if (intersection) {
      // this.mousePosition.copy(intersection.point);
      this.handleSingleClickOnMesh(intersection.object);
      this.ideWebsocket.jumpToLocation(intersection.object);
      this.ideCrossCommunication.jumpToLocation(intersection.object);
    } else {
      this.removeAllHighlighting();
    }
  }

  @action
  removeAllHighlighting() {
    this.highlightingService.removeHighlightingForAllApplications(true);
    this.highlightingService.updateHighlighting();
  }

  @action
  lookAtMesh(meshId: string) {
    const mesh = this.applicationRenderer.getMeshById(meshId);
    if (mesh?.isObject3D) {
      this.cameraControls.focusCameraOn(1, mesh);
    }
  }

  @action
  handleSingleClickOnMesh(mesh: THREE.Object3D) {
    if (
      mesh instanceof FoundationMesh &&
      mesh.parent instanceof ApplicationObject3D
    ) {
      this.selectActiveApplication(mesh.parent);
    }

    if (isEntityMesh(mesh) && !this.heatmapConf.heatmapActive) {
      this.highlightingService.toggleHighlight(mesh, { sendMessage: true });
    }
  }

  @action
  handleDoubleClick(intersection: THREE.Intersection) {
    if (intersection) {
      this.handleDoubleClickOnMesh(intersection.object);
    }
  }

  @action
  handleStrgDown() {
    // nothin to do atm
  }

  @action
  handleStrgUp() {
    // nothing to do atm
  }

  @action
  handleAltDown() {
    this.highlightingService.updateHighlightingOnHover(true);
  }

  @action
  handleAltUp() {
    this.highlightingService.updateHighlightingOnHover(false);
  }

  @action
  handleSpaceBar() {
    this.args.toggleVisualizationUpdating();
  }

  selectActiveApplication(applicationObject3D: ApplicationObject3D) {
    if (this.selectedApplicationObject3D !== applicationObject3D) {
      this.selectedApplicationId = applicationObject3D.getModelId();
      this.heatmapConf.setActiveApplication(applicationObject3D);
    }
    applicationObject3D.updateMatrixWorld();
    this.applicationRenderer.updateLinks?.();
  }

  @action
  handleDoubleClickOnMeshIDEAPI(meshID: string) {
    const mesh = this.applicationRenderer.getMeshById(meshID);
    if (mesh?.isObject3D) {
      this.handleDoubleClickOnMesh(mesh);
    }
  }
  @action
  handleDoubleClickOnMesh(mesh: THREE.Object3D) {
    if (mesh instanceof ComponentMesh || mesh instanceof FoundationMesh) {
      if (
        !this.userSettings.applicationSettings.keepHighlightingOnOpenOrClose
          .value
      ) {
        const applicationObject3D = mesh.parent;
        if (applicationObject3D instanceof ApplicationObject3D)
          removeAllHighlightingFor(applicationObject3D);
      }
    }

    if (mesh instanceof ComponentMesh) {
      const applicationObject3D = mesh.parent;
      if (applicationObject3D instanceof ApplicationObject3D) {
        // Toggle open state of clicked component
        this.applicationRenderer.toggleComponent(mesh, applicationObject3D);
      }
      // Close all components since foundation shall never be closed itself
    } else if (mesh instanceof FoundationMesh) {
      const applicationObject3D = mesh.parent;
      if (applicationObject3D instanceof ApplicationObject3D) {
        this.applicationRenderer.closeAllComponents(applicationObject3D);
      }
    }
  }

  @action
  handleMouseMove(intersection: THREE.Intersection, event: MouseEvent) {
    this.popupHandler.handleMouseMove(event);
    this.annotationHandler.handleMouseMove(event);

    if (intersection) {
      this.mousePosition.copy(intersection.point);
      this.handleMouseMoveOnMesh(intersection.object);
    } else if (this.hoveredObject) {
      this.hoveredObject.resetHoverEffect();
      this.hoveredObject = null;
    }
    this.popupHandler.handleHoverOnMesh(intersection?.object);
    this.annotationHandler.handleHoverOnMesh(intersection?.object);

    if (!event.altKey)
      this.highlightingService.updateHighlightingOnHover(
        isEntityMesh(intersection?.object) && intersection.object.highlighted
      );
  }

  @action
  showApplication(appId: string) {
    this.removePopup(appId);
    const applicationObject3D =
      this.applicationRenderer.getApplicationById(appId);
    if (applicationObject3D) {
      this.cameraControls.focusCameraOn(0.8, applicationObject3D);
    }
  }

  @action
  handleMouseMoveOnMesh(mesh: THREE.Object3D | undefined) {
    const { value: enableAppHoverEffects } =
      this.appSettings.enableHoverEffects;

    // Update hover effect
    if (
      isEntityMesh(mesh) &&
      enableAppHoverEffects &&
      !this.heatmapConf.heatmapActive
    ) {
      if (this.hoveredObject) {
        this.hoveredObject.resetHoverEffect();
      }

      this.hoveredObject = mesh;
      mesh.applyHoverEffect();
    }
  }

  @action
  addAnnotationForPopup(popup: PopupData) {
    const mesh = this.applicationRenderer.getMeshById(popup.entity.id);
    if (!mesh) return;

    this.annotationHandler.addAnnotation({
      annotationId: undefined,
      mesh: mesh,
      position: { x: popup.mouseX + 400, y: popup.mouseY },
      hovered: true,
      annotationTitle: '',
      annotationText: '',
      sharedBy: '',
      owner: this.auth.user!.name,
      shared: false,
      inEdit: true,
      lastEditor: undefined,
      wasMoved: true,
    });
  }

  @action
  removePopup(entityId: string) {
    this.popupHandler.removePopup(entityId);

    // remove potential toggle effect
    const mesh = this.applicationRenderer.getMeshById(entityId);
    if (mesh?.isHovered) {
      mesh.resetHoverEffect();
    }
  }

  @action
  hideAnnotation(annotationId: number) {
    this.annotationHandler.hideAnnotation(annotationId);
  }

  @action
  minimizeAnnotation(annotationId: number) {
    this.annotationHandler.minimizeAnnotation(annotationId);
  }

  @action
  editAnnotation(annotationId: number) {
    this.annotationHandler.editAnnotation(annotationId);
  }

  @action
  updateAnnotation(annotationId: number) {
    this.annotationHandler.updateAnnotation(annotationId);
  }

  @action
  removeAnnotation(annotationId: number) {
    if (!this.appSettings.enableCustomAnnotationPosition.value) {
      this.annotationHandler.clearAnnotations();
    } else {
      this.annotationHandler.removeAnnotation(annotationId);
    }
  }

  @action
  handleMouseOut(/*event: PointerEvent*/) {
    this.popupHandler.handleHoverOnMesh();
    this.annotationHandler.handleHoverOnMesh();
  }

  @action
  handleMouseStop(intersection: THREE.Intersection, mouseOnCanvas: Position2D) {
    if (intersection) {
      this.popupHandler.addPopup({
        mesh: intersection.object,
        position: mouseOnCanvas,
        hovered: true,
      });

      this.annotationHandler.addAnnotation({
        annotationId: undefined,
        mesh: intersection.object,
        position: { x: mouseOnCanvas.x + 250, y: mouseOnCanvas.y },
        hovered: true,
        annotationTitle: '',
        annotationText: '',
        sharedBy: '',
        owner: this.auth.user!.name,
        shared: false,
        inEdit: true,
        lastEditor: undefined,
      });
    }
  }

  /**
   * Moves camera such that a specified clazz or clazz communication is in focus.
   *
   * @param model Clazz or clazz communication which shall be in focus of the camera
   */
  @action
  moveCameraTo(emberModel: Class | Span) {
    if (!this.selectedApplicationObject3D || !this.args.landscapeData) {
      return;
    }
    moveCameraTo(
      emberModel,
      this.selectedApplicationObject3D,
      this.args.landscapeData.dynamicLandscapeData,
      this.cameraControls
    );
  }

  @action
  updateColors() {
    updateColors(this.scene, this.userSettings.applicationColors);
  }

  @action
  setGamepadSupport(enabled: boolean) {
    if (this.gamepadControls) {
      this.gamepadControls.setGamepadSupport(enabled);
    }
  }

  @action
  enterFullscreen() {
    this.canvas.requestFullscreen();
  }

  /**
   * This overridden Ember Component lifecycle hook enables calling
   * ExplorViz's custom cleanup code.
   *
   * @method willDestroy
   */
  willDestroy() {
    super.willDestroy();

    this.renderingLoop.stop();

    // is not called before other e.g. vr-rendering is inserted:
    // https://github.com/emberjs/ember.js/issues/18873
    this.applicationRenderer.cleanup();
    this.applicationRepo.cleanup();
    this.renderer.dispose();
    this.renderer.forceContextLoss();

    this.ideWebsocket.dispose();
    this.ideCrossCommunication.dispose();

    this.heatmapConf.cleanup();
    this.renderingLoop.stop();
    this.configuration.isCommRendered = true;
    this.popupHandler.willDestroy();
    this.annotationHandler.willDestroy();
    // this.graph.graphData([]);

    this.debug('Cleaned up application rendering');

    // Clean up WebGL rendering context by forcing context loss
    const gl = this.canvas.getContext('webgl');
    if (!gl) {
      return;
    }
    const glExtension = gl.getExtension('WEBGL_lose_context');
    if (!glExtension) return;
    glExtension.loseContext();
  }
}
