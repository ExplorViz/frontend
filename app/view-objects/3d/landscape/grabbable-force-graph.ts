import ThreeForceGraph from 'three-forcegraph';
import { GrabbableObject } from 'virtual-reality/utils/view-objects/interfaces/grabbable-object';

export default class GrabbableForceGraph
  extends ThreeForceGraph
  implements GrabbableObject
{
  constructor() {
    super();
  }

  getGrabId() {
    return 'force-graph-grabbable';
  }

  canBeIntersected() {
    return true;
  }
}
