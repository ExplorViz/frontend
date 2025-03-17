import { createScene } from 'react-lib/src//utils/scene';
import * as THREE from 'three';
import RenderingLoop from 'react-lib/src/rendering/application/rendering-loop';
import { MapControls } from 'react-lib/src/utils/controls/MapControls';
import { OrbitControls } from 'react-lib/src/utils/controls/OrbitControls';
import { PointerLockControls } from 'react-lib/src/utils/controls/PointerLockControls';
import { Font } from 'three/examples/jsm/loaders/FontLoader';

type UserActionType = 'zoomin' | 'zoomout' | 'rotate' | 'move';

class UserActions {
  creationDate: Date;
  actionType: UserActionType;

  constructor(actionType: UserActionType) {
    this.creationDate = new Date();
    this.actionType = actionType;
  }

  getActionDetails() {
    return `Action: ${this.actionType}, Created at: ${this.creationDate.toISOString()}`;
  }
}
class ImmersiveViewCappableCrossing {
  creationDate: Date;
  immersiveView: ImmersiveViewCapable | null;

  constructor(immersiveView: ImmersiveViewCapable | null) {
    this.creationDate = new Date();
    this.immersiveView = immersiveView;
  }

  getActionDetails() {
    return `Action: ImmersiveViewObject, Created at: ${this.creationDate.toISOString()}`;
  }
}
type CombinedAction = UserActions | ImmersiveViewCappableCrossing;

function sortActionsByTime(
  immersiveActions: ImmersiveViewCappableCrossing[],
  actions: UserActions[]
): CombinedAction[] {
  // Combine the two lists into one
  const combinedActions: CombinedAction[] = [...immersiveActions, ...actions];

  // Sort by creationDate, latest actions will be at the end
  combinedActions.sort(
    (a, b) => a.creationDate.getTime() - b.creationDate.getTime()
  );

  return combinedActions;
}
// function findLastZoomInIndex(combinedActions: CombinedAction[]): number {
//   // Iterate backwards through the list to find the last "zoomin" action
//   for (let i = combinedActions.length - 1; i >= 0; i--) {
//     const action = combinedActions[i];

//     // Check if the current action is of type 'Action' and has 'zoomin' actionType
//     if (action instanceof UserActions && action.actionType === 'zoomin') {
//       return i; // Return the index of the last "zoomin" action
//     }
//   }

// If no "zoomin" action is found, return -1 to indicate that
//   return -1;
// }
function findActionIndicesByType(
  combinedActions: CombinedAction[],
  actionType: string
): number[] {
  const indices: number[] = [];

  // Iterate through the list to find all occurrences of the specified actionType
  combinedActions.forEach((action, index) => {
    // Check if the current action is of type 'Action' and has the specified actionType
    if (action instanceof UserActions && action.actionType === actionType) {
      indices.push(index); // Store the index of the action
    }
  });

  return indices;
}
function findLastImmersiveViewCapableCrossing(
  combinedActions: CombinedAction[]
): number {
  // Iterate backwards through the list to find the last ImmersiveAction with a non-null immersiveView
  for (let i = combinedActions.length - 1; i >= 0; i--) {
    const action = combinedActions[i];

    // Check if the current action is an instance of ImmersiveAction and its immersiveView is not null
    if (
      action instanceof ImmersiveViewCappableCrossing &&
      action.immersiveView !== null
    ) {
      return i; // Return the index of the last ImmersiveAction with a non-null immersiveView
    }
  }

  // If no such action is found, return -1 to indicate that
  return -1;
}
function filterNumbersGreaterThan(
  numbers: number[],
  threshold: number
): number[] {
  // Use the filter method to return numbers greater than the threshold
  return numbers.filter((num) => num > threshold);
}

export class ImmersiveView {
  // Map: Mesh -> neue Scene

  // Tracking Actions
  // History of mouseovers FIFO Stack (Queue)
  mouseOverHistory: Array<ImmersiveViewCappableCrossing> =
    new Array<ImmersiveViewCappableCrossing>();
  // History of last User actions
  actionHistory: Array<UserActions> = new Array<UserActions>();

