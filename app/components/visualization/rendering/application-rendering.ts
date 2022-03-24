import GlimmerComponent from '@glimmer/component';
import { action } from '@ember/object';
import debugLogger from 'ember-debug-logger';
import THREE from 'three';
import { inject as service } from '@ember/service';
import Configuration from 'explorviz-frontend/services/configuration';
import FoundationMesh from 'explorviz-frontend/view-objects/3d/application/foundation-mesh';
import ClazzMesh from 'explorviz-frontend/view-objects/3d/application/clazz-mesh';
import ComponentMesh from 'explorviz-frontend/view-objects/3d/application/component-mesh';
import ClazzCommunicationMesh from 'explorviz-frontend/view-objects/3d/application/clazz-communication-mesh';
import { tracked } from '@glimmer/tracking';
import BaseMesh from 'explorviz-frontend/view-objects/3d/base-mesh';
import THREEPerformance from 'explorviz-frontend/utils/threejs-performance';
import BoxLayout from 'explorviz-frontend/view-objects/layout-models/box-layout';
import { task } from 'ember-concurrency-decorators';
import ApplicationObject3D from 'explorviz-frontend/view-objects/3d/application/application-object-3d';
import HeatmapConfiguration, { Metric } from 'heatmap/services/heatmap-configuration';
import CommunicationArrowMesh from 'explorviz-frontend/view-objects/3d/application/communication-arrow-mesh';
import {
  Class, isClass, Package,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import { DrawableClassCommunication } from 'explorviz-frontend/utils/landscape-rendering/class-communication-computer';
import { LandscapeData } from 'explorviz-frontend/controllers/visualization';
import { Span, Trace } from 'explorviz-frontend/utils/landscape-schemes/dynamic-data';
import { perform, taskFor } from 'ember-concurrency-ts';
import { Position2D } from 'explorviz-frontend/modifiers/interaction-modifier';
import {
  highlight, highlightModel, highlightTrace, removeHighlighting, updateHighlighting,
} from 'explorviz-frontend/utils/application-rendering/highlighting';
import {
  applyDefaultApplicationLayout,
  closeAllComponents,
  closeComponentMesh,
  moveCameraTo,
  openComponentMesh,
  openAllComponents,
  toggleComponentMeshState,
} from 'explorviz-frontend/utils/application-rendering/entity-manipulation';
import HammerInteraction from 'explorviz-frontend/utils/hammer-interaction';
import { addHeatmapHelperLine, computeHeatMapViewPos, removeHeatmapHelperLines } from 'heatmap/utils/heatmap-helper';
import UserSettings from 'explorviz-frontend/services/user-settings';
import LocalUser from 'collaborative-mode/services/local-user';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import VrSceneService from 'virtual-reality/services/vr-scene';

interface Args {
  readonly landscapeData: LandscapeData;
  readonly font: THREE.Font;
  readonly visualizationPaused: boolean;
  readonly components: string[];
  readonly showDataSelection: boolean;
  addComponent(componentPath: string): void; // is passed down to the viz navbar
  removeComponent(component: string): void;
  openDataSelection(): void;
  closeDataSelection(): void;
  toggleVisualizationUpdating(): void;
}

type PopupData = {
  mouseX: number,
  mouseY: number,
  entity?: Package | Class | DrawableClassCommunication
};

type LayoutData = {
  height: number,
  width: number,
  depth: number,
  positionX: number,
  positionY: number,
  positionZ: number
};

export default class ApplicationRendering extends GlimmerComponent<Args> {
  // #region CLASS FIELDS AND GETTERS

  @service('configuration')
  configuration!: Configuration;

  @service('heatmap-configuration')
  heatmapConf!: HeatmapConfiguration;

  @service()
  worker!: any;

  @service('user-settings')
  userSettings!: UserSettings;

  @service('application-renderer')
  applicationRenderer!: ApplicationRenderer

  @service('vr-scene')
  private sceneService!: VrSceneService;

  debug = debugLogger('ApplicationRendering');

  canvas!: HTMLCanvasElement;

  @tracked
  hammerInteraction: HammerInteraction;

  @service('local-user')
  private localUser!: LocalUser;

  renderer!: THREE.WebGLRenderer;

  clock = new THREE.Clock();

  // Used to display performance and memory usage information
  threePerformance: THREEPerformance | undefined;

  // Incremented every time a frame is rendered
  animationFrameId = 0;

  // Used to register (mouse) events
  hoveredObject: BaseMesh | null;

  drawableClassCommunications: DrawableClassCommunication[] = [];


  get rightClickMenuItems() {
    const commButtonTitle = this.configuration.isCommRendered ? 'Hide Communication' : 'Add Communication';
    const heatmapButtonTitle = this.heatmapConf.heatmapActive ? 'Disable Heatmap' : 'Enable Heatmap';
    const pauseButtonTitle = this.args.visualizationPaused ? 'Resume Visualization' : 'Pause Visualization';

    return [
      { title: 'Reset View', action: this.resetView },
      { title: 'Open All Components', action: this.openAllComponents },
      { title: commButtonTitle, action: this.toggleCommunicationRendering },
      { title: heatmapButtonTitle, action: this.toggleHeatmap },
      { title: pauseButtonTitle, action: this.args.toggleVisualizationUpdating },
      { title: 'Open Sidebar', action: this.args.openDataSelection },
    ];
  }

  get scene() {
    return this.sceneService.scene
  }

  get camera() {
    return this.localUser.camera
  }

  get applicationObject3D() {
    // TODO might be undefined
    // this.debug('Application3D Object:' + this.args.landscapeData.application!.id)
    return this.applicationRenderer.getApplicationById(this.args.landscapeData.application!.id)!;
  }

  @tracked
  popupData: PopupData | null = null;

  isFirstRendering = true;

  // these spheres represent the cursor of the other users
  // and are only visible in collaborative mode
  spheres: Map<string, Array<THREE.Mesh>> = new Map();

  spheresIndex = 0;

  get font() {
    return this.args.font;
  }

  get appSettings() {
    return this.userSettings.applicationSettings;
  }



  // #endregion CLASS FIELDS AND GETTERS

  // #region COMPONENT AND SCENE INITIALIZATION

  constructor(owner: any, args: Args) {
    super(owner, args);
    this.debug('Constructor called');

    this.render = this.render.bind(this);
    this.hammerInteraction = HammerInteraction.create();

    this.hoveredObject = null;
  }

  @action
  canvasInserted(canvas: HTMLCanvasElement) {
    this.debug('Canvas inserted');

    this.canvas = canvas;
    this.hammerInteraction.setupHammer(canvas);

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

    if (this.configuration.popupPosition) {
      this.popupData = {
        mouseX: this.configuration.popupPosition.x,
        mouseY: this.configuration.popupPosition.y,
      };
    }

    try {
      await perform(this.loadApplication);
    } catch (e) {
      // console.log(e);
    }
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

    const { value: showFpsCounter } = this.userSettings.applicationSettings.showFpsCounter;

    if (showFpsCounter) {
      this.threePerformance = new THREEPerformance();
    }
  }

  initServices() {
    this.applicationRenderer.font = this.font;
    // this.scene.
    // if (this.args.landscapedata) {
    //   const { landscapetoken } = this.args.landscapedata.structurelandscapedata;
    //   const timestamp = this.args.selectedtimestamprecords[0]?.timestamp
    //     || this.timestamprepo.getlatesttimestamp(landscapetoken)?.timestamp
    //     || new date().gettime();
    //   this.timestampservice.settimestamplocally(
    //     timestamp,
    //     this.args.landscapedata.structurelandscapedata,
    //     this.args.landscapedata.dynamiclandscapedata,
    //   );
    // } else {
    //   alertifyhandler.showalertifywarning('no landscape found!');
    // }
  }

  /**
   * Creates a PerspectiveCamera according to canvas size and sets its initial position
   */
  initCamera() {
    const { width, height } = this.canvas;
    this.localUser.defaultCamera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    this.camera.position.set(0, 0, 100);
    this.debug('Camera added');
  }

  /**
   * Initiates a WebGLRenderer
   */
  initRenderer() {
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
  }

  /**
   * Creates a SpotLight and an AmbientLight and adds it to the scene
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
  }

  // #endregion COMPONENT AND SCENE INITIALIZATION

  // #region MOUSE EVENT HANDLER
  @action
  handleSingleClick(intersection: THREE.Intersection | null) {
    if (!intersection) return;

    const mesh = intersection.object;
    this.singleClickOnMesh(mesh);
  }

  @action
  singleClickOnMesh(mesh: THREE.Object3D) {
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
    }
  }

  @action
  handleDoubleClick(intersection: THREE.Intersection | null) {
    if (!intersection) return;
    const mesh = intersection.object;
    this.doubleClickOnMesh(mesh);
  }

  @action
  doubleClickOnMesh(mesh: THREE.Object3D) {
    // Toggle open state of clicked component
    if (mesh instanceof ComponentMesh) {
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
  handleMouseMove(intersection: THREE.Intersection | null) {
    if (!intersection) return;
    const mesh = intersection.object;
    this.mouseMoveOnMesh(mesh);
  }

  @action
  mouseMoveOnMesh(mesh: THREE.Object3D) {
    const { value: enableHoverEffects } = this.appSettings.enableHoverEffects;

    // Update hover effect
    if (mesh === undefined && this.hoveredObject) {
      this.hoveredObject.resetHoverEffect();
      this.hoveredObject = null;
    } else if (mesh instanceof BaseMesh && enableHoverEffects && !this.heatmapConf.heatmapActive) {
      if (this.hoveredObject) { this.hoveredObject.resetHoverEffect(); }

      this.hoveredObject = mesh;
      mesh.applyHoverEffect();
    }

    // Hide popups when mouse moves
    if (!this.appSettings.enableCustomPopupPosition.value) {
      this.popupData = null;
    }
  }

  @action
  handleMouseWheel(delta: number) {
    // Do not show popups while zooming
    if (!this.appSettings.enableCustomPopupPosition.value) {
      this.popupData = null;
    }

    // Change zoom depending on mouse wheel direction
    this.camera.position.z += delta * 3.5;
  }

  @action
  handleMouseOut() {
    if (!this.appSettings.enableCustomPopupPosition.value) {
      this.popupData = null;
    }
  }

  /*   handleMouseEnter() {
  } */
  @action
  handleMouseStop(intersection: THREE.Intersection | null, mouseOnCanvas: Position2D) {
    if (!intersection) return;
    const mesh = intersection.object;

    if (mesh && (mesh.parent instanceof ApplicationObject3D)) {
      const parentObj = mesh.parent;
      const pingPosition = parentObj.worldToLocal(intersection.point);
      if (this.localUser.mousePing) {
        taskFor(this.localUser.mousePing.ping).perform({ parentObj: parentObj, position: pingPosition })
      }
    }

    this.mouseStopOnMesh(mesh, mouseOnCanvas);
  }

  @action
  mouseStopOnMesh(mesh: THREE.Object3D, mouseOnCanvas: Position2D) {
    // Show information as popup is mouse stopped on top of a mesh
    if ((mesh instanceof ClazzMesh || mesh instanceof ComponentMesh
      || mesh instanceof ClazzCommunicationMesh)) {
      this.popupData = {
        mouseX: mouseOnCanvas.x,
        mouseY: mouseOnCanvas.y,
        entity: mesh.dataModel,
      };
    }
  }

  @action
  handlePanning(delta: { x: number, y: number }, button: 1 | 2 | 3) {
    const LEFT_MOUSE_BUTTON = 1;
    const RIGHT_MOUSE_BUTTON = 3;

    if (button === RIGHT_MOUSE_BUTTON) {
      // Rotate object
      this.applicationObject3D.rotation.x += delta.y / 100;
      this.applicationObject3D.rotation.y += delta.x / 100;
    } else if (button === LEFT_MOUSE_BUTTON) {
      // Move landscape further if camera is far away
      const ZOOM_CORRECTION = (Math.abs(this.camera.position.z) / 4.0);

      // Divide delta by 100 to achieve reasonable panning speeds
      const xOffset = (delta.x / 100) * -ZOOM_CORRECTION;
      const yOffset = (delta.y / 100) * ZOOM_CORRECTION;

      // Adapt camera position (apply panning)
      this.camera.position.x += xOffset;
      this.camera.position.y += yOffset;
    }
  }

  // #endregion MOUSE EVENT HANDLER

  // #region SCENE POPULATION

  @task *
    loadApplication() {
    // this.applicationObject3D.dataModel = this.args.landscapeData.application!;
    try {
      // yield perform(this.applicationRenderer.addApplicationTask, this.applicationObject3D.dataModel);
      yield perform(this.applicationRenderer.addApplicationTask, this.args.landscapeData.application!);
      // this.applicationObject3D.traces = this.args.landscapeData.dynamicLandscapeData;

      const position = new THREE.Vector3(5, 5, 0);
      this.applicationObject3D.position.copy(position)

      if (this.isFirstRendering) {
        // Display application nicely for first rendering
        applyDefaultApplicationLayout(this.applicationObject3D);
        this.addCommunication();
        this.applicationObject3D.resetRotation();

        this.isFirstRendering = false;
      }
    } catch (e) {
      console.log(e);
    }
  }

  // #endregion SCENE POPULATION

  // #region COLLABORATIVE
  @action
  setPerspective(position: number[], rotation: number[]) {
    this.camera.position.fromArray(position);
    this.applicationObject3D.rotation.fromArray(rotation);
  }
  // #endregion COLLABORATIVE

  // #region HEATMAP



  removeHeatmap() {
    this.applicationObject3D.setOpacity(1);
    removeHeatmapHelperLines(this.applicationObject3D);

    const foundationMesh = this.applicationObject3D
      .getBoxMeshbyModelId(this.args.landscapeData.application!.id);

    if (foundationMesh && foundationMesh instanceof FoundationMesh) {
      foundationMesh.setDefaultMaterial();
    }

    updateHighlighting(this.applicationObject3D, this.drawableClassCommunications, 1);

    this.heatmapConf.currentApplication = null;
    this.heatmapConf.heatmapActive = false;
  }

  // #endregion HEATMAP

  // #region RENDERING LOOP

  /**
   * Main rendering function
   */
  render() {
    if (this.isDestroyed) { return; }

    const animationId = requestAnimationFrame(this.render);
    this.animationFrameId = animationId;

    const { value: showFpsCounter } = this.userSettings.applicationSettings.showFpsCounter;

    if (showFpsCounter && !this.threePerformance) {
      this.threePerformance = new THREEPerformance();
    } else if (!showFpsCounter && this.threePerformance) {
      this.threePerformance.removePerformanceMeasurement();
      this.threePerformance = undefined;
    }

    if (this.threePerformance) {
      this.threePerformance.threexStats.update(this.renderer);
      this.threePerformance.stats.begin();
    }

    if (this.applicationObject3D) {
      this.applicationObject3D.animationMixer?.update(this.clock.getDelta());
    }

    this.renderer.render(this.scene, this.localUser.camera);

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
    const sphereGeometry = new THREE.SphereBufferGeometry(0.4, 32, 32);
    const sphereMaterial = new THREE.MeshBasicMaterial({ color });

    for (let i = 0; i < 30; i++) {
      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      this.scene.add(sphere);
      spheres.push(sphere);
    }
    return spheres;
  }

  // #endregion RENDERING LOOP

  // #region ACTIONS

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
      if (isClass(entity)) {
        return getAllAncestorComponents(entity.parent);
      }

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
   * Sets rotation of application and position of camera to default positon
   */
  @action
  resetView() {
    this.camera.position.set(0, 0, 100);
    this.applicationObject3D.resetRotation();
  }

  /**
   * Call this whenever the canvas is resized. Updated properties of camera
   * and renderer.
   *
   * @param outerDiv HTML element containing the canvas
   */
  @action
  resize(outerDiv: HTMLElement) {
    const width = Number(outerDiv.clientWidth);
    const height = Number(outerDiv.clientHeight);

    // Update renderer and camera according to new canvas size
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Performs a run to re-populate the scene
   */
  @action
  onLandscapeUpdated() {
    perform(this.loadApplication);
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
    highlightTrace(trace, traceStep, this.applicationObject3D,
      this.drawableClassCommunications, this.args.landscapeData.structureLandscapeData, value);
  }

  @action
  removeHighlighting() {
    removeHighlighting(this.applicationObject3D);
  }

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

  @action
  triggerHeatmapVisualization() {
    const metricName = this.heatmapConf.selectedMetric?.name;

    if (metricName) {
      this.heatmapConf.setSelectedMetricForCurrentMode(metricName);
    }

    if (this.heatmapConf.heatmapActive) {
      this.applicationRenderer.applyHeatmap(this.applicationObject3D);
    }
  }

  @action
  updateMetric(metric: Metric) {
    const metricName = metric.name;

    this.heatmapConf.setSelectedMetricForCurrentMode(metricName);

    if (this.heatmapConf.heatmapActive) {
      this.applicationRenderer.applyHeatmap(this.applicationObject3D);
    }
  }

  @action
  toggleHeatmap() {
    // Avoid unwanted reflections in heatmap mode
    this.setSpotLightVisibilityInScene(this.heatmapConf.heatmapActive);

    if (this.heatmapConf.heatmapActive) {
      this.removeHeatmap();
    } else {
      // TODO: Check whether new calculation of heatmap is necessary
      perform(this.applicationRenderer.calculateHeatmapTask, this.applicationObject3D, () => {
        this.applicationRenderer.applyHeatmap(this.applicationObject3D);
      });
    }
  }

  // #endregion ACTIONS

  // #region COMPONENT AND SCENE CLEAN-UP

  willDestroy() {
    super.willDestroy();

    cancelAnimationFrame(this.animationFrameId);
    this.cleanUpApplication();
    this.renderer.dispose();
    this.renderer.forceContextLoss();

    this.heatmapConf.cleanup();
    this.configuration.isCommRendered = true;

    if (this.threePerformance) {
      this.threePerformance.removePerformanceMeasurement();
    }

    this.debug('Cleaned up application rendering');
  }

  cleanUpApplication() {
    this.applicationObject3D.removeAllEntities();
    removeHighlighting(this.applicationObject3D);
  }

  // #endregion COMPONENT AND SCENE CLEAN-UP

  // #region ADDITIONAL HELPER FUNCTIONS

  /**
   * Sets all objects within the scene of type SpotLight to desired visibility
   *
   * @param isVisible Determines whether a spotlight is visible or not
   */
  setSpotLightVisibilityInScene(isVisible = true) {
    this.scene.children.forEach((child) => {
      if (child instanceof THREE.SpotLight) {
        child.visible = isVisible;
      }
    });
  }

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
