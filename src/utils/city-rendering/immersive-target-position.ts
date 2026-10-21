import { InstancedMesh2 } from '@three.ez/instanced-mesh';
import * as THREE from 'three';

/**
 * Padding beyond the configured sphere radius for the visible background sphere.
 * Flat UI (labels, variable/method cards) sits near `userSphereRadius`; this
 * margin keeps their corners from intersecting the sphere wall.
 */
const BACKGROUND_SPHERE_PADDING = 0.75;

/** Matches the background sphere in immersive-sphere.tsx. */
export function getImmersiveBackgroundSphereRadius(
  userSphereRadius: number
): number {
  return userSphereRadius + BACKGROUND_SPHERE_PADDING;
}

/** Radius for immersive UI content (inside the background sphere). */
export function getImmersiveContentRadius(userSphereRadius: number): number {
  return userSphereRadius;
}

/** Extra lift so the sphere clears the building roof and nearby city geometry. */
const SPHERE_CLEARANCE_ABOVE_ROOF = 0.35;

/**
 * How far below the camera the roof should meet the user (eye → feet).
 * Keeps the roof just under the viewpoint so it feels like standing on it.
 */
export const IMMERSIVE_EYE_HEIGHT = 0.2;

/** Immersive grow/restore runs at this fraction of normal animation speed (8 ⇒ 8× slower). */
export const IMMERSIVE_ANIMATION_DURATION_FACTOR = 8;

function readInstanceTransform(mesh: InstancedMesh2, instanceId: number) {
  const instanceMatrix = new THREE.Matrix4();
  const centerLocal = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();

  mesh.getMatrixAt(instanceId, instanceMatrix);
  instanceMatrix.decompose(centerLocal, quaternion, scale);
  mesh.updateWorldMatrix(true, false);

  return { centerLocal, scale };
}

function getMeshUp(mesh: InstancedMesh2): THREE.Vector3 {
  const up = new THREE.Vector3(0, 1, 0);
  up.transformDirection(mesh.matrixWorld);
  return up;
}

/**
 * World-space center for immersive view: above the clicked building's roof,
 * accounting for landscape/city transforms and configured sphere size.
 */
export function getImmersiveTargetWorldPosition(
  mesh: InstancedMesh2,
  instanceId: number,
  userSphereRadius: number
): THREE.Vector3 | null {
  try {
    const { centerLocal, scale } = readInstanceTransform(mesh, instanceId);
    const roofLocal = centerLocal
      .clone()
      .add(new THREE.Vector3(0, scale.y / 2, 0));

    const target = roofLocal.clone();
    mesh.localToWorld(target);

    const lift =
      getImmersiveBackgroundSphereRadius(userSphereRadius) +
      SPHERE_CLEARANCE_ABOVE_ROOF;
    target.addScaledVector(getMeshUp(mesh), lift);

    return target;
  } catch {
    return null;
  }
}

/**
 * Building height (scale.y) so the roof meets `feetWorld`, keeping the base fixed.
 */
export function getImmersiveGrownBuildingHeight(
  mesh: InstancedMesh2,
  instanceId: number,
  feetWorld: THREE.Vector3
): number | null {
  try {
    const { centerLocal, scale } = readInstanceTransform(mesh, instanceId);
    const baseLocalY = centerLocal.y - scale.y / 2;

    const feetLocal = feetWorld.clone();
    mesh.worldToLocal(feetLocal);

    const grownHeight = feetLocal.y - baseLocalY;
    if (!Number.isFinite(grownHeight) || grownHeight <= scale.y * 0.01) {
      return null;
    }

    return grownHeight;
  } catch {
    return null;
  }
}

/**
 * World-space feet position under the immersive camera (roof target).
 */
export function getImmersiveFeetWorldPosition(
  mesh: InstancedMesh2,
  cameraWorld: THREE.Vector3
): THREE.Vector3 {
  mesh.updateWorldMatrix(true, false);
  return cameraWorld
    .clone()
    .addScaledVector(getMeshUp(mesh), -IMMERSIVE_EYE_HEIGHT);
}
