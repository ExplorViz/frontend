import ThreeForceGraph from 'three-forcegraph';
import { GrabbableObject } from 'explorviz-frontend/utils/extended-reality/view-objects/interfaces/grabbable-object';

export default class GrabbableForceGraph
  extends ThreeForceGraph
  implements GrabbableObject
{
  constructor() {
    super();
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
