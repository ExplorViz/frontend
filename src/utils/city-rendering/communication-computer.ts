import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { findFirstEntityWithOpenedParent } from 'explorviz-frontend/src/utils/city-rendering/communication-layouter';
import AggregatedCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/aggregated-communication';
import {
  Comm,
  CommSummary,
} from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/communication';
import {
  FlatLandscape,
  isBuilding,
  isDistrict,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';

export function computeBuildingCommunication(
  flatLandscape: FlatLandscape,
  aggregatedFileCommunication?: CommSummary
) {
  if (
    !aggregatedFileCommunication ||
    !aggregatedFileCommunication.communications ||
    aggregatedFileCommunication.communications.length === 0
  )
    return [];

  const telemetryKeyMap = useModelStore.getState().telemetryKeyToEntityId;

  return aggregatedFileCommunication.communications.filter((comm) => {
    const sourceEntityId = telemetryKeyMap.get(comm.sourceEntityKey);
    const targetEntityId = telemetryKeyMap.get(comm.targetEntityKey);

    if (!sourceEntityId || !targetEntityId) {
      console.warn(
        `Could not find entity for telemetry key ${!sourceEntityId ? comm.sourceEntityKey : comm.targetEntityKey}`
      );
      return false;
    }

    const sourceBuilding = flatLandscape.buildings[sourceEntityId];
    const targetBuilding = flatLandscape.buildings[targetEntityId];

    return !!sourceBuilding && !!targetBuilding;
  });
}

export function computeAggregatedCommunication(allCommunications: Comm[]) {
  const groupedComms = new Map<string, AggregatedCommunication>();
  // Tracks which communication ids an aggregate already contains, so merging
  // does not have to rebuild a Set from the full id list on every hit.
  const seenCommIds = new Map<string, Set<string>>();
  const modelStore = useModelStore.getState();
  const telemetryKeyMap = modelStore.telemetryKeyToEntityId;
  const openedParentCache = new Map<string, string>();

  const resolveOpenedParent = (entityId: string) => {
    const cached = openedParentCache.get(entityId);
    if (cached !== undefined) {
      return cached;
    }
    const resolved = findFirstEntityWithOpenedParent(entityId);
    openedParentCache.set(entityId, resolved);
    return resolved;
  };

  allCommunications.forEach((comm) => {
    const sourceEntityId = telemetryKeyMap.get(comm.sourceEntityKey);
    const targetEntityId = telemetryKeyMap.get(comm.targetEntityKey);
    if (!sourceEntityId || !targetEntityId) {
      console.error(
        'Could not find entity ID for telemetry key: ',
        !sourceEntityId ? comm.sourceEntityKey : comm.targetEntityKey
      );
      return;
    }

    const effSourceId = resolveOpenedParent(sourceEntityId);
    const effTargetId = resolveOpenedParent(targetEntityId);
    if (!effSourceId || !effTargetId) {
      console.error(
        'Could not find source or target for communication.',
        effSourceId,
        effTargetId
      );
      return;
    }

    const key =
      effSourceId <= effTargetId
        ? `${effSourceId}-${effTargetId}`
        : `${effTargetId}-${effSourceId}`;

    if (groupedComms.has(key)) {
      const existing = groupedComms.get(key)!;
      // Aggregate metrics
      Object.entries(comm.metrics).forEach(([metricName, value]) => {
        existing.metrics[metricName] =
          (existing.metrics[metricName] || 0) + value;
      });
      const knownCommIds = seenCommIds.get(key)!;
      if (!knownCommIds.has(comm.id)) {
        knownCommIds.add(comm.id);
        existing.buildingCommunicationIds.push(comm.id);
        existing.originalCommIds.push(comm.id);
      }
      existing.isBidirectional =
        existing.isBidirectional ||
        comm.isBidirectional ||
        (existing.sourceEntity.id === effTargetId &&
          existing.targetEntity.id === effSourceId);
      existing.isRecursive =
        existing.isRecursive || effSourceId === effTargetId;
      existing.fromUnixNano =
        comm.fromUnixNano < existing.fromUnixNano
          ? comm.fromUnixNano
          : existing.fromUnixNano;
      existing.toUnixNano =
        comm.toUnixNano > existing.toUnixNano
          ? comm.toUnixNano
          : existing.toUnixNano;
    } else {
      const sourceEntity = modelStore.getModel(effSourceId);
      const targetEntity = modelStore.getModel(effTargetId);
      if (!isDistrict(sourceEntity) && !isBuilding(sourceEntity)) {
        console.error('No source entity for communication found.');
        return;
      }
      if (!isDistrict(targetEntity) && !isBuilding(targetEntity)) {
        console.error('No target entity for communication found.');
        return;
      }

      const newComm = new AggregatedCommunication(
        comm.id,
        sourceEntity,
        targetEntity,
        comm.fromUnixNano,
        comm.toUnixNano,
        [comm.id],
        [comm.id]
      );
      newComm.metrics = { ...comm.metrics, normalizedRequestCount: 1 };
      newComm.isBidirectional = comm.isBidirectional;
      newComm.isRecursive = effSourceId === effTargetId;
      groupedComms.set(key, newComm);
      seenCommIds.set(key, new Set([comm.id]));
    }
  });

  const aggregatedComms = Array.from(groupedComms.values());

  // Re-normalize metrics
  computeCommunicationMetrics(aggregatedComms);

  return aggregatedComms;
}

export function calculateAggregatedCommunications(
  buildingCommunications?: Comm[]
) {
  const comms =
    buildingCommunications ??
    useModelStore.getState().getAllBuildingCommunications();

  if (comms.length === 0) {
    useModelStore.getState().setAggregatedCommunications([]);
    return;
  }

  const aggregatedCommunications = computeAggregatedCommunication(comms);
  useModelStore
    .getState()
    .setAggregatedCommunications(aggregatedCommunications);
}

function computeCommunicationMetrics(
  classCommunications: AggregatedCommunication[]
) {
  // Spreading into Math.max overflows the call stack for large landscapes.
  let maxRequests = 0;
  for (const communication of classCommunications) {
    const requestCount = communication.metrics.requestCount || 0;
    if (requestCount > maxRequests) {
      maxRequests = requestCount;
    }
  }

  classCommunications.forEach((communication) => {
    const totalRequests = communication.metrics.requestCount || 0;
    if (maxRequests > 0) {
      communication.metrics.normalizedRequestCount =
        totalRequests / maxRequests;
    } else {
      communication.metrics.normalizedRequestCount = 1;
    }
  });
}

export function computeRestructuredAggregatedCommunication(
  classCommunications: AggregatedCommunication[],
  classCommunication: AggregatedCommunication[],
  copiedAggregatedCommunications: Map<string, AggregatedCommunication[]>,
  updatedAggregatedCommunications: Map<string, AggregatedCommunication[]>,
  deletedAggregatedCommunication: Map<
    string,
    AggregatedCommunication[]
  > = new Map()
) {
  if (classCommunication.length) {
    classCommunication.forEach((comm) => {
      classCommunications.push(comm);
    });
  }

  if (copiedAggregatedCommunications.size) {
    copiedAggregatedCommunications.forEach((value) => {
      classCommunications = classCommunications.concat(value);
    });
  }

  if (deletedAggregatedCommunication.size) {
    const allDeletedComms: AggregatedCommunication[] = [];
    deletedAggregatedCommunication.forEach((value) => {
      value.forEach((deletedComm) => {
        const foundComm = classCommunications.filter(
          (comm) => comm.id === deletedComm.id
        );
        if (foundComm.length) allDeletedComms.push(...foundComm);
      });
    });

    classCommunications = classCommunications.filter(
      (comm) => !allDeletedComms.includes(comm)
    );
  }

  if (updatedAggregatedCommunications.size) {
    const allUpdatedComms: AggregatedCommunication[] = [];

    updatedAggregatedCommunications.forEach((value) => {
      allUpdatedComms.push(...value);
    });

    classCommunications = classCommunications.concat(allUpdatedComms);
    const removeUnwantedComms = classCommunications.filter(
      (comm) =>
        !comm.sourceEntity.id.includes('removed') &&
        !comm.targetEntity.id.includes('removed')
    );
    classCommunications = removeUnwantedComms;
  }

  return classCommunications;
}
