import BaseMesh from 'some-react-lib/src/view-objects/3d/base-mesh';
import * as THREE from 'three';

export default class TeleportMesh extends BaseMesh {
  private yOffset: number;

  constructor(color: THREE.Color) {
    super(color);

    this.geometry = new THREE.RingGeometry(0.14, 0.2, 32);
    this.geometry.rotateX(-90 * THREE.MathUtils.DEG2RAD);

    this.material = new THREE.MeshLambertMaterial({ color });
    this.material.transparent = true;
    this.material.opacity = 0.4;

    // Randomize y offset to avoid z-fighting of overlapping teleport areas.
    this.yOffset = Math.random() * 0.001 + 0.005;

    this.visible = false;
  }

  showAbovePosition(position: THREE.Vector3) {
    // Set teleport mesh (just) above the given position
    this.position.copy(position);
    this.position.y += this.yOffset;
  }
}
