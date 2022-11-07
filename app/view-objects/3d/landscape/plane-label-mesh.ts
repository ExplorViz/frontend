import * as THREE from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { Font } from 'three/examples/jsm/loaders/FontLoader';
import LabelMesh from '../label-mesh';

export default class PlaneLabelMesh extends LabelMesh {
  text: string;

  fontSize: number;

  constructor(
    font: Font,
    labelText: string,
    fontSize = 0.4,
    textColor = new THREE.Color('black'),
    geometry?: THREE.BufferGeometry
  ) {
    super(font, labelText, textColor);

    this.text = labelText;
    this.fontSize = fontSize;

    this.computeLabel(labelText, fontSize, geometry);
  }

  computeLabel(
    text: string,
    fontSize: number,
    geometry: THREE.BufferGeometry | undefined
  ) {
    // Use text geoemtry if it is passed
    if (geometry instanceof TextGeometry) {
      this.geometry = geometry;
      // Create new geometry
    } else {
      const labelGeo = new TextGeometry(text, {
        font: this.font,
        curveSegments: 1,
        size: fontSize,
        height: 0,
      });

      this.geometry = labelGeo;
    }

    const material = new THREE.MeshBasicMaterial({
      color: this.defaultColor,
    });

    this.material = material;
  }
}
