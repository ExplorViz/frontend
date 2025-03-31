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

export type MethodMetricCode = {
  loc: string;
  nestedBlockDepth: string;
  cyclomatic_complexity: string;
};

export type FileMetricCode = {
  loc: string;
  cyclomatic_complexity: string;
};

export type ApplicationMetricsCode = {
  // fileMetrics, classMetrics and methodMetrics should have
  // the size of the files list to provide a mapping logic
  files: string[];
  fileMetrics: FileMetricCode[];
  classMetrics: {
    [fullQualifiedClassName: string]: ClassMetricCode;
  }[];
  methodMetrics: {
    [fullQualifiedClassName: string]: MethodMetricCode;
  }[];
};

export type CommitComparisonMetric = {
  entityName: string; // fqn
  metricMap: {
    LCOM4:
      | {
          oldValue: string | null;
          newValue: string;
        }
      | undefined;
    cyclomatic_complexity:
      | {
          oldValue: string | null;
          newValue: string;
        }
      | undefined;
    cyclomatic_complexity_weighted:
      | {
          oldValue: string | null;
          newValue: string;
        }
      | undefined;
    loc:
      | {
          // used to identify which communication line needs to be marked as modified
          // during the commit comparison
          oldValue: string | null;
          newValue: string;
        }
      | undefined;
  };
};
