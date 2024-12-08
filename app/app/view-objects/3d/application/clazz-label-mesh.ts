import * as THREE from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { Font } from 'three/examples/jsm/loaders/FontLoader';
import LabelMesh from '../label-mesh';

export default class ClazzLabelMesh extends LabelMesh {
  constructor(
    font: Font,
    labelText: string,
    textColor = new THREE.Color('black'),
    size: number
  ) {
    super(font, labelText, textColor);

    this.renderOrder = 1;

    this.computeLabel(labelText, size);

    // Set label slightly transparent to avoid errors
    // due to different render order (of transparent objects)
    this.turnTransparent(0.99);
  }

  /**
   * Create the geometry and material for the desired label
   * and add it to this mesh.
   *
   * @param labelText Desired text for the clazz label
   * @param size Desired font size for the clazz label
   */
  computeLabel(labelText: string, size: number) {
    // Text should look like it is written on the parent's box (no height required)
    const TEXT_HEIGHT = 0.0;

    let displayedLabel = labelText;
    // Prevent overlapping clazz labels by truncating
    if (labelText.length > 10) {
      displayedLabel = `${labelText.substring(0, 8)}...`;
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
