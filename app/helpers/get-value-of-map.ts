import { helper } from '@ember/component/helper';

export function getValueOfMap([map, key]: [Map<any, any>, any]) {
  if(key)
    return map.get(key);
  else
    return undefined;
}

export default helper(getValueOfMap);
