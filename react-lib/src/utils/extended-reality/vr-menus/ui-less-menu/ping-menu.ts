import * as THREE from 'three';
// import MessageSender from 'explorviz-frontend/services/collaboration/message-sender';
import { useMessageSenderStore } from 'react-lib/src/stores/collaboration/message-sender';
import PingMesh from 'react-lib/src/utils/extended-reality/view-objects/vr/ping-mesh';
import VRController from 'react-lib/src/utils/extended-reality/vr-controller';
import VRControllerButtonBinding from 'react-lib/src/utils/extended-reality/vr-controller/vr-controller-button-binding';
import AnimatedMenu from 'react-lib/src/utils/extended-reality/vr-menus/animated-menu';

export type PingMenuArgs = {
  scene: THREE.Scene;
};

export default class PingMenu extends AnimatedMenu {
  private mesh: PingMesh | undefined;

  private scene: THREE.Scene;

  constructor({ scene, ...args }: PingMenuArgs) {
    super(args);

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
          .sendPingUpdate(controller.gamepadIndex, true);
      },
      onButtonPress: (controller: VRController) => {
        this.updatePing(controller);
      },
      onButtonUp: (controller: VRController) => {
        this.mesh?.stopPinging();
        useMessageSenderStore
          .getState()
          .sendPingUpdate(controller.gamepadIndex, false);
      },
    });
  }
}
