import * as THREE from 'three';
import { AxisMapping, ButtonMapping } from './gamepad-mappings';
import { Position2D } from 'explorviz-frontend/modifiers/interaction-modifier';
import CrosshairMesh from 'explorviz-frontend/view-objects/3d/crosshair-mesh';
import { defaultRaycastFilter } from 'explorviz-frontend/utils/raycaster';
import { getStoredSettings } from 'explorviz-frontend/utils/settings/local-storage-settings';

/**
 * Checks an axis position against a fixed threshold to filter out small disturbances
 * @param axis_value The gamepad axis position to be checked against dead zone
 * @returns `axis_value` if outside the dead zone threshold, otherwise 0
 */
const dead_zone_clamp = (axis_value: number): number => {
  return Math.abs(axis_value) > DEAD_ZONE_THRESHOLD ? axis_value : 0;
};

interface ButtonState {
  [button: number]: boolean;
}

/**
 * How far a joystick / analog trigger has to be moved in any given direction
 * for it to register. This value should be in the range from 0 to 1
 */
const DEAD_ZONE_THRESHOLD: number = 0.1;

/**
 * Speed multiplier for how many units the camera should move in the lateral
 * directions per animation frame
 */
const SPEED_HORIZONTAL: number = 20;

/**
 * Speed multiplier for how many units the camera should move up or down
 * per animation frame
 */
const ZOOM_SPEED: number = 40;

/**
 * Use a fixed popup position for now. One could perhaps imagine moving popups
 * using the D-pad, however this is not implemented as of yet
 */
const POPUP_POSITION: Position2D = { x: 100, y: 100 };

export type GamepadInteractionCallbacks = {
  lookAt?(intersection: THREE.Intersection | null, event: MouseEvent): void;
  select?(intersection: THREE.Intersection): void;
  interact?(intersection: THREE.Intersection): void;
  inspect?(intersection: THREE.Intersection, canvasPos: Position2D): void;
  ping?(
    obj: THREE.Object3D | null,
    pingPosition: THREE.Vector3,
    durationInMs?: number
  ): void;
};

export default class GamepadControls {
  private connectedGamepads: any = {};
  private gamepadAvailable: boolean = false;
  private gamepadEnabled: boolean =
    getStoredSettings().enableGamepadControls.value;

  private camera: THREE.Camera;
  private scene: THREE.Scene;
  private crosshair: CrosshairMesh;
  private moveDirection: THREE.Vector2 = new THREE.Vector2(0, 0);

  private buttonPressed: ButtonState = {} as ButtonState;
  private buttonJustPressed: ButtonState = {} as ButtonState;
  private callbacks: GamepadInteractionCallbacks;

  // By default, these are OrbitControls by three.js
  private controls: any;

  constructor(
    camera: THREE.Camera,
    scene: THREE.Scene,
    controls: any,
    callbacks: GamepadInteractionCallbacks
  ) {
    this.camera = camera;
    this.scene = scene;
    this.controls = controls;
    this.callbacks = callbacks;

    this.crosshair = new CrosshairMesh({
      color: new THREE.Color('blue'),
    });

    if (typeof navigator.getGamepads !== 'function') {
      console.error('Gamepad API might not be supported on this browser.');
    } else {
      window.addEventListener(
        'gamepadconnected',
        this.onGamepadConnected.bind(this),
        false
      );
      window.addEventListener(
        'gamepaddisconnected',
        this.onGamepadDisconnected.bind(this),
        false
      );

      for (const button in ButtonMapping) {
        if (isNaN(Number(button))) {
          // Enum contains both the names and values
          continue;
        }

        this.buttonPressed[button] = false;
        this.buttonJustPressed[button] = false;
      }
    }
  }

  public activate() {
    if (!this.gamepadAvailable) {
      this.gamepadAvailable = true;
      this.update();
    }

    this.scene.add(this.crosshair);
  }

  private deactivate() {
    this.gamepadAvailable = false;
    this.scene.remove(this.crosshair);
  }

  private update() {
    if (this.gamepadAvailable && this.gamepadEnabled) {
      this.pollGamepads();
    }

    requestAnimationFrame(this.update.bind(this));
  }

