import debugLogger from 'ember-debug-logger';
import { defaultRaycastFilter } from 'explorviz-frontend/utils/raycaster';
import BaseMesh from 'explorviz-frontend/view-objects/3d/base-mesh';
import * as THREE from 'three';
import { canIntersectAllParentObjects } from './view-objects/interfaces/intersectable-object';
import TeleportMesh from './view-objects/vr/teleport-mesh';
import VRControllerBindingsList from './vr-controller/vr-controller-bindings-list';
import VRControllerLabelGroup from './vr-controller/vr-controller-label-group';
import VrControllerModel from './vr-controller/vr-controller-model';
import VrControllerModelFactory from './vr-controller/vr-controller-model-factory';
import {
  displayAsSolidObject,
  displayAsWireframe,
} from './vr-helpers/wireframe';
import MenuGroup from './vr-menus/menu-group';
import { ControllerId } from 'collaboration/utils/web-socket-messages/types/controller-id';
/**
 * Length of the controller's ray when there is no intersection point.
 */
export const DEFAULT_RAY_LENGTH = 1000;

export type VRControllerCallbackFunctions = {
  connected?(controller: VRController, event: THREE.Event): void;
  disconnected?(controller: VRController): void;

  thumbpadTouch?(controller: VRController, axes: number[]): void;
  thumbpadDown?(controller: VRController, axes: number[]): void;
  thumbpadPress?(controller: VRController, axes: number[]): void;
  thumbpadUp?(controller: VRController, axes: number[]): void;

  triggerDown?(controller: VRController): void;
  triggerPress?(controller: VRController, value: number): void;
  triggerUp?(controller: VRController): void;

  gripDown?(controller: VRController): void;
  gripPress?(controller: VRController): void;
  gripUp?(controller: VRController): void;

  menuUp?(controller: VRController): void;
  menuPress?(controller: VRController): void;
  menuDown?(controller: VRController): void;

  bButtonUp?(controller: VRController): void;
  bButtonPress?(controller: VRController): void;
  bButtonDown?(controller: VRController): void;

  updateIntersectedObject?(controller: VRController): void;
};

/**
 * A wrapper around the gamepad object which handles inputs to
 * a VR controller and provides update and callback functionalities.
 */
export default class VRController extends BaseMesh {
  debug = debugLogger('VRController');

  gamepadIndex: ControllerId;

  gamepad: Gamepad | null = null;

  color: THREE.Color;

  axes = [0, 0];

  thumbpadIsPressed = false;

  triggerIsPressed = false;

  gripIsPressed = false;

  menuIsPressed = false;

  bButtonIsPressed = false;

  timestamp = 0;

  eventCallbacks: VRControllerCallbackFunctions;

  gripSpace: THREE.Group;

  raySpace: THREE.Group;

  labelGroup: VRControllerLabelGroup;

  menuGroup: MenuGroup;

  ray: THREE.Line | null = null;

  controllerModel: VrControllerModel;

  intersectedObject: THREE.Intersection | undefined = undefined;

  raycaster: THREE.Raycaster;

  scene: THREE.Scene;

  teleportArea: TeleportMesh | null = null;

  enableTeleport: boolean = true;

  connected = false;

  get gamepadId() {
    return this.gamepad ? this.gamepad.id : 'unknown';
  }

  /**
   * Finds the controller whose buttons the labels in this group point to or
   * returns `null` if the group does not have a parent controller.
   */
  static findController(object: THREE.Object3D): VRController | null {
    let current = object.parent;
    while (current) {
      if (current instanceof VRController) return current;
      current = current.parent;
    }
    return null;
  }

  constructor({
    gamepadIndex,
    color,
    gripSpace,
    raySpace,
    menuGroup,
    bindings,
    scene,
  }: {
    gamepadIndex: ControllerId;
    color: THREE.Color;
    gripSpace: THREE.Group;
    raySpace: THREE.Group;
    menuGroup: MenuGroup;
    bindings: VRControllerBindingsList;
    scene: THREE.Scene;
  }) {
    super();
    // Init properties
    this.gamepadIndex = gamepadIndex;
    this.color = color;
    this.gripSpace = gripSpace;
    this.raySpace = raySpace;
    this.labelGroup = new VRControllerLabelGroup(bindings);
    this.menuGroup = menuGroup;
    this.raycaster = new THREE.Raycaster();
    this.scene = scene;
    this.eventCallbacks = bindings.makeCallbacks();

    // Init controller model
    const controllerModelFactory = VrControllerModelFactory.INSTANCE;
    this.controllerModel = controllerModelFactory.createControllerModel(
      this.gripSpace
    );
    this.raySpace.add(this.controllerModel);

    // Init children
    this.initChildren();

    this.findGamepad();

    this.initConnectionListeners();
  }

