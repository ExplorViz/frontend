import { helper } from '@ember/component/helper';

export function divideAndRound([max, min, decimals]: [number, number, number]) {
  const result = min + (max - min) / 2;
  return result.toFixed(decimals);
}

export default helper(divideAndRound);
