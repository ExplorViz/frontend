import * as THREE from 'three';

export default class BoxLayout {
  positionX: number = 0;

  positionY: number = 0;

  positionZ: number = 0;

  width: number = 1;

  height: number = 1;

  depth: number = 1;

  constructor() {
    console.log('new box layout');
  }

  get position() {
    return new THREE.Vector3(this.positionX, this.positionY, this.positionZ);
  }

  set position(position: THREE.Vector3) {
    this.positionX = position.x;
    this.positionY = position.y;
    this.positionZ = position.z;
  }

  get center() {
    // Calculate middle for each dimension => center point
    const centerPoint = new THREE.Vector3(
      this.positionX + 0.5 * this.width,
      this.positionY + 0.5 * this.height,
      this.positionZ + 0.5 * this.depth
    );

    return centerPoint;
  }

  /**
   * Scales layout positions and extensions just like a object in three.js is scaled.
   *
   * @param scalar The scalar which is multiplied with the current
   *               positions / extensions of the layout.
   */
  scale(scalar: number) {
    this.width *= scalar;
    this.height *= scalar;
    this.depth *= scalar;

    this.positionX *= scalar;
    this.positionY *= scalar;
    this.positionZ *= scalar;
  }
}
