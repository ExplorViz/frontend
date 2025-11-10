import { VisualizationMode } from 'explorviz-frontend/src/stores/collaboration/local-user';
import ClassCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/class-communication';
import ComponentCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/component-communication';
import * as THREE from 'three';
import BaseMesh from 'explorviz-frontend/src/view-objects/3d/base-mesh';

export default class CommunicationArrowMesh extends BaseMesh {
  dataModel: ClassCommunication | ComponentCommunication;

  _axis = new THREE.Vector3();

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
    super();
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