  initConnectionListeners() {
    const callbacks = this.eventCallbacks;

    this.gripSpace.addEventListener('connected', (event) => {
      this.connected = true;
      this.findGamepad();
      this.initTeleportArea();
      if (callbacks.connected) callbacks.connected(this, event);
    });
    this.gripSpace.addEventListener('disconnected', () => {
      this.connected = false;
      this.removeTeleportArea();
      if (callbacks.disconnected) callbacks.disconnected(this);
    });
  }

  setToSpectatingAppearance() {
    if (!this.connected) return;
    displayAsWireframe(this);
    this.removeTeleportArea();
    this.removeRay();
  }

  /**
   * Sets controller to be opaque, adds the respective ray and
   * initiates a teleport area.
   */
  setToDefaultAppearance() {
    if (!this.connected) return;
    displayAsSolidObject(this);
    this.initRay();
    this.initTeleportArea();
  }

  initChildren() {
    this.add(this.gripSpace);
    this.add(this.raySpace);
    this.raySpace.add(this.menuGroup);
    this.controllerModel.add(this.labelGroup);
  }

  findGamepad() {
    const gamepads = navigator.getGamepads();
    if (typeof gamepads.forEach !== 'function') return;

    gamepads.forEach((gamepad) => {
      if (gamepad && gamepad.index === this.gamepadIndex) {
        this.gamepad = gamepad;
      }
    });
  }

  /**
   * Updates the color of the controller's ray and teleport area.
   */
  updateControllerColor(color: THREE.Color) {
    this.color = color;
    this.removeRay();
    this.removeTeleportArea();
    this.initRay();
    this.initTeleportArea();
  }

