import { getOwner } from '@ember/application';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import CollaborationSession from 'collaborative-mode/services/collaboration-session';
import LocalUser from 'collaborative-mode/services/local-user';
import debugLogger from 'ember-debug-logger';
import { LandscapeData } from 'explorviz-frontend/controllers/visualization';
import { Position2D } from 'explorviz-frontend/modifiers/interaction-modifier';
import PopupHandler from 'explorviz-frontend/rendering/application/popup-handler';
import RenderingLoop from 'explorviz-frontend/rendering/application/rendering-loop';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import Configuration from 'explorviz-frontend/services/configuration';
import EntityManipulation from 'explorviz-frontend/services/entity-manipulation';
import HighlightingService from 'explorviz-frontend/services/highlighting-service';
import ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';
import { Timestamp } from 'explorviz-frontend/services/repos/timestamp-repository';
import UserSettings from 'explorviz-frontend/services/user-settings';
import CameraControls from 'explorviz-frontend/utils/application-rendering/camera-controls';
import { moveCameraTo } from 'explorviz-frontend/utils/application-rendering/entity-manipulation';
import {
  Span,
  Trace,
} from 'explorviz-frontend/utils/landscape-schemes/dynamic-data';
import { Class } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import ComponentMesh from 'explorviz-frontend/view-objects/3d/application/component-mesh';
import FoundationMesh from 'explorviz-frontend/view-objects/3d/application/foundation-mesh';
import HeatmapConfiguration from 'heatmap/services/heatmap-configuration';
import { Vector3 } from 'three';
import * as THREE from 'three';
import { MapControls } from 'three/examples/jsm/controls/MapControls';
import SpectateUserService from 'virtual-reality/services/spectate-user';
import {
  type HoverableMesh,
  isEntityMesh,
  EntityMesh,
} from 'virtual-reality/utils/vr-helpers/detail-info-composer';
import IdeWebsocket from 'explorviz-frontend/ide/ide-websocket';
import IdeCrossCommunication from 'explorviz-frontend/ide/ide-cross-communication';
import LandscapeDataService, {
  LandscapeDataUpdateEventName,
} from 'explorviz-frontend/services/landscape-data-service';
import LandscapeScene3D from 'explorviz-frontend/view-objects/3d/landscape/LandscapeScene3D';

interface BrowserRenderingArgs {
  readonly id: string;
  readonly landscapeData: LandscapeData;
  readonly visualizationPaused: boolean;
  readonly selectedTimestampRecords: Timestamp[];
  openSettingsSidebar(): void;
  toggleVisualizationUpdating(): void;
  switchToAR(): void;
  switchToVR(): void;
}

export default class BrowserRendering extends Component<BrowserRenderingArgs> {
  @service('application-renderer')
  applicationRenderer!: ApplicationRenderer;

  @service('repos/application-repository')
  applicationRepo!: ApplicationRepository;

  @service('landscape-data-service')
  landscapeDataService!: LandscapeDataService;

  @service('configuration')
  configuration!: Configuration;

  @service('user-settings')
  userSettings!: UserSettings;

  @service('local-user')
  private localUser!: LocalUser;

  @service('highlighting-service')
  private highlightingService!: HighlightingService;

  @service('spectate-user')
  private spectateUserService!: SpectateUserService;

  @service('heatmap-configuration')
  private heatmapConf!: HeatmapConfiguration;

  @service('entity-manipulation')
  private entityManipulation!: EntityManipulation;

  @service('collaboration-session')
  private collaborationSession!: CollaborationSession;

  private ideWebsocket: IdeWebsocket;

  private ideCrossCommunication: IdeCrossCommunication;

  readonly scene: LandscapeScene3D;

  @tracked
  canvas!: HTMLCanvasElement;

  popupHandler: PopupHandler;

  renderer!: THREE.WebGLRenderer;

  updatables: any[] = [];

  renderingLoop!: RenderingLoop;

  hoveredObject: HoverableMesh | null = null;

  controls!: MapControls;

  cameraControls!: CameraControls;

  initDone: boolean = false;

