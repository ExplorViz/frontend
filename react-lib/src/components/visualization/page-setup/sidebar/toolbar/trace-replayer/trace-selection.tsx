import React, { useState } from 'react';

import {
  DynamicLandscapeData,
  Span,
  Trace,
} from 'react-lib/src/utils/landscape-schemes/dynamic/dynamic-data';
import {
  Class,
  Application,
  StructureLandscapeData,
} from 'react-lib/src/utils/landscape-schemes/structure-data';
import { getHashCodeToClassMap } from 'react-lib/src/utils/landscape-structure-helpers';
import {
  calculateDuration,
  getSortedTraceSpans,
  getTraceRequestCount,
  sortTracesByDuration,
  sortTracesById,
  sortTracesByRequestCount,
} from 'react-lib/src/utils/trace-helpers';
import { formatNumber } from 'react-lib/src/utils/format-number';
import Button from 'react-bootstrap/Button';

export type TimeUnit = 'ns' | 'ms' | 's';

interface TraceSelectionProps {
  readonly dynamicData: DynamicLandscapeData;
  readonly structureData: StructureLandscapeData;
  readonly application: Application;
  readonly selectedTrace: Trace;
  readonly applicationTraces: Trace[];
  moveCameraTo(emberModel: Class | Span): void;
  selectTrace(trace: Trace): void;
}

