import { action } from '@ember/object';

import { getOwner } from '@ember/application';
import { inject as service } from '@ember/service';
import GlimmerComponent from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import LocalUser from 'collaborative-mode/services/local-user';
import { ELK, ElkNode } from 'elkjs/lib/elk-api';
import { task } from 'ember-concurrency-decorators';
import { perform } from 'ember-concurrency-ts';
import debugLogger from 'ember-debug-logger';
import VisualizationController, { LandscapeData } from 'explorviz-frontend/controllers/visualization';
import { Position2D } from 'explorviz-frontend/modifiers/interaction-modifier';
import RenderingLoop from 'explorviz-frontend/rendering/application/rendering-loop';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import Configuration from 'explorviz-frontend/services/configuration';
import LandscapeRenderer from 'explorviz-frontend/services/landscape-renderer';
import TimestampRepository, { Timestamp } from 'explorviz-frontend/services/repos/timestamp-repository';
import UserSettings from 'explorviz-frontend/services/user-settings';
import AlertifyHandler from 'explorviz-frontend/utils/alertify-handler';
import { DrawableClassCommunication } from 'explorviz-frontend/utils/application-rendering/class-communication-computer';
import { applyDefaultApplicationLayout, closeAllComponents, closeComponentMesh, moveCameraTo, openAllComponents, openComponentMesh, toggleComponentMeshState } from 'explorviz-frontend/utils/application-rendering/entity-manipulation';
import * as EntityRendering from 'explorviz-frontend/utils/application-rendering/entity-rendering';
import { highlight, highlightModel, highlightTrace, removeHighlighting, updateHighlighting } from 'explorviz-frontend/utils/application-rendering/highlighting';
import Labeler from 'explorviz-frontend/utils/landscape-rendering/labeler';
import { Span, Trace } from 'explorviz-frontend/utils/landscape-schemes/dynamic-data';
import { Application, Class, Node, Package } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import ImageLoader from 'explorviz-frontend/utils/three-image-loader';
import THREEPerformance from 'explorviz-frontend/utils/threejs-performance';
import AnimationMesh from 'explorviz-frontend/view-objects/3d/animation-mesh';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import ClazzCommunicationMesh from 'explorviz-frontend/view-objects/3d/application/clazz-communication-mesh';
import ClazzMesh from 'explorviz-frontend/view-objects/3d/application/clazz-mesh';
import ComponentMesh from 'explorviz-frontend/view-objects/3d/application/component-mesh';
import FoundationMesh from 'explorviz-frontend/view-objects/3d/application/foundation-mesh';
import ClazzCommuMeshDataModel from 'explorviz-frontend/view-objects/3d/application/utils/clazz-communication-mesh-data-model';
import BaseMesh from 'explorviz-frontend/view-objects/3d/base-mesh';
import ApplicationMesh from 'explorviz-frontend/view-objects/3d/landscape/application-mesh';
import NodeMesh from 'explorviz-frontend/view-objects/3d/landscape/node-mesh';
import PlaneMesh from 'explorviz-frontend/view-objects/3d/landscape/plane-mesh';
import PlaneLayout from 'explorviz-frontend/view-objects/layout-models/plane-layout';
import HeatmapConfiguration, { Metric } from 'heatmap/services/heatmap-configuration';
import { removeHeatmapHelperLines } from 'heatmap/utils/heatmap-helper';
import THREE from 'three';
import VrSceneService from 'virtual-reality/services/vr-scene';
import VrTimestampService from 'virtual-reality/services/vr-timestamp';
import CommunicationArrowMesh from 'explorviz-frontend/view-objects/3d/application/communication-arrow-mesh';
import BoxLayout from 'explorviz-frontend/view-objects/layout-models/box-layout';
import CloseIcon from 'virtual-reality/utils/view-objects/vr/close-icon';


interface Args {
  readonly id: string;
  readonly landscapeData: LandscapeData;
  readonly font: THREE.Font;
  readonly visualizationPaused: boolean;
  readonly elk: ELK;
  readonly selectedTimestampRecords: Timestamp[];
  showApplication(applicationId: string): void;
  openDataSelection(): void;
  toggleVisualizationUpdating(): void;
  switchToAR(): void,
  switchToVR(): void,
}

