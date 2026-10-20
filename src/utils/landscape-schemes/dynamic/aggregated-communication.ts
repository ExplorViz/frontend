import {
  Building,
  City,
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

  sourceEntity: Building | District | City;

  targetEntity: Building | District | City;

  /**
   * The fundamental entity communications from which this communication was aggregated.
   */
  baseCommunications: Comm[] = [];

  /**
   * The point in time at which this communication started (inclusive),
   * given in nanoseconds since the Unix epoch.
   */
  fromUnixNano: bigint;

  /**
   * The point in time at which this communication ends (inclusive),
   * given in nanoseconds since the Unix epoch.
   */
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
    baseCommunications: Comm[] = []
  ) {
    this.id = id;
    this.sourceEntity = sourceEntity;
    this.targetEntity = targetEntity;
    this.fromUnixNano = fromUnixNano;
    this.toUnixNano = toUnixNano;
    this.baseCommunications = baseCommunications;
  }
}

export function isAggregatedCommunication(
  x: any
): x is AggregatedCommunication {
  return (
    isObject(x) && Object.prototype.hasOwnProperty.call(x, 'baseCommunications')
  );
}
