import { getOwner } from '@ember/application';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import GlimmerComponent from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import LocalUser from 'collaborative-mode/services/local-user';
import { perform } from 'ember-concurrency-ts';
import debugLogger from 'ember-debug-logger';
import { LandscapeData } from 'explorviz-frontend/controllers/visualization';
import { Position2D } from 'explorviz-frontend/modifiers/interaction-modifier';
import RenderingLoop from 'explorviz-frontend/rendering/application/rendering-loop';
import ApplicationRenderer from 'explorviz-frontend/services/application-renderer';
import Configuration from 'explorviz-frontend/services/configuration';
import EntityManipulation from 'explorviz-frontend/services/entity-manipulation';
import HighlightingService from 'explorviz-frontend/services/highlighting-service';
import LandscapeRenderer from 'explorviz-frontend/services/landscape-renderer';
import { Timestamp } from 'explorviz-frontend/services/repos/timestamp-repository';
import ToastMessage from 'explorviz-frontend/services/toast-message';
import UserSettings from 'explorviz-frontend/services/user-settings';
import AlertifyHandler from 'explorviz-frontend/utils/alertify-handler';
import focusCameraOn from 'explorviz-frontend/utils/application-rendering/camera-controls';
import { applyDefaultApplicationLayout, moveCameraTo, openComponentMesh } from 'explorviz-frontend/utils/application-rendering/entity-manipulation';
import { removeHighlighting } from 'explorviz-frontend/utils/application-rendering/highlighting';
import { Span, Trace } from 'explorviz-frontend/utils/landscape-schemes/dynamic-data';
import {
  Application, Class, Node, Package,
} from 'explorviz-frontend/utils/landscape-schemes/structure-data';
import { defaultScene } from 'explorviz-frontend/utils/scene';
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
import HeatmapConfiguration from 'heatmap/services/heatmap-configuration';
import THREE, { Vector3 } from 'three';
import SpectateUserService from 'virtual-reality/services/spectate-user';
import CloseIcon from 'virtual-reality/utils/view-objects/vr/close-icon';

interface Args {
  readonly id: string;
  readonly landscapeData: LandscapeData;
  readonly visualizationPaused: boolean;
  readonly selectedTimestampRecords: Timestamp[];
  openDataSelection(): void;
  toggleVisualizationUpdating(): void;
  switchToAR(): void,
  switchToVR(): void,
}

