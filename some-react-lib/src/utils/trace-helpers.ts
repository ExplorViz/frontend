import {
  Span,
  Trace,
} from './landscape-schemes/dynamic/dynamic-data';

/**
 * Returns the span's total duration in nanoseconds
 */
export function calculateDuration(span: Span): number;
/**
 * Returns the trace's total duration in nanoseconds
 */
export function calculateDuration(trace: Trace): number;
export function calculateDuration(traceOrSpan: Trace | Span) {
  return traceOrSpan.endTime - traceOrSpan.startTime;
}

/**
 * Sorts the given trace array by their duration
 *
 * @param traces - The array to be sorted
 * @param ascending - If true, order is ascending, else descending. Default: `true`
 * @param copy - If set to true, a sorted copy of the array is returned,
 * else the original array is mutated and returned
 */
export function sortTracesByDuration(
  traces: Trace[],
  ascending = true,
  copy = false
) {
  let sortedArray = traces;
  if (copy) {
    sortedArray = [...sortedArray];
  }
  sortedArray.sort((a, b) => {
    const traceDurationA = calculateDuration(a);
    const traceDurationB = calculateDuration(b);

    return traceDurationA - traceDurationB;
  });

  if (!ascending) {
    sortedArray.reverse();
  }
  return sortedArray;
}

/**
 * Sorts the given trace array by their id in alphabetical order
 *
 * @param traces - The array to be sorted
 * @param ascending - If true, order is ascending, else descending. Default: `true`
 * @param copy - If set to true, a sorted copy of the array is returned,
 * else the original array is mutated and returned. Default: `true`
 */
export function sortTracesById(
  traces: Trace[],
  ascending = true,
  copy = false
) {
  let sortedArray = traces;
  if (copy) {
    sortedArray = [...sortedArray];
  }
  sortedArray.sort((a, b) => {
    if (a.traceId > b.traceId) {
      return 1;
    }
    if (b.traceId > a.traceId) {
      return -1;
    }
    return 0;
  });

  if (!ascending) {
    sortedArray.reverse();
  }
  return sortedArray;
}

/**
 * Return the number of spans, i.e. requests inside the span
 */
export function getTraceRequestCount(trace: Trace) {
  return trace.spanList.length;
}

/**
 * Sorts the given span array by their startTime and returns it
 *
 * @param spanArary The array that is to be sorted
 * @param copy If set to true, a sorted copy of the array is returned,
 * else the original array is mutated and returned
 */
export function sortSpanArrayByTime(spanArary: Span[], copy = false) {
  let sortedArray = spanArary;
  if (copy) {
    sortedArray = [...sortedArray];
  }
  return sortedArray.sort((span1, span2) => span1.startTime - span2.startTime);
}

/**
 * Returns a SpanTree, which contains the first span and a map,
 * which maps all spans' ids to their corresponding child spans
 */
export function getTraceIdToSpanTree(trace: Trace) {
  let firstSpan: Span = trace.spanList[0];

  // Put spans into map for more efficient lookup when sorting
  const spanIdToSpanMap = new Map<string, Span>();
  trace.spanList.forEach((span) => {
    if (!span.parentSpanId) {
      firstSpan = span;
      //console.log('root', span);
    } else {
      spanIdToSpanMap.set(span.spanId, span);
    }
  });

  const parentSpanIdToChildSpansMap = new Map<string, Span[]>();

  trace.spanList.forEach((span) => {
    parentSpanIdToChildSpansMap.set(span.spanId, []);
  });

  trace.spanList.forEach((span) => {
    parentSpanIdToChildSpansMap.get(span.parentSpanId)?.push(span);
  });

  parentSpanIdToChildSpansMap.forEach((spanArary) =>
    sortSpanArrayByTime(spanArary)
  );

  const tree: SpanTree = {
    root: firstSpan,
    tree: parentSpanIdToChildSpansMap,
  };

  return tree;
}

export function getTraceIdToSpanTreeMap(traces: Trace[]) {
  const traceIdToSpanTree = new Map<string, SpanTree>();

  traces.forEach((trace) => {
    traceIdToSpanTree.set(trace.traceId, getTraceIdToSpanTree(trace));
  });

  return traceIdToSpanTree;
}

/**
 * Returns a sorted copy of the spanList, sorted in ascending order
 * in which they appeared
 */
export function getSortedTraceSpans(trace: Trace) {
  function getSortedSpanList(span: Span, tree: Map<string, Span[]>): Span[] {
    const childSpans = tree.get(span.spanId);

    if (childSpans === undefined || childSpans.length === 0) {
      return [span];
    }

    const subSpans = childSpans
      .map((subSpan) => getSortedSpanList(subSpan, tree))
      .flat();

    return [span, ...subSpans];
  }

  const spanTree = getTraceIdToSpanTree(trace);

  if (spanTree === undefined) {
    return [];
  }

  const { root, tree } = spanTree;

  return getSortedSpanList(root, tree);
}

export interface SpanTree {
  root: Span;
  tree: Map<string, Span[]>;
}
