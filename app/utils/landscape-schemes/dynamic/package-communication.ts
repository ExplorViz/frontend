import { getClassesInPackage } from 'explorviz-frontend/utils/package-helpers';
import { Application, Class, Package, isClass } from '../structure-data';
import AggregatedClassCommunication from './aggregated-class-communication';
import AggregatedMethodCall from './aggregated-method-call';

export default class PackageCommunication {
  id: string = '';
  classCommunications: AggregatedClassCommunication[] = [];
  methodCalls: AggregatedMethodCall[] = [];
  isRecursive = false;
  isBidirectional: boolean = false;
  totalRequests: number = 0;
  sourceApp: Application;
  targetApp: Application;
  sourceEntity: Class | Package;
  targetEntity: Class | Package;

  metrics = {
    normalizedRequestCount: 1, // Normalized request count between 0 and 1
  };

  constructor(
    id: string,
    sourceEntity: Class | Package,
    targetEntity: Class | Package,
    communication: AggregatedClassCommunication
  ) {
    this.id = id;
    this.sourceApp = communication.sourceApp;
    this.targetApp = communication.targetApp;
    this.sourceEntity = sourceEntity;
    this.targetEntity = targetEntity;

    this.addClassCommunication(communication);
  }

  addClassCommunication(
    communication: AggregatedClassCommunication,
    isReversedDirection: boolean = false
  ) {
    this.classCommunications.push(communication);
    this.totalRequests += communication.totalRequests;
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
