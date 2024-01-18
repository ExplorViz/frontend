import { helper } from '@ember/component/helper';

export function firstWord([inputString]: [string]) {
  if (inputString.includes(' ')) {
    const words = inputString.split(' ');
    return words[0];
  }

  return inputString;
}

export default helper(firstWord);
