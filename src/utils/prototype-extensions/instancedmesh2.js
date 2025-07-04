import * as THREE from 'three';
import { InstancedMesh2 } from '@three.ez/instanced-mesh';

const originalRaycast = InstancedMesh2.prototype.raycast;

// Override raycast on the prototype
// This is necessary to ensure that the raycasting works correctly with our other meshes
// InstancedMesh2 uses custom raycasting with scaling. To make distances comparable with those of other meshes,
// we need to undo the scaling applied in the raycasting process.
InstancedMesh2.prototype.raycast = function (raycaster, result) {
  if (
    this._parentLOD ||
    !this.material ||
    this._instancesArrayCount === 0 ||
    !this.instanceIndex
  )
    return;

  const localHits = [];
  originalRaycast.call(this, raycaster, localHits);

  const worldScale = new THREE.Vector3().setFromMatrixScale(this.matrixWorld);
  const direction = raycaster.ray.direction.clone().multiply(worldScale);
  const scaleFactor = direction.length();

  // Fix distances
  for (let i = 0; i < localHits.length; i++) {
    const hit = localHits[i];
    hit.distance *= scaleFactor;
    result.push(hit);
  }
};
