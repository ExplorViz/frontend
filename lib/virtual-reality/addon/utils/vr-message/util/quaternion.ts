export type Quaternion = number[];

export function isQuaternion(quaternion: any): quaternion is Quaternion {
  return (
    Array.isArray(quaternion)
    && quaternion.length === 4
    && quaternion.every((c) => typeof c === 'number')
  );
}
