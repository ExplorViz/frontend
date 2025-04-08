import BaseMesh from 'explorviz-frontend/src/view-objects/3d/base-mesh.ts';
import * as THREE from 'three';
import VRController from 'explorviz-frontend/src/utils/extended-reality/vr-controller';
import { IntersectableObject } from 'explorviz-frontend/src/utils/extended-reality/view-objects/interfaces/intersectable-object';
import { BLOCK_OPTIONS_CONTAINER } from 'explorviz-frontend/src/utils/extended-reality/vr-menus/ui-menu/detail-info-menu';

export type CloseIconTextures = {
  defaultTexture: THREE.Texture;
  hoverTexture: THREE.Texture;
};

export default class CloseIcon extends BaseMesh implements IntersectableObject {
  private radius: number;

  private onClose: () => Promise<boolean>;

  private textures: CloseIconTextures;

  material: THREE.MeshPhongMaterial;

  constructor({
    onClose,
    textures,
    radius = 4,
    segments = 32,
  }: {
    onClose: () => Promise<boolean>;
    textures: CloseIconTextures;
    radius?: number;
    segments?: number;
    compensateParentScale?: boolean;
  }) {
    super(new THREE.Color());

    this.onClose = onClose;
    this.textures = textures;

    this.radius = radius;
    this.geometry = new THREE.SphereGeometry(radius, segments, segments);
    this.material = new THREE.MeshPhongMaterial({
      map: textures.defaultTexture,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  canBeIntersected(_intersection: THREE.Intersection) {
    return true;
  }

  /**
   * Calculates the position at the top right corner of the given application object
   * and adds the close icon to the application at that position.
   *
   * @param Object3D Object to which the icon shall be added
   */
  addToObject(object: THREE.Object3D) {
    // Undo scaling of the object.
    this.scale.set(
      1.0 / object.scale.x,
      1.0 / object.scale.y,
      1.0 / object.scale.z
    );

    // Reset rotation of the object temporarily such that the axis are aligned the world axis.
    const originalRotation = object.rotation.clone();
    object.rotation.set(0, 0, 0);
    object.updateMatrixWorld();

    // Get size of the object.
    const boundingBox = new THREE.Box3().setFromObject(object);
    const width = BLOCK_OPTIONS_CONTAINER.width; //older version (doesn't fit anymore): boundingBox.max.x - boundingBox.min.x;
    const height = BLOCK_OPTIONS_CONTAINER.height; //older version (doesn't fit anymore): boundingBox.max.y - boundingBox.min.y;
    const depth = boundingBox.max.z - boundingBox.min.z;

    // Restore rotation.
    object.rotation.copy(originalRotation);

    // Position the close button in the top-right corner.
    this.position.x = (width / 2 + this.radius) * this.scale.x;
    if (height > depth) {
      this.position.y = (height / 2 + this.radius) * this.scale.y;
    } else {
      this.position.z = (depth / 2 + this.radius) * this.scale.z;

      // Rotate such that the cross faces forwards.
      this.geometry.rotateX(90 * THREE.MathUtils.DEG2RAD);
      this.geometry.rotateY(90 * THREE.MathUtils.DEG2RAD);
    }

    object.add(this);
  }

  applyHoverEffect() {
    super.applyHoverEffect();
    this.material.map = this.textures.hoverTexture;
  }

  resetHoverEffect() {
    super.resetHoverEffect();
    this.material.map = this.textures.defaultTexture;
  }

  close(): Promise<boolean> {
    // An object cannot be closed when it is grabbed by the local user.
    // The `onClose` callback still has to ask the backend whether the
    // object can be clsoed.
    const controller = VRController.findController(this);
    if (!controller) {
      return this.onClose();
    }
    return Promise.resolve(false);
  }
}
