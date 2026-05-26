import { InstancedMesh2 } from '@three.ez/instanced-mesh';
import * as THREE from 'three';

/** Matches the background sphere in immersive-sphere.tsx (userRadius + 0.2). */
export function getImmersiveBackgroundSphereRadius(
  userSphereRadius: number
): number {
  return userSphereRadius + 0.2;
}

/** Extra lift so the sphere clears the building roof and nearby city geometry. */
const SPHERE_CLEARANCE_ABOVE_ROOF = 0.35;

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
    const instanceMatrix = new THREE.Matrix4();
    const centerLocal = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    mesh.getMatrixAt(instanceId, instanceMatrix);
    instanceMatrix.decompose(centerLocal, quaternion, scale);

    const roofLocal = centerLocal
      .clone()
      .add(new THREE.Vector3(0, scale.y / 2, 0));

    mesh.updateWorldMatrix(true, false);

    const target = roofLocal.clone();
    mesh.localToWorld(target);

    const up = new THREE.Vector3(0, 1, 0);
    up.transformDirection(mesh.matrixWorld);

    const lift =
      getImmersiveBackgroundSphereRadius(userSphereRadius) +
      SPHERE_CLEARANCE_ABOVE_ROOF;
    target.addScaledVector(up, lift);

    return target;
  } catch {
    return null;
  }
}
