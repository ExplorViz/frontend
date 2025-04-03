/**
 * Formats a number passed on the passed number and time unit
 * @param number passed number
 * @param unit time unit
 */
<<<<<<< HEAD:src/utils/format-number.ts
export function formatNumber(inputNumber: number, unit: string) {
=======
export function formatNumber([inputNumber, unit]: [number, string]) {
  if (unit === 'μs') {
    return (inputNumber / 1000.0).toFixed(4).toString();
  }
>>>>>>> main:app/helpers/format-number.ts
  if (unit === 'ms') {
    return (inputNumber / 1000000.0).toFixed(4).toString();
  }
  if (unit === 's') {
    return (inputNumber / 1000000000.0).toFixed(4).toString();
  }
  // default time unit is `nanoseconds` (ns) as defined in backend
  return inputNumber.toFixed(0).toString();
}
