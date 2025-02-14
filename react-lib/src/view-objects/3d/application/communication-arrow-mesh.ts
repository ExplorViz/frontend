import { VisualizationMode } from 'react-lib/src/stores/collaboration/local-user';
import ClassCommunication from 'react-lib/src/utils/landscape-schemes/dynamic/class-communication';
import ComponentCommunication from 'react-lib/src/utils/landscape-schemes/dynamic/component-communication';
import * as THREE from 'three';
import { SemanticZoomableObjectBaseMixin } from './utils/semantic-zoom-manager';
import BaseMesh from 'react-lib/src/view-objects/3d/base-mesh';

class CommunicationArrowMeshPrivate extends BaseMesh {
  dataModel: ClassCommunication | ComponentCommunication;

  _axis = new THREE.Vector3();
  isHovered = false;

  HOVER_Y_TRANSLATION = 2;
  HOVER_SCALE_FACTOR = 2.5;

  constructor(
    dataModel: ClassCommunication | ComponentCommunication,
    dir: THREE.Vector3,
    origin: THREE.Vector3,
    length: number,
    color: THREE.Color,
    headLength: number,
    headWidth: number
  ) {
    super(color);
    this.dataModel = dataModel;

    this.material = new THREE.MeshBasicMaterial({
      color: color,
      toneMapped: false,
    });
    this.geometry = new THREE.CylinderGeometry(0, 0.5, 1, 5, 1);
    this.geometry.translate(0, -0.5, 0);

    this.position.copy(origin);

    this.matrixAutoUpdate = true;

    this.setDirection(dir);
    this.setLength(length, headLength, headWidth);
  }

  setDirection(dir: THREE.Vector3) {
    // dir is assumed to be normalized

    if (dir.y > 0.99999) {
      this.quaternion.set(0, 0, 0, 1);
    } else if (dir.y < -0.99999) {
      this.quaternion.set(1, 0, 0, 0);
    } else {
      this._axis.set(dir.z, 0, -dir.x).normalize();

      const radians = Math.acos(dir.y);

      this.quaternion.setFromAxisAngle(this._axis, radians);
    }
  }

  setLength(
    length: number,
    headLength = length * 0.2,
    headWidth = headLength * 0.2
  ) {
    this.scale.set(headWidth, headLength, headWidth);
    this.updateMatrix();
  }

  /**
   * Changes the transparency of the arrow. Fully transprarent: 0.0
   *
   * @param opacity The desired transparancy of the arrow
   */
  changeOpacity(opacity: number) {
    const isTransparent = opacity < 1;

    if (this.material instanceof THREE.Material) {
      this.material.opacity = opacity;
      this.material.transparent = isTransparent;
      this.material.needsUpdate = true;
    }
  }

  hide() {
    if (this.material instanceof THREE.Material) {
      this.material.visible = false;
      this.material.needsUpdate = true;
    }
  }

  show() {
    if (this.material instanceof THREE.Material) {
      this.material.visible = true;
      this.material.needsUpdate = true;
    }
  }

  applyHoverEffect(arg?: VisualizationMode | number): void {
    // Apply hover effect in VR for increased readability
    if (arg === 'vr' && !this.isHovered) {
      this.isHovered = true;
      this.position.y += this.HOVER_Y_TRANSLATION;
      this.scale.set(
        this.HOVER_SCALE_FACTOR,
        this.HOVER_SCALE_FACTOR,
        this.HOVER_SCALE_FACTOR
      );
    }
  }

  resetHoverEffect(mode?: VisualizationMode): void {
    if (this.isHovered && mode === 'vr') {
      this.isHovered = false;
      this.position.y -= this.HOVER_Y_TRANSLATION;
      this.scale.set(1, 1, 1);
    }
  }

  /**
   * Turns the arrow transparent.
   *
   * @param opacity The desired transparency. Default 0.3
   */
  turnTransparent(opacity: number = 0.3) {
    this.changeOpacity(opacity);
  }

  /**
   * Turns the arrow fully opaque again.
   */
  turnOpaque() {
    this.changeOpacity(1);
  }
}

// export const CommunicationArrowMesh = SemanticZoomableObjectBaseMixin(
//   CommunicationArrowMeshPrivate
// );
// export type CommunicationArrowMesh = InstanceType<
//   typeof CommunicationArrowMesh
// >;

export default class CommunicationArrowMesh extends SemanticZoomableObjectBaseMixin(
  CommunicationArrowMeshPrivate
) {
  constructor(
    dataModel: ClassCommunication | ComponentCommunication,
    dir: THREE.Vector3,
    origin: THREE.Vector3,
    length: number,
    color: THREE.Color,
    headLength: number,
    headWidth: number
  ) {
    super(dataModel, dir, origin, length, color, headLength, headWidth);
    // this.saveTheParent = () => {
    //   this.savedParent = this.parent;
    // };
    // this.originalLength = length;
    // this.originalHeadLength = headLength;
    // this.originalHeadWidth = headWidth;
    //this.saveOriginalAppearence();
    this.setCallBeforeAppearenceZero(() => {
      // Src: https://threejs.org/docs/#api/en/helpers/ArrowHelper
      // .setLength (length : Number, headLength : Number, headWidth : Number)
      this.setLength(length, headLength, headWidth);
      //this.parent?.remove(this);
      this.line.layers.disableAll();
      this.cone.layers.disableAll();
      //this.hideme();
    });
    this.setAppearence(2, () => {
      // Src: https://threejs.org/docs/#api/en/helpers/ArrowHelper
      // .setLength (length : Number, headLength : Number, headWidth : Number)
      this.setLength(length / 2, headLength / 2, headWidth / 2);
      //if (this.savedParent != undefined) this.savedParent.add(this);
      this.line.layers.enable(0);
      this.cone.layers.enable(0);
    });
  }
}
