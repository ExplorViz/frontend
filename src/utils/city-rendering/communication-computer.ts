import { AggregatedBuildingCommunication } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/aggregated-file-communication';
import AggregatedCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/aggregated-communication';
import { FlatLandscape } from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';

export default function computeAggregatedCommunication(
  flatLandscape: FlatLandscape,
  aggregatedFileCommunication: AggregatedBuildingCommunication
) {
  if (
    !aggregatedFileCommunication ||
    !aggregatedFileCommunication.communications ||
    aggregatedFileCommunication.communications.length === 0
  )
    return [];

  const classCommunications: AggregatedCommunication[] = [];

  for (const comm of aggregatedFileCommunication.communications) {
    const sourceBuilding = flatLandscape.buildings[comm.sourceBuildingId];
    const targetBuilding = flatLandscape.buildings[comm.targetBuildingId];

    if (!sourceBuilding || !targetBuilding) {
      continue;
    }

    const classComm = new AggregatedCommunication(
      comm.id,
      sourceBuilding,
      targetBuilding,
      [comm.id]
    );
    classComm.metrics.requestCount = comm.metrics['requestCount'] || 0;
    classComm.isBidirectional = comm.isBidirectional;
    classComm.from = aggregatedFileCommunication.from;
    classComm.to = aggregatedFileCommunication.to;

    classCommunications.push(classComm);
  }

  computeCommunicationMetrics(classCommunications);

  return classCommunications;
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
  deletedAggregatedCommunication: Map<string, AggregatedCommunication[]> = new Map()
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
