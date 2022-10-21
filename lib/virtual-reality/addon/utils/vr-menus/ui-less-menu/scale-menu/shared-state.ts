import * as THREE from 'three';
import { GrabbableObject } from 'virtual-reality/utils/view-objects/interfaces/grabbable-object';

export default class SharedScaleMenuState {
  readonly grabbedObject: GrabbableObject;

  readonly initialScale: THREE.Vector3;

  private initialPositions: THREE.Vector3[];

  private currentPositions: THREE.Vector3[];

  initialDistance: number;

  isGrabbedByBoth: boolean;

  constructor(grabbedObject: GrabbableObject) {
    this.grabbedObject = grabbedObject;
    this.initialScale = this.grabbedObject.scale.clone();
    this.isGrabbedByBoth = true;
    this.initialPositions = [];
    this.initialDistance = 0;
    this.currentPositions = [];
  }

  /**
   * The current distance between the scale menus.
   */
  get currentDistance(): number {
    const [p1, p2] = this.currentPositions;
    const currentDistance = p2.clone().sub(p1).length();
    return currentDistance;
  }

  /**
   * Remembers the given initial position of one of the scale menus.
   */
  addInitialPosition(position: THREE.Vector3) {
    this.initialPositions.push(position);

    // Calculate initial distance once the initial positions of both scale
    // menus are known.
    if (this.initialPositions.length === 2) {
      const [p1, p2] = this.initialPositions;
      this.initialDistance = p2.clone().sub(p1).length();
    }
  }

  /**
   * Remembers the given current position of one of the scale menus.
   */
  addCurrentPosition(position: THREE.Vector3) {
    this.currentPositions.push(position);
  }

  /**
   * Tests whether the both scale menus have written their current position
   * into the shared state in the current tick.
   */
  hasCurrentPositions(): boolean {
    return this.currentPositions.length === 2;
  }

  /**
   * Resets the current positions such that new positions can be collected
   * in the next tick.
   */
  clear() {
    this.currentPositions.clear();
  }
}
