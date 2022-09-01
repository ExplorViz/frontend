import * as THREE from 'three';

/**
 * Interface for all objects that can be intersected by a controller's ray.
 */
export interface IntersectableObject extends THREE.Object3D {
  canBeIntersected(intersection: THREE.Intersection): boolean;
}

export function isIntersectableObject(
  object: any,
): object is IntersectableObject {
  return (
    object !== null
    && typeof object === 'object'
    && typeof object.canBeIntersected === 'function'
  );
}

/**
 * Tests whether all intersectable parent objects (there must be at least one)
 * can be intersected by the given intersection.
 *
 * Returns `false` if there is no intersectable parent or at least one of them
 * rejects the intersection. If the `onlyVisisble` flag is set to `true`, all
 * parent objects must be visible.
 */
export function canIntersectAllParentObjects(
  intersection: THREE.Intersection,
  {
    onlyVisible,
  }: {
    onlyVisible: boolean;
  },
) {
  let result = false;
  let current: THREE.Object3D | null = intersection.object;
  while (current) {
    if (onlyVisible && !current.visible) return false;
    if (isIntersectableObject(current)) {
      result = current.canBeIntersected(intersection);
      if (!result) return result;
    }
    current = current.parent;
  }
  return result;
}