  // is another view active?
  insideImmersiveViewActive: boolean = false;

  // Scenes and Views
  originalScene: THREE.Scene | undefined;
  originalCamera: THREE.Camera | undefined;
  originalCanvas: HTMLCanvasElement | undefined;
  originalMapControl: MapControls | undefined;

  currentScene: THREE.Scene | undefined;
  currentCamera: THREE.Camera | undefined;
  currentCameraControl:
    | MapControls
    | OrbitControls
    | PointerLockControls
    | undefined;

  renderingLoop: RenderingLoop | undefined;
  font: Font | undefined;

  // Callbacks
  callbackOnEntering: (() => void) | undefined;
  callbackOnExit: (() => void) | undefined;

  // Singleton
  static #instance: ImmersiveView;
  /**
   *
   */
  constructor() {
    // Init
    this.resetData();
  }

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
  registerCanvas(canvas: HTMLCanvasElement) {
    this.originalCanvas = canvas;
  }
  registerMapControl(cameraControls: MapControls) {
    this.originalMapControl = cameraControls;
  }

  registerRenderingLoop(renderingLoop: RenderingLoop) {
    this.renderingLoop = renderingLoop;
  }

  resetData() {
    this.actionHistory = [];
    this.mouseOverHistory = [];
    this.mouseOverHistory.push(new ImmersiveViewCappableCrossing(null));
  }

  isImmersiveViewCapable(object: any): object is ImmersiveViewCapable {
    //magic happens here
    return (<ImmersiveViewCapable>object).enterImmersiveView !== undefined;
  }

  takeHistory(object: ImmersiveViewCapable | null) {
    if (
      this.mouseOverHistory[this.mouseOverHistory.length - 1].immersiveView !=
      object
    )
      this.mouseOverHistory.push(new ImmersiveViewCappableCrossing(object));
    // if (this.isImmersiveViewCapable(object)) {
    //   if (
    //     this.mouseOverHistory[this.mouseOverHistory.length - 1].immersiveView !=
    //     object
    //   )
    //     this.mouseOverHistory.push(new ImmersiveViewCappableCrossing(object));
    //   //this.mouseOverHistory.push(object);
    // } else {
    //   this.mouseOverHistory.push(0);
    // }
  }
  takeAction(newAction: UserActionType) {
    this.actionHistory.push(new UserActions(newAction));
    this.decide();
  }

  decide() {
    const sortedEvents = sortActionsByTime(
      this.mouseOverHistory,
      this.actionHistory
    );
    const indexOfLastObjectCrossing =
      findLastImmersiveViewCapableCrossing(sortedEvents);
    const indexesOfLastZoomIn = findActionIndicesByType(sortedEvents, 'zoomin');
    // Check if the last element in mouseOverHistory is an instance of ImmersiveViewCapable
    if (
      filterNumbersGreaterThan(indexesOfLastZoomIn, indexOfLastObjectCrossing)
        .length >= 1
    ) {
      if (
        indexOfLastObjectCrossing == -1 ||
        !this.isImmersiveViewCapable(
          sortedEvents[indexOfLastObjectCrossing].immersiveView
        )
      )
        return;
      sortedEvents[
        indexOfLastObjectCrossing
      ].immersiveView.immersiveViewHighlight();
      if (
        filterNumbersGreaterThan(indexesOfLastZoomIn, indexOfLastObjectCrossing)
          .length >= 3
      ) {
        this.triggerObject(
          sortedEvents[indexOfLastObjectCrossing].immersiveView
        );
      }
    }
    // const lastMouseOver =
    //   this.mouseOverHistory[this.mouseOverHistory.length - 1];
    // if (this.insideImmersiveViewActive) {
    //   debugger;
    //   if (this.actionHistory.length < 10) return;
    //   // we are inside an active immersive view. Check if the view shell be ended.
    //   const lastTenActions = this.actionHistory.slice(-10);
    //   const allZoomOut = lastTenActions.every((action) => action === 'zoomout');
    //   if (allZoomOut) {
    //     this.exitObject(lastMouseOver);
    //   }
    //   return;
    // }
    // Check if the last three user actions are "zoom"
    // const lastThreeActions = this.actionHistory.slice(-3);
    // const allZoom = lastThreeActions.every((action) => action === 'zoomin');
    // if (lastThreeActions.length == 0) return;
    // if (allZoom) {
    // }
  }

