import * as THREE from 'three';
import LabelMesh from '../label-mesh';
import { Font } from 'three/examples/jsm/loaders/FontLoader';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

export default class MinimapLabelMesh extends LabelMesh {
  constructor(
    font: Font,
    labelText: string,
    textColor = new THREE.Color('white'),
    size: number
  ) {
    super(font, labelText, textColor);
    this.computeLabel(labelText, size);
  }
  computeLabel(labelText: string, size: number) {
    // Text should look like it is written on the parent's box (no height required)
    const TEXT_HEIGHT = 0.0;

    let displayedLabel = labelText;
    // Prevent overlapping clazz labels by truncating
    if (labelText.length > 13) {
      displayedLabel = `${labelText.substring(0, 11)}...`;
    }

    this.geometry = new TextGeometry(displayedLabel, {
      font: this.font,
      size,
      height: TEXT_HEIGHT,
      curveSegments: 1,
    });

    this.material = new THREE.MeshBasicMaterial({
      color: this.defaultColor,
      // depthTest: false,
    });
  }
}
