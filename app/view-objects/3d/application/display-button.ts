import * as THREE from 'three';
import BaseMesh from '../base-mesh';

export default class DisplayButton extends BaseMesh {
  geometry: THREE.BoxGeometry;

  material: THREE.MeshLambertMaterial;

  width = 5;

  height = 5;

  depth = 5;

  url: string = 'https://www.youtube.com/embed/SJOz3qjfQXU?rel=0';

  constructor() {
    super();

    this.receiveShadow = true;
    this.castShadow = true;

    this.material = new THREE.MeshLambertMaterial({
      color: new THREE.Color('grey'),
    });
    const geometry = new THREE.BoxGeometry(this.width, this.height, this.depth);
    this.geometry = geometry;
    this.changeOpacity(0.5);
  }

  getUrl() {
    return this.url;
  }

  positionRelativeToParent() {
    if (!this.parent) return;

    const boundingBox = new THREE.Box3().setFromObject(this.parent, true);

    const size = new THREE.Vector3();
    boundingBox.getSize(size);
    this.position.set(
      boundingBox.max.z + this.width / 2,
      boundingBox.max.y,
      boundingBox.max.x - this.depth / 2
    );
  }
}
