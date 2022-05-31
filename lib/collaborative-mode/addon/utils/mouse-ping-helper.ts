import { timeout } from 'ember-concurrency';
import { restartableTask } from 'ember-concurrency-decorators';
import THREE from 'three';

export default class MousePing {
  obj: THREE.Object3D | null;

  color: THREE.Color;

  constructor(color: THREE.Color) {
    this.obj = null;
    this.color = color;
  }

  @restartableTask
  public * ping({ parentObj, position }: { parentObj: THREE.Object3D; position: THREE.Vector3; }) {
    if (this.obj) {
      this.obj.parent?.remove(this.obj);
      this.obj = null;
    }

    // Default for applications
    const worldScale = new THREE.Vector3();
    parentObj.getWorldScale(worldScale);
    let size = 0.06 / worldScale.x;

    const geometry = new THREE.SphereGeometry(size, 32, 32);
    const material = new THREE.MeshBasicMaterial({ color: this.color });
    const sphere = new THREE.Mesh(geometry, material);

    sphere.position.copy(position);
    parentObj.add(sphere)

    this.obj = sphere;

    yield timeout(2000);

    this.obj.parent?.remove(this.obj);
    this.obj = null;
  }
}
