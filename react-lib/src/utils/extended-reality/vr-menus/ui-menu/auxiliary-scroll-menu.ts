import VRControllerThumbpadBinding, {
  thumbpadDirectionToVector2,
} from 'explorviz-frontend/src/utils/extended-reality/vr-controller/vr-controller-thumbpad-binding';
import BaseMenu from 'explorviz-frontend/src/utils/extended-reality/vr-menus/base-menu';
import VRController from 'explorviz-frontend/src/utils/extended-reality/vr-controller';
import DetailInfoScrollarea from 'explorviz-frontend/src/utils/extended-reality/view-objects/vr/detail-info-scrollarea';
import VRControllerButtonBinding from 'explorviz-frontend/src/utils/extended-reality/vr-controller/vr-controller-button-binding';
import VrRendering from 'explorviz-frontend/src/components/extended-reality/vr-rendering'; // TODO: Migrate component

export type AuxiliaryScrollMenuArgs = {
  object: DetailInfoScrollarea;
  controller: VRController;
  grabIntersectedObject: (controller: VRController) => void;
};

// This Menu is built just to define the controller thumbpad bindings when hovering the ScrollArea
export class AuxiliaryScrollMenu extends BaseMenu {
  object: DetailInfoScrollarea;
  controller: VRController;
  grabIntersectedObject: (controller: VRController) => void;

  constructor({
    object,
    controller,
    grabIntersectedObject,
  }: AuxiliaryScrollMenuArgs) {
    super();
    this.controller = controller;
    this.grabIntersectedObject = grabIntersectedObject;
    this.object = object;
  }

  get enableControllerRay(): boolean {
    return true;
  }

  /**
   * The thumbpad can be used to scroll through the text.
   */
  makeThumbpadBinding() {
    return new VRControllerThumbpadBinding(
      { labelUp: 'Scroll up', labelDown: 'Scroll down' },
      {
        onThumbpadTouch: (controller: VRController, axes: number[]) => {
          controller.updateIntersectedObject();
          if (!controller.intersectedObject) return;

          const textBlock = this.object.text;

          const direction = VRControllerThumbpadBinding.getDirection(axes);
          const vector = thumbpadDirectionToVector2(direction);
          const offset = vector.toArray()[1]; // vertical part
          if (offset !== 0) {
            //up
            if (offset === -1 && textBlock.position.y > 0) {
              textBlock.position.y += offset * 0.01;
            }
            //down
            if (offset === 1) {
              textBlock.position.y += offset * 0.01;
            }
          }
        },
      }
    );
  }

  makeGripButtonBinding() {
    return new VRControllerButtonBinding('', {
      onButtonPress: () => {
        const gamepadId = this.controller.gamepadId;
        const gamepadIndex = this.controller.gamepadIndex;
        const controllerId: string = gamepadId + gamepadIndex;

        this.object.controllerIdToAuxiliaryMenuOpenFlag.set(
          controllerId,
          false
        );

        this.closeMenu();
        if (this.controller) {
          this.grabIntersectedObject(this.controller);
        }
      },
    });
  }

  makeTriggerButtonBinding(): VRControllerButtonBinding<number> | undefined {
    return new VRControllerButtonBinding('', {
      onButtonPress: () => {
        const gamepadId = this.controller.gamepadId;
        const gamepadIndex = this.controller.gamepadIndex;
        const controllerId: string = gamepadId + gamepadIndex;

        this.object.controllerIdToAuxiliaryMenuOpenFlag.set(
          controllerId,
          false
        );
        const intersection =
          this.object.controllerIdToIntersection.get(controllerId);
        this.object.triggerDown(intersection!); // note that the button press action only gets registered in this auxiliary menu here so we have to "cheat"
        this.closeMenu();
      },
    });
  }
}
