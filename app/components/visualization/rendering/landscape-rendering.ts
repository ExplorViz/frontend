import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import GlimmerComponent from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import LocalUser from 'collaborative-mode/services/local-user';
import { ELK, ElkNode } from 'elkjs/lib/elk-api';
import { task } from 'ember-concurrency-decorators';
import { perform, taskFor } from 'ember-concurrency-ts';
import debugLogger from 'ember-debug-logger';
import { LandscapeData } from 'explorviz-frontend/controllers/visualization';
import { Position2D } from 'explorviz-frontend/modifiers/interaction-modifier';
import Configuration from 'explorviz-frontend/services/configuration';
import LandscapeRenderer from 'explorviz-frontend/services/landscape-renderer';
import TimestampRepository, { Timestamp } from 'explorviz-frontend/services/repos/timestamp-repository';
import UserSettings from 'explorviz-frontend/services/user-settings';
import AlertifyHandler from 'explorviz-frontend/utils/alertify-handler';
import Labeler from 'explorviz-frontend/utils/landscape-rendering/labeler';
import { Application, Node } from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import ImageLoader from 'explorviz-frontend/utils/three-image-loader';
import THREEPerformance from 'explorviz-frontend/utils/threejs-performance';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import BaseMesh from 'explorviz-frontend/view-objects/3d/base-mesh';
import ApplicationMesh from 'explorviz-frontend/view-objects/3d/landscape/application-mesh';
import LandscapeObject3D from 'explorviz-frontend/view-objects/3d/landscape/landscape-object-3d';
import NodeMesh from 'explorviz-frontend/view-objects/3d/landscape/node-mesh';
import PlaneMesh from 'explorviz-frontend/view-objects/3d/landscape/plane-mesh';
import PlaneLayout from 'explorviz-frontend/view-objects/layout-models/plane-layout';
import THREE from 'three';
import VrSceneService from 'virtual-reality/services/vr-scene';
import VrTimestampService from 'virtual-reality/services/vr-timestamp';


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
  entity: Node | Application,
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

  webglrenderer!: THREE.WebGLRenderer;

  canvas!: HTMLCanvasElement;

  debug = debugLogger('LandscapeRendering');

  // Incremented every time a frame is rendered
  animationFrameId = 0;

  // Is set to false until first landscape is rendered
  initDone: boolean;

  // Used to display performance and memory usage information
  threePerformance: THREEPerformance | undefined;

  // Maps models to a computed layout
  modelIdToPlaneLayout: Map<string, PlaneLayout> | null = null;

  // // Extended Object3D which manages landscape meshes
  // readonly landscapeObject3D: LandscapeObject3D;

  // Provides functions to label landscape meshes
  readonly labeler = new Labeler();

  readonly imageLoader: ImageLoader = new ImageLoader();

  hoveredObject: BaseMesh | null = null;

  get rightClickMenuItems() {
    const pauseItemtitle = this.args.visualizationPaused ? 'Resume Visualization' : 'Pause Visualization';

    return [
      { title: 'Reset View', action: this.resetView },
      { title: pauseItemtitle, action: this.args.toggleVisualizationUpdating },
      { title: 'Open Sidebar', action: this.args.openDataSelection },
      { title: 'Enter AR', action: this.args.switchToAR },
      { title: 'Enter VR', action: this.args.switchToVR },
    ];
  }

  @tracked
  popupData: PopupData | null = null;

  spheres: Map<string, Array<THREE.Mesh>> = new Map();

  spheresIndex = 0;

  get font() {
    return this.args.font;
  }

  get landSettings() {
    return this.userSettings.landscapeSettings;
  }

  // #endregion CLASS FIELDS AND GETTERS

  // #region COMPONENT AND SCENE INITIALIZATION

  constructor(owner: any, args: Args) {
    super(owner, args);
    this.initDone = false;
    this.debug('Constructor called');

    this.render = this.render.bind(this);

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
    this.render();

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
    this.localUser.defaultCamera = new THREE.PerspectiveCamera(75, width / height, 0.1, 10);
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
    this.debug('Lights added');
  }

  // #endregion COMPONENT AND SCENE INITIALIZATION

  // #region COLLABORATIVE

  @action
  setPerspective(position: number[] /* , rotation: number[] */) {
    this.localUser.camera.position.fromArray(position);
  }

  // #endregion COLLABORATIVE

  // #region RENDERING LOOP

  /**
   * Main rendering function
   */
  render() {
    if (this.isDestroyed) { return; }

    const animationId = requestAnimationFrame(this.render);
    this.animationFrameId = animationId;

    const { value: showFpsCounter } = this.userSettings.landscapeSettings.showFpsCounter;

    if (showFpsCounter && !this.threePerformance) {
      this.threePerformance = new THREEPerformance();
    } else if (!showFpsCounter && this.threePerformance) {
      this.threePerformance.removePerformanceMeasurement();
      this.threePerformance = undefined;
    }

    if (this.threePerformance) {
      this.threePerformance.threexStats.update(this.webglrenderer);
      this.threePerformance.stats.begin();
    }

    this.webglrenderer.render(this.sceneService.scene, this.localUser.camera);

    this.scaleSpheres();

    if (this.threePerformance) {
      this.threePerformance.stats.end();
    }
  }

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

  // Listener-Callbacks. Override in extending components
  //
  // TODO this might belong to landscape-renderer
  @action
  resetView() {
    this.landscapeRenderer.resetBrowserView()
  }

  @task *
    onUpdated() {
    if (this.initDone) {
      this.debug('onUpdated called')
      const { structureLandscapeData, dynamicLandscapeData } = this.args.landscapeData;
      // TODO ar/vr handle both landscapes and applications. Check if this is also possible in browser.
      yield perform(this.landscapeRenderer.populateLandscape, structureLandscapeData, dynamicLandscapeData);
    }
  }

  // #endregion ACTIONS

  // #region SCENE MANIPULATION

  @action
  updateColors() {
    this.sceneService.scene.traverse((object3D) => {
      if (object3D instanceof BaseMesh) {
        object3D.updateColor();
      }
    });
  }

  // #endregion SCENE MANIPULATION

  // #region MOUSE EVENT HANDLER

  @action
  handleDoubleClick(mesh: THREE.Object3D) {
    // Handle application
    if (mesh instanceof ApplicationMesh) {
      this.openApplicationIfExistend(mesh);
      // Handle nodeGroup
    }
  }

  @action
  handleMouseMove(mesh: THREE.Object3D | undefined) {
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

    // Do not show popups while mouse is moving
    this.popupData = null;
  }

  @action
  handleMouseOut() {
    this.popupData = null;
  }

  @action
  handleMouseStop(mesh: THREE.Object3D, mouseOnCanvas: Position2D) {
    if (mesh instanceof NodeMesh || mesh instanceof ApplicationMesh) {
      this.popupData = {
        mouseX: mouseOnCanvas.x,
        mouseY: mouseOnCanvas.y,
        entity: mesh.dataModel,
      };
    }
  }

  // #endregion MOUSE EVENT HANDLER

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
      this.args.showApplication(application.id);
    }
  }
}
