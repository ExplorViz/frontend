export interface MetricSummary {
  min: number;
  max: number;
}

export interface CommunicationDto {
  id: string;
  name: string;
  sourceBuildingId: string;
  targetBuildingId: string;
  isBidirectional: boolean;
  metrics: Record<string, number>;
}

export interface AggregatedBuildingCommunication {
  metrics: Record<string, MetricSummary>;
  communications: CommunicationDto[];
  from?: number;
  to?: number;
}
