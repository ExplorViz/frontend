import { VisualizationMode } from 'explorviz-frontend/src/stores/collaboration/local-user';
import { Method } from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import BaseMesh from 'explorviz-frontend/src/view-objects/3d/base-mesh';
import * as THREE from 'three';

export class MethodMesh extends BaseMesh {
  dataModel: Method;
  constructor(
    geometry:
      | THREE.BoxGeometry
      | THREE.BufferGeometry = new THREE.BoxGeometry(),
    material: THREE.Material = new THREE.MeshBasicMaterial({ color: 0x00ff00 }),
    dataModel: Method
  ) {
    super();
    this.geometry = geometry;
    this.material = material;
    this.dataModel = dataModel;
  }
  applyHoverEffect(arg?: VisualizationMode | number): void {
    if (arg === 'vr' && !this.isHovered) {
      this.scaleAll = 3;
      super.applyHoverEffect();
    } else if (typeof arg === 'number' && !this.isHovered) {
      super.applyHoverEffect(arg);
    } else if (!this.isHovered) {
      super.applyHoverEffect(1.5);
    }
  }

  resetHoverEffect(mode?: VisualizationMode): void {
    if (this.isHovered) {
      super.resetHoverEffect();
      if (mode === 'vr') {
        this.scaleAll = -3;
      }
    }
  }
  getModelId() {
    return 'method-mesh-id-' + this.dataModel.methodHash;
  }
}
