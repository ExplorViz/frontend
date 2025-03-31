import * as THREE from 'three';
import { Font } from 'three-stdlib'; //'three/examples/jsm/loaders/FontLoader';
import BaseMesh from 'explorviz-frontend/src/view-objects/3d/base-mesh.ts';

export default class LabelMesh extends BaseMesh {
  labelText: string;

  font: Font;

  constructor(
    font: Font,
    labelText: string,
    textColor = new THREE.Color('black')
  ) {
    super(textColor);
    this.font = font;
    this.labelText = labelText;
  }
}
