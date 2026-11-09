import type { Vector3 } from 'three';

/** Compare at the precision used by the instanced mesh's Float32 matrices. */
export function buildingTransformMatches(
  position: Vector3,
  scale: Vector3,
  targetPosition: Vector3,
  targetScale: Vector3
): boolean {
  return (
    Math.fround(position.x) === Math.fround(targetPosition.x) &&
    Math.fround(position.y) === Math.fround(targetPosition.y) &&
    Math.fround(position.z) === Math.fround(targetPosition.z) &&
    Math.fround(scale.x) === Math.fround(targetScale.x) &&
    Math.fround(scale.y) === Math.fround(targetScale.y) &&
    Math.fround(scale.z) === Math.fround(targetScale.z)
  );
}
