import { SearchIcon } from '@primer/octicons-react';
import SpanKindBadge from 'explorviz-frontend/src/components/badges/span-kind-badge';
import EntitySelect from 'explorviz-frontend/src/components/entity-select';
import HelpTooltip from 'explorviz-frontend/src/components/help-tooltip';
import SpanDetailsCard from 'explorviz-frontend/src/components/visualization/rendering/popups/city-popups/span-details-card';
import useSpanFetch, {
  SpanSearchParams,
} from 'explorviz-frontend/src/hooks/fetch/useSpanFetch';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import { Span } from 'explorviz-frontend/src/utils/landscape-schemes/telemetry/traces';
import React, { use, useCallback, useEffect, useState } from 'react';
import { Accordion, Button, Form, Spinner } from 'react-bootstrap';
import { List, RowComponentProps, useDynamicRowHeight } from 'react-window';
import { useInfiniteLoader } from 'react-window-infinite-loader';
import { ToolbarContext } from '../toolbar-context';

function unixNanosecondsToDatetimeLocal(ns: bigint | undefined) {
  if (ns === undefined) {
    return '';
  }

  const date = new Date(Number(ns / 1_000_000n));
  const year = date.getFullYear().toString();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const millis = date.getMilliseconds().toString().padStart(3, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${millis}`;
}

function datetimeLocalToUnixNano(value: string): bigint {
  return BigInt(new Date(value.toString()).getTime()) * 1_000_000n;
}

const defaultSearchParams: SpanSearchParams = {
  includeAttributeValues: true,
};

const PAGINATION_SIZE = 50;

export default function SpanSearch() {
  const cities = useModelStore((state) => state.cities);
  const showErrorToastMessage = useToastHandlerStore(
    (state) => state.showErrorToastMessage
  );

  const toolbarContext = use(ToolbarContext);
  const searchRequest = toolbarContext.telemetrySearchState.spanSearchRequest;

  const [spans, setSpans] = useState<Span[] | null>(null);
  const [searchParams, setSearchParams] =
    useState<SpanSearchParams>(defaultSearchParams);
  const [lastSubmittedParams, setLastSubmittedParams] =
    useState<SpanSearchParams | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [allItemsLoaded, setAllItemsLoaded] = useState<boolean>(false);
  const [prevSearchRequest, setPrevSearchRequest] =
    useState<SpanSearchParams | null>(null);

  const fetchSpans = useSpanFetch();

  const updateSearchParams = (newParams: Partial<SpanSearchParams>) =>
    setSearchParams((state) => ({ ...state, ...newParams }));

  const loadSpans = useCallback(
    async (params: SpanSearchParams) => {
      try {
        const receivedSpans = await fetchSpans({
          ...params,
          limit: PAGINATION_SIZE,
        });

        setSpans((state) =>
          state === null ? receivedSpans : [...state, ...receivedSpans]
        );
        setIsLoading(false);
        if (receivedSpans.length < PAGINATION_SIZE) {
          setAllItemsLoaded(true);
        }
      } catch (error) {
        setIsLoading(false);
        setAllItemsLoaded(true);
        showErrorToastMessage(
          `Failed to retrieve spans: ${error instanceof Error ? error.message : error}`
        );
      }
    },
    [fetchSpans, showErrorToastMessage]
  );

  const onRowsRendered = useInfiniteLoader({
    rowCount: (spans?.length ?? 0) + (allItemsLoaded ? 0 : 1),
    isRowLoaded: (index) => index < (spans?.length ?? 0),
    loadMoreRows: async () => {
      if (isLoading || allItemsLoaded || !lastSubmittedParams || !spans) {
        return;
      }

      setIsLoading(true);

      const lastSeenSpan = spans[spans.length - 1];
      const params = { ...lastSubmittedParams };
      params.cursor = {
        cursorId: lastSeenSpan.spanId,
        cursorTimestamp: lastSeenSpan.startUnixNano,
        cursorDuration: lastSeenSpan.endUnixNano - lastSeenSpan.startUnixNano,
      };
      return loadSpans(params);
    },
  });

  const rowHeight = useDynamicRowHeight({
    defaultRowHeight: 50,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSpans(null);
    setIsLoading(true);
    setAllItemsLoaded(false);
    loadSpans(searchParams);
    setSearchParams(searchParams);
    setLastSubmittedParams(searchParams);
  };

  if (searchRequest !== prevSearchRequest) {
    if (searchRequest) {
      const params = { ...defaultSearchParams, ...searchRequest };
      setSearchParams(params);
      setLastSubmittedParams(params);
      setSpans(null);
      setIsLoading(true);
      setAllItemsLoaded(false);
    }
    setPrevSearchRequest(searchRequest);
  }

  useEffect(
    function handleExternalSearchRequest() {
      if (!searchRequest) {
        return;
      }

      const load = async () => {
        loadSpans({ ...defaultSearchParams, ...searchRequest });
      };

      load();
    },
    [loadSpans, searchRequest]
  );

  return (
    <>
      <fieldset disabled={isLoading}>
        <Form className="mb-3" onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>
              Text Search{' '}
              <HelpTooltip
                title="Only match spans whose name contains all of the provided tokens. Search is case-insensitive."
                placement="top"
              />
            </Form.Label>
            <Form.Control
              name="name"
              value={searchParams.searchString ?? ''}
              onChange={(e) =>
                updateSearchParams({ searchString: e.target.value })
              }
              placeholder='e.g. "GET", "resolveBoolean", &hellip;'
              className="mb-2"
            />
            <Form.Check
              name="includeAttributeKeys"
              type="checkbox"
              label={
                <>
                  Include attribute keys{' '}
                  <HelpTooltip
                    title="Also search the span and resource attributes' keys for the provided search tokens. This can be useful to ensure a specific attribute is present."
                    placement="top"
                  />
                </>
              }
              checked={searchParams.includeAttributeKeys ?? false}
              onChange={(e) =>
                updateSearchParams({ includeAttributeKeys: e.target.checked })
              }
              inline
            />
            <Form.Check
              name="includeAttributeValues"
              type="checkbox"
              label={
                <>
                  Include attribute values{' '}
                  <HelpTooltip
                    title="Also search the span and resource attributes' values for the provided search tokens."
                    placement="top"
                  />
                </>
              }
              checked={searchParams.includeAttributeValues ?? false}
              onChange={(e) =>
                updateSearchParams({ includeAttributeValues: e.target.checked })
              }
              inline
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>
              Span Kind{' '}
              <HelpTooltip
                title="Only match spans of a certain kind. The kind describes the role of a span in a request, such as whether it represents an incoming request or an outgoing call being made."
                placement="top"
              />
            </Form.Label>

            <div style={{ minHeight: '2.4em' }}>
              <Form.Select
                name="kind"
                value={searchParams.kind ?? ''}
                onChange={(e) => updateSearchParams({ kind: e.target.value })}
              >
                <option value="">Any</option>
                <option disabled>────────</option>
                <option>Client</option>
                <option>Server</option>
                <option>Internal</option>
                <option>Producer</option>
                <option>Consumer</option>
              </Form.Select>
            </div>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>
              Trace ID{' '}
              <HelpTooltip
                title="Only match spans that belong to a specific trace."
                placement="top"
              />
            </Form.Label>
            <Form.Control
              name="traceId"
              value={searchParams.traceId ?? ''}
              onChange={(e) => updateSearchParams({ traceId: e.target.value })}
              placeholder="e.g. 5b8aa5a2d2c872e8321cf37308d69df2"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>
              Service{' '}
              <HelpTooltip
                title="Only match spans belonging to a specific application or service."
                placement="top"
              />
            </Form.Label>
            <Form.Select
              name="serviceName"
              value={searchParams.serviceName ?? ''}
              onChange={(e) =>
                updateSearchParams({
                  serviceName:
                    e.target.value != '' ? e.target.value : undefined,
                })
              }
            >
              <option value="">Any</option>
              {Object.keys(cities).length > 0 && (
                <>
                  <option disabled>────────</option>
                  {Object.values(cities).map((city) => (
                    <option key={city.id} value={city.name}>
                      {city.name}
                    </option>
                  ))}
                </>
              )}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>
              Entity{' '}
              <HelpTooltip
                title="Only match spans belonging to a particular visualization entity. Note that entities which are known to have no associated telemetry data are hidden."
                placement="top"
              />
            </Form.Label>
            <EntitySelect
              name={'telemetryKey'}
              excludeCities
              excludeDistricts
              value={searchParams.telemetryKey ?? null}
              getFormValue={(e) => e.telemetryKey}
              onChange={(e) =>
                updateSearchParams({
                  telemetryKey: e?.telemetryKey ?? undefined,
                })
              }
            />
          </Form.Group>

          <div className="row">
            <Form.Group className="mb-3 col-md-6">
              <Form.Label>
                Date start{' '}
                <HelpTooltip
                  title="Only match spans starting at or after the given point in time. Should be specified in your local timezone. Leave empty for no lower bound on the starting timestamp."
                  placement="top"
                />
              </Form.Label>
              <Form.Control
                type="datetime-local"
                name="from"
                step={1}
                value={unixNanosecondsToDatetimeLocal(searchParams.from)}
                onChange={(e) =>
                  updateSearchParams({
                    from:
                      e.target.value !== ''
                        ? datetimeLocalToUnixNano(e.target.value)
                        : undefined,
                  })
                }
              />
            </Form.Group>

            <Form.Group className="mb-3 col-md-6">
              <Form.Label>
                Date end{' '}
                <HelpTooltip
                  title="Only match spans starting before the given point in time. Should be specified in your local timezone. Leave empty for no upper bound on the starting timestamp."
                  placement="top"
                />
              </Form.Label>
              <Form.Control
                type="datetime-local"
                name="to"
                step={1}
                value={unixNanosecondsToDatetimeLocal(searchParams.to)}
                onChange={(e) =>
                  updateSearchParams({
                    to:
                      e.target.value !== ''
                        ? datetimeLocalToUnixNano(e.target.value)
                        : undefined,
                  })
                }
              />
            </Form.Group>
          </div>

          <Form.Group className="mb-3">
            <Form.Label>
              Sort by{' '}
              <HelpTooltip
                title="Determines the order in which matching spans are retrieved and displayed."
                placement="top"
              />
            </Form.Label>
            <div className="mb-1">
              <Form.Check
                inline
                type="radio"
                name="sortBy"
                value="newest"
                label="Newest"
                checked={searchParams.sortBy === 'newest'}
                onChange={(e) => {
                  if (e.target.checked)
                    updateSearchParams({ sortBy: 'newest' });
                }}
              />
              <Form.Check
                inline
                type="radio"
                name="sortBy"
                value="oldest"
                label="Oldest"
                checked={searchParams.sortBy === 'oldest'}
                onChange={(e) => {
                  if (e.target.checked)
                    updateSearchParams({ sortBy: 'oldest' });
                }}
              />
              <Form.Check
                inline
                type="radio"
                name="sortBy"
                value="duration"
                label="Duration"
                checked={searchParams.sortBy === 'duration'}
                onChange={(e) => {
                  if (e.target.checked)
                    updateSearchParams({ sortBy: 'duration' });
                }}
              />
            </div>
          </Form.Group>

          <Button type="submit" className="d-flex align-items-center gap-2">
            {isLoading ? (
              <Spinner animation="border" size="sm" />
            ) : (
              <SearchIcon />
            )}
            <div>Search Spans</div>
          </Button>
        </Form>
      </fieldset>

      {spans && (
        <section className="border rounded p-3 mb-3">
          {spans.length > 0 ? (
            <>
              <Accordion alwaysOpen={true} className="pe-1">
                <List
                  rowComponent={SpanItem}
                  rowCount={spans.length}
                  rowHeight={rowHeight}
                  rowProps={{ spans: spans }}
                  rowKey={(index, { spans }) => spans[index].spanId}
                  onRowsRendered={onRowsRendered}
                  style={{
                    minHeight: '80vh',
                    maxHeight: '80vh',
                  }}
                />
              </Accordion>
            </>
          ) : (
            <span>No spans found for the current search criteria.</span>
          )}

          {isLoading && <Spinner variant="primary" />}
        </section>
      )}
    </>
  );
}

function SpanItem({
  index,
  spans,
  style,
}: RowComponentProps<{
  spans: Span[];
}>) {
  const span = spans[index];

  return (
    <div style={style}>
      <Accordion.Item
        className="mb-2 me-2 border rounded-0"
        eventKey={span.spanId}
      >
        <Accordion.Button
          className="border-0 rounded-0"
          style={{ padding: '8px 12px' }}
        >
          <small>
            <SpanKindBadge kind={span.kind} className="me-2" />
          </small>
          <samp className="text-truncate">
            <small>
              <code>{`${unixNanosecondsToDatetimeLocal(span.startUnixNano)}`}</code>{' '}
              {`${span.name}`}
            </small>
          </samp>
        </Accordion.Button>
        <Accordion.Body>
          <SpanDetailsCard span={span} />
        </Accordion.Body>
      </Accordion.Item>
    </div>
  );
}
