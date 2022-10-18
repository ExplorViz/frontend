export type Position = number[];

export function isPosition(position: any): position is Position {
  return (
    Array.isArray(position) &&
    position.length === 3 &&
    position.every((c) => typeof c === 'number')
  );
}
