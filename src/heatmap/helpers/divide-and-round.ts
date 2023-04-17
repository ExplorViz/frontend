export function divideAndRound([value, divider, decimals]: [
  number,
  number,
  number
]) {
  const result = value / divider;
  return result.toFixed(decimals);
}
