export type Color = {
  colorId: number,
  red: number,
  green: number,
  blue: number
};

export function isColor(color: any): color is Color {
  return (
    Array.isArray(color) &&
    color.length === 3 &&
    color.every((c) => typeof c === 'number' && c >= 0 && c <= 1)
  );
}
