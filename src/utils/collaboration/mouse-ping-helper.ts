// import { timeout, task } from 'ember-concurrency';
import * as THREE from 'three';
import { AnimationMixer } from 'three';
import PingMesh from 'explorviz-frontend/src/utils/extended-reality/view-objects/vr/ping-mesh';
import { SceneLayers } from 'explorviz-frontend/src/stores/minimap-service';

export default class MousePing {
  mesh: PingMesh;
  meshes: Map<THREE.Vector3, PingMesh> = new Map();
  color: THREE.Color;
  animationMixer: AnimationMixer;

  constructor(color: THREE.Color, animationMixer: AnimationMixer) {
    this.animationMixer = animationMixer;
    this.color = color;
    this.mesh = new PingMesh({
      animationMixer,
      color,
    });
    this.mesh.layers.enable(SceneLayers.Ping);
  }

  async ping(
    parentObj: THREE.Object3D,
    position: THREE.Vector3,
    durationInMs: number,
    replay = false
  ) {
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
    this.mesh.startPinging(replay);
    await new Promise<void>((resolve) => setTimeout(resolve, durationInMs));
    this.mesh.stopPinging();

    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
    this.mesh.parent?.remove(this.mesh);
  }

  async pingNonRestartable(
    parentObj: THREE.Object3D,
    position: THREE.Vector3,
    durationInMs: number
  ) {
    if (this.meshes.get(position)) {
      return;
    }

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
    this.meshes.set(position, mesh);
    mesh.startPinging();
    await new Promise<void>((resolve) => setTimeout(resolve, durationInMs));
    mesh.stopPinging();

    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
    mesh.parent?.remove(mesh);
    this.meshes.delete(position);
  }
}
