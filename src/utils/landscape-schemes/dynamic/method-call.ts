import {
  Building,
  City,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import {
  Application,
  Class,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';

export default class MethodCall {
  id: string = '';
  // Spans might be added in the future, if needed
  //   spans: Span[] = [];
  totalRequests: number = 0;
  sourceApp: Application | City;
  sourceClass: Class | Building;
  targetApp: Application | City;
  targetClass: Class | Building;
  operationName: string;
  callerMethodName: string;

  constructor(
    id: string,
    sourceApp: Application | City,
    sourceClass: Class | Building,
    targetApp: Application | City,
    targetClass: Class | Building,
    operationName: string,
    callerMethodName: string
  ) {
    this.id = id;
    this.sourceApp = sourceApp;
    this.sourceClass = sourceClass;
    this.targetApp = targetApp;
    this.targetClass = targetClass;
    this.operationName = operationName;
    this.callerMethodName = callerMethodName;
  }

  addSpan(/* span: Span */) {
    // this.spans.push(span);
    this.totalRequests++;
    return this;
  }
}
