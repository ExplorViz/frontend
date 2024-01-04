import { helper } from '@ember/component/helper';

export function conditional([conditional, value]: [number, string]) {
  if (conditional === 2) {
    return value;
  }
  return '';
}

export default helper(conditional);
