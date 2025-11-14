import * as THREE from 'three';
import { useMessageSenderStore } from 'explorviz-frontend/src/stores/collaboration/message-sender';
import PingMesh from 'explorviz-frontend/src/utils/extended-reality/view-objects/vr/ping-mesh';
import VRController from 'explorviz-frontend/src/utils/extended-reality/vr-controller';
import VRControllerButtonBinding from 'explorviz-frontend/src/utils/extended-reality/vr-controller/vr-controller-button-binding';
import AnimatedMenu from 'explorviz-frontend/src/utils/extended-reality/vr-menus/animated-menu';

export type PingMenuArgs = {
  scene: THREE.Scene;
};

export default class PingMenu extends AnimatedMenu {
  private mesh: PingMesh | undefined;

  private scene: THREE.Scene;

  constructor({ scene }: PingMenuArgs) {
    super();

    this.scene = scene;
  }

  updatePing(controller: VRController) {
    controller.updateIntersectedObject();
    this.mesh?.updateIntersection(
      controller.intersectedObject?.point ?? undefined
    );
  }

  get enableControllerRay() {
    return true;
  }

  get enableTeleport() {
    return false;
  }

  onOpenMenu() {
    const controller = VRController.findController(this);
    if (controller) {
      this.mesh = new PingMesh({
        animationMixer: this.animationMixer,
        color: controller.color,
      });
      this.scene.add(this.mesh);
    }
  }

  onCloseMenu() {
    if (this.mesh) this.scene.remove(this.mesh);
  }

  makeTriggerButtonBinding() {
    return new VRControllerButtonBinding('Ping', {
      onButtonDown: (controller: VRController) => {
        this.mesh?.startPinging();
        useMessageSenderStore
          .getState()
          .sendControllerPingUpdate(controller.gamepadIndex, true);
      },
      onButtonPress: (controller: VRController) => {
        this.updatePing(controller);
      },
      onButtonUp: (controller: VRController) => {
        this.mesh?.stopPinging();
        useMessageSenderStore
          .getState()
          .sendControllerPingUpdate(controller.gamepadIndex, false);
      },
    });
  }
}
