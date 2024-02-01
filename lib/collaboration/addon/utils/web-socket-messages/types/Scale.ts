export type Scale = number[];

export function isScale(scale: any): scale is Scale {
  return (
    Array.isArray(scale) &&
    scale.length === 3 &&
    scale.every((c) => typeof c === 'number')
  );
}
