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

export function getApplicationFromPackage(
  landscapeStructure: StructureLandscapeData,
  packageId: string
): Application | undefined {
  let matchingApplication: Application | undefined;

  landscapeStructure.nodes.forEach((node) => {
    node.applications.forEach((application) => {
      const possibleMatch = application.packages.find(
        (packg) => packg.id === packageId
      );

      if (possibleMatch) {
        matchingApplication = application;
      }
    });
  });

  return matchingApplication;
}

export function getApplicationFromClass(
  structureData: StructureLandscapeData,
  clazz: Class
): Application | undefined {
  let matchingApplication: Application | undefined;

  structureData.nodes.forEach((node) => {
    const possibleMatch = node.applications.find((application) =>
      applicationHasClass(application, clazz)
    );

    if (possibleMatch) {
      matchingApplication = possibleMatch;
    }
  });

  return matchingApplication;
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
