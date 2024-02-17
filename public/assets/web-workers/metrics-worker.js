// Wait for the initial message event.
self.addEventListener(
  'message',
  function (e) {
    const structureData = e.data.structure;
    const dynamicData = e.data.dynamic;
    const staticMetrics = e.data?.staticMetrics;
    const commitId = e.data?.commitId;

    let metrics = [];
    let staticMetricsConverted = [];

    if(commitId && staticMetrics) {
      metrics = calculateMetrics(structureData, dynamicData[0]);
      if(dynamicData[1]){
        metrics = [...metrics, ...calculateMetrics(structureData, dynamicData[1])];
      }else {
        metrics = calculateMetrics(structureData, dynamicData[0]);
      }
      staticMetricsConverted = convertStaticMetrics(structureData, staticMetrics[0], commitId[0], "(#1 sel. commit)");
      staticMetricsConverted = [...staticMetricsConverted, ...convertStaticMetrics(structureData, staticMetrics[1], commitId[1], "(#2 sel. commit)")];
    }else {
      metrics = calculateMetrics(structureData, dynamicData);
    }

    const ret = [...metrics, ...staticMetricsConverted];
    postMessage([...metrics, ...staticMetricsConverted]);
  },
  false
);

// Ping the Ember service to say that everything is ok.
postMessage(true);

// ****** Convert Static Metrics ******

function convertStaticMetrics(application, staticMetrics, commitId, text) {
  if(!staticMetrics || !commitId) {
    return [];
  }

  const metricList = [];
  const metricsNameToMetricsValuesMap = new Map();
  const metricsNameToMinAndMax = new Map();
  for(let i = 0; i < staticMetrics.files.length; i++) {
    //const fqFileName = staticMetrics.files[i];
    const classesWithMetricsOfFile = staticMetrics.classMetrics[i];
    const classes = Object.keys(classesWithMetricsOfFile);

    for(const fqClassName of classes) {
      const clazz = getClazzInApplicationByFullQualifiedClazzName(application, fqClassName);

      const clazzMetricNames = Object.keys(classesWithMetricsOfFile[fqClassName]);
      for(const metricName of clazzMetricNames) {
        //console.log(fqClassName, ":::", metricName, ":::", classesWithMetricsOfFile[fqClassName][metricName]);

        const metricValuesMap = metricsNameToMetricsValuesMap.get(metricName);
        const metricMinMax = metricsNameToMinAndMax.get(metricName);
        const metricVal = parseInt(classesWithMetricsOfFile[fqClassName][metricName]);

        if(metricMinMax) {
          if(metricVal > metricMinMax.max){
            metricMinMax.max = metricVal;
          }
          if(metricVal < metricMinMax.min){
            metricMinMax.min = metricVal;
          }
        }else {
          const minMax = {
            min: metricVal,
            max: metricVal
          };
          metricsNameToMinAndMax.set(metricName, minMax);
        }

        if(metricValuesMap){
          metricValuesMap.set(clazz.id, metricVal);
        }else {
          const map = new Map();
          map.set(clazz.id, metricVal);
          metricsNameToMetricsValuesMap.set(metricName, map);
        }
      }
    }
  }

  for (const [key, value] of metricsNameToMetricsValuesMap) {
    //console.log("Wir haben die Metrik: ", key, " für diese Anzahl an Klassen: ", value.size, " (COMMIT ID: ", commitId, ")");
    const minMax = metricsNameToMinAndMax.get(key);
    const metric = {
      commitId: commitId,
      name: key + " " + text,
      description: "", // TODO: use a predefined map between metric names and descriptions and get the corresponding value
      min: minMax.min,
      max: minMax.max,
      values: value
    };
    metricList.push(metric);
  }

  return metricList;


  // helper function

  function getClazzInApplicationByFullQualifiedClazzName(application, fqClazzName) {
    const fqClazzNameSplit = fqClazzName.split(".");
    let index = 0;
    let children;
    while(index < fqClazzNameSplit.length - 1) {
      if(index == 0) {
        children = application.packages;
      }else {
        children = children.subPackages;
      }

      children = children.find(child => child.name === fqClazzNameSplit[index]);
      if(!children) {
        return undefined;
      }
      index++;
    }

    children = children.classes;
    children = children.find(child => child.name === fqClazzNameSplit[index]);

    return children;
  }
}

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
      clazz.methods.forEach(({ methodHash }) => 
        hashCodeToClassMap.set(methodHash, clazz)
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
