import { Trace } from 'explorviz-frontend/utils/landscape-schemes/dynamic-data';
import {
  sortTracesByDuration,
  sortTracesById,
  sortSpanArrayByTime,
} from 'explorviz-frontend/utils/trace-helpers';
import { module, test } from 'qunit';

module('Unit | Utility | trace-helpers', function () {
  test('sortTracesByDuration', function (assert) {
    const testTraces = getTestTraces();
    sortTracesByDuration(testTraces);
    assert.ok(
      testTraces[0].traceId === 'trace2' &&
        testTraces[1].traceId === 'trace3' &&
        testTraces[2].traceId === 'trace1',
      'Traces must be sorted in ascending order and original array mutated'
    );

    const testTraces2 = getTestTraces();
    sortTracesByDuration(testTraces2, false);
    assert.ok(
      testTraces2[0].traceId === 'trace1' &&
        testTraces2[1].traceId === 'trace3' &&
        testTraces2[2].traceId === 'trace2',
      'Traces must be sorted in descending order and original array mutated'
    );

    const testTraces3 = getTestTraces();
    const sortedArray = sortTracesByDuration(testTraces3, true, true);
    assert.ok(
      sortedArray[0].traceId === 'trace2' &&
        sortedArray[1].traceId === 'trace3' &&
        sortedArray[2].traceId === 'trace1' &&
        sortedArray !== testTraces3,
      'Traces must be sorted in ascending order and original array unmutated'
    );
  });

  test('sortTracesById', function (assert) {
    const testTraces = getTestTraces();
    sortTracesById(testTraces);
    assert.ok(
      testTraces[0].traceId === 'trace1' &&
        testTraces[1].traceId === 'trace2' &&
        testTraces[2].traceId === 'trace3',
      'Traces must be sorted in ascending order and original array mutated'
    );

    const testTraces2 = getTestTraces();
    sortTracesById(testTraces2, false);
    assert.ok(
      testTraces2[0].traceId === 'trace3' &&
        testTraces2[1].traceId === 'trace2' &&
        testTraces2[2].traceId === 'trace1',
      'Traces must be sorted in descending order and original array mutated'
    );

    const testTraces3 = getTestTraces();
    const sortedArray = sortTracesById(testTraces3, true, true);
    assert.ok(
      sortedArray[0].traceId === 'trace1' &&
        sortedArray[1].traceId === 'trace2' &&
        sortedArray[2].traceId === 'trace3' &&
        sortedArray !== testTraces3,
      'Traces must be sorted in ascending order and original array unmutated'
    );
  });

  test('sortSpanArrayByTime', function (assert) {
    const testSpanList = getTestSpanList();
    sortSpanArrayByTime(testSpanList);
    // test spans are defined in a way that the time sorted array matches the
    // also matches the array sorted by spanId
    assert.ok(
      testSpanList[0].spanId === 'span1' &&
        testSpanList[1].spanId === 'span2' &&
        testSpanList[2].spanId === 'span3' &&
        testSpanList[3].spanId === 'span4',
      'Spans must be sorted in ascending order and original array mutated'
    );

    const testSpanList2 = getTestSpanList();
    const sortedArray = sortSpanArrayByTime(testSpanList2, true);
    assert.ok(
      testSpanList[0].spanId === 'span1' &&
        testSpanList[1].spanId === 'span2' &&
        testSpanList[2].spanId === 'span3' &&
        testSpanList[3].spanId === 'span4' &&
        sortedArray !== testSpanList2,
      'Spans must be sorted in ascending order and original array unmutated'
    );
  });
});

function getTestTraces(): Trace[] {
  return [
    {
      landscapeToken: '',
      traceId: 'trace2',
      startTime: 26850000000,
      endTime: 26890000000,
      duration: 40,
      overallRequestCount: 1,
      traceCount: 1,
      spanList: [
        {
          landscapeToken: '',
          spanId: 'trace2_span1',
          parentSpanId: '',
          traceId: 'trace2',
          startTime: 26850000000,
          endTime: 26890000000,
          methodHash: 'trace2_hashCode',
        },
      ],
    },
    {
      landscapeToken: '',
      traceId: 'trace3',
      startTime: 15500000000,
      endTime: 15570000000,
      duration: 70,
      overallRequestCount: 1,
      traceCount: 1,
      spanList: [
        {
          landscapeToken: '',
          spanId: 'trace3_span1',
          parentSpanId: '',
          traceId: 'trace3',
          startTime: 15500000000,
          endTime: 15570000000,
          methodHash: 'trace3_hashCode',
        },
      ],
    },
    {
      landscapeToken: '',
      traceId: 'trace1',
      startTime: 10100000000,
      endTime: 11110000000,
      duration: 1010,
      overallRequestCount: 1,
      traceCount: 1,
      spanList: [
        {
          landscapeToken: '',
          spanId: 'trace1_span1',
          parentSpanId: '',
          traceId: 'trace1',
          startTime: 10100000000,
          endTime: 11110000000,
          methodHash: 'trace1_hashCode',
        },
      ],
    },
  ];
}

function getTestSpanList() {
  return [
    {
      landscapeToken: '',
      spanId: 'span1',
      parentSpanId: '',
      traceId: 'trace1',
      startTime: 10100000000,
      endTime: 11110000000,
      methodHash: 'method1HashCode',
    },
    {
      landscapeToken: '',
      spanId: 'span4',
      parentSpanId: 'span3',
      traceId: 'trace1',
      startTime: 10130000000,
      endTime: 11110000000,
      methodHash: 'method3HashCode',
    },
    {
      landscapeToken: '',
      spanId: 'span2',
      parentSpanId: 'span1',
      traceId: 'trace1',
      startTime: 10110000000,
      endTime: 10120000000,
      methodHash: 'method2HashCode',
    },
    {
      landscapeToken: '',
      spanId: 'span3',
      parentSpanId: 'span1',
      traceId: 'trace1',
      startTime: 10120000000,
      endTime: 11110000000,
      methodHash: 'method2HashCode',
    },
  ];
}
