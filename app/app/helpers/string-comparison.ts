import { helper } from '@ember/component/helper';

// TODO use this as generic comparison helper
// not only for string equality

export function stringComparison([string1, string2]: [string, string]) {
  return string1 === string2;
}

export default helper(stringComparison);
