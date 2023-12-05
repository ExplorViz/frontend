import * as THREE from 'three';
import { CSS3DObject } from 'three/examples/jsm/renderers/CSS3DRenderer';

export default class Css3dFrame extends THREE.Object3D {
  iFrame: HTMLIFrameElement;
  cssObj: CSS3DObject;

  constructor(url: string, width: number, height: number, scale = 0.1) {
    super();
    this.position.set(0, 1, -1);

    this.iFrame = document.createElement('iframe');
    this.iFrame.style.width = width + 'px';
    this.iFrame.style.height = height + 'px';
    this.iFrame.style.border = '0px';
    this.iFrame.src = url;

    this.cssObj = new CSS3DObject(this.iFrame);
    this.cssObj.position.set(0, 0, 0);
    this.cssObj.rotation.y = 0;
    this.cssObj.scale.set(scale, scale, scale);
    this.add(this.cssObj);

    const material = new THREE.MeshPhongMaterial({
      opacity: 0.15,
      color: new THREE.Color(0xf00),
      blending: THREE.NoBlending,
      side: THREE.DoubleSide,
    });
    const geometry = new THREE.BoxGeometry(width, height, 1);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.set(scale, scale, scale);

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.add(mesh);
  }

  destroy() {
    this.remove(this.cssObj);
  }
}
