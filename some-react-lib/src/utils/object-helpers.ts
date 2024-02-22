export default function isObject(obj: any): obj is object {
  return Object.prototype.toString.call(obj) === '[object Object]';
}

export function objectsHaveSameKeys(obj1: object, obj2: object) {
  const keysObj1 = Object.keys(obj1);
  return (
    keysObj1.length === Object.keys(obj2).length &&
    keysObj1.every((s) => Object.prototype.hasOwnProperty.call(obj2, s))
  );
}
