import {
  DynamicLandscapeData,
  Span,
} from '../landscape-schemes/dynamic/dynamic-data';
import MethodCall from '../landscape-schemes/dynamic/method-call';
import {
  Application,
  Class,
  StructureLandscapeData,
} from '../landscape-schemes/structure-data';
import { getTraceIdToSpanTreeMap } from '../trace-helpers';
import ClassCommunication from '../landscape-schemes/dynamic/class-communication';
import { getAllClassesInApplication } from '../application-helpers';

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
  landscapeDynamicDataArr: [DynamicLandscapeData?, DynamicLandscapeData?] // first element => cross-commit dynamics/first selected commit dynamics, second element => second selected commit dynamics
) {
  // if no dynamic landscape for any commit available => return empty list
  if (
    (!landscapeDynamicDataArr[0] && !landscapeDynamicDataArr[1]) ||
    !(
      landscapeDynamicDataArr[0]?.length !== 0 ||
      landscapeDynamicDataArr[1]?.length !== 0
    )
  )
    return [];

  const [hashCodeToClassMap, classToApplicationMap] = createLookupMaps(
    landscapeStructureData
  );

  const classCommunications = new Map<string, ClassCommunication>();
  for (let i = 0; i < 2; i++) {
    if (!landscapeDynamicDataArr[i]) {
      continue;
    }

    const traceIdToSpanTrees = getTraceIdToSpanTreeMap(
      landscapeDynamicDataArr[i]!
    );

    const totalClassCommunications: SingleClassCommunication[] = [];

    landscapeDynamicDataArr[i]!.forEach((trace) => {
      const traceSpanTree = traceIdToSpanTrees.get(trace.traceId);

      if (traceSpanTree) {
        const firstSpan = traceSpanTree.root;
        const x = computeClassCommunicationRecursively(
          firstSpan,
          traceSpanTree.tree,
          hashCodeToClassMap
        );

        totalClassCommunications.push(
          ...x // replace x with function call
        );
      }
    });

    const methodCalls = new Map<string, MethodCall>();

    totalClassCommunications.forEach(
      ({ sourceClass, targetClass, operationName, callerMethodName }) => {
        const sourceTargetClassMethodId = `${sourceClass.id}_${targetClass.id}_${operationName}`;

        // get source app
        const sourceApp = classToApplicationMap.get(sourceClass);

        // get target app
        const targetApp = classToApplicationMap.get(targetClass);

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

    methodCalls.forEach((methodCall) => {
      const classIds = [
        methodCall.sourceClass.id,
        methodCall.targetClass.id,
      ].sort();
      const communicationId = classIds[0] + '_' + classIds[1];
      const maybeClassCommunication = classCommunications.get(communicationId);

      if (maybeClassCommunication) {
        maybeClassCommunication.addMethodCalls(methodCall, i);
      } else {
        const newCommunication = new ClassCommunication(
          communicationId,
          methodCall.sourceApp,
          methodCall.sourceClass,
          methodCall.targetApp,
          methodCall.targetClass,
          methodCall.operationName
        );
        newCommunication.addMethodCalls(methodCall, i);
        classCommunications.set(communicationId, newCommunication);
      }
    });
  }
  const computedCommunication = [...classCommunications.values()];
  computeCommunicationMetrics(computedCommunication, 0);
  computeCommunicationMetrics(computedCommunication, 1);

  return computedCommunication;
}

function computeCommunicationMetrics(
  classCommunications: ClassCommunication[],
  index: number
) {
  classCommunications.forEach((communication) => {
    const { totalRequests } = communication;
    const maxRequests = Math.max(
      ...classCommunications.map((x) => x.totalRequests[index])
    );
    if (maxRequests > 0) {
      communication.metrics[index].normalizedRequestCount =
        totalRequests[index] / maxRequests;
    }
  });
}

function createLookupMaps(
  structureData: StructureLandscapeData
): [Map<string, Class>, Map<Class, Application>] {
  const hashCodeToClassMap = new Map<string, Class>();
  const classToApplicationMap = new Map<Class, Application>();

  const allApplications = structureData.nodes
    .map((node) => node.applications)
    .flat();

  for (const application of allApplications) {
    const classes = getAllClassesInApplication(application);

    for (const clazz of classes) {
      clazz.methods.forEach(({ methodHash }) =>
        hashCodeToClassMap.set(methodHash, clazz)
      );

      classToApplicationMap.set(clazz, application);
    }
  }

  return [hashCodeToClassMap, classToApplicationMap];
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
