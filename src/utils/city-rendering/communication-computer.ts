import ClassCommunication from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/class-communication';
import {
  DynamicLandscapeData,
  Span,
} from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/dynamic-data';
import MethodCall from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/method-call';
import {
  Building,
  City,
  FlatLandscape
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { getTraceIdToSpanTreeMap } from 'explorviz-frontend/src/utils/trace-helpers';

function computeClassCommunicationRecursively(
  span: Span,
  spanIdToChildSpanMap: Map<string, Span[]>,
  flatLandscape: FlatLandscape
) {
  if (span === undefined) {
    return [];
  }

  const childSpans = spanIdToChildSpanMap.get(span.spanId);

  if (childSpans === undefined || childSpans.length === 0) {
    // no child span, therefore no one to call => no communication line
    return [];
  }

  const func = flatLandscape.functions[span.methodHash];
  if (!func) {
    return [];
  }
  const building = flatLandscape.buildings[func.parentBuildingId];
  if (!building) {
    return [];
  }

  const callerMethodName = func.name;

  const classCommunications: SingleCommunication[] = [];

  childSpans.forEach((childSpan) => {
    const childFunc = flatLandscape.functions[childSpan.methodHash];
    if (childFunc) {
      // const childBuilding = flatLandscape.buildings[childFunc.parentId];
      const childBuilding = flatLandscape.buildings[childFunc.parentBuildingId];
      if (childBuilding) {
        const methodName = childFunc.name;

        // create classCommunication (eventually results in a single
        // communication line) and proceed with remaining method calls
        classCommunications.push({
          sourceBuilding: building,
          targetBuilding: childBuilding,
          operationName: methodName,
          callerMethodName: callerMethodName,
        });
        classCommunications.push(
          ...computeClassCommunicationRecursively(
            childSpan,
            spanIdToChildSpanMap,
            flatLandscape
          )
        );
      }
    }
  });

  return classCommunications;
}

export default function computeAggregatedCommunication(
  flatLandscape: FlatLandscape,
  landscapeDynamicData: DynamicLandscapeData
) {
  if (!landscapeDynamicData || landscapeDynamicData.length === 0) return [];

  const buildingToCityMap = new Map<Building, City>();
  for (const building of Object.values(flatLandscape.buildings)) {
    const city = flatLandscape.cities[building.parentCityId];
    if (city) {
      buildingToCityMap.set(building, city);
    }
  }

  const traceIdToSpanTrees = getTraceIdToSpanTreeMap(landscapeDynamicData);

  const totalCommunications: SingleCommunication[] = [];

  landscapeDynamicData.forEach((trace) => {
    const traceSpanTree = traceIdToSpanTrees.get(trace.traceId);

    if (traceSpanTree) {
      const firstSpan = traceSpanTree.root;
      totalCommunications.push(
        ...computeClassCommunicationRecursively(
          firstSpan,
          traceSpanTree.tree,
          flatLandscape
        )
      );
    }
  });

  const methodCalls = new Map<string, MethodCall>();

  totalCommunications.forEach(
    ({ sourceBuilding, targetBuilding, operationName, callerMethodName }) => {
      const sourceToTargetMethodId = `${sourceBuilding.id}_${targetBuilding.id}_${operationName}`;

      // Get source app
      const sourceCity = buildingToCityMap.get(sourceBuilding);

      // Get target app
      const targetCity = buildingToCityMap.get(targetBuilding);

      if (!sourceCity || !targetCity) {
        console.error('City for class communication not found!');
        return;
      }

      // Find all identical method calls based on their source
      // and target and aggregate identical method calls with exactly
      // same source and target within a single representative
      const maybeMethodCall = methodCalls.get(sourceToTargetMethodId);

      if (!maybeMethodCall) {
        methodCalls.set(
          sourceToTargetMethodId,
          new MethodCall(
            sourceToTargetMethodId,
            sourceCity,
            sourceBuilding,
            targetCity,
            targetBuilding,
            operationName,
            callerMethodName
          ).addSpan()
        );
      } else {
        maybeMethodCall.addSpan();
      }
    }
  );

  const aggregatedCommunications = new Map<string, ClassCommunication>();

  methodCalls.forEach((methodCall) => {
    const classIds = [
      methodCall.sourceClass.id,
      methodCall.targetClass.id,
    ].sort();
    const communicationId = classIds[0] + '_' + classIds[1];
    const maybeClassCommunication =
      aggregatedCommunications.get(communicationId);

    if (maybeClassCommunication) {
      maybeClassCommunication.addMethodCalls(methodCall);
    } else {
      const newCommunication = new ClassCommunication(
        communicationId,
        methodCall.sourceApp,
        methodCall.sourceClass,
        methodCall.targetApp,
        methodCall.targetClass,
        methodCall.operationName
      );
      newCommunication.addMethodCalls(methodCall);
      aggregatedCommunications.set(communicationId, newCommunication);
    }
  });

  const computedCommunication = [...aggregatedCommunications.values()];
  computeCommunicationMetrics(computedCommunication);

  return computedCommunication;
}

function computeCommunicationMetrics(
  classCommunications: ClassCommunication[]
) {
  const maxRequests = Math.max(
    0,
    ...classCommunications.map((x) => x.totalRequests)
  );

  classCommunications.forEach((communication) => {
    const { totalRequests } = communication;
    if (maxRequests > 0) {
      communication.metrics.normalizedRequestCount =
        totalRequests / maxRequests;
    } else {
      communication.metrics.normalizedRequestCount = 1;
    }
  });
}

export function computeRestructuredClassCommunication(
  classCommunications: ClassCommunication[],
  classCommunication: ClassCommunication[],
  copiedClassCommunications: Map<string, ClassCommunication[]>,
  updatedClassCommunications: Map<string, ClassCommunication[]>,
  deletedClassCommunication: Map<string, ClassCommunication[]> = new Map()
) {
  if (classCommunication.length) {
    classCommunication.forEach((comm) => {
      classCommunications.push(comm);
    });
  }

  if (copiedClassCommunications.size) {
    copiedClassCommunications.forEach((value) => {
      classCommunications = classCommunications.concat(value);
    });
  }

  if (deletedClassCommunication.size) {
    const allDeletedComms: ClassCommunication[] = [];
    deletedClassCommunication.forEach((value) => {
      value.forEach((deletedComm) => {
        const foundComm = classCommunications.filter(
          (comm) =>
            comm.id === deletedComm.id ||
            comm.operationName === deletedComm.operationName
        );
        if (foundComm.length) allDeletedComms.push(...foundComm);
      });
    });

    classCommunications = classCommunications.filter(
      (comm) => !allDeletedComms.includes(comm)
    );
  }

  if (updatedClassCommunications.size) {
    const allUpdatedComms: ClassCommunication[] = [];

    updatedClassCommunications.forEach((value) => {
      allUpdatedComms.push(...value);
    });

    classCommunications = classCommunications.concat(allUpdatedComms);
    const removeUnwantedComms = classCommunications.filter(
      (comm) =>
        !comm.operationName.includes('removed') &&
        !comm.sourceClass.id.includes('removed') &&
        !comm.targetClass.id.includes('removed')
    );
    classCommunications = removeUnwantedComms;
  }

  return classCommunications;
}

interface SingleCommunication {
  sourceBuilding: Building;
  targetBuilding: Building;
  operationName: string;
  callerMethodName: string;
}
