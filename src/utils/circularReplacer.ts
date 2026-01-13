export function getCircularReplacer(dropKeys: boolean = false) {
  const ancestors: any = [];

  return function (this: any, key: any, value: any) {
    if (typeof value !== 'object' || value === null) {
      return value;
    }
    while (ancestors.length > 0 && ancestors.at(-1) !== this) {
      ancestors.pop();
    }
    if (ancestors.includes(value)) {
      return dropKeys ? undefined : '[Circular]';
    }
    ancestors.push(value);
    return value;
  };
}
