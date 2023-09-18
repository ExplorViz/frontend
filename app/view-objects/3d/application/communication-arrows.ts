import * as THREE from 'three';

const tmpMatrix = new THREE.Matrix4();
const tmpQuaternion = new THREE.Quaternion();
const initialDirection = new THREE.Vector3(0, 1, 0);
const magicScaleValues = new THREE.Vector3(1.25, 2.6, 1.25); // TODO: why

export default class CommunicationArrows extends THREE.Object3D {
  private arrowGeometry: THREE.BufferGeometry;
  private arrowMaterial = new THREE.MeshBasicMaterial();
  private instancedMesh!: THREE.InstancedMesh;
  private arrowIndex: number = -1;

  constructor(count: number, width: number) {
    super();

    const headWidth = Math.max(0.5, width);
    const headLength = 2 * headWidth;
    const length = headLength + 0.00001; // body of arrow not visible

    this.arrowGeometry = new THREE.ArrowHelper(
      initialDirection,
      new THREE.Vector3(0, 0, 0),
      length,
      0x000000,
      headLength,
      headWidth
    ).cone.geometry;

    this.arrowMaterial.color = new THREE.Color(0x000000);

    this.reset(count);
  }

  reset(maxNumberOfArrows: number): void {
    if (this.instancedMesh) {
      this.instancedMesh.removeFromParent();
    }

    this.instancedMesh = new THREE.InstancedMesh(
      this.arrowGeometry,
      this.arrowMaterial,
      maxNumberOfArrows
    );
    this.instancedMesh.userData = {
      raycastInvisible: true,
    };
    this.instancedMesh.name = 'Instanced Mesh for Arrows';
    this.instancedMesh.count = 0;
    this.arrowIndex = -1;
    this.add(this.instancedMesh);
  }

  /**
   * @param origin
   * @param dir a normalized direction vector
   */
  addArrow(origin: THREE.Vector3, dir: THREE.Vector3): void {
    const index = ++this.arrowIndex;

    // Compute instance matrix
    tmpQuaternion.setFromUnitVectors(initialDirection, dir);
    tmpMatrix.makeRotationFromQuaternion(tmpQuaternion);
    tmpMatrix.scale(magicScaleValues);
    const position = origin.clone().addScaledVector(dir, magicScaleValues.y);
    tmpMatrix.setPosition(position);
    this.instancedMesh.setMatrixAt(index, tmpMatrix);

    this.instancedMesh.count = index + 1;
  }

  allArrowsAdded(): void {
    this.instancedMesh.instanceMatrix.needsUpdate = true;
  }

  get count(): number {
    return this.instancedMesh.count;
  }
}