  private pollGamepads() {
    if (!this.getGamepad()) return;

    const STICK_RIGHT_H = this.getAxisValue(AxisMapping.StickRightH);
    const STICK_RIGHT_V = this.getAxisValue(AxisMapping.StickRightV);
    const STICK_LEFT_H = this.getAxisValue(AxisMapping.StickLeftH);
    const STICK_LEFT_V = this.getAxisValue(AxisMapping.StickLeftV);

    // Update button presses
    for (const button in ButtonMapping) {
      if (isNaN(Number(button))) {
        // Enum contains both the names and values
        continue;
      }

      this.buttonJustPressed[button] =
        !this.buttonPressed[button] && this.isButtonPressed(Number(button));
      this.buttonPressed[button] = this.isButtonPressed(Number(button));
    }

    //////////////
    // Movement //
    //////////////

    // Apply lateral movement according to left stick in camera space.
    // Create a basis vector to transform using camera's rotation
    this.moveDirection.set(STICK_LEFT_H, STICK_LEFT_V);

    // The more the stick is pressed, the faster the camera should move
    const EXPONENT = 6;
    const AXIS_SCALE = Math.sqrt(
      STICK_LEFT_H ** EXPONENT + STICK_LEFT_V ** EXPONENT
    );

    // Scale directional vector with speed constant. Note we do not want to
    // apply vertical movement if camera faces downward
    this.moveDirection
      .normalize()
      .multiplyScalar(AXIS_SCALE)
      .multiplyScalar(SPEED_HORIZONTAL);

    this.controls.pan(-this.moveDirection.x, -this.moveDirection.y);

    // Rotate the camera according to the right stick
    this.controls.rotate(STICK_RIGHT_H * 0.05, STICK_RIGHT_V * 0.05);

    // Handle zooming in and out
    if (this.isButtonPressed(ButtonMapping.FaceDown)) {
      this.controls.zoomOut(ZOOM_SPEED);
    }

    if (this.isButtonPressed(ButtonMapping.FaceRight)) {
      this.controls.zoomIn(ZOOM_SPEED);
    }

    ////////////////////////
    // Object Interaction //
    ////////////////////////

    // Raycast to find retrieve 3D object we are looking at
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);

    // Calculate intersections and filter out non-interactive objects like a ping
    let intersections = raycaster.intersectObjects(this.scene.children, true);
    intersections = intersections.filter(defaultRaycastFilter);

    const objClosest = intersections.length > 0 ? intersections[0] : null;

    // The lookAt callback is mainly used for (un)highlighting objects
    if (this.moveDirection.length() > 0 && this.callbacks.lookAt) {
      this.callbacks.lookAt(objClosest, new MouseEvent(''));
    }

    const intersectionPoint = objClosest ? objClosest.point : undefined;
    this.crosshair.updatePosition(intersectionPoint);

    if (objClosest) {
      if (this.buttonJustPressed[ButtonMapping.ShoulderLeft]) {
        if (this.callbacks.select) {
          this.callbacks.select(objClosest);
        }
      }

      if (this.buttonJustPressed[ButtonMapping.ShoulderRight]) {
        if (this.callbacks.interact) {
          this.callbacks.interact(objClosest);
        }
      }

      if (this.buttonJustPressed[ButtonMapping.TriggerLeft]) {
        if (this.callbacks.inspect) {
          this.callbacks.inspect(objClosest, POPUP_POSITION);
        }
      }

      if (this.buttonJustPressed[ButtonMapping.TriggerRight]) {
        if (this.callbacks.ping) {
          this.callbacks.ping(objClosest.object, objClosest.point);
        }
      }
    }
  }

  setGamepadSupport(enabled: boolean) {
    this.gamepadEnabled = enabled;

    if (!enabled) {
      this.scene.remove(this.crosshair);
    } else {
      this.scene.add(this.crosshair);
    }
  }

  private getGamepad(): Gamepad | null {
    const gamepads = navigator.getGamepads();
    const selectedGamepadIndex = getStoredSettings().selectedGamepadIndex.value;

    // Todo: Add support for multiple gamepads
    if (!gamepads || !gamepads[selectedGamepadIndex]) {
      console.error('No connected gamepad could be found');
      return null;
    }

    return gamepads[selectedGamepadIndex];
  }

  private getAxisValue(axisId: number): number {
    const gamepad = this.getGamepad();
    if (!gamepad) return 0;

    if (gamepad.axes.length <= axisId) return 0;

    return dead_zone_clamp(gamepad.axes[axisId]);
  }

  private isButtonPressed(buttonId: number): boolean {
    const gamepad = this.getGamepad();
    if (!gamepad) return false;

    if (gamepad.buttons.length <= buttonId) return false;

    return gamepad.buttons[buttonId].value > 0;
  }

  private onGamepadConnected(event: GamepadEvent) {
    console.log(event);
    this.connectedGamepads[event.gamepad.id] = event.gamepad;
    this.activate();
  }

  private onGamepadDisconnected(event: GamepadEvent) {
    console.log(event);
    delete this.connectedGamepads[event.gamepad.id];
    if (Object.keys(this.connectedGamepads).length == 0) this.deactivate();
  }
}
