import * as THREE from 'three';
import BaseMesh from '../base-mesh';
import Css3dFrame from './css-3d-frame';

export default class DisplayButton extends BaseMesh {
  geometry: THREE.BoxGeometry;

  material: THREE.MeshLambertMaterial;

  width = 5;

  height = 5;

  depth = 5;

  url: string;

  css3dFrame: Css3dFrame | undefined;

  constructor(url = 'https://explorviz.dev/') {
    super();
    this.url = url;

    this.receiveShadow = true;
    this.castShadow = true;

    this.material = new THREE.MeshLambertMaterial({
      color: new THREE.Color('grey'),
    });
    const geometry = new THREE.BoxGeometry(this.width, this.height, this.depth);
    this.geometry = geometry;
    this.changeOpacity(0.5);

    // this.showDisplay();
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

  toggleDisplay() {
    if (!this.css3dFrame) {
      this.showDisplay();
    } else {
      this.removeDisplay();
    }
  }

  showDisplay() {
    this.css3dFrame = new Css3dFrame(this.url, 480, 360, 0.2);

    this.css3dFrame.rotateY(Math.PI * 1.5);
    this.css3dFrame.position.x += 10;
    this.css3dFrame.position.y += 50;
    this.css3dFrame.position.z -= 25;

    this.add(this.css3dFrame);
  }

  removeDisplay() {
    if (!this.css3dFrame) return;
    this.css3dFrame.destroy();
    this.remove(this.css3dFrame);
    this.css3dFrame = undefined;
  }
}
