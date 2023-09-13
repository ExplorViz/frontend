import * as THREE from 'three';
import VrMessageSender from 'virtual-reality/services/vr-message-sender';
import PingMesh from 'virtual-reality/utils/view-objects/vr/ping-mesh';
import VRController from 'virtual-reality/utils/vr-controller';
import VRControllerButtonBinding from 'virtual-reality/utils/vr-controller/vr-controller-button-binding';
import AnimatedMenu from '../animated-menu';
import { BaseMenuArgs } from '../base-menu';

export type PingMenuArgs = BaseMenuArgs & {
  scene: THREE.Scene;
  sender: VrMessageSender;
};

export default class PingMenu extends AnimatedMenu {
  private mesh: PingMesh | undefined;

  private scene: THREE.Scene;

  private sender: VrMessageSender;

  constructor({ scene, sender, ...args }: PingMenuArgs) {
    super(args);

    this.scene = scene;
    this.sender = sender;
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
        this.sender.sendPingUpdate(controller.gamepadIndex, true);
      },
      onButtonPress: (controller: VRController) => {
        this.updatePing(controller);
      },
      onButtonUp: (controller: VRController) => {
        this.mesh?.stopPinging();
        this.sender.sendPingUpdate(controller.gamepadIndex, false);
      },
    });
  }
}
