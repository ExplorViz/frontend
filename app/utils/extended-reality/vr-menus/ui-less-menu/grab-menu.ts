import * as THREE from 'three';
import GrabbedObjectService from 'explorviz-frontend/services/extended-reality/grabbed-object';
import { GrabbableObject } from 'explorviz-frontend/utils/extended-reality/view-objects/interfaces/grabbable-object';
import VRController from 'explorviz-frontend/utils/extended-reality/vr-controller';
import VRControllerButtonBinding from 'explorviz-frontend/utils/extended-reality/vr-controller/vr-controller-button-binding';
import VRControllerThumbpadBinding from 'explorviz-frontend/utils/extended-reality/vr-controller/vr-controller-thumbpad-binding';
import BaseMenu, { BaseMenuArgs } from '../base-menu';

export type GrabMenuArgs = BaseMenuArgs & {
  grabbedObject: GrabbableObject;
  grabbedObjectService: GrabbedObjectService;
};

export default class GrabMenu extends BaseMenu {
  private grabbedObject: GrabbableObject;

  private grabbedObjectParent: THREE.Object3D | null;

  private allowedToGrab: boolean;

  private grabbedObjectService: GrabbedObjectService;

  constructor({ grabbedObject, grabbedObjectService, ...args }: GrabMenuArgs) {
    super(args);
    this.grabbedObject = grabbedObject;
    this.grabbedObjectParent = null;
    this.allowedToGrab = false;
    this.grabbedObjectService = grabbedObjectService;
  }

  /**
   * Moves the grabbed object into the controller's grip space.
   */
  private addToGripSpace() {
    // Don't grab the object when the menu has been closed or paused
    // since the object was requested to be grabbed.
    const controller = VRController.findController(this);
    if (controller && this.isMenuOpen) {
      // Store original parent of grabbed object.
      this.grabbedObjectParent = this.grabbedObject.parent;
      controller.controllerModel.attach(this.grabbedObject);
    }
  }

  /**
   * Removes the grabbed object from the controller's grip space and adds it
   * back to its original parent.
   */
  private removeFromGripSpace() {
    // If the object has not been grabbed, it cannot be released.
    if (!this.grabbedObjectParent) return;

    // Restore original parent.
    this.grabbedObjectParent.attach(this.grabbedObject);
    this.grabbedObjectParent = null;
  }

  async onOpenMenu() {
    super.onOpenMenu();
    // Grab the object only when we are allowed to grab it.
    this.allowedToGrab = await this.grabbedObjectService.grabObject(
      this.grabbedObject
    );
    if (this.allowedToGrab) {
      // If the object is grabbed by another menu already, open the scale
      // menu instead.
      const controller = VRController.findController(this);
      const otherController = VRController.findController(this.grabbedObject);
      const otherMenu = otherController?.menuGroup.currentMenu;
      if (controller && otherController && otherMenu instanceof GrabMenu) {
        const { scaleMenu1, scaleMenu2 } = this.menuFactory.buildScaleMenus(
          this.grabbedObject
        );
        controller.menuGroup.openMenu(scaleMenu1);
        otherController.menuGroup.openMenu(scaleMenu2);
      } else {
        this.addToGripSpace();
      }
    } else {
      this.closeMenu();
    }
  }

  onPauseMenu() {
    super.onPauseMenu();
    this.removeFromGripSpace();
  }

  onResumeMenu() {
    super.onResumeMenu();
    if (this.allowedToGrab) this.addToGripSpace();
  }

  onCloseMenu() {
    super.onCloseMenu();
    this.removeFromGripSpace();
    // Move landscape up if it should stick in or beneath the floor
    this.collideWithFloor();
    this.grabbedObjectService.releaseObject(this.grabbedObject);
  }

  makeThumbpadBinding() {
    return new VRControllerThumbpadBinding(
      {
        labelUp: 'Move Away',
        labelDown: 'Move Closer',
      },
      {
        onThumbpadTouch: (controller: VRController, axes: number[]) => {
          controller.updateIntersectedObject();
          if (!controller.intersectedObject) return;

          // Position where ray hits the application
          const intersectionPosWorld = controller.intersectedObject.point;
          const intersectionPosLocal = intersectionPosWorld.clone();
          this.grabbedObject.worldToLocal(intersectionPosLocal);

          const controllerPosition = new THREE.Vector3();
          controller.raySpace.getWorldPosition(controllerPosition);
          const controllerPositionLocal = controllerPosition.clone();
          this.grabbedObject.worldToLocal(controllerPositionLocal);

          const direction = new THREE.Vector3();
          direction.subVectors(intersectionPosLocal, controllerPositionLocal);

          const worldDirection = new THREE.Vector3().subVectors(
            controllerPosition,
            intersectionPosWorld
          );

          // Stop object from moving too close to controller.
          const yAxis = -axes[1];
          if (
            (worldDirection.length() > 0.5 && Math.abs(yAxis) > 0.1) ||
            (worldDirection.length() <= 0.5 && yAxis > 0.1)
          ) {
            // Adapt distance for moving according to trigger value.
            direction.normalize();
            const length = yAxis * 0.1;

            this.grabbedObject.translateOnAxis(direction, length);
            this.collideWithFloor();
          }
        },
      }
    );
  }

  get enableControllerRay(): boolean {
    return true;
  }

  makeGripButtonBinding() {
    return new VRControllerButtonBinding('Release Object', {
      onButtonUp: () => this.closeMenu(),
    });
  }

  makeMenuButtonBinding() {
    // The menu button cannot be used to close the menu.
    return undefined;
  }

  /**
   * Prevent the object from being moved beneath the floor.
   */
  private collideWithFloor() {
    this.grabbedObject.updateMatrixWorld();
    const bbox = new THREE.Box3().setFromObject(this.grabbedObject);
    if (bbox.min.y < 0) {
      const position = this.grabbedObject.getWorldPosition(new THREE.Vector3());
      position.y -= bbox.min.y;
      this.grabbedObject.parent?.worldToLocal(position);
      this.grabbedObject.position.copy(position);
    }
  }
}
