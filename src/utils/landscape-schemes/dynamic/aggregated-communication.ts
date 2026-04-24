import {
  Building,
  District,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import isObject from 'explorviz-frontend/src/utils/object-helpers';

export default class AggregatedCommunication {
  id: string = '';

  isRecursive: boolean = false;

  isBidirectional: boolean = false;

  sourceEntity: District | Building;

  targetEntity: District | Building;

  buildingCommunicationIds: string[] = [];

  originalCommIds: string[] = [];

  from?: number;

  to?: number;

  sourceApp?: any;

  targetApp?: any;

  metrics: {
    normalizedRequestCount: number;
    [key: string]: number;
  } = {
    normalizedRequestCount: 1,
  };

  constructor(
    id: string,
    sourceEntity: District | Building,
    targetEntity: District | Building,
    buildingCommunicationIds: string[] = [],
    originalCommIds: string[] = []
  ) {
    this.id = id;
    this.sourceEntity = sourceEntity;
    this.targetEntity = targetEntity;
    this.buildingCommunicationIds = buildingCommunicationIds;
    this.originalCommIds = originalCommIds.length > 0 ? originalCommIds : [id];
  }
}

export function isAggregatedCommunication(
  x: any
): x is AggregatedCommunication {
  return (
    isObject(x) &&
    Object.prototype.hasOwnProperty.call(x, 'buildingCommunicationIds')
  );
}
