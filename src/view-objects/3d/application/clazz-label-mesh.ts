import * as THREE from 'three';
import { TextGeometry } from 'three-stdlib'; //'three/examples/jsm/geometries/TextGeometry.js';
import { Font } from 'three-stdlib'; //'three/examples/jsm/loaders/FontLoader';
import LabelMesh from 'explorviz-frontend/src/view-objects/3d/label-mesh.ts';

export default class ClazzLabelMesh extends LabelMesh {
  //parents: THREE.Object3D | undefined = undefined;
  constructor(
    font: Font,
    labelText: string,
    textColor = new THREE.Color('black'),
    size: number,
    letterLimit: number = 15
  ) {
    super({ font, labelText, textColor });

    this.renderOrder = 1;

    this.computeLabel(labelText, size, letterLimit);
  }

  /**
   * Create the geometry and material for the desired label
   * and add it to this mesh.
   *
   * @param labelText Desired text for the class label
   * @param size Desired font size for the class label
   */
  computeLabel(labelText: string, size: number, letterLimit: number = 10) {
    // Text should look like it is written on the parent's box (no height required)
    const TEXT_HEIGHT = 0.0;

    let displayedLabel = labelText;
    // Prevent overlapping class labels by truncating
    if (labelText.length > letterLimit) {
      displayedLabel = `${labelText.substring(0, letterLimit)}...`;
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
