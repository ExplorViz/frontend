/**
 * Rounds a given number to a specfied precision.
 * @param value Number which should be rounded
 * @param precision Determines how many decimal places the returned value has
 */
export default function round(value: number, precision?: number): number {
  const multiplier = 10 ** (precision || 0);
  return Math.round(value * multiplier) / multiplier;
}
