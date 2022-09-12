import * as THREE from 'three';
import { IntersectableObject } from './intersectable-object';

export interface GrabbableObject extends IntersectableObject {
  getGrabId(): string | null;
}

export class GrabbableObjectWrapper extends THREE.Group implements GrabbableObject {
  private grabId: string | null;

  constructor(object: THREE.Object3D, grabId: string | null = null) {
    super();
    this.grabId = grabId;
    this.add(object);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  canBeIntersected(_intersection: THREE.Intersection) {
    return true;
  }

  getGrabId() {
    return this.grabId;
  }
}

export function isGrabbableObject(object: any): object is GrabbableObject {
  return (
    object !== null
    && typeof object === 'object'
    && typeof object.getGrabId === 'function'
  );
}

export function findGrabbableObject(
  root: THREE.Object3D,
  objectId: string,
): GrabbableObject | null {
  const objects = [root];
  while (objects.length > 0) {
    const object = objects.shift();
    if (isGrabbableObject(object) && object.getGrabId() === objectId) return object;
    if (object) objects.push(...object.children);
  }
  return null;
}
