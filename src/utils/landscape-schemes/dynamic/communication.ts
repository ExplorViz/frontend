/**
 * A MetricRange records the minimum and maximum encountered values for a particular metric.
 */
export interface MetricRange {
  min: number;
  max: number;
}

/**
 * A Comm represents a communication relationship between two particular entities.
 */
export interface Comm {
  id: string;
  sourceEntityKey: string; // Telemetry lookup key of the source entity
  targetEntityKey: string; // Telemetry lookup key of the target entity
  isBidirectional: boolean;
  fromUnixNano: number;
  toUnixNano: number;
  metrics: Record<string, number>;
}

/**
 * A CommSummary contains all communication for a particular visualization state.
 */
export interface CommSummary {
  communications: Comm[];

  /**
   * Minimum and maximum value of metrics across all communications within this summary
   */
  metrics: Record<string, MetricRange>;

  fromUnixNano?: number;
  toUnixNano?: number;
}
