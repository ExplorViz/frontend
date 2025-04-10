import * as THREE from 'three';
import { Font } from 'three-stdlib'; //'three/examples/jsm/loaders/FontLoader';
import BaseMesh from 'explorviz-frontend/src/view-objects/3d/base-mesh.ts';
import { extend, ThreeElement } from '@react-three/fiber';

interface Args {
  font: Font,
  labelText: string,
  textColor: THREE.Color;
}

export default class LabelMesh extends BaseMesh {
  labelText: string;

  font: Font;

  constructor({
    font,
    labelText,
    textColor = new THREE.Color('black')
  }: Args) {
    super(textColor);
    this.font = font;
    this.labelText = labelText;
  }
}

extend({ LabelMesh })

// Add types to ThreeElements elements so primitives pick up on it
declare module '@react-three/fiber' {
  interface ThreeElements {
    labelMesh: ThreeElement<typeof LabelMesh>;
  }
}