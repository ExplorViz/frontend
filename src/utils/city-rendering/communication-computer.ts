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
  aggregatedFileCommunication: CommSummary
) {
  if (
    !aggregatedFileCommunication ||
    !aggregatedFileCommunication.communications ||
    aggregatedFileCommunication.communications.length === 0
  )
    return [];

  return aggregatedFileCommunication.communications.filter((comm) => {
    const telemetryKeyMap = useModelStore.getState().telemetryKeyToEntityId;

    const sourceEntityId = telemetryKeyMap.get(comm.sourceEntityKey);
    const targetEntityId = telemetryKeyMap.get(comm.targetEntityKey);

    if (!sourceEntityId || !targetEntityId) {
      return false;
    }

    const sourceBuilding = flatLandscape.buildings[sourceEntityId];
    const targetBuilding = flatLandscape.buildings[targetEntityId];

    return !!sourceBuilding && !!targetBuilding;
  });
}

export function computeAggregatedCommunication(allCommunications: Comm[]) {
  const groupedComms = new Map<string, AggregatedCommunication>();
  const telemetryKeyMap = useModelStore.getState().telemetryKeyToEntityId;

  allCommunications.forEach((comm) => {
    const sourceEntityId = telemetryKeyMap.get(comm.sourceEntityKey);
    const targetEntityId = telemetryKeyMap.get(comm.targetEntityKey);
    if (!sourceEntityId || !targetEntityId) {
      console.error(
        'Could not find source or target entity ID for communication.',
        sourceEntityId,
        targetEntityId
      );
      return;
    }

    const effSourceId = findFirstEntityWithOpenedParent(sourceEntityId);
    const effTargetId = findFirstEntityWithOpenedParent(targetEntityId);
    if (!effSourceId || !effTargetId) {
      console.error(
        'Could not find source or target for communication.',
        effSourceId,
        effTargetId
      );
      return;
    }

    const key = `${effSourceId}-${effTargetId}`;

    if (groupedComms.has(key)) {
      const existing = groupedComms.get(key)!;
      // Aggregate metrics
      Object.entries(comm.metrics).forEach(([metricName, value]) => {
        existing.metrics[metricName] =
          (existing.metrics[metricName] || 0) + value;
      });
      existing.buildingCommunicationIds = [
        ...new Set([...existing.buildingCommunicationIds, comm.id]),
      ];
      existing.originalCommIds = [
        ...new Set([...existing.originalCommIds, comm.id]),
      ];
      existing.isBidirectional =
        existing.isBidirectional || comm.isBidirectional;
      existing.isRecursive =
        existing.isRecursive || effSourceId === effTargetId;
      existing.fromUnixNano = Math.min(
        existing.fromUnixNano,
        comm.fromUnixNano
      );
      existing.toUnixNano = Math.max(existing.toUnixNano, comm.toUnixNano);
    } else {
      const sourceEntity = useModelStore.getState().getModel(effSourceId);
      const targetEntity = useModelStore.getState().getModel(effTargetId);
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
  const maxRequests = Math.max(
    0,
    ...classCommunications.map((x) => x.metrics.requestCount || 0)
  );

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
