import { Application, Class } from '../structure-data';
import AggregatedMethodCall from './aggregated-method-call';

export default class AggregatedClassCommunication {
  id: string = '';
  methodCalls: AggregatedMethodCall[] = [];
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

  addMethodCalls(aggregatedMethodCall: AggregatedMethodCall) {
    this.methodCalls.push(aggregatedMethodCall);
    this.totalRequests += aggregatedMethodCall.totalRequests;

    if (
      aggregatedMethodCall.sourceClass.id ===
      aggregatedMethodCall.targetClass.id
    ) {
      this.isRecursive = true;
      this.isBidirectional = true; // Implied by recursion
      return;
    }

    // Added communication in opposite direction?
    if (aggregatedMethodCall.sourceClass.id !== this.sourceClass.id) {
      this.isBidirectional = true;
    }
  }

  getClasses() {
    return [this.sourceClass, this.targetClass];
  }
}
