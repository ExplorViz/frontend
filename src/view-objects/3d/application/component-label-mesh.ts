import * as THREE from 'three';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';
import { Font } from 'three/examples/jsm/loaders/FontLoader';
import LabelMesh from '../label-mesh';
import ComponentMesh from './component-mesh';
import FoundationMesh from './foundation-mesh';

export default class ComponentLabelMesh extends LabelMesh {
  minHeight: number;

  minLength: number;

  constructor(
    componentMesh: ComponentMesh | FoundationMesh,
    font: Font,
    textColor = new THREE.Color('black'),
    minHeight = 1.5,
    minLength = 4
  ) {
    const labelText = componentMesh.dataModel.name;
    super(font, labelText, textColor);

    this.renderOrder = 1;
    this.receiveShadow = true;

    this.minHeight = minHeight;
    this.minLength = minLength;
  }

  /**
   * Adds a label mesh to a given component or foundation mesh with given text.
   *
   * @param componentMesh The component or foundation mesh to add a label to
   * @param labelText The desired text for the label
   */
  computeLabel(
    componentMesh: ComponentMesh | FoundationMesh,
    labelText = this.labelText,
    scalar = 1
  ) {
    /**
     * Updates bounding box of geometry and returns respective dimensions
     */
    function computeBoxSize(geometry: THREE.BufferGeometry) {
      geometry.computeBoundingBox();
      const boxDimensions = new THREE.Vector3();
      geometry.boundingBox?.getSize(boxDimensions);
      return { x: boxDimensions.x, y: boxDimensions.y, z: boxDimensions.z };
    }

    const parentScale = componentMesh.scale;

    const parentAspectRatio = parentScale.x / parentScale.z;

    // Adjust desired text size with possible scaling
    const textSize = (2.0 / parentScale.x) * parentAspectRatio * scalar;
    // Text should look like it is written on the parent's box (no height required)
    const textHeight = 0.0;

    this.geometry = new TextGeometry(labelText, {
      font: this.font,
      size: textSize,
      height: textHeight,
      curveSegments: 1,
    });

    this.material = new THREE.MeshBasicMaterial({
      color: this.defaultColor,
      // depthTest: false,
    });

    const textDimensions = computeBoxSize(this.geometry);
    const textWidth = textDimensions.x;

    let scaleFactor = 1;

    // Handle too long labels, expect labels to be (at most) 90% the width of the parent's mesh
    const desiredWidth = componentMesh.geometry.parameters.depth * 0.9;
    if (textWidth > desiredWidth) {
      scaleFactor = desiredWidth / textWidth;
      this.geometry.scale(scaleFactor, scaleFactor, scaleFactor);
    }

    // Avoid distorted text due to parent scaling
    this.scale.y /= componentMesh.scale.x / componentMesh.scale.z;

    // Text height as percepted by the user
    const absoluteTextHeight = textDimensions.y * parentScale.x * scaleFactor;

    // Shorten label string if scaling obliterated label
    if (
      absoluteTextHeight < this.minHeight &&
      labelText.length > this.minLength &&
      !labelText.includes('...')
    ) {
      // Dispose objects because new text object needs to be computed
      this.geometry.dispose();
      this.material.dispose();
      this.scale.set(1, 1, 1);

      // Calculate theoretical label length based on height mismatch
      const desiredLength =
        (absoluteTextHeight / this.minHeight) * Math.floor(labelText.length);

      if (labelText.length - desiredLength > 3) {
        const shortenedLabel = `${labelText.substring(
          0,
          desiredLength - 1
        )}...`;

        // Recursive call to reuse existing code
        this.computeLabel(componentMesh, shortenedLabel);
      }
    }

    // Set label slightly transparent to avoid errors
    // due to different render order (of transparent objects)
    this.turnTransparent(0.99);
  }
}
