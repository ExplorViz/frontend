import {
  DynamicLandscapeData,
  Span,
} from '../landscape-schemes/dynamic/dynamic-data';
import MethodCall from '../landscape-schemes/dynamic/method-call';
import {
  Class,
  StructureLandscapeData,
} from '../landscape-schemes/structure-data';
import {
  getHashCodeToClassMap,
  getApplicationFromClass,
} from '../landscape-structure-helpers';
import { getTraceIdToSpanTreeMap } from '../trace-helpers';
import AggregatedClassCommunication from '../landscape-schemes/dynamic/aggregated-class-communication';

function computeClassCommunicationRecursively(
  span: Span,
  spanIdToChildSpanMap: Map<string, Span[]>,
  hashCodeToClassMap: Map<string, Class>
) {
  const childSpans = spanIdToChildSpanMap.get(span.spanId);

  if (childSpans === undefined) {
    return [];
  }

  const classMatchingSpan = hashCodeToClassMap.get(span.hashCode);

  if (classMatchingSpan === undefined) {
    return [];
  }

  const classCommunications: ClassCommunication[] = [];
  childSpans.forEach((childSpan) => {
    const classMatchingChildSpan = hashCodeToClassMap.get(childSpan.hashCode);
    if (classMatchingChildSpan !== undefined) {
      // retrieve operationName
      const methodMatchingSpanHash = classMatchingChildSpan.methods.find(
        (method) => method.hashCode === childSpan.hashCode
      );

      const methodName = methodMatchingSpanHash
        ? methodMatchingSpanHash.name
        : 'UNKNOWN';

      classCommunications.push({
        sourceClass: classMatchingSpan,
        targetClass: classMatchingChildSpan,
        operationName: methodName,
      });
      classCommunications.push(
        ...computeClassCommunicationRecursively(
          childSpan,
          spanIdToChildSpanMap,
          hashCodeToClassMap
        )
      );
    }
  });

  return classCommunications;
}

export default function computeAggregatedClassCommunication(
  landscapeStructureData: StructureLandscapeData,
  landscapeDynamicData: DynamicLandscapeData
) {
  if (!landscapeDynamicData || landscapeDynamicData.length === 0) return [];

  const hashCodeToClassMap = getHashCodeToClassMap(landscapeStructureData);

  const traceIdToSpanTrees = getTraceIdToSpanTreeMap(landscapeDynamicData);

  const totalClassCommunications: ClassCommunication[] = [];

  landscapeDynamicData.forEach((trace) => {
    const traceSpanTree = traceIdToSpanTrees.get(trace.traceId);

    if (traceSpanTree) {
      const firstSpan = traceSpanTree.root;
      totalClassCommunications.push(
        ...computeClassCommunicationRecursively(
          firstSpan,
          traceSpanTree.tree,
          hashCodeToClassMap
        )
      );
    }
  });

  const methodCalls = new Map<string, MethodCall>();

  totalClassCommunications.forEach(
    ({ sourceClass, targetClass, operationName }) => {
      const sourceTargetClassMethodId = `${sourceClass.id}_${targetClass.id}_${operationName}`;

      // get source app
      const sourceApp = getApplicationFromClass(
        landscapeStructureData,
        sourceClass
      );

      // get target app
      const targetApp = getApplicationFromClass(
        landscapeStructureData,
        targetClass
      );

      if (!sourceApp || !targetApp) {
        console.error('Application for class communication not found!');
        return;
      }

      // Find all identical method calls based on their source
      // and target app / class
      // and aggregate identical method calls with exactly same source
      // and target app / class within a single representative
      const maybeMethodCall = methodCalls.get(sourceTargetClassMethodId);

      if (!maybeMethodCall) {
        methodCalls.set(
          sourceTargetClassMethodId,
          new MethodCall(
            sourceTargetClassMethodId,
            sourceApp,
            sourceClass,
            targetApp,
            targetClass,
            operationName
          ).addSpan()
        );
      } else {
        maybeMethodCall.addSpan();
      }
    }
  );

  const aggregatedClassCommunications = new Map<
    string,
    AggregatedClassCommunication
  >();

  methodCalls.forEach((methodCall) => {
    const classIds = [
      methodCall.sourceClass.id,
      methodCall.targetClass.id,
    ].sort();
    const communicationId = classIds[0] + '_' + classIds[1];
    const maybeClassCommunication =
      aggregatedClassCommunications.get(communicationId);

    if (maybeClassCommunication) {
      maybeClassCommunication.addMethodCalls(methodCall);
    } else {
      const newCommunication = new AggregatedClassCommunication(
        communicationId,
        methodCall.sourceApp,
        methodCall.sourceClass,
        methodCall.targetApp,
        methodCall.targetClass,
        methodCall.operationName
      );
      newCommunication.addMethodCalls(methodCall);
      aggregatedClassCommunications.set(communicationId, newCommunication);
    }
  });

  const computedCommunication = [...aggregatedClassCommunications.values()];
  computeCommunicationMetrics(computedCommunication);

  return computedCommunication;
}

function computeCommunicationMetrics(
  aggregatedClassCommunications: AggregatedClassCommunication[]
) {
  aggregatedClassCommunications.forEach((communication) => {
    const { totalRequests } = communication;
    const maxRequests = Math.max(
      ...aggregatedClassCommunications.map((x) => x.totalRequests)
    );
    if (maxRequests > 0) {
      communication.metrics.normalizedRequestCount =
        totalRequests / maxRequests;
    }
  });
}

export function computeRestructuredClassCommunication(
  aggregatedClassCommunications: AggregatedClassCommunication[],
  classCommunication: AggregatedClassCommunication[],
  copiedClassCommunications: Map<string, AggregatedClassCommunication[]>,
  updatedClassCommunications: Map<string, AggregatedClassCommunication[]>,
  deletedClassCommunication: Map<
    string,
    AggregatedClassCommunication[]
  > = new Map()
) {
  if (classCommunication.length) {
    classCommunication.forEach((comm) => {
      aggregatedClassCommunications.push(comm);
    });
  }

  if (copiedClassCommunications.size) {
    copiedClassCommunications.forEach((value) => {
      aggregatedClassCommunications.pushObjects(value);
    });
  }

  if (deletedClassCommunication.size) {
    const allDeletedComms: AggregatedClassCommunication[] = [];
    deletedClassCommunication.forEach((value) => {
      value.forEach((deletedComm) => {
        const foundComm = aggregatedClassCommunications.filter(
          (comm) =>
            comm.id === deletedComm.id ||
            comm.operationName === deletedComm.operationName
        );
        if (foundComm.length) allDeletedComms.pushObjects(foundComm);
      });
    });

    aggregatedClassCommunications.removeObjects(allDeletedComms);
  }

  if (updatedClassCommunications.size) {
    const allUpdatedComms: AggregatedClassCommunication[] = [];

    updatedClassCommunications.forEach((value) => {
      allUpdatedComms.push(...value);
    });

    aggregatedClassCommunications.pushObjects(allUpdatedComms);
    const removeUnwantedComms = aggregatedClassCommunications.filter(
      (comm) =>
        !comm.operationName.includes('removed') &&
        !comm.sourceClass.id.includes('removed') &&
        !comm.targetClass.id.includes('removed')
    );
    aggregatedClassCommunications.clear();
    aggregatedClassCommunications.pushObjects(removeUnwantedComms);
  }

  return aggregatedClassCommunications;
}

interface ClassCommunication {
  sourceClass: Class;
  targetClass: Class;
  operationName: string;
}