type PopupData = {
  mouseX: number,
  mouseY: number,
  entity: Node | Application | Package | Class | ClazzCommuMeshDataModel,
  isPinned: boolean,
};
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

  @service('toast-message')
  toastMessage!: ToastMessage;

  @service('user-settings')
  userSettings!: UserSettings;

  @service('local-user')
  private localUser!: LocalUser;

  @service('landscape-renderer')
  private landscapeRenderer!: LandscapeRenderer;

  @service('heatmap-configuration')
  heatmapConf!: HeatmapConfiguration;

  @service('application-renderer')
  applicationRenderer!: ApplicationRenderer;

  @service('highlighting-service')
  highlightingService!: HighlightingService;

  @service('entity-manipulation')
  // @ts-ignore since it is used in template
  private entityManipulation!: EntityManipulation;

  @service('spectate-user')
  private spectateUserService!: SpectateUserService;

  webglrenderer!: THREE.WebGLRenderer;

  @tracked
  canvas!: HTMLCanvasElement;

  debug = debugLogger('LandscapeRendering');

  timer!: any;

  // Is set to false until first landscape is rendered
  initDone: boolean;

  mouseMovementActive: boolean = true;

  renderingLoop!: RenderingLoop;

  applicationId: string = '1';

  @tracked
  popupData: PopupData[] = [];

  isFirstRendering = true;

  hoveredObject: BaseMesh | null = null;

  @tracked
  selectedApplicationId: string = '';

  @tracked
  scene: THREE.Scene;

  updatables: any[] = [];

  get selectedApplicationObject3D() {
    return this.applicationRenderer.getApplicationById(this.selectedApplicationId);
  }

  @tracked
  mousePosition: Vector3 = new Vector3(0, 0, 0);

  get rightClickMenuItems() {
    const commButtonTitle = this.configuration.isCommRendered ? 'Hide Communication' : 'Add Communication';
    const heatmapButtonTitle = this.heatmapConf.heatmapActive ? 'Disable Heatmap' : 'Enable Heatmap';
    const pauseItemtitle = this.args.visualizationPaused ? 'Resume Visualization' : 'Pause Visualization';

    return [
      { title: 'Reset View', action: this.resetView },
      { title: 'Open All Components', action: this.applicationRenderer.openAllComponentsOfAllApplications },
      { title: commButtonTitle, action: this.applicationRenderer.toggleCommunicationRendering },
      { title: heatmapButtonTitle, action: this.heatmapConf.toggleHeatmap },
      { title: pauseItemtitle, action: this.args.toggleVisualizationUpdating },
      { title: 'Open Sidebar', action: this.args.openDataSelection },
      { title: 'Enter AR', action: this.args.switchToAR },
      { title: 'Enter VR', action: this.args.switchToVR },
    ];
  }

  get raytraceObjects() {
    return [this.landscapeRenderer.landscapeObject3D, ...this.applicationRenderer.raycastObjects];
  }

  get camera() {
    return this.localUser.defaultCamera;
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
    this.scene = defaultScene();
    this.scene.background = this.configuration.landscapeColors.backgroundColor;
    this.landscapeRenderer.resetAndAddToScene(this.scene);
    this.applicationRenderer.resetAndAddToScene(this.scene, this.updatables);
    // reset to default
    this.toastMessage.init();
    this.applicationRenderer.initCallback = this.initializeNewApplication.bind(this);
    this.debug('Lights and objetcs added called');
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

    // scene cleanup
    this.initThreeJs();

    this.resize(outerDiv);
    this.initDone = true;
  }

  /**
   * Calls all three related init functions and adds the three
   * performance panel if it is activated in user settings
   */
  initThreeJs() {
    this.initScene();
    this.initCamera();
    this.initRenderer();

    this.renderingLoop = RenderingLoop.create(getOwner(this).ownerInjection(),
      {
        camera: this.camera,
        scene: this.scene,
        renderer: this.webglrenderer,
        updatables: this.updatables,
      });
    this.renderingLoop.start();
    // addSpheres('skyblue', this.mousePosition, this.scene, this.updatables);
  }

  /**
   * Creates a PerspectiveCamera according to canvas size and sets its initial position
   */
  initCamera() {
    const { width, height } = this.canvas;
    this.localUser.defaultCamera.aspect = width / height;
    this.localUser.defaultCamera.position.set(0, 3, 0);
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

    this.localUser.renderer = this.webglrenderer;
    this.landscapeRenderer.webglrenderer = this.webglrenderer;
    this.updatables.push(this.spectateUserService);
    this.debug('Renderer set up');
  }

  /**
   * Creates a DirectionalLight and adds it to the scene
   */
  initScene() {
    this.debug('Lights added');
  }

  initVisualization(applicationObject3D: ApplicationObject3D) {
    const applicationAnimation = () => {
      // applicationObject3D animation
      const period = 4000;
      const times = [0, period];
      let animationStartCoordinateApplicationObject3D = 0;
      let values = [animationStartCoordinateApplicationObject3D, 360];

      const trackName = '.rotation[y]';

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
      this.updatables.push(applicationObject3D);
    };

    applicationAnimation();
  }
  // #endregion COMPONENT AND SCENE INITIALIZATION

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

    // is not called before other e.g. vr-rendering is inserted:
    // https://github.com/emberjs/ember.js/issues/18873
    // this.applicationRenderer.cleanUpApplications();
    this.webglrenderer.dispose();
    this.webglrenderer.forceContextLoss();

    this.heatmapConf.cleanup();
    this.renderingLoop.stop();
    this.configuration.isCommRendered = true;

    this.debug('Cleaned up application rendering');

    // Clean up WebGL rendering context by forcing context loss
    const gl = this.canvas.getContext('webgl');
    if (!gl) {
      return;
    }
    const glExtension = gl.getExtension('WEBGL_lose_context');
    if (!glExtension) return;
    glExtension.loseContext();

    this.debug('cleanup landscape rendering');

    // Clean up all remaining meshes
    this.landscapeRenderer.landscapeObject3D.removeAllChildren();
  }

  // #endregion COMPONENT AND SCENE CLEAN-UP

  // #region ACTIONS

  @action
  resize(outerDiv: HTMLElement) {
    const width = Number(outerDiv.clientWidth);
    const height = Number(outerDiv.clientHeight);

    // Update renderer and camera according to canvas size
    this.webglrenderer.setSize(width, height);
    this.localUser.defaultCamera.aspect = width / height;
    this.localUser.defaultCamera.updateProjectionMatrix();
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
        trace, traceStep,
        this.selectedApplicationObject3D,
        this.args.landscapeData.structureLandscapeData,
      );
    }
  }

  @action
  removeHighlighting() {
    if (this.selectedApplicationObject3D) {
      removeHighlighting(this.selectedApplicationObject3D);
    }
  }

  // Listener-Callbacks. Override in extending components
  //
  @action
  resetView() {
    this.landscapeRenderer.resetBrowserView();
  }

  @action
  initializeNewApplication(applicationObject3D: ApplicationObject3D) {
    applyDefaultApplicationLayout(applicationObject3D);
    applicationObject3D.resetRotation();

    this.initVisualization(applicationObject3D);
    this.selectedApplicationId = applicationObject3D.dataModel.id;
    this.heatmapConf.currentApplication = applicationObject3D;
    focusCameraOn(applicationObject3D, this.camera, this.renderingLoop.controls);
  }
  // #endregion ACTIONS

  // #region MOUSE EVENT HANDLER
  @action
  handleSingleClick(intersection: THREE.Intersection) {
    if (intersection) {
      this.mousePosition.copy(intersection.point);
      this.handleSingleClickOnMesh(intersection.object);
    }
  }

  @action
  handleSingleClickOnMesh(mesh: THREE.Object3D) {
    // User clicked on blank spot on the canvas
    if (mesh === undefined) {
      this.removeHighlighting();
    } else if (mesh instanceof ComponentMesh || mesh instanceof ClazzMesh
      || mesh instanceof ClazzCommunicationMesh) {
      if (mesh.parent instanceof ApplicationObject3D) {
        this.highlightingService.highlightComponent(mesh!.parent, mesh);
      }
    } else if (mesh instanceof FoundationMesh) {
      if (mesh.parent instanceof ApplicationObject3D) {
        this.selectActiveApplication(mesh.parent);
      }
      focusCameraOn(mesh, this.camera, this.renderingLoop.controls);
    } else if (mesh instanceof NodeMesh) {
      focusCameraOn(mesh, this.camera, this.renderingLoop.controls);
    } else if (mesh instanceof CloseIcon) {
      const self = this;
      mesh.close().then((closedSuccessfully: boolean) => {
        if (!closedSuccessfully) AlertifyHandler.showAlertifyError('Application could not be closed');
        if (self.selectedApplicationObject3D === mesh.parent) {
          self.selectedApplicationId = '';
        }
      });
    }
  }

  runOrRestartMouseMovementTimer() {
    this.mouseMovementActive = true;
    clearTimeout(this.timer);
    this.timer = setTimeout(
      () => {
        this.mouseMovementActive = false;
      }, 25000,
    );
  }

  @action
  handleDoubleClick(intersection: THREE.Intersection) {
    if (intersection) {
      this.handleDoubleClickOnMesh(intersection.object);
    }
  }

  selectActiveApplication(applicationObject3D: ApplicationObject3D) {
    if (this.selectedApplicationObject3D !== applicationObject3D) {
      this.selectedApplicationId = applicationObject3D.dataModel.id;
      this.heatmapConf.setActiveApplication(applicationObject3D);
    }
    this.heatmapConf.setActiveApplication(applicationObject3D);
  }

  @action
  handleDoubleClickOnMesh(mesh: THREE.Object3D) {
    // Handle application
    if (mesh instanceof ApplicationMesh) {
      this.showApplication(mesh.dataModel.id);
      // Handle nodeGroup
    } else if (mesh instanceof ComponentMesh) {
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
  handleMouseMove(intersection: THREE.Intersection) {
    this.runOrRestartMouseMovementTimer();
    if (intersection) {
      this.mousePosition.copy(intersection.point);
      this.handleMouseMoveOnMesh(intersection.object);
    }
  }

  @action
  handleMouseMoveOnMesh(mesh: THREE.Object3D | undefined) {
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
    } else if (mesh instanceof BaseMesh
      && enableAppHoverEffects && !this.heatmapConf.heatmapActive) {
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
    const applicationObject3D = this.applicationRenderer.getApplicationById(appId);
    if (applicationObject3D) {
      focusCameraOn(applicationObject3D, this.camera, this.renderingLoop.controls);
    } else {
      perform(
        this.applicationRenderer.openApplicationTask,
        appId,
      );
    }
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
    if ((mesh instanceof NodeMesh || mesh instanceof ApplicationMesh
      || mesh instanceof ClazzMesh || mesh instanceof ComponentMesh
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

  // #endregion MOUSE EVENT HANDLER
  /**
   * Opens all parents / components of a given component or clazz.
   * Adds communication and restores highlighting.
   *
   * @param entity Component or Clazz of which the mesh parents shall be opened
   */
  @action
  openParents(entity: Package | Class) {
    if (!this.selectedApplicationObject3D) {
      return;
    }
    const applicationObject3D = this.selectedApplicationObject3D;

    // TODO after here it should probably be moved to the application renderer.
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
      const ancestorMesh = applicationObject3D.getBoxMeshbyModelId(anc.id);
      if (ancestorMesh instanceof ComponentMesh) {
        openComponentMesh(ancestorMesh, applicationObject3D);
      }
    });
    this.applicationRenderer.updateApplicationObject3DAfterUpdate(applicationObject3D);
  }

  /**
   * Highlights a given component or clazz
   *
   * @param entity Component or clazz which shall be highlighted
   */
  @action
  highlightModel(entity: Package | Class) {
    if (this.selectedApplicationObject3D) {
      this.highlightingService.highlightModel(entity, this.selectedApplicationObject3D);
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
    const applicationCenter = this.selectedApplicationObject3D.layout.center;
    moveCameraTo(emberModel, applicationCenter, this.camera,
      this.selectedApplicationObject3D, this.renderingLoop.controls.target,
      this.args.landscapeData.dynamicLandscapeData);
  }

  @action
  updateColors() {
    this.entityManipulation.updateColors(this.scene);
  }
}
