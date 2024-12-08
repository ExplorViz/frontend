import { getClassesInPackage } from 'explorviz-frontend/utils/package-helpers';
import { Application, Class, Package, isClass } from '../structure-data';
import ClassCommunication from './class-communication';
import MethodCall from './method-call';

export default class ComponentCommunication {
  id: string = '';
  classCommunications: ClassCommunication[] = [];
  methodCalls: MethodCall[] = [];
  isRecursive = false;
  isBidirectional: boolean = false;
  totalRequests: number = 0;
  sourceApp: Application;
  targetApp: Application;
  sourceEntity: Class | Package;
  targetEntity: Class | Package;

  metrics = {
    // Normalized request count might be above 1 when combining multiple class communications
    normalizedRequestCount: 1,
  };

  constructor(
    id: string,
    sourceEntity: Class | Package,
    targetEntity: Class | Package,
    communication: ClassCommunication
  ) {
    this.id = id;
    this.sourceApp = communication.sourceApp;
    this.targetApp = communication.targetApp;
    this.sourceEntity = sourceEntity;
    this.targetEntity = targetEntity;

    this.addClassCommunication(communication);
  }

  addClassCommunication(
    communication: ClassCommunication,
    isReversedDirection: boolean = false
  ) {
    this.classCommunications.push(communication);
    this.totalRequests += communication.totalRequests;
    this.metrics.normalizedRequestCount +=
      communication.metrics.normalizedRequestCount;
    this.methodCalls.push(...communication.methodCalls);

    if (communication.isBidirectional || isReversedDirection) {
      this.isBidirectional = true;
    }
  }

  getClasses() {
    const classes = [];
    if (isClass(this.sourceEntity)) {
      classes.push(this.sourceEntity);
    } else {
      classes.push(...getClassesInPackage(this.sourceEntity));
    }

    if (isClass(this.targetEntity)) {
      classes.push(this.targetEntity);
    } else {
      classes.push(...getClassesInPackage(this.targetEntity));
    }

    return classes;
  }
}
