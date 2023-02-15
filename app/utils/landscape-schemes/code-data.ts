import isObject from '../object-helpers';

enum ClassType {
  INTERFACE,
  ABSTRACT_CLASS,
  CLASS,
  ENUM,
}

export interface ParameterData {
  name: string;
  type: string;
  modifier: string[];
}

export interface MethodData {
  returnType: string;
  modifier: string[];
  parameterData: ParameterData[];
  outgoingMethodCall: string[];
}

export interface ClassData {
  classType: ClassType;
  modifier: string[];
  interface: string[];
  variable: string[];
  methodData: Map<string, MethodData>;
}

export function isClassData(x: any): x is ClassData {
  return isObject(x) && Object.prototype.hasOwnProperty.call(x, 'classType');
}

export function isMethodData(x: any): x is MethodData {
  return isObject(x) && Object.prototype.hasOwnProperty.call(x, 'returnType');
}

export function isParameterData(x: any): x is ParameterData {
  return isObject(x) && Object.prototype.hasOwnProperty.call(x, 'returnType');
}
