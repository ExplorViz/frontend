import CommunicationArrowMesh from 'explorviz-frontend/view-objects/3d/application/communication-arrow-mesh';
import CrosshairMesh from 'explorviz-frontend/view-objects/3d/crosshair-mesh';
import LabelMesh from 'explorviz-frontend/view-objects/3d/label-mesh';
import LogoMesh from 'explorviz-frontend/view-objects/3d/logo-mesh';
import PingMesh from 'extended-reality/utils/view-objects/vr/ping-mesh';
import * as THREE from 'three';
import ThreeMeshUI from 'three-mesh-ui';
import UserSettings from 'explorviz-frontend/services/user-settings';
import { inject as service } from '@ember/service';

export let updateMinimap: boolean;

export function defaultRaycastFilter(
  intersection: THREE.Intersection
): boolean {
  return !(
    !intersection.object.visible ||
    intersection.object instanceof LabelMesh ||
    intersection.object instanceof LogoMesh ||
    intersection.object.parent instanceof CommunicationArrowMesh ||
    intersection.object instanceof PingMesh ||
    intersection.object instanceof CrosshairMesh ||
    isChildOfText(intersection)
  );
}

function isChildOfText(intersection: THREE.Intersection) {
  let isChild = false;
  intersection.object.traverseAncestors((ancestor) => {
    if (ancestor instanceof ThreeMeshUI.Text) isChild = true;
  });
  return isChild;
}

export default class Raycaster extends THREE.Raycaster {
  /**
   * Calculate objects which intersect the ray - given by coordinates and camera
   *
   * @param coords x- and y-coordinates of the pointer, e.g. a mouse
   * @param camera Camera - contains view information
   * @param possibleObjects Objects to check for raycasting
   */

  @service('user-setting')
  userSetting!: UserSettings;

  groundPlane = new THREE.Plane(new THREE.Vector3(0, -0.54, 0), 0); // Virtual ground Plane used to intersect raycast

  cam: THREE.Camera | null = null;

  lastPoint: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  boundingBox: THREE.Box3 | null = null;

  raycasting(
    coords: { x: number; y: number },
    camera: THREE.Camera,
    possibleObjects: THREE.Object3D[],
    raycastFilter?: (object: THREE.Intersection) => boolean
  ) {
    this.setFromCamera(new THREE.Vector2(coords.x, coords.y), camera);
    // Calculate objects intersecting the picking ray
    const intersections = this.intersectObjects(possibleObjects, true);

    let visibleObjects = intersections.filter((intersection) => {
      let { visible } = intersection.object;

      // Also traverse ancestors as given object could be invisible if a ancestor's
      // visible property is set to false
      intersection.object.traverseAncestors((ancestor) => {
        if (!ancestor.visible) visible = false;
      });

      return visible;
    });

    if (raycastFilter) {
      visibleObjects = visibleObjects.filter(raycastFilter);
    } else {
      visibleObjects = visibleObjects.filter(defaultRaycastFilter);
      // visibleObjects = visibleObjects.filter((x) => !(x.object instanceof LabelMesh);
    }

    // Returns the nearest hit object if one exists
    if (visibleObjects.length > 0) {
      return visibleObjects[0];
    }

    // Return null to indicate that no object was found
    return null;
  }
  raycastToGround(camera: THREE.Camera, box: THREE.Box3) {
    this.cam = camera;
    this.boundingBox = box;

    // Set up the raycaster with the camera's position and the calculated direction
    this.setFromCamera(new THREE.Vector2(0, 0), this.cam);

    // Calculate the intersection point with the ground plane
    const intersectionPoint = new THREE.Vector3();
    this.ray.intersectPlane(this.groundPlane, intersectionPoint);

    // Calculate the difference between the last point and the intersection point
    const difference = new THREE.Vector3().subVectors(
      intersectionPoint,
      this.lastPoint
    );

    // Calculate the adjusted intersection point
    // Instead of subtracting the full difference, subtract only a fraction of it
    const adjustmentFactor = 1; // Adjust this value to control the smoothness
    const adjustedDifference = difference.multiplyScalar(adjustmentFactor);
    const adjustedIntersectionPoint = new THREE.Vector3().addVectors(
      this.lastPoint,
      adjustedDifference
    );

    return this.checkBoundingBox(adjustedIntersectionPoint);
  }

  checkBoundingBox(intersectionPoint: THREE.Vector3) {
    // Check if the point is inside the bounding box
    if (!this.boundingBox!.containsPoint(intersectionPoint)) {
      // Clamp the intersectionPoint to the bounding box boundaries
      intersectionPoint.clamp(this.boundingBox!.min, this.boundingBox!.max);
    }

    return intersectionPoint;
  }
}

export function changeValue(value: boolean) {
  updateMinimap = value;
}
