import * as THREE from 'three';
import LabelMesh from '../label-mesh';

export default class PlaneLabelMesh extends LabelMesh {
  text: string;

  fontSize: number;

  constructor(font: THREE.Font, labelText: string, fontSize = 0.4,
    textColor = new THREE.Color('black'), geometry?: THREE.BufferGeometry) {
    super(font, labelText, textColor);

    this.text = labelText;
    this.fontSize = fontSize;

    this.computeLabel(labelText, fontSize, geometry);
  }

  computeLabel(text: string, fontSize: number, geometry?: THREE.BufferGeometry) {
    // Use text geoemtry if it is passed
    if (geometry instanceof THREE.TextBufferGeometry) {
      this.geometry = geometry;
    // Create new geometry
    } else {
      const labelGeo = new THREE.TextGeometry(text, {
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
