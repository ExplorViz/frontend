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

  // @task *emberEventedLoop() {
  //   while (true) {
  //     let event = yield waitForEvent(this, 'fooEvent');
  //     this.set('emberEvent', event);
  //   }
  // }

  @restartableTask
  public * ping({ parentObj, position }: { parentObj: THREE.Object3D; position: THREE.Vector3; }) {
    if (this.obj) {
      this.obj.parent?.remove(this.obj);
      this.obj = null;
    }

    // Default for applications
    let size = 2.3;

    const geometry = new THREE.SphereGeometry(size, 32, 32);
    const material = new THREE.MeshBasicMaterial({ color: this.color });
    const sphere = new THREE.Mesh(geometry, material);

    sphere.position.copy(position);
    // parentObj.localToWorld(sphere.position);
    // parentObj.attach(sphere);
    parentObj.add(sphere)

    this.obj = sphere;

    yield timeout(2000);

    this.obj.parent?.remove(this.obj);
    this.obj = null;
  }
}
