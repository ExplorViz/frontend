import {
  getAllClassesInApplication,
  getAllSpanHashCodesFromTraces,
  getClassList,
  getHashCodeToClassMap,
} from './utils';
import type {
  ReducedApplication,
  ReducedClass,
  Trace,
  Span,
} from './worker-types';

// Wait for the initial message event.
self.addEventListener(
  'message',
  (e) => {
    const structureData = e.data.structure;
    const dynamicData = e.data.dynamic;

    const metrics = calculateMetrics(structureData, dynamicData);

    postMessage(metrics);
  },
  false
);

// Ping the Ember service to say that everything is ok.
postMessage(true);

/******* Define Metrics *******/

type Metric = {
  name: string;
  mode: string;
  description: string;
  min: number;
  max: number;
  values: Map<ReducedClass['id'], number>;
};

function calculateMetrics(
  application: ReducedApplication,
  allLandscapeTraces: Trace[]
) {
  function calcInstanceCountMetric(
    application: ReducedApplication,
    allLandscapeTraces: Trace[]
  ): Metric {
    // Initialize metric properties
    const min = 0;
    let max = 0;
    const values = new Map();

    getAllClassesInApplication(application).forEach((clazz) => {
      values.set(clazz.id, 0);
    });

    const classes: ReducedClass[] = [];
    application.packages.forEach((component) => {
      getClassList(component, classes);
    });

    const hashCodeToClassMap = getHashCodeToClassMap(classes);

    const allMethodHashCodes =
      getAllSpanHashCodesFromTraces(allLandscapeTraces);

    for (const methodHashCode of allMethodHashCodes) {
      const classMatchingTraceHashCode = hashCodeToClassMap.get(methodHashCode);

      if (classMatchingTraceHashCode === undefined) {
        continue;
      }

      const methodMatchingSpanHash = classMatchingTraceHashCode.methods.find(
        (method) => method.hashCode === methodHashCode
      );

      if (methodMatchingSpanHash === undefined) {
        continue;
      }

      // OpenCensus denotes constructor calls with <init>
      // Therefore, we count the <init>s for all given classes
      if (methodMatchingSpanHash.name === '<init>') {
        const newInstanceCount = values.get(classMatchingTraceHashCode.id) + 1;

        values.set(classMatchingTraceHashCode.id, newInstanceCount);
        max = Math.max(max, newInstanceCount);
      }
    }

    return {
      name: 'Instance Count',
      mode: 'aggregatedHeatmap',
      description: 'Number of newly created instances (objects)',
      min,
      max,
      values,
    };
  }

  function calculateIncomingRequestCountMetric(
    application: ReducedApplication,
    allLandscapeTraces: Trace[]
  ): Metric {
    // Initialize metric properties
    const min = 0;
    let max = 0;
    const values = new Map();

    const classes = getAllClassesInApplication(application);

    classes.forEach((clazz) => {
      values.set(clazz.id, 0);
    });

    //const clazzes = getAllClassesInApplication(application);
    // classes = [];
    //application.packages.forEach((component) => {
    //  getClazzList(component, classes);
    // });

    const hashCodeToClassMap = getHashCodeToClassMap(classes);

    const allMethodHashCodes =
      getAllSpanHashCodesFromTracesExceptParentSpans(allLandscapeTraces);

    for (const methodHashCode of allMethodHashCodes) {
      const classMatchingTraceHashCode = hashCodeToClassMap.get(methodHashCode);

      if (classMatchingTraceHashCode === undefined) {
        continue;
      }

      const methodMatchingSpanHash = classMatchingTraceHashCode.methods.find(
        (method) => method.hashCode === methodHashCode
      );

      if (methodMatchingSpanHash === undefined) {
        continue;
      }

      const newRequestCount = values.get(classMatchingTraceHashCode.id) + 1;

      values.set(classMatchingTraceHashCode.id, newRequestCount);
      max = Math.max(max, newRequestCount);
    }

    return {
      name: 'Incoming Requests',
      mode: 'aggregatedHeatmap',
      description: 'Number of incoming requests of a class',
      min,
      max,
      values,
    };
  }

  function calculateOutgoingRequestCountMetric(
    application: ReducedApplication,
    allLandscapeTraces: Trace[]
  ): Metric {
    // Initialize metric properties
    const min = 0;
    let max = 0;
    const values = new Map();

    const clazzes = getAllClassesInApplication(application);

    clazzes.forEach((clazz) => {
      values.set(clazz.id, 0);
    });

    const hashCodeToClassMap = getHashCodeToClassMap(clazzes);

    const traceIdToSpanTreeMap = getTraceIdToSpanTreeMap(allLandscapeTraces);

    traceIdToSpanTreeMap.forEach(({ root, tree }) =>
      calculateRequestsRecursively(root, tree)
    );

    function calculateRequestsRecursively(
      span: Span,
      tree: Map<string, Span[]>
    ) {
      const childSpans = tree.get(span.spanId) ?? [];
      const parentClass = hashCodeToClassMap.get(span.hashCode);

      if (parentClass) {
        const newRequestCount = values.get(parentClass.id) + childSpans.length;

        values.set(parentClass.id, newRequestCount);
        max = Math.max(max, newRequestCount);
      }

      childSpans.forEach((childSpan) =>
        calculateRequestsRecursively(childSpan, tree)
      );
    }

    return {
      name: 'Outgoing Requests',
      mode: 'aggregatedHeatmap',
      description: 'Number of outgoing requests of a class',
      min,
      max,
      values,
    };
  }

  function calculateOverallRequestCountMetric(
    incomingRequestCountMetric: Metric,
    outgoingRequestCountMetric: Metric
  ): Metric {
    // Initialize metric properties
    let min = Number.MAX_SAFE_INTEGER;
    let max = 0;

    const values = new Map();

    incomingRequestCountMetric.values.forEach((incomingRequests, classId) => {
      const outgoingRequests =
        outgoingRequestCountMetric.values.get(classId) ?? 0;
      const overallRequests = incomingRequests + outgoingRequests;

      min = Math.min(min, overallRequests);
      max = Math.max(max, overallRequests);
      values.set(classId, incomingRequests + outgoingRequests);
    });

    if (min > max) {
      min = max = 0;
    }

    return {
      name: 'Overall Requests',
      mode: 'aggregatedHeatmap',
      description: 'Number of in- and outgoing requests of a class',
      min,
      max,
      values,
    };
  }

  /**
   * Can be used for test purposes, as every new calculation of this metric generates different results
   */
  function calculateDummyMetric(application: ReducedApplication): Metric {
    // Initialize metric properties
    let min = Number.MAX_VALUE;
    let max = 0;
    const values = new Map();

    getAllClassesInApplication(application).forEach((clazz) => {
      const randomValue = Math.random() * 1000;
      values.set(clazz.id, randomValue);
      min = Math.min(min, randomValue);
      max = Math.max(max, randomValue);
    });

    if (min > max) {
      min = 0;
    }

    return {
      name: 'Dummy Metric',
      mode: 'aggregatedHeatmap',
      description: 'Random values between 0 and 1000',
      min,
      max,
      values,
    };
  }

  // Fake usage:
  calculateDummyMetric;

  const metrics: Metric[] = [];

  // The following metric might be useful for testing purposes
  // const dummyMetric = calculateDummyMetric(application);
  // metrics.push(dummyMetric);

  const instanceCountMetric = calcInstanceCountMetric(
    application,
    allLandscapeTraces
  );
  metrics.push(instanceCountMetric);

  const incomingRequestCountMetric = calculateIncomingRequestCountMetric(
    application,
    allLandscapeTraces
  );
  metrics.push(incomingRequestCountMetric);

  const outgoingRequestCountMetric = calculateOutgoingRequestCountMetric(
    application,
    allLandscapeTraces
  );
  metrics.push(outgoingRequestCountMetric);

  const overallRequestCountMetric = calculateOverallRequestCountMetric(
    incomingRequestCountMetric,
    outgoingRequestCountMetric
  );
  metrics.push(overallRequestCountMetric);

  return metrics;

  // Helper functions

  function getAllSpanHashCodesFromTracesExceptParentSpans(traceArray: Trace[]) {
    const hashCodes: string[] = [];

    traceArray.forEach((trace) => {
      trace.spanList.forEach((span) => {
        if (span.parentSpanId) {
          hashCodes.push(span.hashCode);
        }
      });
    });
    return hashCodes;
  }

  function sortSpanArrayByTime(spanArray: Span[], copy = false) {
    let sortedArray = spanArray;
    if (copy) {
      sortedArray = [...sortedArray];
    }
    return sortedArray.sort(
      (span1, span2) => span1.startTime - span2.startTime
    );
  }

  type SpanTree = {
    root: Span;
    tree: Map<Span['spanId'], Span[]>;
  };

  /**
   * Returns a SpanTree, which contains the first span and a map,
   * which maps all spans' ids to their corresponding child spans
   */
  function getTraceIdToSpanTree(trace: Trace): SpanTree {
    let firstSpan = trace.spanList[0];

    // Put spans into map for more efficient lookup when sorting
    const spanIdToSpanMap = new Map();
    trace.spanList.forEach((span) => {
      if (span.parentSpanId === '') {
        firstSpan = span;
      } else {
        spanIdToSpanMap.set(span.spanId, span);
      }
    });

    const parentSpanIdToChildSpansMap = new Map<Span['spanId'], Span[]>();

    trace.spanList.forEach((span) => {
      parentSpanIdToChildSpansMap.set(span.spanId, []);
    });

    trace.spanList.forEach((span) => {
      parentSpanIdToChildSpansMap.get(span.parentSpanId)?.push(span);
    });

    parentSpanIdToChildSpansMap.forEach((spanArray) =>
      sortSpanArrayByTime(spanArray)
    );

    const tree = {
      root: firstSpan,
      tree: parentSpanIdToChildSpansMap,
    };

    return tree;
  }

  function getTraceIdToSpanTreeMap(traces: Trace[]) {
    const traceIdToSpanTree = new Map<Trace['traceId'], SpanTree>();

    traces.forEach((trace) => {
      traceIdToSpanTree.set(trace.traceId, getTraceIdToSpanTree(trace));
    });

    return traceIdToSpanTree;
  }
}
