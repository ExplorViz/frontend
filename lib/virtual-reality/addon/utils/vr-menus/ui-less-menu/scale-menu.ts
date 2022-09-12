import * as THREE from 'three';
import VRControllerButtonBinding from 'virtual-reality/utils/vr-controller/vr-controller-button-binding';
import BaseMenu, { BaseMenuArgs } from '../base-menu';
import GrabMenu from './grab-menu';
import SharedScaleMenuState from './scale-menu/shared-state';

export type ScaleMenuArgs = BaseMenuArgs & {
  sharedState: SharedScaleMenuState;
};

export default class ScaleMenu extends BaseMenu {
  protected sharedState: SharedScaleMenuState;

  constructor({ sharedState, ...args }: ScaleMenuArgs) {
    super(args);
    this.sharedState = sharedState;
  }

  /**
   * Scales the grabbed object based on the change in distance between
   * the two scale menus.
   */
  private scaleGrabbedObject() {
    const scale = this.sharedState.currentDistance / this.sharedState.initialDistance;
    this.sharedState.grabbedObject.scale
      .copy(this.sharedState.initialScale)
      .multiplyScalar(scale);
  }

  get enableControllerRay(): boolean {
    return true;
  }

  onOpenMenu() {
    super.onOpenMenu();

    const position = new THREE.Vector3();
    this.getWorldPosition(position);
    this.sharedState.addInitialPosition(position);
  }

  onUpdateMenu(delta: number) {
    super.onUpdateMenu(delta);

    // Close the scale menu and return to the grab menu when the other
    // controller released the object.
    if (!this.sharedState.isGrabbedByBoth) {
      this.closeMenu();
      return;
    }

    // Write current position into the shared state.
    const position = new THREE.Vector3();
    this.getWorldPosition(position);
    this.sharedState.addCurrentPosition(position);

    // Once the scale menu of both controllers has been updated, update
    // the grabbed object's scale factor.
    if (this.sharedState.hasCurrentPositions()) {
      this.scaleGrabbedObject();
      this.sharedState.clear();
    }
  }

  onCloseMenu() {
    super.onCloseMenu();
  }

  makeGripButtonBinding() {
    return new VRControllerButtonBinding('Release Object', {
      onButtonUp: () => {
        // Close this menu and the grab menu and notify the other scale
        // menu when the grip is released.
        this.sharedState.isGrabbedByBoth = false;
        this.closeMenusWhile(
          (menu) => menu instanceof ScaleMenu || menu instanceof GrabMenu,
        );
      },
    });
  }

  makeMenuButtonBinding() {
    // The menu button cannot be used to close the menu.
    return undefined;
  }
}
