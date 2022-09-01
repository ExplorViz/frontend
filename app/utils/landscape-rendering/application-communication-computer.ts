import { DynamicLandscapeData, Span } from '../landscape-schemes/dynamic-data';
import { Application, StructureLandscapeData } from '../landscape-schemes/structure-data';
import { getHashCodeToApplicationMap } from '../landscape-structure-helpers';
import { getTraceIdToSpanTreeMap } from '../trace-helpers';

function computeApplicationCommunicationRecursively(span: Span,
  parentSpanIdToChildSpanMap: Map<string, Span[]>,
  hashCodeToApplicationMap: Map<string, Application>) {
  const childSpans = parentSpanIdToChildSpanMap.get(span.spanId);

  if (childSpans === undefined) {
    return [];
  }

  const parentSpanApplication = hashCodeToApplicationMap.get(span.hashCode)!;

  const allApplicationCommunications: ApplicationCommunication[] = [];

  childSpans.forEach((childSpan) => {
    const childSpanApplication = hashCodeToApplicationMap.get(childSpan.hashCode)!;

    if (parentSpanApplication !== childSpanApplication) {
      const applicationCommunication: ApplicationCommunication = {
        id: `${parentSpanApplication.id}_${childSpanApplication.id}`,
        sourceApplication: parentSpanApplication,
        targetApplication: childSpanApplication,
      };
      allApplicationCommunications.push(applicationCommunication);
    }
    const childCommunications = computeApplicationCommunicationRecursively(childSpan,
      parentSpanIdToChildSpanMap, hashCodeToApplicationMap);

    allApplicationCommunications.push(...childCommunications);
  });

  return allApplicationCommunications;
}

export default function computeApplicationCommunication(landscape: StructureLandscapeData,
  landscapeDynamicData: DynamicLandscapeData) {
  if (landscapeDynamicData.length === 0) {
    return [];
  }
  const hashCodeToApplicationMap = getHashCodeToApplicationMap(landscape);

  const traceIdToSpanTrees = getTraceIdToSpanTreeMap(landscapeDynamicData);

  const applicationCommunications: ApplicationCommunication[] = [];

  landscapeDynamicData.forEach((trace) => {
    const spanTree = traceIdToSpanTrees.get(trace.traceId);
    if (spanTree !== undefined) {
      applicationCommunications.push(...computeApplicationCommunicationRecursively(spanTree.root,
        spanTree.tree, hashCodeToApplicationMap));
    }
  });

  // filter out duplicates
  const comms = applicationCommunications
    .filter((v, i, a) => a.findIndex((t) => (t.id === v.id)) === i);

  return comms;
}

export interface ApplicationCommunication {
  id: string;
  sourceApplication: Application;
  targetApplication: Application;
}
