import * as THREE from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { Font } from 'three/examples/jsm/loaders/FontLoader';
import LabelMesh from 'react-lib/src/view-objects/3d/label-mesh.ts';
import SemanticZoomManager from 'react-lib/src/view-objects/3d/application/utils/semantic-zoom-manager';
// import * as Labeler from 'explorviz-frontend/utils/application-rendering/labeler';

export default class ClazzLabelMesh extends LabelMesh {
  //parents: THREE.Object3D | undefined = undefined;
  constructor(
    font: Font,
    labelText: string,
    textColor = new THREE.Color('black'),
    size: number,
    limitletters: number = 10
  ) {
    super(font, labelText, textColor);

    this.renderOrder = 1;

    this.computeLabel(labelText, size, limitletters);

    // Set label slightly transparent to avoid errors
    // due to different render order (of transparent objects)
    this.turnTransparent(0.99);

    // Add this to the SemanticZoomManager
    SemanticZoomManager.instance.add(this);
    // Semantic Zoom preparations
    this.saveOriginalAppearence();
    // Set Appearence on Level 1
    this.setAppearence(1, () => {
      this.computeLabel(labelText, size - 0.1, limitletters + 5);
      if (this.parent != undefined) {
        // Labeler.positionClassLabel(this, this.parent);
      }
    });
    this.setAppearence(2, () => {
      this.computeLabel(labelText, size - 0.2, limitletters + 10);
      if (this.parent != undefined) {
        // Labeler.positionClassLabel(this, this.parent);
      }
    });
    // // Remove original Label
    // this.setCallBeforeAppearenceAboveZero((clazzMesh) => {
    //   debugger;
    //   clazzMesh.remove(clazzMesh.labelMesh);
    // });
    // this.setCallBeforeAppearenceZero((clazzMesh) => {
    //   clazzMesh.add(clazzMesh.labelMesh);
    // });
  }

  /**
   * Create the geometry and material for the desired label
   * and add it to this mesh.
   *
   * @param labelText Desired text for the clazz label
   * @param size Desired font size for the clazz label
   */
  computeLabel(labelText: string, size: number, letterlimit: number = 10) {
    // Text should look like it is written on the parent's box (no height required)
    const TEXT_HEIGHT = 0.0;

    let displayedLabel = labelText;
    // Prevent overlapping clazz labels by truncating
    if (labelText.length > letterlimit) {
      displayedLabel = `${labelText.substring(0, letterlimit - 2)}...`;
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
