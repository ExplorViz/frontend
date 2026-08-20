import { useCommunicationStore } from 'explorviz-frontend/src/stores/communication-store';
import {
  Building,
  District,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import isObject from 'explorviz-frontend/src/utils/object-helpers';
import { Comm } from './communication';

/**
 * An AggregatedCommunication bundles communication originating from potentially multiple entities into a single communication.
 * The resulting communication may be originating from a building, but also a container (e.g. district) in the hierarchy.
 * This can be used to display communication even when the container is currently collapsed.
 */
export default class AggregatedCommunication {
  id: string = '';

  isRecursive: boolean = false;

  isBidirectional: boolean = false;

  sourceEntity: District | Building;

  targetEntity: District | Building;

  buildingCommunicationIds: string[] = [];

  originalCommIds: string[] = [];

  fromUnixNano: bigint;

  toUnixNano: bigint;

  sourceCity?: any;

  targetCity?: any;

  // Backward compatibility for legacy application naming.
  sourceApp?: any;

  // Backward compatibility for legacy application naming.
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
    fromUnixNano: bigint,
    toUnixNano: bigint,
    buildingCommunicationIds: string[] = [],
    originalCommIds: string[] = []
  ) {
    this.id = id;
    this.sourceEntity = sourceEntity;
    this.targetEntity = targetEntity;
    this.fromUnixNano = fromUnixNano;
    this.toUnixNano = toUnixNano;
    this.buildingCommunicationIds = buildingCommunicationIds;
    this.originalCommIds = originalCommIds.length > 0 ? originalCommIds : [id];
  }

  /**
   * Retrieves the building communications from which this communication was aggregated.
   * @returns An array of the underlying building communications
   */
  getBuildingCommunications(): Comm[] {
    const allComms = useCommunicationStore.getState().communications;

    return this.buildingCommunicationIds.reduce((res, key) => {
      const comm = allComms.get(key);
      if (comm) {
        res.push(comm);
      } else {
        console.warn(`Could not find building communication with ID ${key}`);
      }
      return res;
    }, [] as Comm[]);
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
