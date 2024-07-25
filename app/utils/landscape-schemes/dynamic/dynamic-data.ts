import isObject from '../../object-helpers';

export type Trace = {
  landscapeToken: string;
  traceId: string;
  gitCommitChecksum: string;
  startTime: number;
  endTime: number;
  duration: number;
  overallRequestCount: number;
  traceCount: number;
  spanList: Span[];
};

export type Span = {
  spanId: string;
  parentSpanId: string;
  startTime: number;
  endTime: number;
  methodHash: string;
};

export function isTrace(x: any): x is Trace {
  return isObject(x) && Object.prototype.hasOwnProperty.call(x, 'traceId');
}

export function isSpan(x: any): x is Span {
  return isObject(x) && Object.prototype.hasOwnProperty.call(x, 'spanId');
}

export type DynamicLandscapeData = Trace[];
