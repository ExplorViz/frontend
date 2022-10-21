import * as THREE from 'three';
import BaseMesh from './base-mesh';

export default class LabelMesh extends BaseMesh {
  labelText: string;

  font: THREE.Font;

  constructor(
    font: THREE.Font,
    labelText: string,
    textColor = new THREE.Color('black')
  ) {
    super(textColor);
    this.font = font;
    this.labelText = labelText;
  }
}
