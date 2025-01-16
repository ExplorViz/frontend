import { GrabbableObject } from 'explorviz-frontend/utils/extended-reality/view-objects/interfaces/grabbable-object';
import * as THREE from 'three';

export default class LandscapeGroup
  extends THREE.Group
  implements GrabbableObject
{
  constructor() {
    super();
    this.scale.set(0.5, 0.5, 0.5);
  }

  getGrabId() {
    return this.getModelId();
  }

  getModelId() {
    return 'three-force-graph';
  }

  canBeIntersected() {
    return true;
  }
}
