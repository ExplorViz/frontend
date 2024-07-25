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
