import {
  applicationHasClass,
  getAllClassesInApplication,
  getAllMethodHashCodesInApplication,
} from './application-helpers';
import { Trace } from './landscape-schemes/dynamic-data';
import {
  Application,
  Class,
  isApplication,
  StructureLandscapeData,
} from './landscape-schemes/structure-data';
import { getTraceIdToSpanTree, SpanTree } from './trace-helpers';

export function getAllApplicationsInLandscape(
  landscapeStructure: StructureLandscapeData
) {
  return landscapeStructure.nodes.map((node) => node.applications).flat();
}

export function getApplicationInLandscapeById(
  landscapeStructure: StructureLandscapeData,
  id: string
): Application | undefined {
  return getAllApplicationsInLandscape(landscapeStructure).filter(
    (app) => app.id === id
  )[0];
}

export function getApplicationFromClass(
  structureData: StructureLandscapeData,
  clazz: Class
): Application | undefined {
  for (const node of structureData.nodes) {
    const possibleMatch = node.applications.find((application) =>
      applicationHasClass(application, clazz)
    );

    if (possibleMatch) {
      return possibleMatch;
      //matchingApplication = possibleMatch;
    }
  }

  return undefined;
}

export function getHashCodeToApplicationMap(
  landscapeStructure: StructureLandscapeData
) {
  const hashCodeToApplicationMap = new Map<string, Application>();

  landscapeStructure.nodes.forEach((node) =>
    node.applications.forEach((application) =>
      getAllMethodHashCodesInApplication(application).forEach((hashCode) =>
        hashCodeToApplicationMap.set(hashCode, application)
      )
    )
  );

  return hashCodeToApplicationMap;
}

export function getHashCodeToClassMap(
  structureData: StructureLandscapeData | Application
) {
  const hashCodeToClassMap = new Map<string, Class>();

  let classList: Class[];

  if (isApplication(structureData)) {
    classList = getAllClassesInApplication(structureData);
  } else {
    classList = structureData.nodes
      .map((node) =>
        node.applications.map((application) =>
          getAllClassesInApplication(application)
        )
      )
      .flat(2);
  }

  classList.forEach((clazz) => {
    clazz.methods.forEach(({ hashCode }) =>
      hashCodeToClassMap.set(hashCode, clazz)
    );
  });

  return hashCodeToClassMap;
}

/**
 * Creates the following two maps based on given structure data:
 *  - hashCodeToClassMap: maps method hash codes to classes
 *  - classToApplicationMap: maps classes to an application
 * @returns Both maps as a tuple which can be destructured
 */
export function createMapsForClasses(
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

export function createTraceIdToSpanTrees(traces: Trace[]) {
  const traceIdToSpanTree = new Map<string, SpanTree>();

  traces.forEach((trace) => {
    traceIdToSpanTree.set(trace.traceId, getTraceIdToSpanTree(trace));
  });

  return traceIdToSpanTree;
}

export function getSpanIdToClassMap(
  structureData: Application | StructureLandscapeData,
  trace: Trace
) {
  const hashCodeToClassMap = getHashCodeToClassMap(structureData);

  const spanIdToClassMap = new Map<string, Class>();

  trace.spanList.forEach((span) => {
    const { hashCode, spanId } = span;

    const clazz = hashCodeToClassMap.get(hashCode);

    if (clazz !== undefined) {
      spanIdToClassMap.set(spanId, clazz);
    }
  });

  return spanIdToClassMap;
}

export function spanIdToClass(
  structureData: Application | StructureLandscapeData,
  trace: Trace,
  spanId: string
) {
  const spanIdToClassMap = getSpanIdToClassMap(structureData, trace);
  return spanIdToClassMap.get(spanId);
}
