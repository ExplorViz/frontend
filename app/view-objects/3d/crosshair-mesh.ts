import * as THREE from 'three';

const CROSSHAIR_RADIUS = 0.01;
const CROSSHAIR_SEGMENTS = 22;

export default class CrosshairMesh extends THREE.Mesh {
  constructor({ color }: { color: THREE.Color }) {
    super();

    this.geometry = new THREE.SphereGeometry(
      CROSSHAIR_RADIUS,
      CROSSHAIR_SEGMENTS,
      CROSSHAIR_SEGMENTS
    );
    this.material = new THREE.MeshBasicMaterial({ color });
  }

  updatePosition(position: THREE.Vector3 | undefined) {
    if (position) {
      this.visible = true;
      this.position.copy(position);
    } else {
      this.visible = false;
    }
  }
}
