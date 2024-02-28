import { timeout, task } from 'ember-concurrency';
import * as THREE from 'three';
import { AnimationMixer } from 'three';
import PingMesh from 'extended-reality/utils/view-objects/vr/ping-mesh';

export default class MousePing {
  mesh: PingMesh;
  color: THREE.Color;
  animationMixer: AnimationMixer;

  constructor(color: THREE.Color, animationMixer: AnimationMixer) {
    this.animationMixer = animationMixer;
    this.color = color;
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
      durationInMs,
    }: {
      parentObj: THREE.Object3D;
      position: THREE.Vector3;
      durationInMs: number;
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
      await timeout(durationInMs);
      this.mesh.stopPinging();

      //this.mesh.geometry.dispose();
      //this.mesh.material.dispose();
      this.mesh.parent?.remove(this.mesh);
    }
  );

  pingNonRestartable = task(
    async ({
      parentObj,
      position,
      durationInMs,
    }: {
      parentObj: THREE.Object3D;
      position: THREE.Vector3;
      durationInMs: number;
    }) => {
      const animationMixer = this.animationMixer;
      const color = this.color;

      const mesh = new PingMesh({
        animationMixer,
        color,
      });

      const worldScale = new THREE.Vector3();
      parentObj.getWorldScale(worldScale);
      // disable for floor and other unscaled objects
      if (worldScale.x === 1) {
        return;
      }

      mesh.position.copy(position);
      parentObj.add(mesh);
      mesh.startPinging();
      await timeout(durationInMs);
      mesh.stopPinging();

      mesh.geometry.dispose();
      mesh.material.dispose();
      mesh.parent?.remove(mesh);
    }
  );
}
