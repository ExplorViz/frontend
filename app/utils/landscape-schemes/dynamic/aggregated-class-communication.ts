import { Application, Class } from '../structure-data';
import MethodCall from './method-call';

export default class AggregatedClassCommunication {
  id: string = '';
  methodCalls: MethodCall[] = [];
  isRecursive: boolean = false;
  isBidirectional: boolean = false;
  totalRequests: number = 0;
  sourceApp: Application;
  sourceClass: Class;
  targetApp: Application;
  targetClass: Class;
  operationName: string;

  metrics = {
    normalizedRequestCount: 1, // Normalized request count between 0 and 1
  };

  constructor(
    id: string,
    sourceApp: Application,
    sourceClass: Class,
    targetApp: Application,
    targetClass: Class,
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
