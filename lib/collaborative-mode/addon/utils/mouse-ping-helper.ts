import { restartableTask } from 'ember-concurrency-decorators';
import LandscapeObject3D from "explorviz-frontend/view-objects/3d/landscape/landscape-object-3d";
import { timeout } from 'ember-concurrency';
import THREE from "three";

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
    let size = 2;

    if (parentObj instanceof LandscapeObject3D) {
      size = 0.2;
    }

    const geometry = new THREE.SphereGeometry(size, 32, 32);
    const material = new THREE.MeshBasicMaterial({ color: this.color });
    const sphere = new THREE.Mesh(geometry, material);

    sphere.position.copy(position);

    parentObj.add(sphere);

    this.obj = sphere;

    yield timeout(2000)

    this.obj.parent?.remove(this.obj);
    this.obj = null;
  }
}