export default function TraceSelection({
  structureData,
  application,
  selectedTrace,
  applicationTraces,
  moveCameraTo,
  selectTrace,
}: TraceSelectionProps) {
  const [traceTimeUnit, setTraceTimeUnit] = useState<TimeUnit>('ns');
  const [sortBy, setSortBy] = useState<any>('traceId');
  const [isSortedAsc, setIsSortedAsc] = useState<boolean>(true);
  const [filterTerm, setFilterTerm] = useState<string>('');

  const firstClasses = (() => {
    const sortedSpanLists = applicationTraces.map(getSortedTraceSpans);

    const hashCodeToClassInLandscapeMap = getHashCodeToClassMap(structureData);

    const traceIdToFirstClassMap = new Map<string, Class>();

    applicationTraces.forEach((trace, index) => {
      const spanList = sortedSpanLists[index];

      const firstClassHashCode = spanList[0].methodHash;
      const firstClass = hashCodeToClassInLandscapeMap.get(firstClassHashCode)!;

      traceIdToFirstClassMap.set(trace.traceId, firstClass);
    });

    return traceIdToFirstClassMap;
  })();

  const lastClasses = (() => {
    const sortedSpanLists = applicationTraces.map(getSortedTraceSpans);

    const hashCodeToClassInLandscapeMap = getHashCodeToClassMap(structureData);

    const traceIdToLastClassMap = new Map<string, Class>();

    applicationTraces.forEach((trace, index) => {
      const spanList = sortedSpanLists[index];

      const lastClassHashCode = spanList[spanList.length - 1].methodHash;
      const lastClass = hashCodeToClassInLandscapeMap.get(lastClassHashCode)!;

      traceIdToLastClassMap.set(trace.traceId, lastClass);
    });

    return traceIdToLastClassMap;
  })();

  const sortTracesByFirstClassName = (traces: Trace[], ascending = true) => {
    traces.sort((a, b) => {
      const firstClassA = firstClasses.get(a.traceId)!;
      const firstClassB = firstClasses.get(b.traceId)!;

      if (firstClassA.name > firstClassB.name) {
        return 1;
      }
      if (firstClassB.name > firstClassA.name) {
        return -1;
      }
      return 0;
    });

    if (!ascending) {
      traces.reverse();
    }
  };

  const sortTracesByLastClassName = (traces: Trace[], ascending = true) => {
    traces.sort((a, b) => {
      const lastClassA = lastClasses.get(a.traceId)!;
      const lastClassB = lastClasses.get(b.traceId)!;

      if (lastClassA.name > lastClassB.name) {
        return 1;
      }
      if (lastClassB.name > lastClassA.name) {
        return -1;
      }
      return 0;
    });

    if (!ascending) {
      traces.reverse();
    }
  };

  const filterAndSortTraces = () => {
    if (selectedTrace) {
      return [selectedTrace];
    }

    const filteredTraces: Trace[] = [];
    const filter = filterTerm;

    applicationTraces.forEach((trace) => {
      if (filter === '' || trace.traceId.toLowerCase().includes(filter)) {
        filteredTraces.push(trace);
        return;
      }

      const firstClass = firstClasses.get(trace.traceId);
      const lastClass = lastClasses.get(trace.traceId);

      if (
        (firstClass && firstClass.name.toLowerCase().includes(filter)) ||
        (lastClass && lastClass.name.toLowerCase().includes(filter))
      ) {
        filteredTraces.push(trace);
      }
    });

    switch (sortBy) {
      case 'traceId':
        sortTracesById(filteredTraces, isSortedAsc);
        break;
      case 'firstClassName':
        sortTracesByFirstClassName(filteredTraces, isSortedAsc);
        break;
      case 'lastClassName':
        sortTracesByLastClassName(filteredTraces, isSortedAsc);
        break;
      case 'steps':
        sortTracesByRequestCount(filteredTraces, isSortedAsc);
        break;
      case 'traceDuration':
        sortTracesByDuration(filteredTraces, isSortedAsc);
        break;
    }

    return filteredTraces;
  };

  const filter = (event: React.FormEvent<HTMLInputElement>) => {
    // Case insensitive string filter
    setFilterTerm(event.currentTarget.value.toLowerCase());
  };

  const toggleTraceTimeUnit = () => {
    if (traceTimeUnit === 'ns') {
      setTraceTimeUnit('ms');
    } else if (traceTimeUnit === 'ms') {
      setTraceTimeUnit('s');
    } else if (traceTimeUnit === 's') {
      setTraceTimeUnit('ns');
    }
  };

  const sortByProperty = (property: any) => {
    // Determine order for sorting
    if (sortBy === property) {
      // Toggle sorting order
      setIsSortedAsc((prev) => !prev);
    } else {
      // Sort in ascending order by default
      setIsSortedAsc(true);
    }

    setSortBy(property);
  };

  const traces = filterAndSortTraces();
  const traceDurations = traces.map(calculateDuration);
  const requestCounts = traces.map(getTraceRequestCount);

  return (
    <>
      <div className="mt-2 mb-1 d-flex justify-content-end">
        <div>
          <input
            id="filterInput"
            className="form-control input-lg"
            placeholder="Filter traces"
            autoFocus={true}
            onInput={filter}
          />
        </div>
      </div>

      <div style={{ maxHeight: '500px', overflow: 'auto', width: '100%' }}>
        <table className="table table-hover">
          <thead>
            <tr style={{ cursor: 'pointer' }}>
              <th onClick={() => sortByProperty('traceId')} scope="col">
                Trace
              </th>
              <th onClick={() => sortByProperty('steps')} scope="col">
                Requests
              </th>
              <th onClick={() => sortByProperty('traceDuration')} scope="col">
                Duration in
                <Button
                  className="th-btn"
                  variant="outline-secondary"
                  onClick={toggleTraceTimeUnit}
                >
                  {traceTimeUnit}
                </Button>
              </th>
            </tr>
          </thead>
          <tbody>
            {traces.map((trace, index) => (
              <tr
                key={index}
                style={{
                  cursor: 'pointer',
                  backgroundColor: selectedTrace ? '#cc8a8a' : undefined,
                }}
                onClick={() => selectTrace(trace)}
              >
                <th title={trace.traceId}>
                  {trace.traceId.substring(0, 27) + '...'}
                </th>
                <td>{requestCounts[index]}</td>
                <td>{formatNumber(traceDurations[index], traceTimeUnit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
