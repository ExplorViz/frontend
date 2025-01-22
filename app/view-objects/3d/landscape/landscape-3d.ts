import { GrabbableObject } from 'explorviz-frontend/utils/extended-reality/view-objects/interfaces/grabbable-object';
import * as THREE from 'three';

export default class Landscape3D
  extends THREE.Group
  implements GrabbableObject
{
  constructor() {
    super();
    const scalar = 0.01;
    this.scale.set(scalar, scalar, scalar);
  }

  getGrabId() {
    return this.getModelId();
  }

  getModelId() {
    return '3d-landscape';
  }

  canBeIntersected() {
    return true;
  }
}
