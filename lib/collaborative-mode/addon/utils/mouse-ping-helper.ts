import { timeout, task } from 'ember-concurrency';
import * as THREE from 'three';
import { AnimationMixer } from 'three';
import PingMesh from 'virtual-reality/utils/view-objects/vr/ping-mesh';

export default class MousePing {
  mesh: PingMesh;

  constructor(color: THREE.Color, animationMixer: AnimationMixer) {
    this.mesh = new PingMesh({
      animationMixer,
      color,
    });
  }

  ping = task(
    { restartable: true },
    async ({
      parentObj,
      position,
    }: {
      parentObj: THREE.Object3D;
      position: THREE.Vector3;
    }) => {
      if (this.mesh) {
        this.mesh.parent?.remove(this.mesh);
      }

      const worldScale = new THREE.Vector3();
      parentObj.getWorldScale(worldScale);
      // disable for floor and other unscaled objects
      if (worldScale.x === 1) {
        return;
      }

      this.mesh.position.copy(position);
      parentObj.add(this.mesh);
      this.mesh.startPinging();
      await timeout(2000);
      this.mesh.stopPinging();

      this.mesh.parent?.remove(this.mesh);
    }
  );
}
