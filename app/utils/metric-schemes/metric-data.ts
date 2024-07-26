export type Metric = {
  name: string;
  description: string;
  min: number;
  max: number;
  values: Map<string, number>;
};

export type ApplicationMetrics = {
  metrics: Metric[];
  latestClazzMetricScores: Metric[];
  metricsArray: [Metric[]];
  differenceMetricScores: Map<string, Metric[]>;
  aggregatedMetricScores: Map<string, Metric>;
};

export type ClassMetricCode = {
  loc: string;
  LCOM4: string;
  cyclomatic_complexity_weighted: string;
  cyclomatic_complexity: string;
};

export type ApplicationMetricsCode = {
  files: string[]; // fileMetrics, classMetrics and methodMetrics should have
  // the size of the files list to provide a mapping logic
  fileMetrics: {
    loc: string;
    cyclomatic_complexity: string;
  }[];
  classMetrics: {
    [fullQualifiedClassName: string]: ClassMetricCode;
  }[];
  methodMetrics: {
    loc: string;
    nestedBlockDepth: string;
    cyclomatic_complexity: string;
  }[];
};
