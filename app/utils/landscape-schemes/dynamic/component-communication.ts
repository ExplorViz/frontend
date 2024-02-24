import { getClassesInPackage } from 'explorviz-frontend/utils/package-helpers';
import { Application, Class, Package, isClass } from '../structure-data';
import ClassCommunication from './class-communication';
import MethodCall from './method-call';

export default class ComponentCommunication {
  id: string = '';
  classCommunications: ClassCommunication[] = [];
  methodCalls: [MethodCall[], MethodCall[]] = [[], []]; // method calls for first and second selected commit
  isRecursive = false;
  isBidirectional: boolean = false;
  totalRequests: [number, number] = [0,0];
  sourceApp: Application;
  targetApp: Application;
  sourceEntity: Class | Package;
  targetEntity: Class | Package;

  metrics = [{
    normalizedRequestCount: 1, // // Normalized request count might be above 1 when combining multiple class communications
  },
  {
    normalizedRequestCount: 1, // // Normalized request count might be above 1 when combining multiple class communications
  }
];


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
    
    if(communication.methodCalls[0].length > 0){
      this.totalRequests[0] += communication.totalRequests[0];
      this.totalRequests[1] += communication.totalRequests[1];
      this.metrics[0].normalizedRequestCount +=
      communication.metrics[0].normalizedRequestCount;
      this.metrics[1].normalizedRequestCount +=
      communication.metrics[1].normalizedRequestCount;
      this.methodCalls[0].push(...communication.methodCalls[0]);
      this.methodCalls[1].push(...communication.methodCalls[1]);
    }

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
