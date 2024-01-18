import { helper } from '@ember/component/helper';

export function nameSelector([instanceId, name]: [string, string]) {
  if (name !== undefined && name !== '') {
    return name;
  }
  return instanceId;
}

export default helper(nameSelector);
