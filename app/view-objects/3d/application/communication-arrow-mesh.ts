import * as THREE from 'three';
import { DrawableClassCommunication } from 'explorviz-frontend/utils/application-rendering/class-communication-computer';

export default class CommunicationArrowMesh extends THREE.ArrowHelper {
  dataModel: DrawableClassCommunication;

  constructor(
    dataModel: DrawableClassCommunication,
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