interface SimplePlaneLayout {
  height: number;
  width: number;
  positionX: number;
  positionY: number;
}

type PopupData = {
  mouseX: number,
  mouseY: number,
  entity: Node | Application | Package | Class | ClazzCommuMeshDataModel,
  isPinned: boolean,
};

type LayoutData = {
  height: number,
  width: number,
  depth: number,
  positionX: number,
  positionY: number,
  positionZ: number
};

export type Point = {
  x: number,
  y: number
};

export interface Layout1Return {
  graph: ElkNode,
  modelIdToPoints: Map<string, Point[]>,
}

export interface Layout3Return {
  modelIdToLayout: Map<string, SimplePlaneLayout>,
  modelIdToPoints: Map<string, Point[]>,
}

/**
* Renderer for landscape visualization.
*
* @class Landscape-Rendering-Component
* @extends GlimmerComponent
*
* @module explorviz
* @submodule visualization.rendering
*/
export default class LandscapeRendering extends GlimmerComponent<Args> {
  // #region CLASS FIELDS AND GETTERS

  @service('configuration')
  configuration!: Configuration;

  @service()
  worker!: any;

  @service('user-settings')
  userSettings!: UserSettings;

  @service('local-user')
  private localUser!: LocalUser;

  @service('vr-scene')
  private sceneService!: VrSceneService;

  @service('landscape-renderer')
  private landscapeRenderer!: LandscapeRenderer;

  @service('heatmap-configuration')
  heatmapConf!: HeatmapConfiguration;

  @service('application-renderer')
  applicationRenderer!: ApplicationRenderer

  webglrenderer!: THREE.WebGLRenderer;

  @tracked
  canvas!: HTMLCanvasElement;

  debug = debugLogger('LandscapeRendering');

  timer!: any;

  // Incremented every time a frame is rendered
  animationFrameId = 0;

  // Is set to false until first landscape is rendered
  initDone: boolean;

  // Used to display performance and memory usage information
  threePerformance: THREEPerformance | undefined;

  // Maps models to a computed layout
  modelIdToPlaneLayout: Map<string, PlaneLayout> | null = null;

  mouseMovementActive: boolean = true;

  oldRotationApplicationObject3D!: THREE.Euler;

  animationStartCoordinateApplicationObject3D: number = 0;

  isAnimationApplicationObject3DDone: boolean = false;

  clock = new THREE.Clock();

  drawableClassCommunications: DrawableClassCommunication[] = [];

  renderingLoop!: RenderingLoop;

  applicationId: string = '1';

  @tracked
  popupData: PopupData[] = [];

  isFirstRendering = true;

  // // Extended Object3D which manages landscape meshes
  // readonly landscapeObject3D: LandscapeObject3D;

  // Provides functions to label landscape meshes
  readonly labeler = new Labeler();

  readonly imageLoader: ImageLoader = new ImageLoader();

  hoveredObject: BaseMesh | null = null;

  @tracked
  selectedApplicationObject3D?: ApplicationObject3D = undefined;

  get rightClickMenuItems() {
    const commButtonTitle = this.configuration.isCommRendered ? 'Hide Communication' : 'Add Communication';
    const heatmapButtonTitle = this.heatmapConf.heatmapActive ? 'Disable Heatmap' : 'Enable Heatmap';
    const pauseItemtitle = this.args.visualizationPaused ? 'Resume Visualization' : 'Pause Visualization';

    return [
      { title: 'Reset View', action: this.resetView },
      { title: 'Open All Components', action: this.openAllComponents },
      { title: commButtonTitle, action: this.toggleCommunicationRendering },
      { title: heatmapButtonTitle, action: this.heatmapConf.toggleHeatmap },
      { title: pauseItemtitle, action: this.args.toggleVisualizationUpdating },
      { title: 'Open Sidebar', action: this.args.openDataSelection },
      { title: 'Enter AR', action: this.args.switchToAR },
      { title: 'Enter VR', action: this.args.switchToVR },
    ];
  }


  spheres: Map<string, Array<THREE.Mesh>> = new Map();

  spheresIndex = 0;

  get scene() {
    return this.sceneService.scene
  }

  get raytraceObjects() {
    return [this.landscapeRenderer.landscapeObject3D, ...this.applicationRenderer.raycastObjects]
  }

