import { TimeUnit } from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/trace-replayer/trace-selection-and-replayer';
import { formatNumber } from 'explorviz-frontend/src/utils/format-number';
import { Trace } from 'explorviz-frontend/src/utils/landscape-schemes/dynamic/dynamic-data';
import {
  Building,
  FlatLandscape,
  getFunctionIdToBuildingMap,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import {
  calculateDuration,
  getSortedTraceSpans,
  getTraceRequestCount,
  sortTracesByDuration,
  sortTracesById,
  sortTracesByRequestCount,
} from 'explorviz-frontend/src/utils/trace-helpers';
import React, { useState } from 'react';

interface TraceSelectionProps {
  selectTrace: (trace: Trace) => void;
  flatData: FlatLandscape;
  selectedTrace: Trace | null;
  applicationTraces: Trace[];
  toggleUnit: () => void;
  unit: TimeUnit;
}

const TraceSelection: React.FC<TraceSelectionProps> = ({
  selectTrace,
  flatData,
  selectedTrace,
  applicationTraces,
  toggleUnit,
  unit,
}) => {
  const [sortBy, setSortBy] = useState<string>('traceId');
  const [isSortedAsc, setIsSortedAsc] = useState<boolean>(true);
  const [filterTerm, setFilterTerm] = useState<string>('');

  const functionIdToBuildingMap = getFunctionIdToBuildingMap(flatData);
  const firstClasses = getFirstClasses(
    applicationTraces,
    functionIdToBuildingMap
  );
  const lastClasses = getLastClasses(
    applicationTraces,
    functionIdToBuildingMap
  );

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
    functionIdToBuildingMap: Map<string, Building>
  ) {
    const sortedSpanLists = applicationTraces.map((trace) =>
      getSortedTraceSpans(trace)
    );
    const traceIdToFirstClassMap = new Map<string, Building>();

    applicationTraces.forEach((trace, index) => {
      const spanList = sortedSpanLists[index];
      const firstClassHashCode = spanList[0].functionId;
      const firstClass = functionIdToBuildingMap.get(firstClassHashCode)!;
      traceIdToFirstClassMap.set(trace.traceId, firstClass);
    });

    return traceIdToFirstClassMap;
  }

  function getLastClasses(
    applicationTraces: Trace[],
    functionIdToBuildingMap: Map<string, Building>
  ) {
    const sortedSpanLists = applicationTraces.map((trace) =>
      getSortedTraceSpans(trace)
    );
    const traceIdToLastClassMap = new Map<string, Building>();

    applicationTraces.forEach((trace, index) => {
      const spanList = sortedSpanLists[index];
      const lastClassHashCode = spanList[spanList.length - 1].functionId;
      const lastClass = functionIdToBuildingMap.get(lastClassHashCode)!;
      traceIdToLastClassMap.set(trace.traceId, lastClass);
    });

    return traceIdToLastClassMap;
  }

  function filterAndSortTraces(
    applicationTraces: Trace[],
    selectedTrace: Trace | null,
    filterTerm: string,
    sortBy: string,
    isSortedAsc: boolean,
    firstClasses: Map<string, Building>,
    lastClasses: Map<string, Building>
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
            placeholder="Search traces..."
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
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleUnit();
                  }}
                  className="btn btn-link p-0 border-0 bg-transparent"
                  style={{ color: 'inherit', textDecoration: 'none' }}
                >
                  {unit}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {traces.map((trace, index) => (
              <tr
                key={trace.traceId}
                style={{
                  cursor: 'pointer',
                  backgroundColor:
                    trace === selectedTrace ? '#cc8a8a' : undefined,
                }}
                onClick={() => selectTrace(trace)}
              >
                <th title={trace.traceId}>{trace.traceId.substring(0, 30)}</th>
                <td>{requestCounts[index]}</td>
                <td>
                  {formatNumber(traceDurations[index], unit)} {unit}
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
