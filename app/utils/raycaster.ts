import CommunicationArrowMesh from 'explorviz-frontend/view-objects/3d/application/communication-arrow-mesh';
import CrosshairMesh from 'explorviz-frontend/view-objects/3d/crosshair-mesh';
import LabelMesh from 'explorviz-frontend/view-objects/3d/label-mesh';
import LogoMesh from 'explorviz-frontend/view-objects/3d/logo-mesh';
import PingMesh from 'extended-reality/utils/view-objects/vr/ping-mesh';
import * as THREE from 'three';
import ThreeMeshUI from 'three-mesh-ui';
import UserSettings from 'explorviz-frontend/services/user-settings';
import { inject as service } from '@ember/service';
import remoteUser from 'collaboration/utils/remote-user';
import RemoteUser from 'collaboration/utils/remote-user';

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

  minimapCam: THREE.OrthographicCamera | undefined;

  lastPoint: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  boundingBox!: THREE.Box3;

  constructor(minimap?: THREE.OrthographicCamera) {
    super();
    this.minimapCam = minimap;
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

  raycastMinimap(
    camera: THREE.OrthographicCamera,
    coords: { x: number; y: number },
    userList: RemoteUser[]
  ) {
    this.setFromCamera(new THREE.Vector2(coords.x, coords.y), camera);
    const users = userList;
    const markers: THREE.Object3D[] = [];
    users.forEach((user: remoteUser) => {
      markers.push(user.minimapMarker!);
      user.minimapMarker?.layers.enable(0);
    });
    const intersections = this.intersectObjects(markers, false);
    markers.forEach((marker: THREE.Object3D) => {
      marker.layers.disable(0);
    });
    if (intersections.length > 0) {
      return intersections[0];
    }
    return null;
  }

  raycastToGround(camera: THREE.Camera, box: THREE.Box3, version2: boolean) {
    if (!version2) {
      return this.checkBoundingBox(new THREE.Vector3().copy(camera.position));
    }
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
    const adjustedIntersectionPoint = new THREE.Vector3().addVectors(
      this.lastPoint,
      difference
    );

    return this.checkBoundingBox(adjustedIntersectionPoint);
  }

  checkBoundingBox(intersectionPoint: THREE.Vector3) {
    if (this.boundingBox) {
      if (intersectionPoint.x > this.boundingBox.max.x) {
        intersectionPoint.x = this.boundingBox.max.x;
      } else if (intersectionPoint.x < this.boundingBox.min.x) {
        intersectionPoint.x = this.boundingBox.min.x;
      }
      if (intersectionPoint.z > this.boundingBox.max.z) {
        intersectionPoint.z = this.boundingBox.max.z;
      } else if (intersectionPoint.z < this.boundingBox.min.z) {
        intersectionPoint.z = this.boundingBox.min.z;
      }
    }
    return intersectionPoint;
  }
}

export function changeValue(value: boolean) {
  updateMinimap = value;
}