  get applicationObject3D() {// TODO fix this initialization workaround. Probably use application markers like in ar-rendering. This currently does
    if (this.selectedApplicationObject3D) {
      return this.selectedApplicationObject3D;
    }
    // not work too well with the interactions
    const applicationObject3D = this.applicationRenderer.getApplicationById(this.applicationId);
    // const applicationObject3D = this.applicationRenderer.getApplicationById(this.args.landscapeData.application!.id);
    if (!applicationObject3D) {
      const { application, dynamicLandscapeData } = this.args.landscapeData;
      return new ApplicationObject3D(application!,
        new Map(), dynamicLandscapeData);
    }

    return applicationObject3D;
  }

  get camera() {
    return this.localUser.camera
  }

  get font() {
    return this.args.font;
  }

  get landSettings() {
    return this.userSettings.landscapeSettings;
  }

  get appSettings() {
    return this.userSettings.applicationSettings;
  }

  // #endregion CLASS FIELDS AND GETTERS

  // #region COMPONENT AND SCENE INITIALIZATION

  constructor(owner: any, args: Args) {
    super(owner, args);
    this.initDone = false;
    this.debug('Constructor called');

    // this.render = this.render.bind(this);

    this.landscapeRenderer.font = this.font
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
  async outerDivInserted(outerDiv: HTMLElement) {
    this.debug('Outer Div inserted');

    this.initThreeJs();

    this.resize(outerDiv);
    this.initDone = true;
  }

  /**
   * Calls all three related init functions and adds the three
   * performance panel if it is activated in user settings
   */
  initThreeJs() {
    this.initServices();
    this.initCamera();
    this.initRenderer();
    this.initLights();
    this.initWebSocket()

    this.renderingLoop = RenderingLoop.create(getOwner(this).ownerInjection(),
      {
        camera: this.camera,
        scene: this.scene,
        renderer: this.webglrenderer,
      });
    this.applicationRenderer.renderingLoop = this.renderingLoop;
    this.renderingLoop.start();
  }

  @service('vr-timestamp')
  private timestampService!: VrTimestampService;

  @service('repos/timestamp-repository')
  private timestampRepo!: TimestampRepository;

  private async initWebSocket() {
    this.debug('Initializing websocket...');
  }

  // // TODO this is new, was taken from ar-rendering
  initServices() {
    this.applicationRenderer.font = this.font;
    this.sceneService.addFloor();
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
  initCamera() {
    const { width, height } = this.canvas;
    this.localUser.defaultCamera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.localUser.camera.position.set(0, 3, 0);
    this.debug('Camera added');
  }

  /**
   * Initiates a WebGLRenderer
   */
  initRenderer() {
    const { width, height } = this.canvas;
    this.webglrenderer = new THREE.WebGLRenderer({
      antialias: true,
      canvas: this.canvas,
    });

    this.webglrenderer.shadowMap.enabled = true;
    this.webglrenderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.webglrenderer.setPixelRatio(window.devicePixelRatio);
    this.webglrenderer.setSize(width, height);
    this.localUser.renderer = this.webglrenderer
    this.landscapeRenderer.webglrenderer = this.webglrenderer
    this.debug('Renderer set up');
  }

  /**
   * Creates a DirectionalLight and adds it to the scene
   */
  initLights() {
    // const spotLight = new THREE.SpotLight(0xffffff, 0.5, 1000, 1.56, 0, 0);
    const spotLight = new THREE.SpotLight(0xffffff, 0.5, 2000);
    spotLight.position.set(-200, 100, 100);
    spotLight.castShadow = true;

    spotLight.angle = 0.3;
    spotLight.penumbra = 0.2;
    spotLight.decay = 2;
    // spotLight.distance = 50;

    this.scene.add(spotLight);

    const light = new THREE.AmbientLight(new THREE.Color(0.65, 0.65, 0.65));
    this.scene.add(light);
    this.debug('Lights added');
    this.debug('Lights added');
  }

  initVisualization(applicationObject3D: ApplicationObject3D) {
    const applicationAnimation = () => {
      // applicationObject3D animation
      const period = 4000;
      const times = [0, period];
      let animationStartCoordinateApplicationObject3D = 0
      let values = [animationStartCoordinateApplicationObject3D, 360];

      let trackName = '.rotation[y]';

      let track = new THREE.NumberKeyframeTrack(trackName, times, values);

      let clip = new THREE.AnimationClip('default', period, [track]);

      let animationMixer = new THREE.AnimationMixer(applicationObject3D);

      let clipAction = animationMixer.clipAction(clip);

      let isAnimationApplicationObject3DDone = false;

      applicationObject3D.tick = (delta: any) => {
        if (!this.mouseMovementActive) {
          if (!isAnimationApplicationObject3DDone) {
            values = [animationStartCoordinateApplicationObject3D, 360];

            track = new THREE.NumberKeyframeTrack(trackName, times, values);

            clip = new THREE.AnimationClip('default', period, [track]);

            animationMixer = new THREE.AnimationMixer(applicationObject3D);
            clipAction = animationMixer.clipAction(clip);
            clipAction.play();
            isAnimationApplicationObject3DDone = true;
          }

          animationMixer.update(delta);
        } else {
          animationStartCoordinateApplicationObject3D = applicationObject3D.rotation.y;
          clipAction.stop();
          isAnimationApplicationObject3DDone = false;
        }
      };
      this.renderingLoop.updatables.push(applicationObject3D);
    };

    applicationAnimation();
  }


  // #endregion COMPONENT AND SCENE INITIALIZATION

  // #region COLLABORATIVE

  @action
  setPerspective(position: number[] /* , rotation: number[] */) {
    this.localUser.camera.position.fromArray(position);
  }

  // #endregion COLLABORATIVE

  // #region RENDERING LOOP


  scaleSpheres() {
    this.spheres.forEach((sphereArray) => {
      for (let i = 0; i < sphereArray.length; i++) {
        const sphere = sphereArray[i];
        sphere.scale.multiplyScalar(0.98);
        sphere.scale.clampScalar(0.01, 1);
      }
    });
  }

  @action
  repositionSphere(vec: THREE.Vector3, user: string, color: string) {
    let spheres = this.spheres.get(user);
    if (!spheres) {
      spheres = this.createSpheres(color);
      this.spheres.set(user, spheres);
    }

    // TODO independent sphereIndex for each user?
    spheres[this.spheresIndex].position.copy(vec);
    spheres[this.spheresIndex].scale.set(1, 1, 1);
    this.spheresIndex = (this.spheresIndex + 1) % spheres.length;
  }

  createSpheres(color: string): Array<THREE.Mesh> {
    const spheres = [];
    const sphereGeometry = new THREE.SphereBufferGeometry(0.08, 32, 32);
    const sphereMaterial = new THREE.MeshBasicMaterial({ color });

    for (let i = 0; i < 30; i++) {
      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      this.sceneService.scene.add(sphere);
      spheres.push(sphere);
    }
    return spheres;
  }

  // #endregion RENDERING LOOP

  // #region COMPONENT AND SCENE CLEAN-UP

  /**
  * This overridden Ember Component lifecycle hook enables calling
  * ExplorViz's custom cleanup code.
  *
  * @method willDestroy
  */
  willDestroy() {
    super.willDestroy();

    this.renderingLoop.stop();

    this.applicationRenderer.cleanUpApplications();
    this.webglrenderer.dispose();
    this.webglrenderer.forceContextLoss();

    this.heatmapConf.cleanup();
    this.configuration.isCommRendered = true;

    this.renderingLoop.stop();

    this.debug('Cleaned up application rendering');
    cancelAnimationFrame(this.animationFrameId);

    // Clean up WebGL rendering context by forcing context loss
    const gl = this.canvas.getContext('webgl');
    if (!gl) {
      return;
    }
    const glExtension = gl.getExtension('WEBGL_lose_context');
    if (!glExtension) return;
    glExtension.loseContext();

    if (this.threePerformance) {
      this.threePerformance.removePerformanceMeasurement();
    }

    this.debug('cleanup landscape rendering');

    // Clean up all remaining meshes
    this.landscapeRenderer.landscapeObject3D.removeAllChildren();
    this.labeler.clearCache();

    // this.sceneService.scene.remove(this.landscapeRenderer.landscapeObject3D)
  }

  // #endregion COMPONENT AND SCENE CLEAN-UP

  // #region ACTIONS

  @action
  resize(outerDiv: HTMLElement) {
    const width = Number(outerDiv.clientWidth);
    const height = Number(outerDiv.clientHeight);

    // Update renderer and camera according to canvas size
    this.webglrenderer.setSize(width, height);
    this.localUser.camera.aspect = width / height;
    this.localUser.camera.updateProjectionMatrix();
  }

  /**
   * Performs a run to re-populate the scene
   */
  @action
  onLandscapeUpdated() {
    // perform(this.loadApplication);
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
    // Open components such that complete trace is visible
    this.openAllComponents();
    const { value } = this.appSettings.transparencyIntensity;
    highlightTrace(trace, traceStep, this.selectedApplicationObject3D,
      this.drawableClassCommunications, this.args.landscapeData.structureLandscapeData, value);
  }

  @action
  removeHighlighting() {
    removeHighlighting(this.applicationObject3D);
  }


  // Listener-Callbacks. Override in extending components
  //
  // TODO this might belong to landscape-renderer
  @action
  resetView() {
    this.landscapeRenderer.resetBrowserView()
    this.camera.position.set(0, 0, 100);
    this.applicationObject3D.resetRotation();
  }

  @task *
    onUpdated() {
    if (this.initDone) {
      this.debug('onUpdated called')
      const { structureLandscapeData, dynamicLandscapeData } = this.args.landscapeData;
      // TODO ar/vr handle both landscapes and applications. Check if this is also possible in browser.
      yield perform(this.landscapeRenderer.populateLandscape, structureLandscapeData, dynamicLandscapeData);

      if (this.selectedApplicationObject3D) {
        yield perform(this.applicationRenderer.addApplicationTask, this.selectedApplicationObject3D.dataModel);
      }
    }
  }

  // #endregion ACTIONS

  // #region SCENE MANIPULATION

  @action
  updateColors() {
    this.scene.traverse((object3D) => {
      if (object3D instanceof BaseMesh) {
        object3D.updateColor();
        // Special case because communication arrow is no base mesh
      } else if (object3D instanceof CommunicationArrowMesh) {
        object3D.updateColor(this.configuration.applicationColors.communicationArrowColor);
      }
    });
  }

  // #endregion SCENE MANIPULATION

  // #region MOUSE EVENT HANDLER
  //
  @action
  handleSingleClick(intersection: THREE.Intersection) {
    if (intersection) {
      this.handleSingleClickOnMesh(intersection.object);
    }
  }

  @action
  handleSingleClickOnMesh(mesh: THREE.Object3D) {
    // User clicked on blank spot on the canvas
    if (mesh === undefined) {
      removeHighlighting(this.applicationObject3D);
    } else if (mesh instanceof ComponentMesh || mesh instanceof ClazzMesh
      || mesh instanceof ClazzCommunicationMesh) {
      const { value } = this.appSettings.transparencyIntensity;
      highlight(mesh, this.applicationObject3D, this.drawableClassCommunications, value);

      if (this.heatmapConf.heatmapActive) {
        this.applicationObject3D.setComponentMeshOpacity(0.1);
        this.applicationObject3D.setCommunicationOpacity(0.1);
      }
    } else if (mesh instanceof FoundationMesh) {
      if (mesh.parent instanceof ApplicationObject3D) {
        const selectedApp = mesh.parent;
        if (this.selectedApplicationObject3D != selectedApp) {
          this.selectedApplicationObject3D = selectedApp;
          this.heatmapConf.renderIfActive(selectedApp);
        }

        this.debug('Selected Application: ' + mesh.parent?.id)
      }
      this.focusCameraOn(mesh);
    } else if (mesh instanceof NodeMesh) {
      this.focusCameraOn(mesh);
    } else if (mesh instanceof CloseIcon) {
      const self = this;
      mesh.close().then((closedSuccessfully: boolean) => {
        // if (mesh.parent === self.heatmapConf.currentApplication) {
        //   self.removeHeatmap();
        // }
        if (!closedSuccessfully) AlertifyHandler.showAlertifyError('Application could not be closed');
        if (self.selectedApplicationObject3D == mesh.parent) {
          self.selectedApplicationObject3D = undefined;
        }
      });
    }
  }

  runOrRestartMouseMovementTimer() {
    if (!this.mouseMovementActive) {
      this.mouseMovementActive = true;
      // this.applicationObject3D.rotation.copy(this.oldRotationApplicationObject3D);
    }

    clearTimeout(this.timer);
    this.timer = setTimeout(
      () => {
        // this.oldRotationApplicationObject3D = new THREE.Euler()
        //   .copy(this.applicationObject3D.rotation);
        this.mouseMovementActive = false;
      }, 2500,
    );
  }

  @action
  handleDoubleClick(intersection: THREE.Intersection) {
    if (intersection) {
      this.handleDoubleClickOnMesh(intersection.object);
    }
  }

  @action
  handleDoubleClickOnMesh(mesh: THREE.Object3D) {
    // Handle application
    if (mesh instanceof ApplicationMesh) {
      this.openApplicationIfExistend(mesh);
      // Handle nodeGroup
    } else if (mesh instanceof ComponentMesh) {
      // Toggle open state of clicked component
      toggleComponentMeshState(mesh, this.applicationObject3D);
      this.addCommunication();
      if (this.appSettings.keepHighlightingOnOpenOrClose.value) {
        const { value } = this.appSettings.transparencyIntensity;
        updateHighlighting(this.applicationObject3D, this.drawableClassCommunications, value);
      } else {
        this.unhighlightAll();
      }
      // Close all components since foundation shall never be closed itself
    } else if (mesh instanceof FoundationMesh) {
      closeAllComponents(this.applicationObject3D);
      // Re-compute communication and highlighting
      this.addCommunication();
      if (this.appSettings.keepHighlightingOnOpenOrClose.value) {
        const { value } = this.appSettings.transparencyIntensity;
        updateHighlighting(this.applicationObject3D, this.drawableClassCommunications, value);
      } else {
        this.unhighlightAll();
      }
    }
    if (this.heatmapConf.heatmapActive) {
      this.applicationObject3D.setComponentMeshOpacity(0.1);
      this.applicationObject3D.setCommunicationOpacity(0.1);
    }
  }


  @action
  handleMouseMove(intersection: THREE.Intersection) {
    this.runOrRestartMouseMovementTimer();
    if (intersection) {
      this.handleMouseMoveOnMesh(intersection.object);
    }
  }

  @action
  handleMouseMoveOnMesh(mesh: THREE.Object3D | undefined) {

    // this.runOrRestartMouseMovementTimer();
    const { value: enableHoverEffects } = this.landSettings.enableHoverEffects;

    // Update hover effect
    if (mesh === undefined && this.hoveredObject) {
      this.hoveredObject.resetHoverEffect();
      this.hoveredObject = null;
    } else if (mesh instanceof PlaneMesh && enableHoverEffects) {
      if (this.hoveredObject) { this.hoveredObject.resetHoverEffect(); }

      this.hoveredObject = mesh;
      mesh.applyHoverEffect();
    }

    // Hide popups when mouse moves
    if (!this.appSettings.enableCustomPopupPosition.value) {
      this.popupData = [];
    }
    const { value: enableAppHoverEffects } = this.appSettings.enableHoverEffects;

    // Update hover effect
    if (mesh === undefined && this.hoveredObject) {
      this.hoveredObject.resetHoverEffect();
      this.hoveredObject = null;
    } else if (mesh instanceof BaseMesh && enableAppHoverEffects && !this.heatmapConf.heatmapActive) {
      if (this.hoveredObject) { this.hoveredObject.resetHoverEffect(); }

      this.hoveredObject = mesh;
      mesh.applyHoverEffect();
    }

    // Hide popups when mouse moves
    if (!this.appSettings.enableCustomPopupPosition.value) {
      this.popupData = [];
    }
  }

  @action
  showApplication(appId: string) {
    this.removePopup(appId);
    this.args.showApplication(appId);
  }

  @action
  removePopup(entityId: string) {
    if (!this.appSettings.enableCustomPopupPosition.value) {
      this.popupData = [];
    } else {
      this.popupData = this.popupData.filter(((pd) => pd.entity.id !== entityId));
    }
  }

  @action
  pinPopup(entityId: string) {
    this.popupData.forEach((pd) => {
      if (pd.entity.id === entityId) {
        pd.isPinned = true;
      }
    });
    this.popupData = [...this.popupData];
  }

  @action
  handleMouseOut() {
    if (!this.appSettings.enableCustomPopupPosition.value) {
      this.popupData = [];
    }
  }

  @action
  handleMouseStop(intersection: THREE.Intersection, mouseOnCanvas: Position2D) {
    if (intersection) {
      this.handleMouseStopOnMesh(intersection.object, mouseOnCanvas);
    }
  }

  @action
  handleMouseStopOnMesh(mesh: THREE.Object3D, mouseOnCanvas: Position2D) {
    // Show information as popup is mouse stopped on top of a mesh
    if ((mesh instanceof NodeMesh || mesh instanceof ApplicationMesh || mesh instanceof ClazzMesh || mesh instanceof ComponentMesh
      || mesh instanceof ClazzCommunicationMesh)) {
      const newPopup = {
        mouseX: mouseOnCanvas.x,
        mouseY: mouseOnCanvas.y,
        entity: mesh.dataModel,
        isPinned: false,
      };

      if (!this.appSettings.enableCustomPopupPosition.value) {
        this.popupData = [newPopup];
      } else {
        const popupAlreadyExists = this.popupData.any((pd) => pd.entity.id === mesh.dataModel.id);
        if (popupAlreadyExists) return;

        const notPinnedPopupIndex = this.popupData.findIndex((pd) => !pd.isPinned);

        if (notPinnedPopupIndex === -1) {
          this.popupData = [...this.popupData, newPopup];
        } else {
          this.popupData[notPinnedPopupIndex] = newPopup;
          this.popupData = [...this.popupData];
        }
      }
    }
  }

  @task *
    loadApplication(application: Application) {
    try {
      const applicationObject3D = yield perform(this.applicationRenderer.addApplicationTask, application);

      if (applicationObject3D) {
        // Display application nicely for first rendering
        applyDefaultApplicationLayout(applicationObject3D);
        this.addCommunication();
        applicationObject3D.resetRotation();

        this.initVisualization(applicationObject3D);
        this.isFirstRendering = false;
        this.selectedApplicationObject3D = applicationObject3D;

        this.focusCameraOn(applicationObject3D);
      }
    } catch (e) {
      console.log(e);
    }
  }

  private focusCameraOn(mesh: THREE.Mesh) {
    const meshPosition = mesh.getWorldPosition(new THREE.Vector3());
    this.renderingLoop.controls.target.copy(meshPosition);
    this.camera.position.x = meshPosition.x;
    this.camera.position.z = meshPosition.z;
  }


  // #endregion MOUSE EVENT HANDLER
  /**
   * Opens all parents / components of a given component or clazz.
   * Adds communication and restores highlighting.
   *
   * @param entity Component or Clazz of which the mesh parents shall be opened
   */
  @action
  openParents(entity: Package | Class) {
    // eslint-disable-next-line @typescript-eslint/no-shadow
    function getAllAncestorComponents(entity: Package | Class): Package[] {
      // if (isClass(entity)) {
      //  return getAllAncestorComponents(entity.parent);
      // }

      if (entity.parent === undefined) {
        return [];
      }

      return [entity.parent, ...getAllAncestorComponents(entity.parent)];
    }

    const ancestors = getAllAncestorComponents(entity);
    ancestors.forEach((anc) => {
      const ancestorMesh = this.applicationObject3D.getBoxMeshbyModelId(anc.id);
      if (ancestorMesh instanceof ComponentMesh) {
        openComponentMesh(ancestorMesh, this.applicationObject3D);
      }
    });
    this.addCommunication();

    if (this.appSettings.keepHighlightingOnOpenOrClose.value) {
      const { value } = this.appSettings.transparencyIntensity;
      updateHighlighting(this.applicationObject3D, this.drawableClassCommunications, value);
    } else {
      this.unhighlightAll();
    }
  }

  /**
   * Closes the corresponding component mesh to a given component
   *
   * @param component Data model of the component which shall be closed
   */
  @action
  closeComponent(component: Package) {
    const mesh = this.applicationObject3D.getBoxMeshbyModelId(component.id);
    if (mesh instanceof ComponentMesh) {
      closeComponentMesh(mesh, this.applicationObject3D);
    }
    this.addCommunication();

    if (this.appSettings.keepHighlightingOnOpenOrClose.value) {
      const { value } = this.appSettings.transparencyIntensity;
      updateHighlighting(this.applicationObject3D, this.drawableClassCommunications, value);
    } else {
      this.unhighlightAll();
    }
  }

  /**
   * Opens all component meshes. Then adds communication and restores highlighting.
   */
  @action
  openAllComponents() {
    openAllComponents(this.applicationObject3D);

    this.addCommunication();

    if (this.appSettings.keepHighlightingOnOpenOrClose.value) {
      const { value } = this.appSettings.transparencyIntensity;
      updateHighlighting(this.applicationObject3D, this.drawableClassCommunications, value);
    } else {
      this.unhighlightAll();
    }
  }

  @action
  updateHighlighting() {
    const { value } = this.appSettings.transparencyIntensity;
    updateHighlighting(this.applicationObject3D, this.drawableClassCommunications, value);
  }

  @action
  addCommunication() {
    this.applicationRenderer.addCommunication(
      this.applicationObject3D,
      this.drawableClassCommunications
    );
  }

  /**
   * Toggles the visualization of communication lines.
   */
  @action
  toggleCommunicationRendering() {
    this.configuration.isCommRendered = !this.configuration.isCommRendered;

    if (this.configuration.isCommRendered) {
      this.applicationRenderer.appCommRendering.addCommunication(this.applicationObject3D,
        this.drawableClassCommunications);
    } else {
      this.applicationObject3D.removeAllCommunication();

      // Remove highlighting if highlighted communication is no longer visible
      if (this.applicationObject3D.highlightedEntity instanceof ClazzCommunicationMesh) {
        removeHighlighting(this.applicationObject3D);
      }
    }
  }

  /**
   * Highlights a given component or clazz
   *
   * @param entity Component or clazz which shall be highlighted
   */
  @action
  highlightModel(entity: Package | Class) {
    const { value } = this.appSettings.transparencyIntensity;
    highlightModel(entity, this.applicationObject3D, this.drawableClassCommunications, value);
  }

  /**
   * Removes all (possibly) existing highlighting.
   */
  @action
  unhighlightAll() {
    removeHighlighting(this.applicationObject3D);
  }

  /**
   * Moves camera such that a specified clazz or clazz communication is in focus.
   *
   * @param model Clazz or clazz communication which shall be in focus of the camera
   */
  @action
  moveCameraTo(emberModel: Class | Span) {
    const applicationCenter = this.applicationObject3D.layout.center;

    moveCameraTo(emberModel, applicationCenter, this.camera, this.applicationObject3D);
  }

  /**
   * Takes an application mesh and tries to enter application-rendering
   * with that application. Displays an errors message if application does
   * not contain any data.
   *
   * @param applicationMesh Mesh of application which shall be opened
   */
  @action
  openApplicationIfExistend(applicationMesh: ApplicationMesh) {


    const application = applicationMesh.dataModel;
    // No data => show message
    if (application.packages.length === 0) {
      const message = `Sorry, there is no information for application <b>
        ${application.name}</b> available.`;

      AlertifyHandler.showAlertifyMessage(message);
    } else {
      // data available => open application-rendering
      AlertifyHandler.closeAlertifyMessages();

      const app = VisualizationController.getApplicationFromLandscapeById(application.id,
        this.args.landscapeData.structureLandscapeData)
      if (app) {
        this.applicationId = app.id
        perform(this.loadApplication, app)
      }

      // this.args.showApplication(application.id);
    }
  }

  // #region ADDITIONAL HELPER FUNCTIONS


  /**
   * Takes a map with plain JSON layout objects and creates BoxLayout objects from it
   *
   * @param layoutedApplication Map containing plain JSON layout data
   */
  static convertToBoxLayoutMap(layoutedApplication: Map<string, LayoutData>) {
    const boxLayoutMap: Map<string, BoxLayout> = new Map();

    layoutedApplication.forEach((value, key) => {
      const boxLayout = new BoxLayout();
      boxLayout.positionX = value.positionX;
      boxLayout.positionY = value.positionY;
      boxLayout.positionZ = value.positionZ;
      boxLayout.width = value.width;
      boxLayout.height = value.height;
      boxLayout.depth = value.depth;
      boxLayoutMap.set(key, boxLayout);
    });

    return boxLayoutMap;
  }

  // #endregion ADDITIONAL HELPER FUNCTIONS
}
