import * as THREE from 'three';
import { AxisMapping, ButtonMapping } from './gamepad-mappings';
import { Position2D } from 'explorviz-frontend/modifiers/interaction-modifier';
import CrosshairMesh from 'explorviz-frontend/view-objects/3d/crosshair-mesh';
import { defaultRaycastFilter } from 'explorviz-frontend/utils/raycaster';

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
  private active: boolean = false;

  private camera: THREE.Camera;
  private scene: THREE.Scene;
  private crosshair: CrosshairMesh;
  private moveDirection: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

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
    if (!this.active) {
      this.active = true;
      this.update();
    }

    this.scene.add(this.crosshair);
  }

  private deactivate() {
    this.active = false;
    this.scene.remove(this.crosshair);
  }

  private update() {
    this.pollGamepads();

    if (this.active) {
      requestAnimationFrame(this.update.bind(this));
    }
  }

  private pollGamepads() {
    if (typeof navigator.getGamepads !== 'function') {
      console.error('Could not call navigator.getGamepads()');
      return;
    }

    const gamepads = navigator.getGamepads();

    if (!gamepads || !gamepads[0]) {
      console.error('No connected gamepad could be found');
      return;
    }

    // Todo: Add support for multiple gamepads
    const gp = gamepads[0];

    const STICK_RIGHT_H = dead_zone_clamp(gp.axes[AxisMapping.StickRightH]);
    const STICK_RIGHT_V = dead_zone_clamp(gp.axes[AxisMapping.StickRightV]);
    const STICK_LEFT_H = dead_zone_clamp(gp.axes[AxisMapping.StickLeftH]);
    const STICK_LEFT_V = dead_zone_clamp(gp.axes[AxisMapping.StickLeftV]);

    // Update button presses

    for (const button in ButtonMapping) {
      if (isNaN(Number(button))) {
        // Enum contains both the names and values
        continue;
      }

      this.buttonJustPressed[button] =
        !this.buttonPressed[button] && gp.buttons[button].value > 0;
      this.buttonPressed[button] = gp.buttons[button].value > 0;
    }

    //////////////
    // Movement //
    //////////////

    // Apply lateral movement according to left stick in camera space.
    // Create a basis vector to transform using camera's rotation
    this.moveDirection.set(STICK_LEFT_H, 0, STICK_LEFT_V);

    // The more the stick is pressed, the faster the camera should move
    const EXPONENT = 6;
    const AXIS_SCALE = Math.sqrt(
      STICK_LEFT_H ** EXPONENT + STICK_LEFT_V ** EXPONENT
    );

    // Scale directional vector with speed constant. Note we do not want to
    // apply vertical movement if camera faces downward
    this.moveDirection
      .setY(0)
      .normalize()
      .multiplyScalar(AXIS_SCALE)
      .multiplyScalar(SPEED_HORIZONTAL);

    this.controls.pan(-this.moveDirection.x, -this.moveDirection.z);

    // Rotate the camera according to the right stick
    this.controls.rotate(STICK_RIGHT_H * 0.05, STICK_RIGHT_V * 0.05);

    // Apply vertical movement if face buttons are pressed
    this.controls.zoomIn(gp.buttons[ButtonMapping.FaceDown].value * ZOOM_SPEED);
    this.controls.zoomOut(
      gp.buttons[ButtonMapping.FaceRight].value * ZOOM_SPEED
    );

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
