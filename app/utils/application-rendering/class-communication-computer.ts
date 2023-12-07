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
import ClassCommunication from '../landscape-schemes/dynamic/class-communication';

function computeClassCommunicationRecursively(
  span: Span,
  spanIdToChildSpanMap: Map<string, Span[]>,
  hashCodeToClassMap: Map<string, Class>
) {
  if (span === undefined) {
    return [];
  }

  const childSpans = spanIdToChildSpanMap.get(span.spanId);

  if (childSpans === undefined || childSpans.length === 0) {
    // no childspan, therefore no one to call => no communication line
    return [];
  }

  const classMatchingSpan = hashCodeToClassMap.get(span.methodHash);
  if (classMatchingSpan === undefined) {
    return [];
  }

  let callerMethodName = 'UNKNOWN';

  classMatchingSpan.methods.forEach((method) => {
    if (method.methodHash === span.methodHash) {
      callerMethodName = method.name;
    }
  });

  const classCommunications: SingleClassCommunication[] = [];

  childSpans.forEach((childSpan) => {
    const classMatchingChildSpan = hashCodeToClassMap.get(childSpan.methodHash);
    if (classMatchingChildSpan !== undefined) {
      // retrieve operationName
      const methodMatchingSpanHash = classMatchingChildSpan.methods.find(
        (method) => method.methodHash === childSpan.methodHash
      );

      const methodName = methodMatchingSpanHash
        ? methodMatchingSpanHash.name
        : 'UNKNOWN';

      // create classCommunication (eventually results in a single
      // communication line) and proceed with remaining method calls
      classCommunications.push({
        sourceClass: classMatchingSpan,
        targetClass: classMatchingChildSpan,
        operationName: methodName,
        callerMethodName: callerMethodName,
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

export default function computeClassCommunication(
  landscapeStructureData: StructureLandscapeData,
  landscapeDynamicData: DynamicLandscapeData
) {
  if (!landscapeDynamicData || landscapeDynamicData.length === 0) return [];

  const hashCodeToClassMap = getHashCodeToClassMap(landscapeStructureData);

  const traceIdToSpanTrees = getTraceIdToSpanTreeMap(landscapeDynamicData);

  const totalClassCommunications: SingleClassCommunication[] = [];

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
    ({ sourceClass, targetClass, operationName, callerMethodName }) => {
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
            operationName,
            callerMethodName
          ).addSpan()
        );
      } else {
        maybeMethodCall.addSpan();
      }
    }
  );

  const classCommunications = new Map<string, ClassCommunication>();

  methodCalls.forEach((methodCall) => {
    const classIds = [
      methodCall.sourceClass.id,
      methodCall.targetClass.id,
    ].sort();
    const communicationId = classIds[0] + '_' + classIds[1];
    const maybeClassCommunication = classCommunications.get(communicationId);

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
      classCommunications.set(communicationId, newCommunication);
    }
  });

  const computedCommunication = [...classCommunications.values()];
  computeCommunicationMetrics(computedCommunication);

  //for (const computedCommu of computedCommunication) {
  //console.log(
  // computedCommu.operationName + ' of ' + computedCommu.sourceClass.name
  //);
  //}

  return computedCommunication;
}

function computeCommunicationMetrics(
  classCommunications: ClassCommunication[]
) {
  classCommunications.forEach((communication) => {
    const { totalRequests } = communication;
    const maxRequests = Math.max(
      ...classCommunications.map((x) => x.totalRequests)
    );
    if (maxRequests > 0) {
      communication.metrics.normalizedRequestCount =
        totalRequests / maxRequests;
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
      classCommunications.pushObjects(value);
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
        if (foundComm.length) allDeletedComms.pushObjects(foundComm);
      });
    });

    classCommunications.removeObjects(allDeletedComms);
  }

  if (updatedClassCommunications.size) {
    const allUpdatedComms: ClassCommunication[] = [];

    updatedClassCommunications.forEach((value) => {
      allUpdatedComms.push(...value);
    });

    classCommunications.pushObjects(allUpdatedComms);
    const removeUnwantedComms = classCommunications.filter(
      (comm) =>
        !comm.operationName.includes('removed') &&
        !comm.sourceClass.id.includes('removed') &&
        !comm.targetClass.id.includes('removed')
    );
    classCommunications.clear();
    classCommunications.pushObjects(removeUnwantedComms);
  }

  return classCommunications;
}

interface SingleClassCommunication {
  sourceClass: Class;
  targetClass: Class;
  operationName: string;
  callerMethodName: string;
}
