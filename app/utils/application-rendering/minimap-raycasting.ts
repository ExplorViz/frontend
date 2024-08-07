import * as THREE from 'three';

const groundPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0); // Virtual ground Plane used to intersect raycast

let cam: THREE.Camera;

export let updateMinimap: Boolean;

let lastPoint = new THREE.Vector3(0, 0, 0);

let boundingBox: THREE.Box3;

export function raycastToGround(
  camera: THREE.Camera,
  box: THREE.Box3,
  currentPosition: THREE.Vector3
) {
  if (updateMinimap) {
    const raycaster = new THREE.Raycaster();
    const screenX = window.innerWidth / 2;
    const screenY = window.innerHeight / 2;
    cam = camera;
    boundingBox = box;

    // Convert screen coordinates to world coordinates
    const middlePoint = screenToWorld(screenX, screenY);
    // Calculate the direction from the camera to the unprojected point
    const direction = middlePoint.sub(camera.position).normalize();

    // Set up the raycaster with the camera's position and the calculated direction
    raycaster.set(camera.position, direction);

    // Calculate the intersection point with the ground plane
    const intersectionPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(groundPlane, intersectionPoint);

    // Calculate the difference between the last point and the intersection point
    const difference = new THREE.Vector3().subVectors(
      intersectionPoint,
      lastPoint
    );

    // Calculate the adjusted intersection point
    // Instead of subtracting the full difference, subtract only a fraction of it
    const adjustmentFactor = 0.5; // Adjust this value to control the smoothness
    const adjustedDifference = difference.multiplyScalar(adjustmentFactor);
    const adjustedIntersectionPoint = new THREE.Vector3().addVectors(
      lastPoint,
      adjustedDifference
    );

    // Update the lastPoint to the adjusted intersection point
    lastPoint.copy(adjustedIntersectionPoint);

    return checkBoundingBox(adjustedIntersectionPoint);
  } else {
    return currentPosition;
  }
}

function screenToWorld(screenX: number, screenY: number) {
  const vector = new THREE.Vector3();
  vector.set(
    (screenX / window.innerWidth) * 2 - 1,
    -(screenY / window.innerHeight) * 2 + 1,
    0.5
  );
  vector.unproject(cam);
  return vector;
}

export function changeValue(value: Boolean) {
  updateMinimap = value;
}

function checkBoundingBox(intersectionPoint: THREE.Vector3) {
  let margin = 0.7;
  if (intersectionPoint.x > boundingBox.max.x / 100 + margin) {
    intersectionPoint.x = boundingBox.max.x / 100 + margin;
  } else if (intersectionPoint.x < boundingBox.min.x / 100 - margin) {
    intersectionPoint.x = boundingBox.min.x / 100 - margin;
  }
  if (intersectionPoint.z > boundingBox.max.z / 100 + margin) {
    intersectionPoint.z = boundingBox.max.z / 100 + margin;
  } else if (intersectionPoint.z < boundingBox.min.z / 100 - margin) {
    intersectionPoint.z = boundingBox.min.z / 100 - margin;
  }
  return intersectionPoint;
}
