import { helper } from '@ember/component/helper';

export function divideAndRound([value, divider, decimals]: [number, number, number]) {
  const result = value / divider;
  return result.toFixed(decimals);
}

export default helper(divideAndRound);
