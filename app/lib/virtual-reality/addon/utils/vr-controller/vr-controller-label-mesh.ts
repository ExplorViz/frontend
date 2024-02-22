import BaseMesh from 'some-react-lib/src/view-objects/3d/base-mesh';
import * as THREE from 'three';
import TextTexture from '../vr-helpers/text-texture';
import { VRControllerLabelPosition } from './vr-controller-label-positions';

const SIZE_PER_PIXEL = 0.15 / 500;

export default class VRControllerLabelMesh extends BaseMesh {
  constructor(label: string, labelPosition: VRControllerLabelPosition) {
    super();

    // Write label text into a texture.
    const texture = new TextTexture({
      text: label,
      textColor: new THREE.Color(0xffffff),
      fontSize: 30,
      fontFamily: 'arial',
      padding: 20,
    });

    // Set size of label based on text size.
    const worldWidth = texture.image.width * SIZE_PER_PIXEL;
    const worldHeight = texture.image.height * SIZE_PER_PIXEL;
    this.geometry = new THREE.PlaneGeometry(worldWidth, worldHeight);

    // Fill background with default menu background color.
    this.material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0x444444),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });

    // Create a new mesh whose texture is the texture such that the text
    // is not visible from the back.
    const canvasGeometry = this.geometry.clone();
    const canvasMaterial = new THREE.MeshBasicMaterial({
      map: texture,
      depthTest: true,
      transparent: true,
    });
    const canvasMesh = new THREE.Mesh(canvasGeometry, canvasMaterial);

    // Move the canvas slightly in front of the background.
    canvasMesh.position.z = 0.00001;
    this.add(canvasMesh);

    // Move label to the left or right of the controller.
    // There is a 5cm padding between the label and the controller.
    const labelOffset = (labelPosition.offsetDirection * worldWidth) / 2;
    const labelPadding = labelPosition.offsetDirection * 0.05;
    this.position.copy(labelPosition.buttonPosition);
    this.translateX(labelOffset + labelPadding);

    // Draw a line from the edge of the label to the button.
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-(labelOffset + labelPadding), 0, 0),
      new THREE.Vector3(-labelOffset, 0, 0),
    ]);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color(0x444444),
    });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    this.add(line);

    // Rotate such that the label faces up.
    this.rotateX(-90 * THREE.MathUtils.DEG2RAD);
  }
}
