import type LandscapeScene3D from 'explorviz-frontend/view-objects/3d/landscape/landscape-scene-3d';
import * as THREE from 'three';

export default class Spheres {
  spheres: Array<THREE.Mesh>;

  spheresIndex = 0;

  vector: THREE.Vector3;

  constructor(color: string, vector: THREE.Vector3) {
    this.vector = vector;
    const spheres = [];
    const sphereGeometry = new THREE.SphereGeometry(0.02, 32, 32);
    const sphereMaterial = new THREE.MeshBasicMaterial({ color });

    for (let i = 0; i < 30; i++) {
      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      spheres.push(sphere);
    }
    this.spheres = spheres;
  }

  tick() {
    if (!this.spheres[this.spheresIndex].position.equals(this.vector)) {
      this.spheres[this.spheresIndex].position.copy(this.vector);
      this.spheres[this.spheresIndex].scale.set(1, 1, 1);
      this.spheresIndex = (this.spheresIndex + 1) % this.spheres.length;
    }

    for (let i = 0; i < this.spheres.length; i++) {
      const sphere = this.spheres[i];
      sphere.scale.multiplyScalar(0.98);
      sphere.scale.clampScalar(0.01, 1);
    }
  }
}

export function addSpheres(
  color: string,
  position: THREE.Vector3,
  scene: THREE.Scene | LandscapeScene3D,
  updatables: any[]
) {
  const spheres = new Spheres(color, position);
  scene.add(...spheres.spheres);
  updatables.push(spheres);
}
