import ThreeForceGraph from 'three-forcegraph';
/* import { GrabbableObject } from 'virtual-reality/utils/view-objects/interfaces/grabbable-object'; */

export default class GrabbableForceGraph extends ThreeForceGraph {
  /* Implementing deleted for migration purposes. Readd after/when migrating vr */
  // implements GrabbableObject
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
