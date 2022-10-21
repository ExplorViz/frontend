import LandscapeObject3D from 'explorviz-frontend/view-objects/3d/landscape/landscape-object-3d';
import * as THREE from 'three';
import { GrabbableObject } from '../interfaces/grabbable-object';

/**
 * For the VR extension, we need a custom view object for landscapes to
 * implement the {@link GrabbableObject} interface. The interface marks the
 * landscape as grabbable by a controller and provides a method to get
 * the ID to send to the backend to identify the grabbed object.
 */
export default class VrLandscapeObject3D
  extends LandscapeObject3D
  implements GrabbableObject
{
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  canBeIntersected(_intersection: THREE.Intersection) {
    return true;
  }

  getGrabId(): string {
    return this.dataModel.landscapeToken;
  }
}
