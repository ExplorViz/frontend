import * as THREE from 'three';
import BaseMesh from './base-mesh';

export default class LogoMesh extends BaseMesh {
  texture: THREE.Texture;

  width: number;

  height: number;

  constructor(texture: THREE.Texture, width: number, height: number, defaultColor = new THREE.Color('white')) {
    super(defaultColor);

    this.texture = texture;
    this.width = width;
    this.height = height;

    this.material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
    });
    this.geometry = new THREE.PlaneGeometry(width, height);
  }
}
