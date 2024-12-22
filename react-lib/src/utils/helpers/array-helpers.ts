import equal from 'fast-deep-equal';

export function areArraysEqual(a: any[] | null, b: any[] | null): boolean {
  if (a === b) return true; // both null or both the same reference.
  if (a === null || b === null) return false;

  if (a.length !== b.length) return false;

  const isObjectArray = (arr: any[]): boolean =>
    arr.every((item) => typeof item === 'object' && item !== null);

  if (isObjectArray(a) && isObjectArray(b)) {
    return equal(a, b);
  }

  return a.every((val, index) => val === b[index]);
}
