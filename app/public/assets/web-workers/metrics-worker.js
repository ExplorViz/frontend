// Wait for the initial message event.
self.addEventListener(
  'message',
  function (e) {
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

function calculateMetrics(application, allLandscapeTraces) {
  function calcInstanceCountMetric(application, allLandscapeTraces) {
    // Initialize metric properties
    let min = 0;
    let max = 0;
    const values = new Map();

    getAllClazzesInApplication(application).forEach((clazz) => {
      values.set(clazz.id, 0);
    });

    const clazzes = [];
    application.packages.forEach((component) => {
      getClazzList(component, clazzes);
    });

    const hashCodeToClassMap = getHashCodeToClassMap(clazzes);

    const allMethodHashCodes =
      getAllSpanHashCodesFromTraces(allLandscapeTraces);

    for (let methodHashCode of allMethodHashCodes) {
      const classMatchingTraceHashCode = hashCodeToClassMap.get(methodHashCode);

      if (classMatchingTraceHashCode === undefined) {
        continue;
      }

      const methodMatchingSpanHash = classMatchingTraceHashCode.methods.find(
        (method) => method.methodHash === methodHashCode
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
    application,
    allLandscapeTraces
  ) {
    // Initialize metric properties
    let min = 0;
    let max = 0;
    const values = new Map();

    const clazzes = getAllClazzesInApplication(application);

    clazzes.forEach((clazz) => {
      values.set(clazz.id, 0);
    });

    //const clazzes = getAllClazzesInApplication(application);
    // clazzes = [];
    //application.packages.forEach((component) => {
    //  getClazzList(component, clazzes);
    // });

    const hashCodeToClassMap = getHashCodeToClassMap(clazzes);

    const allMethodHashCodes =
      getAllSpanHashCodesFromTracesExceptParentSpans(allLandscapeTraces);

    for (let methodHashCode of allMethodHashCodes) {
      const classMatchingTraceHashCode = hashCodeToClassMap.get(methodHashCode);

      if (classMatchingTraceHashCode === undefined) {
        continue;
      }

      const methodMatchingSpanHash = classMatchingTraceHashCode.methods.find(
        (method) => method.methodHash === methodHashCode
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
    application,
    allLandscapeTraces
  ) {
    // Initialize metric properties
    let min = 0;
    let max = 0;
    const values = new Map();

    const clazzes = getAllClazzesInApplication(application);

    clazzes.forEach((clazz) => {
      values.set(clazz.id, 0);
    });

    const hashCodeToClassMap = getHashCodeToClassMap(clazzes);

    const traceIdToSpanTreeMap = getTraceIdToSpanTreeMap(allLandscapeTraces);

    traceIdToSpanTreeMap.forEach((spanTree) => {
      const { root, tree } = spanTree;

      calculateRequestsRecursively(root, tree);
    });

    function calculateRequestsRecursively(span, tree) {
      if (span === undefined) {
        return;
      }
      const childSpans = tree.get(span.spanId);
      const parentClass = hashCodeToClassMap.get(span.methodHash);

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
    incomingRequestCountMetric,
    outgoingRequestCountMetric
  ) {
    // Initialize metric properties
    let min = Number.MAX_SAFE_INTEGER;
    let max = 0;

    const values = new Map();

    incomingRequestCountMetric.values.forEach((incomingRequests, classId) => {
      const outgoingRequests = outgoingRequestCountMetric.values.get(classId);
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
  function calculateDummyMetric(application) {
    // Initialize metric properties
    let min = Number.MAX_VALUE;
    let max = 0;
    const values = new Map();

    getAllClazzesInApplication(application).forEach((clazz) => {
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

  let metrics = [];

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

  function getAllClazzesInApplication(application) {
    let allComponents = getAllComponentsInApplication(application);

    let allClazzes = [];
    allComponents.forEach((component) => {
      allClazzes.push(...component.classes);
    });
    return allClazzes;
  }

  function getClazzList(component, clazzesArray) {
    const children = component.subPackages;
    const clazzes = component.classes;

    children.forEach((child) => {
      getClazzList(child, clazzesArray);
    });

    clazzes.forEach((clazz) => {
      clazzesArray.push(clazz);
    });
  }

  function getAllComponentsInApplication(application) {
    let children = application.packages;

    let components = [];

    children.forEach((component) => {
      components.push(...getAllComponents(component), component);
    });
    return components;
  }

  function getAllComponents(component) {
    let components = [];
    component.subPackages.forEach((component) => {
      components.push(...getAllComponents(component), component);
    });

    return components;
  }

  function getHashCodeToClassMap(clazzes) {
    const hashCodeToClassMap = new Map();

    clazzes.forEach((clazz) => {
      clazz.methods.forEach(({ hashCode }) =>
        hashCodeToClassMap.set(hashCode, clazz)
      );
    });

    return hashCodeToClassMap;
  }

  function getAllSpanHashCodesFromTracesExceptParentSpans(traceArray) {
    const hashCodes = [];

    traceArray.forEach((trace) => {
      trace.spanList.forEach((span) => {
        if (span.parentSpanId) {
          hashCodes.push(span.methodHash);
        }
      });
    });
    return hashCodes;
  }

  function getAllSpanHashCodesFromTraces(traceArray) {
    const hashCodes = [];

    traceArray.forEach((trace) => {
      trace.spanList.forEach((span) => {
        hashCodes.push(span.methodHash);
      });
    });
    return hashCodes;
  }

  function sortSpanArrayByTime(spanArary, copy = false) {
    let sortedArray = spanArary;
    if (copy) {
      sortedArray = [...sortedArray];
    }
    return sortedArray.sort(
      (span1, span2) => span1.startTime - span2.startTime
    );
  }

  /**
   * Returns a SpanTree, which contains the first span and a map,
   * which maps all spans' ids to their corresponding child spans
   */
  function getTraceIdToSpanTree(trace) {
    let firstSpan = trace.spanList[0];

    // Put spans into map for more efficient lookup when sorting
    const spanIdToSpanMap = new Map();
    trace.spanList.forEach((span) => {
      if (!span.parentSpanId) {
        firstSpan = span;
      } else {
        spanIdToSpanMap.set(span.spanId, span);
      }
    });

    const parentSpanIdToChildSpansMap = new Map();

    trace.spanList.forEach((span) => {
      parentSpanIdToChildSpansMap.set(span.spanId, []);
    });

    trace.spanList.forEach((span) => {
      parentSpanIdToChildSpansMap.get(span.parentSpanId)?.push(span);
    });

    parentSpanIdToChildSpansMap.forEach((spanArary) =>
      sortSpanArrayByTime(spanArary)
    );

    const tree = {
      root: firstSpan,
      tree: parentSpanIdToChildSpansMap,
    };

    return tree;
  }

  function getTraceIdToSpanTreeMap(traces) {
    const traceIdToSpanTree = new Map();

    traces.forEach((trace) => {
      traceIdToSpanTree.set(trace.traceId, getTraceIdToSpanTree(trace));
    });

    return traceIdToSpanTree;
  }
}
