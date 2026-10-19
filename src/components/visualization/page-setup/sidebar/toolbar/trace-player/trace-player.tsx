import { SortAscIcon, SortDescIcon } from '@primer/octicons-react';
import useTraceCatalogFetch from 'explorviz-frontend/src/hooks/fetch/useTraceCatalogFetch';
import { useCommitTreeStateStore } from 'explorviz-frontend/src/stores/commit-tree-state';
import { useTimestampStore } from 'explorviz-frontend/src/stores/timestamp';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import { CROSS_COMMIT_IDENTIFIER } from 'explorviz-frontend/src/utils/evolution-schemes/evolution-data';
import { TraceOverview } from 'explorviz-frontend/src/utils/landscape-schemes/telemetry/traces';
import { useEffect, useState } from 'react';
import { Spinner, Table } from 'react-bootstrap';
import TraceDetails from './trace-details';

export default function TracePlayer() {
  const [traces, setTraces] = useState<TraceOverview[] | null>(null);
  const [selectedTrace, setSelectedTrace] = useState<TraceOverview | null>(
    null
  );

  const commitToSelectedTimestamps = useTimestampStore(
    (state) => state.commitToSelectedTimestamps
  );
  const selectedRepository = useCommitTreeStateStore(
    (state) => state._currentSelectedRepositoryName
  );
  const repositoryToSelectedCommits = useCommitTreeStateStore(
    (state) => state._selectedCommits
  );
  const showErrorToastMessage = useToastHandlerStore(
    (state) => state.showErrorToastMessage
  );

  const selectedCommits = repositoryToSelectedCommits.get(selectedRepository);

  const selectedTimestamps = Array.from(
    commitToSelectedTimestamps
      .get(selectedCommits?.[0].commitId ?? CROSS_COMMIT_IDENTIFIER)
      ?.values() ?? []
  );

  let [from, to] = selectedTimestamps.reduce(
    ([min, max], ts) => [
      min <= ts.fromUnixNano ? min : ts.fromUnixNano,
      max >= ts.toUnixNano ? max : ts.toUnixNano,
    ],
    [selectedTimestamps[0]?.fromUnixNano, selectedTimestamps[0]?.toUnixNano]
  );

  const fetchTraceCatalog = useTraceCatalogFetch();

  useEffect(() => {
    const fetchTraces = async () => {
      try {
        const traceOverview = await fetchTraceCatalog({ from: from, to: to });
        setTraces(traceOverview);
      } catch (error) {
        console.error(error);
        showErrorToastMessage('Failed to fetch traces for timestamp');
        setTraces([]);
      }
      setSelectedTrace(null);
    };

    fetchTraces();
  }, [from, to, fetchTraceCatalog, showErrorToastMessage]);

  if (selectedCommits && selectedCommits.length > 1) {
    return <>Multiple commits are selected, no traces available</>;
  }

  if (selectedTimestamps.length === 0) {
    return <>Select a timestamp first</>;
  }

  const handleTraceClick = (trace: TraceOverview) => {
    setSelectedTrace(trace);
  };

  return (
    <>
      <h5 className="text-center">Trace Player</h5>
      <p className="text-center text-muted">
        Follow traces for the current timestamp step-by-step.
      </p>

      {traces === null ? (
        <div className="inline">
          <Spinner size="sm" /> Loading traces for timestamp &hellip;
        </div>
      ) : selectedTrace ? (
        <TraceDetails
          traceOverview={selectedTrace}
          onBackClick={() => setSelectedTrace(null)}
        />
      ) : (
        <TraceSelection traces={traces} onTraceClick={handleTraceClick} />
      )}
    </>
  );
}

type TraceSorting = 'name' | 'service' | 'spancount';

interface TraceSelectionProps {
  traces: TraceOverview[];
  onTraceClick(trace: TraceOverview): void;
}

function TraceSelection({ traces, onTraceClick }: TraceSelectionProps) {
  const [sorting, setSorting] = useState<TraceSorting>('spancount');
  const [sortAscending, setSortAscending] = useState<boolean>(false);

  if (traces.length === 0) {
    return <span>No traces available for current timestamp</span>;
  }

  const sortedTraces = traces.sort((a, b) => {
    let res: number;
    switch (sorting) {
      case 'name':
        res = a.name.localeCompare(b.name);
        break;
      case 'service':
        res = a.entrypointService.localeCompare(b.entrypointService);
        break;
      case 'spancount':
        res = a.spanCount - b.spanCount;
    }
    return sortAscending ? res : -res;
  });

  const changeSorting = (newSorting: TraceSorting) => {
    if (sorting === newSorting) {
      setSortAscending((state) => !state);
      return;
    }
    setSorting(newSorting);
    setSortAscending(true);
  };

  const sortIcon = sortAscending ? <SortAscIcon /> : <SortDescIcon />;

  return (
    <div className="overflow-x-auto">
      <Table>
        <thead>
          <tr>
            <th
              role="button"
              onClick={() => changeSorting('service')}
              className="clickable user-select-none"
            >
              Service
              <div
                className={`inline ms-2 ${sorting === 'service' ? '' : 'invisible'}`}
              >
                {sortIcon}
              </div>
            </th>
            <th
              role="button"
              onClick={() => changeSorting('name')}
              className="clickable user-select-none"
            >
              Name
              <div
                className={`inline ms-2 ${sorting === 'name' ? '' : 'invisible'}`}
              >
                {sortIcon}
              </div>
            </th>
            <th
              role="button"
              onClick={() => changeSorting('spancount')}
              className="clickable user-select-none"
            >
              Spans
              <div
                className={`inline ms-2 ${sorting === 'spancount' ? '' : 'invisible'}`}
              >
                {sortIcon}
              </div>
            </th>
          </tr>
        </thead>

        <tbody>
          {sortedTraces.map((trace) => (
            <tr
              key={trace.traceId}
              role="button"
              onClick={() => onTraceClick(trace)}
              className="clickable user-select-none"
            >
              <td>{trace.entrypointService}</td>
              <td>{trace.name}</td>
              <td>{trace.spanCount}</td>
            </tr>
          ))}
        </tbody>
      </Table>

      <style>
        {`
          .clickable {
            cursor: pointer;
          }

          .clickable:hover {
            background: var(--bs-gray-100);
          }

          .clickable:active {
            background: var(--bs-gray-200);
          }

          .clickable td {
            background: none;
          }
        `}
      </style>
    </div>
  );
}