  triggerObject(viewObject: ImmersiveViewCapable) {
    // Create new Camera
    //const immersiveCam = new THREE.Camera();

    // Create new Scene
    //const immersiveScene = new THREE.Scene();
    // TODO fix browser
    //const sc: THREE.Scene = createScene('browser');

    // Callback
    if (this.callbackOnEntering != undefined) this.callbackOnEntering();

    // Alternative:
    // Get Orignals
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
    this.renderingLoop?.changeCamera(immersiveCam);
    // Deactivate current Map Control
    if (this.originalMapControl != undefined)
      this.originalMapControl.enabled = false;
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
    this.renderingLoop?.changeCamera(this.originalCamera);
    // Callback
    if (this.callbackOnExit != undefined) this.callbackOnExit();
    this.insideImmersiveViewActive = false;
    // enable Map Controls again
    if (this.originalMapControl != undefined)
      this.originalMapControl.enabled = true;
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
      originalCam: THREE.Camera,
      originalScene: THREE.Scene
    ): Array<THREE.Camera | THREE.Scene> {
      const ret = new Array<THREE.Camera | THREE.Scene>();
      //void originalScene; // TODO delete
      originalScene.remove(originalCam);
      //const iCamera = new THREE.PerspectiveCamera(45, 1920 / 1080, 1, 1000);
      const iCamera = originalCam.clone();
      // Rotate Camera to neutral position
      iCamera.rotation.set(0, 0, 0);
      // const camcontrol = new MapControls(
      //   iCamera,
      //   ImmersiveView.instance.originalCanvas
      // );

      const camcontrol = new PointerLockControls(
        iCamera,
        ImmersiveView.instance.originalCanvas
      );
      camcontrol.lock();
      const toExitTheView = () => ImmersiveView.instance.exitObject(this);
      camcontrol.addEventListener('unlock', () => {
        toExitTheView();
      });
      // ImmersiveView.instance.originalCanvas?.addEventListener(
      //   'mousedown',
      //   () => {
      //     camcontrol.moveForward(2);
      //   }
      // );

      // camcontrol.enableDamping = true;
      // camcontrol.dampingFactor = 0.3;
      // camcontrol.minDistance = 0.1;
      // camcontrol.maxDistance = 1;
      // camcontrol.maxPolarAngle = Math.PI / 2;
      // camcontrol.enablePan = false;
      // camcontrol.mouseButtons = {
      //   LEFT: THREE.MOUSE.ROTATE,
      //   // MIDDLE: MOUSE.DOLLY,
      //   RIGHT: THREE.MOUSE.ROTATE,
      // };
      // camcontrol.update();
      ImmersiveView.instance.currentCameraControl = camcontrol;
      //ret.push(orignalCam);
      ret.push(iCamera);
      ret.push(createScene('browser'));
      return ret;
      // throw new Error(
      //   'This function must be implemented in the child class. And return an Array with [0] -> Camera [1] -> Scene'
      // );
      return new Array<THREE.Camera | THREE.Scene>();
    }
    immersiveViewHighlight() {
      throw new Error('This function must be implemented in the child class.');
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
      orignalCam: THREE.Camera,
      originalScene: THREE.Scene,
      camera: THREE.Camera,
      scene: THREE.Scene
    ): void {
      ImmersiveView.instance.currentCameraControl.unlock();
      this.exitImmersiveView(camera, scene);
      originalScene.add(orignalCam);
    }
    exitImmersiveView(camera: THREE.Camera, scene: THREE.Scene): void {
      void camera; // TODO Delete
      void scene; // TODO Delete
      //this.pulseAnimation(true);
      // throw new Error(
      //   'Method not implemented. You can clean up something here'
      // );
    }
  };
}
