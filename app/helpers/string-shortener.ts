import { helper } from '@ember/component/helper';

export function stringShortener([value, desiredLength]: [string, number]) {
  if (desiredLength <= 0) {
    return '';
  }
  if (String(value).length <= desiredLength) {
    return String(value);
  }
  return `${String(value).substring(0, desiredLength)}...`;
}

export default helper(stringShortener);