  /**
   * Adds a line to the controller which is a visual representation of the hit
   * objects for raycasting.
   */
  initRay() {
    if (this.ray) return;

    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1),
    ]);

    const material = new THREE.LineBasicMaterial({
      color: this.color,
    });

    const line = new THREE.Line(geometry, material);
    line.scale.z = DEFAULT_RAY_LENGTH;

    this.ray = line;
    this.raySpace.add(this.ray);
  }

  /**
   * Adds a teleport area to the controller (if it is the utility controller)
   */
  initTeleportArea() {
    if (!this.teleportArea) {
      // Create teleport area
      this.teleportArea = new TeleportMesh(this.color);

      // Add teleport area to parent (usually the scene object)
      this.scene.add(this.teleportArea);
    }
  }

  removeRay() {
    if (!this.ray) return;

    // Remove and dispose ray
    this.raySpace.remove(this.ray);
    if (this.ray.material instanceof THREE.Material)
      this.ray.material.dispose();
    this.ray.geometry.dispose();
    this.ray = null;
  }

  removeTeleportArea() {
    const { teleportArea } = this;

    // Remove teleport area
    if (teleportArea) {
      teleportArea.deleteFromParent();
      teleportArea.disposeRecursively();
      this.teleportArea = null;
    }
  }

  update(delta: number) {
    this.updateGamepad();
    this.updateIntersectedObject();
    this.labelGroup.updateLabels();
    this.menuGroup.updateMenu(delta);
  }

  /**
   * Updates the current button states according to the gamepad object.
   * Whenever a button change or press event is registered, the according
   * callback functions (provided via the constructor) are called.
   */
  private updateGamepad() {
    const { gamepad } = this;
    if (!gamepad || this.timestamp === gamepad.timestamp) {
      return;
    }

    this.timestamp = gamepad.timestamp;
    const callbacks = this.eventCallbacks;

    // Also see: https://github.com/immersive-web/webxr-gamepads-module/blob/main/gamepads-module-explainer.md

    const TRIGGER_BUTTON = 0;
    const GRIP_BUTTON = 1;
    // const TOUCHPAD_BUTTON = 2;
    const THUMBPAD_BUTTON = 3;
    const A_BUTTON = 4;
    const B_BUTTON = 5;

    // const TOUCHPAD_X_AXIS = 0;
    // const TOUCHPAD_Y_AXIS = 1;
    const THUMBSTICK_X_AXIS = 2;
    const THUMBSTICK_Y_AXIS = 3;

    // Handle change in joystick / thumbpad position
    if (
      gamepad.axes.length >= 4 &&
      (this.axes[0] !== gamepad.axes[THUMBSTICK_X_AXIS] ||
        this.axes[1] !== gamepad.axes[THUMBSTICK_Y_AXIS])
    ) {
      [this.axes[0], this.axes[1]] = [
        gamepad.axes[THUMBSTICK_X_AXIS],
        gamepad.axes[THUMBSTICK_Y_AXIS],
      ];
      if (callbacks.thumbpadTouch) {
        callbacks.thumbpadTouch(this, this.axes);
      }
    }

    // Handle clicked / touched / released thumbpad
    if (
      gamepad.buttons.length > THUMBPAD_BUTTON &&
      this.thumbpadIsPressed !== gamepad.buttons[THUMBPAD_BUTTON].pressed
    ) {
      this.thumbpadIsPressed = gamepad.buttons[THUMBPAD_BUTTON].pressed;
      if (this.thumbpadIsPressed && callbacks.thumbpadDown) {
        callbacks.thumbpadDown(this, this.axes);
      } else if (!this.thumbpadIsPressed && callbacks.thumbpadUp) {
        callbacks.thumbpadUp(this, this.axes);
      }
    } else if (callbacks.thumbpadPress && this.thumbpadIsPressed) {
      callbacks.thumbpadPress(this, this.axes);
    }

    // Handle clicked / released trigger
    if (
      gamepad.buttons.length > TRIGGER_BUTTON &&
      this.triggerIsPressed !== gamepad.buttons[TRIGGER_BUTTON].pressed
    ) {
      this.triggerIsPressed = gamepad.buttons[TRIGGER_BUTTON].pressed;
      if (this.triggerIsPressed && callbacks.triggerDown) {
        callbacks.triggerDown(this);
      } else if (!this.triggerIsPressed && callbacks.triggerUp) {
        callbacks.triggerUp(this);
      }
    } else if (callbacks.triggerPress && this.triggerIsPressed) {
      callbacks.triggerPress(this, gamepad.buttons[TRIGGER_BUTTON].value);
    }

    // Handle clicked released grip button
    if (gamepad.buttons.length > GRIP_BUTTON && gamepad.buttons[GRIP_BUTTON]) {
      if (this.gripIsPressed !== gamepad.buttons[GRIP_BUTTON].pressed) {
        this.gripIsPressed = gamepad.buttons[GRIP_BUTTON].pressed;
        if (this.gripIsPressed && callbacks.gripDown) {
          callbacks.gripDown(this);
        } else if (!this.gripIsPressed && callbacks.gripUp) {
          callbacks.gripUp(this);
        }
      } else if (callbacks.gripPress && this.gripIsPressed) {
        callbacks.gripPress(this);
      }
    }

    // Handle clicked / released menu button
    if (gamepad.buttons.length > A_BUTTON && gamepad.buttons[A_BUTTON]) {
      if (this.menuIsPressed !== gamepad.buttons[A_BUTTON].pressed) {
        this.menuIsPressed = gamepad.buttons[A_BUTTON].pressed;
        if (this.menuIsPressed && callbacks.menuDown) {
          callbacks.menuDown(this);
        } else if (!this.menuIsPressed && callbacks.menuUp) {
          callbacks.menuUp(this);
        }
      } else if (callbacks.menuPress && this.menuIsPressed) {
        callbacks.menuPress(this);
      }
    }

    if (gamepad.buttons.length > B_BUTTON && gamepad.buttons[B_BUTTON]) {
      if (this.bButtonIsPressed !== gamepad.buttons[B_BUTTON].pressed) {
        this.bButtonIsPressed = gamepad.buttons[B_BUTTON].pressed;
        if (this.bButtonIsPressed && callbacks.bButtonDown) {
          callbacks.bButtonDown(this);
        } else if (!this.bButtonIsPressed && callbacks.bButtonUp) {
          callbacks.bButtonUp(this);
        }
      } else if (callbacks.bButtonPress && this.bButtonIsPressed) {
        callbacks.bButtonPress(this);
      }
    }
  }

  private computeNearestIntersection(): THREE.Intersection | undefined {
    const { raySpace } = this;
    const tempMatrix = new THREE.Matrix4();
    tempMatrix.identity().extractRotation(raySpace.matrixWorld);

    this.raycaster.ray.origin.setFromMatrixPosition(raySpace.matrixWorld);
    this.raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

    const intersections = this.raycaster.intersectObject(this.scene, true);

    for (let i = 0; i < intersections.length; i++) {
      const intersection = intersections[i];
      if (
        canIntersectAllParentObjects(intersection, { onlyVisible: true }) &&
        defaultRaycastFilter(intersection)
      ) {
        return intersection;
      }
    }

    return undefined;
  }

  updateIntersectedObject() {
    if (!this.ray || !this.ray.visible) return;

    // Find and store intersected object and scale ray accordingly.
    const nearestIntersection = this.computeNearestIntersection();
    this.intersectedObject = nearestIntersection || undefined;
    this.ray.scale.z = nearestIntersection?.distance || DEFAULT_RAY_LENGTH;

    // Invoke event handler for hover effect.
    if (this.eventCallbacks.updateIntersectedObject) {
      this.eventCallbacks.updateIntersectedObject(this);
    }
  }
}
