import * as THREE from 'three';
import ApplicationObject3D from './application-object-3d';

const tmpMatrix = new THREE.Matrix4().makeScale(1, 1, 1);
const tmpQuaternion = new THREE.Quaternion();
const initialDirection = new THREE.Vector3(1, 0, 0);

export default class CommunicationArrows extends THREE.Object3D {
  private readonly app3d: ApplicationObject3D;
  private arrowGeometry: THREE.BufferGeometry;
  private arrowMaterial = new THREE.MeshBasicMaterial();
  private instancedMesh!: THREE.InstancedMesh;
  private arrowIndex: number = -1;

  constructor(app3d: ApplicationObject3D, count: number, width: number) {
    super();
    this.app3d = app3d;

    const headWidth = Math.max(0.5, width);
    const headLength = Math.min(2 * headWidth /*, 0.3 * len*/);
    const length = headLength + 0.00001; // body of arrow not visible

    this.arrowGeometry = new THREE.ArrowHelper(
      initialDirection,
      new THREE.Vector3(0, 0, 0),
      length,
      0x000000,
      headLength,
      headWidth
    ).cone.geometry;

    this.reset(count);

    this.add(this.instancedMesh);
  }

  reset(count: number): void {
    this.instancedMesh = new THREE.InstancedMesh(
      this.arrowGeometry,
      this.arrowMaterial,
      count
    );
    this.arrowIndex = -1;
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
    tmpMatrix.setPosition(origin);
    this.instancedMesh.setMatrixAt(index, tmpMatrix);

    this.instancedMesh.count = index + 1;
  }
}
