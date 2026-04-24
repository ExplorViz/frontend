export interface SimpleFunctionDto {
  id: string;
  name: string;
  isForward: boolean;
  requestCount: number;
  executionTime: number;
}

export interface EntityPairCommunicationDto {
  sourceEntityId: number;
  sourceEntityName: string;
  targetEntityId: number;
  targetEntityName: string;
  isBidirectional: boolean;
  functions: SimpleFunctionDto[];
}
