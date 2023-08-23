import { Class } from './landscape-schemes/structure-data';
import { getAncestorPackages } from './package-helpers';

export function getClassAncestorPackages(clss: Class) {
  return [clss.parent, ...getAncestorPackages(clss.parent)];
}

export function getClassMethodHashCodes(clss: Class) {
  return clss.methods.map((method) => method.hashCode);
}

export function getClassMethodByName(clss: Class, methodName: string) {
  return clss.methods.find((method) => method.name === methodName);
}
