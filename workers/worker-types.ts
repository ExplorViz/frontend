export type LayoutSegment = {
  parent: null | LayoutSegment;
  lowerChild: null | LayoutSegment;
  upperRightChild: null | LayoutSegment;
  startX: number;
  startZ: number;
  width: number;
  height: number;
  used: boolean;
};

export type ReducedClass = {
  id: string;
  name: string;
  instanceCount: number;
  methods: ReducedMethod[];
};

export type ReducedMethod = {
  name: string;
  hashCode: string; // TODO tiwe
};

export type ReducedComponent = {
  id: string;
  name: string;
  classes: ReducedClass[];
  subPackages: ReducedComponent[]; // TODO tiwe
};

export type ReducedApplication = {
  id: string;
  name: string;
  packages: ReducedComponent[];
};

export type Trace = {
  spanList: Span[];
};

export type Span = {
  parentSpanId: '' | string;
  hashCode: string;
  spanId: string;
  startTime: number;
  endTime: number;
};
