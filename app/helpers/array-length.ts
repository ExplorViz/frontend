import { helper } from '@ember/component/helper';

export function arrayLength([array]: [any[] | undefined]) {
  if (array) return array.length;
  else return undefined;
}

export default helper(arrayLength);
