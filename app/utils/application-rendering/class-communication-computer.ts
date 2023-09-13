import { getAllClassesInApplication } from '../application-helpers';
import type {
  DynamicLandscapeData,
  Span,
} from '../landscape-schemes/dynamic-data';
import type {
  Application,
  Class,
  StructureLandscapeData,
} from '../landscape-schemes/structure-data';
import isObject from '../object-helpers';
import { getTraceIdToSpanTreeMap } from '../trace-helpers';

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

export default function computeDrawableClassCommunication(
  landscapeStructureData: StructureLandscapeData,
  landscapeDynamicData: DynamicLandscapeData,
  restructureMode: boolean,
  classCommunication: DrawableClassCommunication[]
) {
  performance.mark('computeDrawableClassCommunication-start');
  if (!landscapeDynamicData || landscapeDynamicData.length === 0) return [];

  const [hashCodeToClassMap, classToApplicationMap] = createLookupMaps(
    landscapeStructureData
  );

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

  const aggregatedDrawableClassCommunications = new Map<
    string,
    DrawableClassCommunication
  >();

  totalClassCommunications.forEach(
    ({ sourceClass, targetClass, operationName }) => {
      const sourceTargetClassMethodId = `${sourceClass.id}_${targetClass.id}_${operationName}`;

      // get source app
      const sourceApp = classToApplicationMap.get(sourceClass);

      // get target app
      const targetApp = classToApplicationMap.get(targetClass);

      // Find all identical method calls based on their source
      // and target app / class
      // and aggregate identical method calls with exactly same source
      // and target app / class within a single representative
      const drawableClassCommunication =
        aggregatedDrawableClassCommunications.get(sourceTargetClassMethodId);

      if (!drawableClassCommunication) {
        aggregatedDrawableClassCommunications.set(sourceTargetClassMethodId, {
          id: sourceTargetClassMethodId,
          totalRequests: 1,
          sourceClass,
          targetClass,
          operationName,
          sourceApp,
          targetApp,
        });
      } else {
        drawableClassCommunication.totalRequests++;
      }
    }
  );

  const drawableClassCommunications = [
    ...aggregatedDrawableClassCommunications.values(),
  ];

  if (restructureMode && classCommunication) {
    classCommunication.forEach((comm) => {
      drawableClassCommunications.push(comm);
    });
  }

  if (restructureMode && classCommunication) {
    classCommunication.forEach((comm) => {
      drawableClassCommunications.push(comm);
    });
  }

  performance.mark('computeDrawableClassCommunication-end');
  return drawableClassCommunications;
}

export function isDrawableClassCommunication(
  x: unknown
): x is DrawableClassCommunication {
  return isObject(x) && Object.hasOwn(x, 'totalRequests');
}

/**
 * Creates the following two maps based on given structure data:
 *  - hashCodeToClassMap: maps method hash codes to classes
 *  - classToApplicationMap: maps classes to an application
 * @returns Both maps as a tuple which can be destructured
 */
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
      clazz.methods.forEach(({ hashCode }) =>
        hashCodeToClassMap.set(hashCode, clazz)
      );

      classToApplicationMap.set(clazz, application);
    }
  }

  return [hashCodeToClassMap, classToApplicationMap];
}

interface ClassCommunication {
  sourceClass: Class;
  targetClass: Class;
  operationName: string;
}

export interface DrawableClassCommunication {
  id: string;
  totalRequests: number;
  sourceClass: Class;
  targetClass: Class;
  operationName: string;
  sourceApp: Application | undefined;
  targetApp: Application | undefined;
}
