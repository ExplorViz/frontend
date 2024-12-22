import { areArraysEqual } from 'react-lib/src/utils/helpers/array-helpers';

export function areMapsEqual(
  mapA: Map<any, any[]> | null,
  mapB: Map<any, any[]> | null
): boolean {
  if (mapA === mapB) return true; // both null or both the same reference.
  if (mapA === null || mapB === null) return false;

  if (mapA.size !== mapB.size) return false;

  for (const [key, valueA] of mapA) {
    if (!mapB.has(key)) return false;
    const valueB = mapB.get(key)!;
    if (!areArraysEqual(valueA, valueB)) return false;
  }

  return true;
}
