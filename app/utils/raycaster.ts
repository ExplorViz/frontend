import LabelMesh from 'explorviz-frontend/view-objects/3d/label-mesh';
import LogoMesh from 'explorviz-frontend/view-objects/3d/logo-mesh';
import * as THREE from 'three';
import ThreeMeshUI from 'three-mesh-ui';

export function defaultRaycastFilter(
  intersection: THREE.Intersection
): boolean {
  return !(
    intersection.object instanceof LabelMesh ||
    intersection.object instanceof LogoMesh ||
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
}
