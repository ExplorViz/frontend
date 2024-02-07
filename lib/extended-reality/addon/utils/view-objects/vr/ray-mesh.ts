import * as THREE from 'three';

export default class RayMesh extends THREE.Line {
  constructor(color: THREE.Color) {
    const geometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, -1),
    ]);
    const material = new THREE.LineBasicMaterial({
      color,
    });

    super(geometry, material);

    this.position.y -= 0.005;
    this.position.z -= 0.02;
  }
}
