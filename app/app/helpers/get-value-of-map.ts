import { helper } from '@ember/component/helper';

export function getValueOfMap([map, key]: [Map<any, any>, any]) {
  return map.get(key);
}

export default helper(getValueOfMap);
