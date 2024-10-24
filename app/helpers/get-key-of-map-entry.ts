import { helper } from '@ember/component/helper';

export function getKeyOfMapEntry([mapEntry]: [[any, any]]) {
  return mapEntry[0];
}

export default helper(getKeyOfMapEntry);
