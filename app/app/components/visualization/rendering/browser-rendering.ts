import { getOwner } from '@ember/application';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import CollaborationSession from 'explorviz-frontend/services/collaboration/collaboration-session';
import LocalUser from 'explorviz-frontend/services/collaboration/local-user';
import debugLogger from 'ember-debug-logger';
import { LandscapeData } from 'react-lib/src/utils/landscape-schemes/landscape-data';
import { Position2D } from 'explorviz-frontend/modifiers/interaction-modifier';
import PopupHandler from 'explorviz-frontend/rendering/application/popup-handler';
import RenderingLoop from 'explorviz-frontend/rendering/application/rendering-loop';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import Configuration from 'explorviz-frontend/services/configuration';
import HighlightingService from 'explorviz-frontend/services/highlighting-service';
import LandscapeRestructure from 'explorviz-frontend/services/landscape-restructure';
// import ApplicationRepository from 'explorviz-frontend/services/repos/application-repository';
import { useApplicationRepositoryStore } from 'react-lib/src/stores/repos/application-repository';
import UserSettings from 'explorviz-frontend/services/user-settings';
import CameraControls from 'react-lib/src/utils/application-rendering/camera-controls';
import {
  moveCameraTo,
  updateColors,
} from 'explorviz-frontend/utils/application-rendering/entity-manipulation';
import {
  Span,
  Trace,
} from 'react-lib/src/utils/landscape-schemes/dynamic/dynamic-data';
import { Class } from 'react-lib/src/utils/landscape-schemes/structure-data';
import ApplicationObject3D from 'react-lib/src/view-objects/3d/application/application-object-3d';
import ComponentMesh from 'react-lib/src/view-objects/3d/application/component-mesh';
import FoundationMesh from 'react-lib/src/view-objects/3d/application/foundation-mesh';
import { Vector3 } from 'three';
import * as THREE from 'three';
import { MapControls } from 'three/examples/jsm/controls/MapControls';
import SpectateUser from 'explorviz-frontend/services/collaboration/spectate-user';
import {
  EntityMesh,
  isEntityMesh,
} from 'react-lib/src/utils/extended-reality/vr-helpers/detail-info-composer';
import IdeWebsocket from 'explorviz-frontend/ide/ide-websocket';
import IdeCrossCommunication from 'explorviz-frontend/ide/ide-cross-communication';
import { removeAllHighlightingFor } from 'react-lib/src/utils/application-rendering/highlighting';
import LinkRenderer from 'explorviz-frontend/services/link-renderer';
// import SceneRepository from 'explorviz-frontend/services/repos/scene-repository';
import { useSceneRepositoryStore } from 'react-lib/src/stores/repos/scene-repository';
import RoomSerializer from 'explorviz-frontend/services/collaboration/room-serializer';
import AnnotationHandlerService from 'explorviz-frontend/services/annotation-handler';
import { SnapshotToken } from 'explorviz-frontend/services/snapshot-token';
import Auth from 'explorviz-frontend/services/auth';
import GamepadControls from 'react-lib/src/utils/controls/gamepad/gamepad-controls';
import SemanticZoomManager from 'react-lib/src/view-objects/3d/application/utils/semantic-zoom-manager';
import { ImmersiveView } from 'explorviz-frontend/rendering/application/immersive-view';
import ClazzCommunicationMesh from 'react-lib/src/view-objects/3d/application/clazz-communication-mesh';
import MinimapService from 'explorviz-frontend/services/minimap-service';
import Raycaster from 'react-lib/src/utils/raycaster';
import calculateHeatmap from 'react-lib/src/utils/calculate-heatmap';
import { useHeatmapConfigurationStore } from 'react-lib/src/stores/heatmap/heatmap-configuration';
import { useToastHandlerStore } from 'react-lib/src/stores/toast-handler';
import Landscape3D from 'react-lib/src/view-objects/3d/landscape/landscape-3d';
import PopupData from 'react-lib/src/components/visualization/rendering/popups/popup-data';
import LoadingIndicator from 'react-lib/src/components/visualization/rendering/loading-indicator.tsx';
import CollaborationOpener from 'react-lib/src/components/collaboration/visualization/page-setup/sidebar/customizationbar/collaboration/collaboration-opener.tsx';
import VscodeExtensionOpener from 'react-lib/src/components/collaboration/visualization/page-setup/sidebar/customizationbar/vscode/vscode-extension-settings-opener.tsx';
import RestructureOpener from 'react-lib/src/components/visualization/page-setup/sidebar/customizationbar/restructure/restructure-opener.tsx';
import SettingsOpener from 'react-lib/src/components/visualization/page-setup/sidebar/customizationbar/settings/settings-opener.tsx';
import SnapshotOpener from 'react-lib/src/components/visualization/page-setup/sidebar/customizationbar/snapshot/snapshot-opener.tsx';
import TraceReplayerOpener from 'react-lib/src/components/visualization/page-setup/sidebar/toolbar/trace-replayer/trace-replayer-opener.tsx';
import ApplicationSearchOpener from 'react-lib/src/components/visualization/page-setup/sidebar/toolbar/application-search/application-search-opener.tsx';
import EntityFilteringOpener from 'react-lib/src/components/visualization/page-setup/sidebar/toolbar/entity-filtering/entity-filtering-opener.tsx';
import HeatmapConfiguration from 'explorviz-frontend/services/heatmap/heatmap-configuration';
import HeatmapInfo from 'react-lib/src/components/heatmap/heatmap-info.tsx';
import VscodeExtensionSettings from 'react-lib/src/components/collaboration/visualization/page-setup/sidebar/customizationbar/vscode/vscode-extension-settings.tsx';

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
  // React component refs
  loadingIndicator = LoadingIndicator;
  collaborationOpener = CollaborationOpener;
  vscodeExtensionOpener = VscodeExtensionOpener;
  restructureOpener = RestructureOpener;
  snapshotOpener = SnapshotOpener;
  settingsOpener = SettingsOpener;
  traceReplayerOpener = TraceReplayerOpener;
  applicationSearchOpener = ApplicationSearchOpener;
  entityFilteringOpener = EntityFilteringOpener;
  heatmapInfo = HeatmapInfo;
  vscodeExtensionSettings = VscodeExtensionSettings;

  @service('application-renderer')
  applicationRenderer!: ApplicationRenderer;

  // @service('repos/application-repository')
  // applicationRepo!: ApplicationRepository;

  @service('configuration')
  configuration!: Configuration;

  @service('landscape-restructure')
  landscapeRestructure!: LandscapeRestructure;

  @service('user-settings')
  userSettings!: UserSettings;

  @service('collaboration/local-user')
  private localUser!: LocalUser;

  @service('highlighting-service')
  private highlightingService!: HighlightingService;

  @service('collaboration/spectate-user')
  private spectateUserService!: SpectateUser;

  @service('collaboration/collaboration-session')
  private collaborationSession!: CollaborationSession;

  @service('link-renderer')
  linkRenderer!: LinkRenderer;

  @service('collaboration/room-serializer')
  roomSerializer!: RoomSerializer;

  // @service('repos/scene-repository')
  // sceneRepo!: SceneRepository;

  @service('minimap-service')
  minimapService!: MinimapService;

  @service('annotation-handler')
  annotationHandler!: AnnotationHandlerService;

  @service('auth')
  private auth!: Auth;

  @service('heatmap/heatmap-configuration')
  private heatmapConf!: HeatmapConfiguration; // TODO for testing heatmap

  @service
  private worker!: any;

  private ideWebsocket: IdeWebsocket;

  private ideCrossCommunication: IdeCrossCommunication;

  @tracked
  readonly landscape3D: Landscape3D;

  // Determines if landscape needs to be fully re-computed
  @tracked
  updateLayout = false;

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

  toggleForceAppearenceLayer: boolean = false;

  semanticZoomToggle: boolean = false;

  get selectedApplicationObject3D() {
    if (this.selectedApplicationId === '') {
      // TODO
      this.selectedApplicationId = this.applicationRenderer
        .getOpenApplications()[0]
        .getModelId();
    }
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
    return this.userSettings.visualizationSettings;
  }

  debug = debugLogger('BrowserRendering');

  constructor(owner: any, args: BrowserRenderingArgs) {
    super(owner, args);

    // Scene
    this.scene = useSceneRepositoryStore.getState().getScene('browser', true);
    this.scene.background = this.userSettings.colors!.backgroundColor;

    this.localUser.defaultCamera = new THREE.PerspectiveCamera();

    this.configuration.semanticZoomEnabled =
      SemanticZoomManager.instance.isEnabled;

    // Landscape
    this.landscape3D = new Landscape3D();
    this.scene.add(this.landscape3D);
    this.updatables.push(this);

    // Spectate
    this.updatables.push(this.spectateUserService);

    // Minimap
    this.updatables.push(this.minimapService);

    this.popupHandler = new PopupHandler(getOwner(this));
    ImmersiveView.instance.callbackOnEntering = () => {
      this.popupHandler.deactivated = true;
      this.popupHandler.clearPopups();
    };
    ImmersiveView.instance.callbackOnExit = () => {
      this.popupHandler.deactivated = false;
    };
    this.applicationRenderer.landscape3D = this.landscape3D;
    // Semantic Zoom Manager shows/removes all communication arrows, due to heigh rendering time.
    // If the Semantic zoom feature is enabled, all previously generated arrows are hidden. After that
    // the manager decides on which level to show.
    // If it gets disabled, alle previous arrows get restored.
    // All this is done by shifting layers.
    SemanticZoomManager.instance.registerActivationCallback((onOff) => {
      this.linkRenderer
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
      this.applicationRenderer.getOpenApplications().forEach((ap) => {
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
      this.userSettings.visualizationSettings.autoOpenCloseFeature.value
    );
    this.applicationRenderer.landscape3D = this.landscape3D;

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

    return [
      { title: 'Reset View', action: this.resetView },
      {
        title: 'Open All Components',
        action: () => {
          if (
            this.userSettings.visualizationSettings.autoOpenCloseFeature
              .value == true &&
            this.userSettings.visualizationSettings.semanticZoomState.value ==
              true
          ) {
            useToastHandlerStore
              .getState()
              .showErrorToastMessage(
                'Open All Components not useable when Semantic Zoom with auto open/close is enabled.'
              );
            return;
          }
          this.applicationRenderer.openAllComponentsOfAllApplications();
        },
      },
      {
        title: commButtonTitle,
        action: this.applicationRenderer.toggleCommunicationRendering,
      },
      { title: 'Enter AR', action: this.args.switchToAR },
    ];
  }

  @action
  toggleSemanticZoom() {
    if (!SemanticZoomManager.instance.isEnabled) {
      SemanticZoomManager.instance.activate();
    } else {
      SemanticZoomManager.instance.deactivate();
    }
    this.userSettings.updateSetting(
      'semanticZoomState',
      SemanticZoomManager.instance.isEnabled
    );
    this.configuration.semanticZoomEnabled =
      SemanticZoomManager.instance.isEnabled;
  }

  @action
  showSemanticZoomClusterCenters() {
    // Remove previous center points from scene
    const prevCenterPointList = this.scene.children.filter(
      (preCenterPoint) => preCenterPoint.name == 'centerPoints'
    );
    prevCenterPointList.forEach((preCenterPoint) => {
      this.scene.remove(preCenterPoint);
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
        this.scene.add(xGroup);
      });
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
    this.cameraControls.resetCameraFocusOn(1.0, [this.landscape3D]);
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

  @action
  async outerDivInserted(outerDiv: HTMLElement) {
    this.initCameras();
    this.initRenderer();
    this.resize(outerDiv);
  }

  private initCameras() {
    const aspectRatio = this.canvas.width / this.canvas.height;
    const settings = this.userSettings.visualizationSettings;

    // Camera
    this.localUser.defaultCamera = new THREE.PerspectiveCamera(
      settings.cameraFov.value,
      aspectRatio,
      settings.cameraNear.value,
      settings.cameraFar.value
    );
    this.camera.position.set(1, 2, 3);
    this.scene.add(this.camera);

    // Add Camera to ImmersiveView manager
    ImmersiveView.instance.registerCamera(this.camera);
    ImmersiveView.instance.registerScene(this.scene);
    ImmersiveView.instance.registerCanvas(this.canvas);

    this.localUser.ortographicCamera = new THREE.OrthographicCamera(
      -aspectRatio * 1,
      aspectRatio * 1,
      1,
      -1,
      0.1,
      100
    );

    this.localUser.ortographicCamera.userData.aspect = aspectRatio;

    this.localUser.ortographicCamera.position.setFromSphericalCoords(
      10,
      Math.PI / 3,
      Math.PI / 4
    );
    this.localUser.ortographicCamera.lookAt(this.scene.position);

    // Controls
    this.cameraControls = new CameraControls(this.camera, this.canvas);
    this.spectateUserService.cameraControls = this.cameraControls;
    this.localUser.cameraControls = this.cameraControls;
    this.updatables.push(this.localUser);
    this.updatables.push(this.cameraControls);

    // initialize minimap
    this.minimapService.initializeMinimap(
      this.scene,
      this.landscape3D,
      this.cameraControls
    );

    this.minimapService.raycaster = new Raycaster(this.localUser.minimapCamera);
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
    ImmersiveView.instance.registerRenderingLoop(this.renderingLoop);
    this.renderingLoop.start();

    document.addEventListener('Landscape initialized', () => {
      if (!this.initDone && this.landscape3D.children.length > 0) {
        this.debug('initdone!');
        setTimeout(() => {
          this.cameraControls.resetCameraFocusOn(1.2, [this.landscape3D]);
          if (
            SemanticZoomManager.instance.isEnabled ||
            this.userSettings.visualizationSettings.semanticZoomState.value ==
              true
          ) {
            SemanticZoomManager.instance.activate();
            this.configuration.semanticZoomEnabled =
              SemanticZoomManager.instance.isEnabled;
          }
        }, 200);
        this.initDone = true;
      }

      if (this.args.snapshot || this.args.snapshotReload) {
        if (!this.initDone && this.landscape3D.children.length > 0) {
          this.debug('initdone!');
          setTimeout(() => {
            this.applicationRenderer.getOpenApplications();
          }, 200);
          this.initDone = true;
        }
      } else {
        if (!this.initDone && this.landscape3D.children.length > 0) {
          this.debug('initdone!');
          setTimeout(() => {
            this.cameraControls.resetCameraFocusOn(1.2, [this.landscape3D]);
          }, 200);
          this.initDone = true;
        }
      }
    });
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

    if (
      isEntityMesh(mesh) &&
      !useHeatmapConfigurationStore.getState().heatmapActive
    ) {
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
    SemanticZoomManager.instance.logCurrentState();
    // nothing to do atm
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

  async selectActiveApplication(applicationObject3D: ApplicationObject3D) {
    if (applicationObject3D.dataModel.applicationMetrics.metrics.length === 0) {
      const workerPayload = {
        structure: applicationObject3D.dataModel.application,
        dynamic: this.args.landscapeData?.dynamicLandscapeData,
      };

      calculateHeatmap(
        applicationObject3D.dataModel.applicationMetrics,
        await this.worker.postMessage('metrics-worker', workerPayload)
      );
    }

    if (this.selectedApplicationObject3D !== applicationObject3D) {
      this.selectedApplicationId = applicationObject3D.getModelId();
      useHeatmapConfigurationStore
        .getState()
        .setActiveApplication(applicationObject3D);
    }

    applicationObject3D.updateMatrixWorld();
    // TODO: Update links (make them invisible?)
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
        !this.userSettings.visualizationSettings.keepHighlightingOnOpenOrClose
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
    if (ImmersiveView.instance.isImmersiveViewCapable(mesh)) {
      ImmersiveView.instance.triggerObject(mesh);
    }
  }

  @action
  handleMouseMove(intersection: THREE.Intersection, event: MouseEvent) {
    this.popupHandler.handleMouseMove(event);
    this.annotationHandler.handleMouseMove(event);

    if (intersection) {
      this.mousePosition.copy(intersection.point);
      this.handleMouseMoveOnMesh(intersection.object);
      //@ts-ignore Interface conformance can only be checked at runtime
      ImmersiveView.instance.takeHistory(intersection.object);
    } else if (this.hoveredObject) {
      this.hoveredObject.resetHoverEffect();
      this.hoveredObject = null;
      ImmersiveView.instance.takeHistory(null);
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
      !useHeatmapConfigurationStore.getState().heatmapActive
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
    updateColors(this.scene, this.userSettings.colors!);
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
    useApplicationRepositoryStore.getState().clearApplication();
    // this.applicationRepo.cleanup();
    this.renderer.dispose();
    this.renderer.forceContextLoss();

    this.ideWebsocket.dispose();
    this.ideCrossCommunication.dispose();

    useHeatmapConfigurationStore.getState().cleanup();
    this.renderingLoop.stop();
    this.configuration.isCommRendered = true;
    this.popupHandler.willDestroy();
    this.annotationHandler.willDestroy();

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
