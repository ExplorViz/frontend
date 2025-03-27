import { helper } from '@ember/component/helper';

/**
 * Formats a number passed on the passed number and time unit
 * @param number passed number
 * @param unit time unit
 */
export function formatNumber([inputNumber, unit]: [number, string]) {
  if (unit === 'us') {
    return (inputNumber / 1000.0).toFixed(4).toString();
  }
  if (unit === 'ms') {
    return (inputNumber / 1000000.0).toFixed(4).toString();
  }
  if (unit === 's') {
    return (inputNumber / 1000000000.0).toFixed(4).toString();
  }
  // default time unit is `nanoseconds` (ns) as defined in backend
  return inputNumber.toFixed(0).toString();
}

export default helper(formatNumber);
