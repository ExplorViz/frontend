import { helper } from '@ember/component/helper';

export function conditional([conditional, value]: [number | boolean, string]) {
  if (conditional === 2 || conditional === true) {
    return value;
  }
  return '';
}

export default helper(conditional);