  mousePosition: Vector3 = new Vector3(0, 0, 0); // TODO remove? seems to be unused

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
    return this.scene.threeScene.children;
  }

  get appSettings() {
    return this.userSettings.applicationSettings;
  }

  debug = debugLogger('BrowserRendering');

  constructor(owner: any, args: BrowserRenderingArgs) {
    super(owner, args);
    this.debug('Constructor called');
    // scene
    this.scene = LandscapeScene3D.createDefault(
      getOwner(this)!,
      this.configuration.landscapeColors.backgroundColor
    );

    // camera
    this.localUser.defaultCamera = new THREE.PerspectiveCamera(
      75,
      1.0,
      0.1,
      100
    );
    this.camera.position.set(5, 5, 5);

    this.applicationRenderer.getOpenApplications().clear();

    this.updatables.push(this.scene);
    this.updatables.push(this);

    // spectate
    this.updatables.push(this.spectateUserService);

    this.popupHandler = new PopupHandler(getOwner(this));

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

    this.landscapeDataService.on(
      LandscapeDataUpdateEventName,
      this.scene,
      this.scene.updateData
    );

    // TODO
    setTimeout(
      () => this.scene.updateData(this.landscapeDataService.getLatest()),
      0
    );
  }

  tick(delta: number) {
    this.collaborationSession.idToRemoteUser.forEach((remoteUser) => {
      remoteUser.update(delta);
    });
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
      { title: 'Enter VR', action: this.args.switchToVR },
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
    if (this.selectedApplicationObject3D) {
      this.highlightingService.highlightTrace(
        trace,
        traceStep,
        this.selectedApplicationObject3D,
        this.args.landscapeData.structureLandscapeData
      );
    }
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
    this.debug('Canvas inserted');

    this.canvas = canvas;

    canvas.oncontextmenu = (e) => {
      e.preventDefault();
    };
  }

  @action
  resize(outerDiv: HTMLElement) {
    const width = outerDiv.clientWidth;
    const height = outerDiv.clientHeight;

    // Update renderer and camera according to canvas size
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  // https://github.com/vasturiano/3d-force-graph/blob/master/example/custom-node-geometry/index.html
  @action
  async outerDivInserted(outerDiv: HTMLElement) {
    this.initRenderer();
    this.resize(outerDiv);
  }

  /**
   * Initiates a WebGLRenderer
   */
  private initRenderer() {
    const { width, height } = this.canvas;
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      canvas: this.canvas,
    });

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(width, height);
    this.debug('Renderer set up');

    // controls
    this.cameraControls = new CameraControls(this.camera, this.canvas);

    this.spectateUserService.cameraControls = this.cameraControls;
    this.scene.graph.onFinishUpdate(() => {
      if (!this.initDone && !this.scene.isGraphEmpty()) {
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
    this.updatables.push(this.cameraControls);
    this.updatables.push(this.localUser);

    this.renderingLoop = new RenderingLoop(getOwner(this), {
      camera: this.camera,
      scene: this.scene.threeScene,
      renderer: this.renderer,
      updatables: this.updatables,
    });
    this.renderingLoop.start();
  }

  @action
  handleSingleClick(intersection: THREE.Intersection) {
    if (intersection) {
      // this.mousePosition.copy(intersection.point);
      this.handleSingleClickOnMesh(intersection.object);
      this.ideWebsocket.jumpToLocation(intersection.object);
      this.ideCrossCommunication.jumpToLocation(intersection.object);
    } else {
      this.highlightingService.removeHighlightingForAllApplications();
    }
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
    // User clicked on blank spot on the canvas
    if (isEntityMesh(mesh)) {
      this.highlightingService.highlight(mesh);
    }
    if (mesh instanceof FoundationMesh) {
      if (mesh.parent instanceof ApplicationObject3D) {
        this.selectActiveApplication(mesh.parent);
      }
    }
  }

  @action
  handleDoubleClick(intersection: THREE.Intersection) {
    if (intersection) {
      this.handleDoubleClickOnMesh(intersection.object, intersection);
    }
  }

  selectActiveApplication(applicationObject3D: ApplicationObject3D) {
    if (this.selectedApplicationObject3D !== applicationObject3D) {
      this.selectedApplicationId = applicationObject3D.getModelId();
      this.heatmapConf.setActiveApplication(applicationObject3D);
    }
    // applicationObject3D.position.y = 10;
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
  handleDoubleClickOnMesh(
    mesh: THREE.Object3D,
    intersection?: THREE.Intersection
  ) {
    const applicationObject3D = mesh.parent as ApplicationObject3D;

    if (mesh instanceof ComponentMesh) {
      if (applicationObject3D instanceof ApplicationObject3D) {
        // Toggle open state of clicked component
        this.applicationRenderer.toggleComponent(mesh, applicationObject3D);
      }
      // Close all components since foundation shall never be closed itself
      return;
    }

    if (mesh instanceof FoundationMesh) {
      if (applicationObject3D instanceof ApplicationObject3D) {
        this.applicationRenderer.closeAllComponents(applicationObject3D);
      }
      return;
    }

    if (intersection && mesh instanceof THREE.InstancedMesh) {
      applicationObject3D.toggleComponentByIndex(intersection.instanceId!);
      return;
    }
  }

  @action
  handleMouseMove(intersection: THREE.Intersection) {
    // this.runOrRestartMouseMovementTimer();
    if (intersection) {
      this.mousePosition.copy(intersection.point);
      this.handleMouseMoveOnMesh(intersection.object, intersection);
    } else if (this.hoveredObject) {
      if (this.hoveredObject instanceof THREE.InstancedMesh) {
        const application3DObject = this.hoveredObject
          .parent as ApplicationObject3D;
        application3DObject.content.resetHoverEffect();
      } else {
        this.hoveredObject.resetHoverEffect();
        this.hoveredObject = null;
      }
    }
    this.popupHandler.hover(intersection?.object);
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
  handleMouseMoveOnMesh(
    mesh?: THREE.Object3D,
    intersection?: THREE.Intersection
  ) {
    const { value: enableAppHoverEffects } =
      this.appSettings.enableHoverEffects;

    // Update hover effect
    if (enableAppHoverEffects && !this.heatmapConf.heatmapActive) {
      if (mesh instanceof THREE.InstancedMesh) {
        const applicationObject3D = mesh.parent as ApplicationObject3D;
        applicationObject3D.content.applyHoverEffect(intersection!.instanceId!);
      } else if (isEntityMesh(mesh)) {
        // TODO
        if (this.hoveredObject) {
          (this.hoveredObject as EntityMesh).resetHoverEffect();
        }

        this.hoveredObject = mesh as HoverableMesh;
        mesh.applyHoverEffect();
      }
    }

    // Hide popups when mouse moves
    if (!this.appSettings.enableCustomPopupPosition.value) {
      this.popupHandler.clearPopups();
    }
  }

  @action
  removePopup(entityId: string) {
    if (!this.appSettings.enableCustomPopupPosition.value) {
      this.popupHandler.clearPopups();
    } else {
      this.popupHandler.removePopup(entityId);
    }
  }

  @action
  handleMouseOut() {
    this.popupHandler.hover();
    if (!this.appSettings.enableCustomPopupPosition.value) {
      this.popupHandler.clearPopups();
    }
  }

  @action
  handleMouseStop(intersection: THREE.Intersection, mouseOnCanvas: Position2D) {
    if (intersection) {
      this.popupHandler.addPopup({
        mesh: intersection.object,
        position: mouseOnCanvas,
        replace: !this.appSettings.enableCustomPopupPosition.value,
        hovered: true,
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
    if (!this.selectedApplicationObject3D) {
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
    this.entityManipulation.updateColors(this.scene.threeScene);
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
    // this.applicationRenderer.cleanUpApplications();
    this.renderer.dispose();
    this.renderer.forceContextLoss();

    this.ideWebsocket.dispose();
    this.ideCrossCommunication.dispose();

    this.heatmapConf.cleanup();
    this.renderingLoop.stop();
    this.configuration.isCommRendered = true;
    this.popupHandler.willDestroy();
    // this.graph.graphData([]);
    this.landscapeDataService.off(
      LandscapeDataUpdateEventName,
      this.scene,
      this.scene.updateData
    );

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
