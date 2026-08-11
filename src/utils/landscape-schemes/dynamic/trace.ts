import isObject from 'explorviz-frontend/src/utils/object-helpers';

export type Trace = {
  landscapeToken: string;
  traceId: string;
  startTime: number;
  endTime: number;
  spanList: Span[];
};

export type Span = {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  startTime: number;
  endTime: number;
  functionId: string;
};

export function isTrace(x: any): x is Trace {
  return isObject(x) && Object.prototype.hasOwnProperty.call(x, 'traceId');
}

export function isSpan(x: any): x is Span {
  return isObject(x) && Object.prototype.hasOwnProperty.call(x, 'spanId');
}

export type DynamicLandscapeData = Trace[];
