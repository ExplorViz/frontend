export function getCircularReplacer() {
  const ancestors: any = [];
  // eslint-disable-next-line func-names
  return function (this: any, key: any, value: any) {
    // console.log(this);
    if (typeof value !== 'object' || value === null) {
      return value;
    }
    while (ancestors.length > 0 && ancestors.at(-1) !== this) {
      ancestors.pop();
    }
    if (ancestors.includes(value)) {
      return '[Circular]';
    }
    ancestors.push(value);
    return value;
  };
}
