import debugLogger from 'ember-debug-logger';
import { createScene } from 'explorviz-frontend/utils/scene';
// import THREE from 'three';
import * as THREE from 'three';
import RenderingLoop from './rendering-loop';

type UserAction = 'zoomin' | 'zoomout' | 'rotate' | 'move';

export class ImmersiveView {
  // Map: Mesh -> neue Scene

  // Tracking Actions
  // History of mouseovers FIFO Stack (Queue)
  mouseOverHistory: Array<ImmersiveViewCapable | number> = new Array<
    ImmersiveViewCapable | number
  >();
  // History of last User actions
  actionHistory: Array<UserAction> = new Array<UserAction>();

  // is another view active?
  insideImmersiveViewActive: boolean = false;

  // Scenes and Views
  originalScene: THREE.Scene | undefined;
  originalCamera: THREE.Camera | undefined;

  currentScene: THREE.Scene | undefined;
  currentCamera: THREE.Camera | undefined;

  renderingLoop: RenderingLoop | undefined;

  // Singleton
  static #instance: ImmersiveView;
  debug = debugLogger('ImmersiveViewManager');
  /**
   *
   */
  constructor() {}

  public static get instance(): ImmersiveView {
    if (!ImmersiveView.#instance) {
      ImmersiveView.#instance = new ImmersiveView();
    }

    return ImmersiveView.#instance;
  }

  //registerObject() {}

  registerCamera(cam: THREE.Camera) {
    this.originalCamera = cam;
  }
  registerScene(scene: THREE.Scene) {
    this.originalScene = scene;
  }

  registerRenderingLoop(renderingLoop: RenderingLoop) {
    this.renderingLoop = renderingLoop;
  }

  resetData() {
    this.actionHistory.clear();
    this.mouseOverHistory.clear();
  }

  isImmersiveViewCapable(object: any): object is ImmersiveViewCapable {
    //magic happens here
    return (<ImmersiveViewCapable>object).enterImmersiveView !== undefined;
  }

  takeHistory(object: ImmersiveViewCapable | number) {
    if (this.isImmersiveViewCapable(object)) {
      if (this.mouseOverHistory[this.mouseOverHistory.length - 1] != object)
        this.mouseOverHistory.push(object);
    } else {
      this.mouseOverHistory.push(0);
    }
    this.decide();
  }

  decide() {
    // Check if the last three user actions are "zoom"
    const lastThreeActions = this.actionHistory.slice(-3);
    const allZoom = lastThreeActions.every((action) => action === 'zoomin');
    if (lastThreeActions.length == 0) return;
    if (allZoom) {
      // Check if the last element in mouseOverHistory is an instance of ImmersiveViewCapable
      const lastMouseOver =
        this.mouseOverHistory[this.mouseOverHistory.length - 1];
      if (this.isImmersiveViewCapable(lastMouseOver)) {
        this.triggerObject(lastMouseOver);
      }
    }
  }

  triggerObject(viewObject: ImmersiveViewCapable) {
    // Create new Camera
    //const immersiveCam = new THREE.Camera();

    // Create new Scene
    //const immersiveScene = new THREE.Scene();
    // TODO fix browser
    //const sc: THREE.Scene = createScene('browser');

    // Alternative:
    // Get Orignals
    //debugger;
    if (this.originalCamera == undefined || this.originalScene == undefined) {
      return;
    }
    const camandscene = viewObject._buildSceneandCamera(
      this.originalCamera,
      this.originalScene
    );
    const immersiveCam = camandscene[0] as THREE.Camera;
    const immersiveScene = camandscene[1] as THREE.Scene;

    this.insideImmersiveViewActive = true;
    // in Rendering loop poll for insideImmersiveViewActive.
    // if true -> change camera to the one provided by this view

    // Add Camera and Scene to class variables.
    this.currentScene = immersiveScene;
    this.currentCamera = immersiveCam;

    viewObject._enterImmersiveView(immersiveCam, immersiveScene);
    // Attach to render loop
    this.renderingLoop?.changeScene(immersiveScene);
    //this.renderingLoop?.changeCamera(immersiveCam);
  }
  exitObject(viewObject: ImmersiveViewCapable) {
    if (this.originalCamera == undefined || this.originalScene == undefined) {
      return;
    }
    if (this.currentCamera == undefined || this.currentScene == undefined) {
      return;
    }
    viewObject._exitImmersiveView(
      this.originalCamera,
      this.originalScene,
      this.currentCamera,
      this.currentScene
    );
    this.renderingLoop?.changeScene(this.originalScene);
    //this.renderingLoop?.changeCamera(this.originalCamera);
  }
}

