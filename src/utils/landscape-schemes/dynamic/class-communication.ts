import MethodCall from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/method-call';
import {
  Building,
  City,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import {
  Application,
  Class,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import isObject from 'explorviz-frontend/src/utils/object-helpers';

export default class ClassCommunication {
  id: string = '';
  methodCalls: MethodCall[] = [];
  isRecursive: boolean = false;
  isBidirectional: boolean = false;
  totalRequests: number = 0;
  sourceApp: Application | City;
  sourceClass: Class | Building;
  targetApp: Application | City;
  targetClass: Class | Building;
  operationName: string;

  metrics = {
    normalizedRequestCount: 1, // Normalized request count between 0 and 1
  };

  constructor(
    id: string,
    sourceApp: Application | City,
    sourceClass: Class | Building,
    targetApp: Application | City,
    targetClass: Class | Building,
    operationName: string
  ) {
    this.id = id;
    this.sourceApp = sourceApp;
    this.sourceClass = sourceClass;
    this.targetApp = targetApp;
    this.targetClass = targetClass;
    this.operationName = operationName;
  }

  addMethodCalls(methodCall: MethodCall) {
    this.methodCalls.push(methodCall);
    this.totalRequests += methodCall.totalRequests;

    if (methodCall.sourceClass.id === methodCall.targetClass.id) {
      this.isRecursive = true;
      this.isBidirectional = true; // Implied by recursion
      return;
    }

    // Added communication in opposite direction?
    if (methodCall.sourceClass.id !== this.sourceClass.id) {
      this.isBidirectional = true;
    }
  }

  getClasses() {
    return [this.sourceClass, this.targetClass];
  }
}

export function isClassCommunication(x: any): x is ClassCommunication {
  return isObject(x) && Object.prototype.hasOwnProperty.call(x, 'methodCalls');
}
