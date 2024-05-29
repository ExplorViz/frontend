import * as THREE from 'three';
import { AxisMapping, ButtonMapping } from './gamepad-mappings';
import { Position2D } from 'explorviz-frontend/modifiers/interaction-modifier';
import { defaultRaycastFilter } from '../raycaster';
import CrosshairMesh from 'explorviz-frontend/view-objects/3d/crosshair-mesh';

/**
 * Convert an angle given in degrees to radians
 * @param degrees An angle measured in degrees
 * @returns The same angle, but measured in radians
 */
// const degreesToRadians = (degrees: number): number => {
//   return degrees * (Math.PI / 180);
// };

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
const SPEED_HORIZONTAL: number = 0.04;

/**
 * Speed multiplier for how many units the camera should move up or down
 * per animation frame
 */
const SPEED_VERTICAL: number = SPEED_HORIZONTAL;
/**
 * How many degrees the camera should rotate per frame if direction is held
 */
// const ROTATION_ANGLE: number = degreesToRadians(2);

/**
 * This caps the rotation in the up / down direction to avoid the possibility
 * of the camera turning upside-down
 */
// const ROTATION_VMAX: number = degreesToRadians(80);

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
  // private angleH: number = 0;
  // private angleV: number = 0;
  private moveDirection: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  private buttonPressed: ButtonState = {} as ButtonState;
  private buttonJustPressed: ButtonState = {} as ButtonState;
  private callbacks: GamepadInteractionCallbacks;

  private orbitControls: any;

  constructor(
    camera: THREE.Camera,
    scene: THREE.Scene,
    orbitControls: any,
    callbacks: GamepadInteractionCallbacks
  ) {
    this.camera = camera;
    this.scene = scene;
    this.orbitControls = orbitControls;
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

    // const STICK_RIGHT_H = dead_zone_clamp(gp.axes[AxisMapping.StickRightH]);
    // const STICK_RIGHT_V = dead_zone_clamp(gp.axes[AxisMapping.StickRightV]);
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

    // Apply vertical movement if face buttons are pressed
    const BUTTON_UP: number =
      gp.buttons[ButtonMapping.FaceDown].value > 0 ? 1 : 0;
    const BUTTON_DOWN: number =
      gp.buttons[ButtonMapping.FaceRight].value > 0 ? 1 : 0;

    // One button counts positive, one negative.
    // If both buttons are pressed, they cancel out
    this.moveDirection.setY((BUTTON_UP - BUTTON_DOWN) * SPEED_VERTICAL);

    // Move both camera and target to achieve panning effect with orbit controls
    this.camera.position.add(this.moveDirection);
    this.orbitControls.target.add(this.moveDirection);

    ////////////////////////
    // Object Interaction //
    ////////////////////////

    // Raycast to find which mesh we are looking at

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    let intersections = raycaster.intersectObjects(this.scene.children, true);
    intersections = intersections.filter(defaultRaycastFilter);

    // Find the closest object which is visible. Raycaster.intersectObjects()
    // sorts objects by distance, but some intersected objects may be invisible

    let objClosest = null;

    if (intersections) {
      for (const intersection of intersections) {
        if (intersection.object.visible) {
          objClosest = intersection;
          break;
        }
      }
    }

    // Highlight looked-at object. If objClosest is null, we unhighlight all
    // if (this.callbacks.lookAt) {
    //   this.callbacks.lookAt(objClosest, new MouseEvent(''));
    // }

    if (objClosest) {
      this.crosshair.updatePosition(objClosest.point);

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
    } else {
      this.crosshair.updatePosition(undefined);
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

  // public setRotation(newAngleH: number, newAngleV: number) {
  //   this.angleH = newAngleH;
  //   this.angleV = newAngleV;
  // }
}