interface ImmersiveViewCapable {
  //_triggerImmersiveView(): void;
  _buildSceneandCamera(
    Ocamera: THREE.Camera,
    Oscene: THREE.Scene
  ): Array<THREE.Camera | THREE.Scene>;
  buildSceneandCamera(
    Ocamera: THREE.Camera,
    Oscene: THREE.Scene
  ): Array<THREE.Camera | THREE.Scene>;
  _enterImmersiveView(camera: THREE.Camera, scene: THREE.Scene): void;
  enterImmersiveView(camera: THREE.Camera, scene: THREE.Scene): void;
  _exitImmersiveView(
    Ocamera: THREE.Camera,
    Oscene: THREE.Scene,
    camera: THREE.Camera,
    scene: THREE.Scene
  ): void;
  exitImmersiveView(camera: THREE.Camera, scene: THREE.Scene): void;
}

type Constructor = new (...args: any[]) => any;
/**
 * This Mixin can extend any kind of THREE Object class and implmenet the basic function of the `SemanticZoomableObject` Interface
 * Is gets the orignal class as a parameter and returns a new extended class that can be used to instanciate
 * const extendedClass = SemanticZoomableObjectBaseMixin(orignalClass)
 * extendedClass(orignal params);
 * @template Base
 * @param base
 * @returns
 */
export function ImmersiveViewMixin<Base extends Constructor>(base: Base) {
  return class extends base implements ImmersiveViewCapable {
    _buildSceneandCamera(
      orignalCam: THREE.Camera,
      originalScene: THREE.Scene
    ): Array<THREE.Camera | THREE.Scene> {
      // Either use a provided environment by buildSceneandCamera function or create a simple generic world.
      const target = this.buildSceneandCamera(orignalCam, originalScene);
      if (target.length == 0) {
        const newWorld = new Array<THREE.Camera | THREE.Scene>();
        // Create new Scene
        const iCamera = new THREE.PerspectiveCamera(45, 1920 / 1080, 1, 1000);
        // TODO fix browser
        const iScene: THREE.Scene = createScene('browser');
        newWorld.push(iCamera);
        newWorld.push(iScene);
        iCamera.position.set(5, 5, 5);
        iScene.add(iCamera);
        return newWorld;
      }
      //target[0].position.set(5, 5, 5);
      target[1].add(target[0]);
      return target;
    }
    buildSceneandCamera(
      orignalCam: THREE.Camera,
      originalScene: THREE.Scene
    ): Array<THREE.Camera | THREE.Scene> {
      const ret = new Array<THREE.Camera | THREE.Scene>();
      void originalScene; // TODO delete
      ret.push(orignalCam);
      ret.push(createScene('browser'));
      return ret;
      // throw new Error(
      //   'This function must be implemented in the child class. And return an Array with [0] -> Camera [1] -> Scene'
      // );
      return new Array<THREE.Camera | THREE.Scene>();
    }
    _enterImmersiveView(camera: THREE.Camera, sc: THREE.Scene) {
      // Call me first, triggerImmersiveView later!
      //this._buildSceneandCamera();
      ImmersiveView.instance.resetData();
      this.enterImmersiveView(camera, sc);
    }
    enterImmersiveView(camera: THREE.Camera, scene: THREE.Scene) {
      // Register Exit command
      //ImmersiveView.instance.exitObject(this);
      void camera; // TODO Delete
      void scene; // TODO Delete
      throw new Error('This function must be implemented in the child class.');
    }
    _exitImmersiveView(
      _orignalCam: THREE.Camera,
      _originalScene: THREE.Scene,
      camera: THREE.Camera,
      scene: THREE.Scene
    ): void {
      this.exitImmersiveView(camera, scene);
    }
    exitImmersiveView(camera: THREE.Camera, scene: THREE.Scene): void {
      void camera; // TODO Delete
      void scene; // TODO Delete
      // throw new Error(
      //   'Method not implemented. You can clean up something here'
      // );
    }
  };
}
