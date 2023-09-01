import type {
  DynamicLandscapeData,
  Span,
} from '../landscape-schemes/dynamic-data';
import type {
  Application,
  Class,
  StructureLandscapeData,
} from '../landscape-schemes/structure-data';
import { createMapsForClasses } from '../landscape-structure-helpers';
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
  landscapeDynamicData: DynamicLandscapeData
) {
  performance.mark('computeDrawableClassCommunication-start');
  if (!landscapeDynamicData || landscapeDynamicData.length === 0) return [];

  const [hashCodeToClassMap, classToApplicationMap] = createMapsForClasses(
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

  performance.mark('computeDrawableClassCommunication-end');
  return drawableClassCommunications;
}

export function isDrawableClassCommunication(
  x: unknown
): x is DrawableClassCommunication {
  return isObject(x) && Object.hasOwn(x, 'totalRequests');
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
