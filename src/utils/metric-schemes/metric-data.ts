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
  lineCount: string;
  lcom4: string;
  averageCyclomaticComplexity: string;
  cyclomaticComplexity: string;
};

export type MethodMetricCode = {
  lineCount: string;
  nestedBlockDepth: string;
  cyclomaticComplexity: string;
};

export type FileMetricCode = {
  lineCount: string;
  cyclomaticComplexity: string;
};

export type ApplicationMetricsCode = {
  fileMetrics: { [filePath: string]: FileMetricCode };
  classMetrics: {
    [fullQualifiedClassName: string]: ClassMetricCode;
  };
  methodMetrics: {
    [fullQualifiedClassName: string]: MethodMetricCode;
  };
};

export type CommitComparisonMetric = {
  entityName: string; // fqn
  metricMap: {
    lcom4:
      | {
          oldValue: string | null;
          newValue: string;
        }
      | undefined;
    cyclomaticComplexity:
      | {
          oldValue: string | null;
          newValue: string;
        }
      | undefined;
    averageCyclomaticComplexity:
      | {
          oldValue: string | null;
          newValue: string;
        }
      | undefined;
    lineCount:
      | {
          // used to identify which communication line needs to be marked as modified
          // during the commit comparison
          oldValue: string | null;
          newValue: string;
        }
      | undefined;
  };
};
