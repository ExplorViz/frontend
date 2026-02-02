import { useVisualizationStore } from 'explorviz-frontend/src/stores/visualization-store';
import PingMesh from 'explorviz-frontend/src/utils/extended-reality/view-objects/vr/ping-mesh';
import CommunicationArrowMesh from 'explorviz-frontend/src/view-objects/3d/application/communication-arrow-mesh';
import CrosshairMesh from 'explorviz-frontend/src/view-objects/3d/crosshair-mesh.ts';
import * as THREE from 'three';
import ThreeMeshUI from 'three-mesh-ui';

export function defaultRaycastFilter(
  intersection: THREE.Intersection
): boolean {
  return !(
    intersection.object instanceof LabelMesh ||
    intersection.object instanceof LogoMesh ||
    intersection.object instanceof PingMesh ||
    intersection.object instanceof CrosshairMesh ||
    intersection.object instanceof CommunicationArrowMesh ||
    intersection.object.type === 'AxesHelper' ||
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

const TARGET_Y_VALUE = 0.165;

export default class Raycaster extends THREE.Raycaster {
  /**
   * Calculate objects which intersect the ray - given by coordinates and camera
   *
   * @param coords x- and y-coordinates of the pointer, e.g. a mouse
   * @param camera Camera - contains view information
   * @param possibleObjects Objects to check for raycasting
   */

  groundPlane = new THREE.Plane();

  cam: THREE.Camera | null = null;

  minimapCam: THREE.OrthographicCamera | undefined;

  boundingBox!: THREE.Box3;

  constructor(minimap?: THREE.OrthographicCamera) {
    super();
    this.minimapCam = minimap;
    this.groundPlane.set(new THREE.Vector3(0, TARGET_Y_VALUE, 0), 0);
  }

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

  raycastMinimapMarkers(
    camera: THREE.OrthographicCamera,
    coords: { x: number; y: number },
    userList: THREE.Mesh[]
  ) {
    this.setFromCamera(new THREE.Vector2(coords.x, coords.y), camera);
    userList.forEach((mesh: THREE.Mesh) => {
      mesh.layers.enable(useVisualizationStore.getState().sceneLayers.Default);
    });
    const intersections = this.intersectObjects(userList, false);
    userList.forEach((mesh: THREE.Mesh) => {
      mesh.layers.disable(useVisualizationStore.getState().sceneLayers.Default);
    });
    if (intersections.length > 0) {
      return intersections[0];
    }
    return null;
  }

  raycastToCameraTarget(camera: THREE.Camera, box: THREE.Box3) {
    this.cam = camera;
    this.boundingBox = box;

    // Set up the raycaster with the camera's position and the calculated direction
    this.setFromCamera(new THREE.Vector2(0, 0), this.cam);

    // Calculate the intersection point with the ground plane
    const intersectionPoint = new THREE.Vector3();
    this.ray.intersectPlane(this.groundPlane, intersectionPoint);

    return intersectionPoint;
  }
}
