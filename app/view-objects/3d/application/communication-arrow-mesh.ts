import { VisualizationMode } from 'explorviz-frontend/services/collaboration/local-user';
import ClassCommunication from 'explorviz-frontend/utils/landscape-schemes/dynamic/class-communication';
import ComponentCommunication from 'explorviz-frontend/utils/landscape-schemes/dynamic/component-communication';
import * as THREE from 'three';
import { SemanticZoomableObjectBaseMixin } from './utils/semantic-zoom-manager';

class CommunicationArrowMeshPrivate extends THREE.ArrowHelper {
  dataModel: ClassCommunication | ComponentCommunication;

  isHovered = false;

  HOVER_Y_TRANSLATION = 2;
  HOVER_SCALE_FACTOR = 2.5;

  constructor(
    dataModel: ClassCommunication | ComponentCommunication,
    dir: THREE.Vector3,
    origin: THREE.Vector3,
    length: number,
    color: number,
    headLength: number,
    headWidth: number
  ) {
    super(dir, origin, length, color, headLength, headWidth);
    this.dataModel = dataModel;
  }

  /**
   * Deletes this arrow from its parent and dispose the arrow's geomeries and materials
   */
  delete() {
    if (this.parent) {
      this.parent.remove(this);
    }
    const { line } = this;
    line.geometry.dispose();

    if (line.material instanceof THREE.Material) {
      line.material.dispose();
    }

    const { cone } = this;
    cone.geometry.dispose();
    if (cone.material instanceof THREE.Material) {
      cone.material.dispose();
    }
  }

  updateColor(color: THREE.Color) {
    if (this.line.material instanceof THREE.LineBasicMaterial) {
      this.line.material.color = color;
    }
    if (this.cone.material instanceof THREE.MeshBasicMaterial) {
      this.cone.material.color = color;
    }
  }

  /**
   * Changes the transparency of the arrow. Fully transprarent: 0.0
   *
   * @param opacity The desired transparancy of the arrow
   */
  changeOpacity(opacity: number) {
    const isTransparent = opacity < 1;

    if (this.line.material instanceof THREE.Material) {
      this.line.material.opacity = opacity;
      this.line.material.transparent = isTransparent;
      this.line.material.needsUpdate = true;
    }

    if (this.cone.material instanceof THREE.Material) {
      this.cone.material.opacity = opacity;
      this.cone.material.transparent = isTransparent;
      this.cone.material.needsUpdate = true;
    }
  }

  hide() {
    if (this.line.material instanceof THREE.Material) {
      this.line.material.visible = false;
      this.line.material.needsUpdate = true;
    }

    if (this.cone.material instanceof THREE.Material) {
      this.cone.material.visible = false;
      this.cone.material.needsUpdate = true;
    }
  }

  show() {
    if (this.line.material instanceof THREE.Material) {
      this.line.material.visible = true;
      this.line.material.needsUpdate = true;
    }

    if (this.cone.material instanceof THREE.Material) {
      this.cone.material.visible = true;
      this.cone.material.needsUpdate = true;
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
    color: number,
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
