export interface EvolutionLandscapeData {
  applications: EvolutedApplication[];
}

export interface EvolutedApplication {
  name: string;
  branches: Branch[];
}

export interface Branch {
  name: string;
  commits: string[];
  branchPoint: BranchPoint;
}

export interface BranchPoint {
  name: string;
  commit: string;
}

// export function isTrace(x: any): x is Trace {
//   return isObject(x) && Object.prototype.hasOwnProperty.call(x, 'traceId');
// }

// export function isSpan(x: any): x is Span {
//   return isObject(x) && Object.prototype.hasOwnProperty.call(x, 'spanId');
// }
