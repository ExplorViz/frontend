import { Application, Class } from '../structure-data';
// import { Span } from './dynamic-data';

export default class AggregatedMethodCall {
  id: string = '';
  // Spans might be added in the future, if needed
  //   spans: Span[] = [];
  totalRequests: number = 0;
  sourceApp: Application;
  sourceClass: Class;
  targetApp: Application;
  targetClass: Class;
  operationName: string;

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

  addSpan(/* span: Span */) {
    // this.spans.push(span);
    this.totalRequests++;
    return this;
  }
}
