import { helper } from '@ember/component/helper';

// https://github.com/ChrisHonniball/ember-string-helpers/blob/master/addon/helpers/regexp-replace.js
export function revertKey(params: any, hash: any) {
  const string = params[0];
  const regex = params[1].replace(/^(\/)(.*)+(\/)$/, '$2');
  const { flags } = hash;
  const regexPattern = new RegExp(regex, flags);
  const replacePattern = params[2];
  return string.replace(regexPattern, replacePattern);
}

export default helper(revertKey);
