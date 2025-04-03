import React, { useState, useEffect } from 'react';
import {
  Span,
  Trace,
} from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/dynamic-data';
import {
  Application,
  Class,
  StructureLandscapeData,
} from 'explorviz-frontend/src/utils/landscape-schemes/structure-data';
import { getHashCodeToClassMap } from 'explorviz-frontend/src/utils/landscape-structure-helpers';
import {
  calculateDuration,
  getSortedTraceSpans,
  getTraceRequestCount,
  sortTracesByDuration,
  sortTracesById,
  sortTracesByRequestCount,
} from 'explorviz-frontend/src/utils/trace-helpers';
import { Button } from 'react-bootstrap'; // Assuming you're using react-bootstrap for buttons
import { TimeUnit } from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/trace-replayer/trace-selection-and-replayer';

interface TraceSelectionProps {
  moveCameraTo: (emberModel: Class | Span) => void;
  selectTrace: (trace: Trace) => void;
  structureData: StructureLandscapeData;
  application: Application;
  selectedTrace: Trace;
  applicationTraces: Trace[];
  toggleUnit: () => void;
  unit: TimeUnit;
}

const TraceSelection: React.FC<TraceSelectionProps> = ({
  selectTrace,
  structureData,
  selectedTrace,
  applicationTraces,
  toggleUnit,
  unit,
}) => {
  const [sortBy, setSortBy] = useState<string>('traceId');
  const [isSortedAsc, setIsSortedAsc] = useState<boolean>(true);
  const [filterTerm, setFilterTerm] = useState<string>('');

  const firstClasses = getFirstClasses(applicationTraces, structureData);
  const lastClasses = getLastClasses(applicationTraces, structureData);

  const traces = filterAndSortTraces(
    applicationTraces,
    selectedTrace,
    filterTerm,
    sortBy,
    isSortedAsc,
    firstClasses,
    lastClasses
  );
  const traceDurations = traces.map((trace) => calculateDuration(trace));
  const requestCounts = traces.map((trace) => getTraceRequestCount(trace));

  function getFirstClasses(
    applicationTraces: Trace[],
    structureData: StructureLandscapeData
  ) {
    const sortedSpanLists = applicationTraces.map((trace) =>
      getSortedTraceSpans(trace)
    );
    const hashCodeToClassInLandscapeMap = getHashCodeToClassMap(structureData);
    const traceIdToFirstClassMap = new Map<string, Class>();

    applicationTraces.forEach((trace, index) => {
      const spanList = sortedSpanLists[index];
      const firstClassHashCode = spanList[0].methodHash;
      const firstClass = hashCodeToClassInLandscapeMap.get(firstClassHashCode)!;
      traceIdToFirstClassMap.set(trace.traceId, firstClass);
    });

    return traceIdToFirstClassMap;
  }

  function getLastClasses(
    applicationTraces: Trace[],
    structureData: StructureLandscapeData
  ) {
    const sortedSpanLists = applicationTraces.map((trace) =>
      getSortedTraceSpans(trace)
    );
    const hashCodeToClassInLandscapeMap = getHashCodeToClassMap(structureData);
    const traceIdToLastClassMap = new Map<string, Class>();

    applicationTraces.forEach((trace, index) => {
      const spanList = sortedSpanLists[index];
      const lastClassHashCode = spanList[spanList.length - 1].methodHash;
      const lastClass = hashCodeToClassInLandscapeMap.get(lastClassHashCode)!;
      traceIdToLastClassMap.set(trace.traceId, lastClass);
    });

    return traceIdToLastClassMap;
  }

  function filterAndSortTraces(
    applicationTraces: Trace[],
    selectedTrace: Trace,
    filterTerm: string,
    sortBy: string,
    isSortedAsc: boolean,
    firstClasses: Map<string, Class>,
    lastClasses: Map<string, Class>
  ) {
    if (selectedTrace) {
      return [selectedTrace];
    }

    const filteredTraces: Trace[] = applicationTraces.filter((trace) => {
      if (
        filterTerm === '' ||
        trace.traceId.toLowerCase().includes(filterTerm)
      ) {
        return true;
      }

      const firstClass = firstClasses.get(trace.traceId);
      const lastClass = lastClasses.get(trace.traceId);

      return (
        (firstClass && firstClass.name.toLowerCase().includes(filterTerm)) ||
        (lastClass && lastClass.name.toLowerCase().includes(filterTerm))
      );
    });

    switch (sortBy) {
      case 'traceId':
        sortTracesById(filteredTraces, isSortedAsc);
        break;
      case 'firstClassName':
        sortTracesByFirstClassName(filteredTraces, isSortedAsc, firstClasses);
        break;
      case 'lastClassName':
        sortTracesByLastClassName(filteredTraces, isSortedAsc, lastClasses);
        break;
      case 'steps':
        sortTracesByRequestCount(filteredTraces, isSortedAsc);
        break;
      case 'traceDuration':
        sortTracesByDuration(filteredTraces, isSortedAsc);
        break;
    }

    return filteredTraces;
  }

  function sortTracesByFirstClassName(traces: Trace[], ascending: boolean) {
    traces.sort((a, b) => {
      const firstClassA = firstClasses.get(a.traceId)!;
      const firstClassB = firstClasses.get(b.traceId)!;

      return firstClassA.name.localeCompare(firstClassB.name);
    });

    if (!ascending) {
      traces.reverse();
    }
  }

  function sortTracesByLastClassName(traces: Trace[], ascending: boolean) {
    traces.sort((a, b) => {
      const lastClassA = lastClasses.get(a.traceId)!;
      const lastClassB = lastClasses.get(b.traceId)!;

      return lastClassA.name.localeCompare(lastClassB.name);
    });

    if (!ascending) {
      traces.reverse();
    }
  }

  const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilterTerm(event.target.value.toLowerCase());
  };

  const handleSortByProperty = (property: string) => {
    if (sortBy === property) {
      setIsSortedAsc(!isSortedAsc);
    } else {
      setIsSortedAsc(true);
    }
    setSortBy(property);
  };

  return (
    <div>
      <div className="mt-2 mb-1 d-flex justify-content-end">
        <div>
          <input
            id="filterInput"
            className="form-control input-lg"
            placeholder="Filter traces"
            onInput={handleFilterChange}
          />
        </div>
      </div>

      <div style={{ maxHeight: '500px', overflow: 'auto', width: '100%' }}>
        <table className="table table-hover">
          <thead>
            <tr style={{ cursor: 'pointer' }}>
              <th onClick={() => handleSortByProperty('traceId')} scope="col">
                Trace
              </th>
              <th onClick={() => handleSortByProperty('steps')} scope="col">
                Requests
              </th>
              <th
                onClick={() => handleSortByProperty('traceDuration')}
                scope="col"
              >
                <Button onClick={toggleUnit} className="th-btn" outline>
                  {unit}
                </Button>
              </th>
            </tr>
          </thead>
          <tbody>
            {traces.map((trace, index) => (
              <tr
                key={trace.traceId}
                style={{ cursor: 'pointer' }}
                bgcolor={trace === selectedTrace ? '#cc8a8a' : undefined}
                onClick={() => selectTrace(trace)}
              >
                <th title={trace.traceId}>{trace.traceId.substring(0, 30)}</th>
                <td>{requestCounts[index]}</td>
                <td>
                  {traceDurations[index].toFixed(2)} {unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TraceSelection;
