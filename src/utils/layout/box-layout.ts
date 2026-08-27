import * as THREE from 'three';

export default class BoxLayout {
  positionX: number = 0;

  positionY: number = 0;

  positionZ: number = 0;

  width: number = 1;

  height: number = 1;

  depth: number = 1;

  // Level in the component hierarchy
  level: number = 0;

  private cachedPosition: THREE.Vector3 | null = null;

  private cachedCenter: THREE.Vector3 | null = null;

  private cachedForX = NaN;

  private cachedForY = NaN;

  private cachedForZ = NaN;

  private cachedForWidth = NaN;

  private cachedForHeight = NaN;

  private cachedForDepth = NaN;

  private isCacheStale(): boolean {
    return (
      this.cachedForX !== this.positionX ||
      this.cachedForY !== this.positionY ||
      this.cachedForZ !== this.positionZ ||
      this.cachedForWidth !== this.width ||
      this.cachedForHeight !== this.height ||
      this.cachedForDepth !== this.depth
    );
  }

  private refreshCache() {
    this.cachedForX = this.positionX;
    this.cachedForY = this.positionY;
    this.cachedForZ = this.positionZ;
    this.cachedForWidth = this.width;
    this.cachedForHeight = this.height;
    this.cachedForDepth = this.depth;
    this.cachedPosition = new THREE.Vector3(
      this.positionX,
      this.positionY,
      this.positionZ
    );
    // Calculate middle for each dimension => center point
    this.cachedCenter = new THREE.Vector3(
      this.positionX + this.width / 2.0,
      this.positionY + this.height / 2.0,
      this.positionZ + this.depth / 2.0
    );
  }

  get position() {
    if (!this.cachedPosition || this.isCacheStale()) {
      this.refreshCache();
    }
    return this.cachedPosition!;
  }

  get aspectRatio() {
    return this.width / this.height;
  }

  get area() {
    return this.width * this.depth;
  }

  // Copy function
  copy(): BoxLayout {
    const copy = new BoxLayout();
    copy.positionX = this.positionX;
    copy.positionY = this.positionY;
    copy.positionZ = this.positionZ;
    copy.width = this.width;
    copy.height = this.height;
    copy.depth = this.depth;
    return copy;
  }

  set position(position: THREE.Vector3) {
    this.positionX = position.x;
    this.positionY = position.y;
    this.positionZ = position.z;
  }

  get center() {
    if (!this.cachedCenter || this.isCacheStale()) {
      this.refreshCache();
    }
    return this.cachedCenter!;
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
