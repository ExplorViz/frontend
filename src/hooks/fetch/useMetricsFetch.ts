export interface MetricsSearchParams {
  /** Name of service / application that all matched metrics must belong to */
  serviceName?: string;

  /** Lookup key of a visualization entity to which all matched metrics must belong */
  telemetryKey?: string;
}
