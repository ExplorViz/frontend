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
import {
  Building,
  City,
  District,
} from 'explorviz-frontend/src/utils/landscape-schemes/flat-landscape';
import { Span } from 'explorviz-frontend/src/utils/landscape-schemes/telemetry/traces';
import React, { useRef, useState } from 'react';
import { Accordion, Button, Form, Spinner } from 'react-bootstrap';
import { SelectInstance } from 'react-select';
import { List, RowComponentProps, useDynamicRowHeight } from 'react-window';
import { useInfiniteLoader } from 'react-window-infinite-loader';

function formatUnixNanoseconds(ns: bigint) {
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

const PAGINATION_SIZE = 50;

export default function SpanSearch() {
  const cities = useModelStore((state) => state.cities);
  const showErrorToastMessage = useToastHandlerStore(
    (state) => state.showErrorToastMessage
  );

  const [spans, setSpans] = useState<Span[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [allItemsLoaded, setAllItemsLoaded] = useState<boolean>(false);
  const [lastSubmittedFormData, setLastSubmittedFormData] =
    useState<FormData | null>(null);

  const formRef = useRef<HTMLFormElement | null>(null);
  const traceIdRef = useRef<HTMLInputElement | null>(null);
  const entitySelectRef = useRef<SelectInstance<
    City | District | Building
  > | null>(null);

  const fetchSpans = useSpanFetch();

  const getSearchParamsFromFormData = (
    formData: FormData,
    isNewSearch: boolean
  ) => {
    const searchParams: SpanSearchParams = {
      searchString: formData.get('name')?.toString() || undefined,
      includeAttributeKeys: formData.has('includeAttributeKeys'),
      includeAttributeValues: formData.has('includeAttributeValues'),
      kind: formData.get('kind')?.toString() || undefined,
      traceId: formData.get('traceId')?.toString() || undefined,
      serviceName: formData.get('serviceName')?.toString() || undefined,
      telemetryKey: formData.get('telemetryKey')?.toString() || undefined,
      limit: PAGINATION_SIZE,
    };

    const sortBy = formData.get('sortBy')?.toString();
    if (sortBy === 'newest' || sortBy === 'oldest' || sortBy === 'duration') {
      searchParams.sortBy = sortBy;
    }

    const from = formData.get('from');
    if (from) {
      // Convert string from datetime_local inputs to Unix nanosecond epoch
      searchParams.from =
        BigInt(new Date(from.toString()).getTime()) * 1_000_000n;
    }

    const to = formData.get('to');
    if (to) {
      // Convert string from datetime_local inputs to Unix nanosecond epoch
      searchParams.to = BigInt(new Date(to.toString()).getTime()) * 1_000_000n;
    }

    // If this is a successive fetch for a previous search, specify a cursor
    if (!isNewSearch && spans && spans.length > 0) {
      const lastSeenSpan = spans[spans.length - 1];
      searchParams.cursor = {
        cursorId: lastSeenSpan.spanId,
        cursorTimestamp: lastSeenSpan.startUnixNano,
        cursorDuration: lastSeenSpan.endUnixNano - lastSeenSpan.startUnixNano,
      };
    }

    return searchParams;
  };

  const loadSpans = async (searchParams: SpanSearchParams) => {
    try {
      const receivedSpans = await fetchSpans(searchParams);

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
  };

  const onRowsRendered = useInfiniteLoader({
    rowCount: (spans?.length ?? 0) + (allItemsLoaded ? 0 : 1),
    isRowLoaded: (index) => index < (spans?.length ?? 0),
    loadMoreRows: async () => {
      if (isLoading || allItemsLoaded || !lastSubmittedFormData) {
        return;
      }
      setIsLoading(true);
      const searchParams = getSearchParamsFromFormData(
        lastSubmittedFormData,
        false
      );
      return loadSpans(searchParams);
    },
  });

  const rowHeight = useDynamicRowHeight({
    defaultRowHeight: 50,
  });

  const startNewSearch = (formData: FormData) => {
    const searchParams = getSearchParamsFromFormData(formData, true);
    setLastSubmittedFormData(formData);
    setSpans(null);
    setIsLoading(true);
    setAllItemsLoaded(false);
    loadSpans(searchParams);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formRef.current) {
      showErrorToastMessage('Failed to access form element');
      return;
    }

    startNewSearch(new FormData(formRef.current));
  };

  const handleTraceIdClick = (traceId: string) => {
    if (!formRef.current) {
      showErrorToastMessage('Failed to access form element');
      return;
    }

    if (!traceIdRef.current) {
      showErrorToastMessage('Failed to access trace ID form input');
      return;
    }

    formRef.current.reset();
    traceIdRef.current.value = traceId;
    entitySelectRef.current?.clearValue();

    const formData = new FormData(formRef.current);
    formData.set('traceId', traceId);
    startNewSearch(formData);
  };

  const handleSearchEntityClick = (entity: Building) => {
    if (!formRef.current) {
      showErrorToastMessage('Failed to access form element');
      return;
    }

    if (!entitySelectRef.current) {
      showErrorToastMessage('Failed to access entity select form element');
      return;
    }

    formRef.current.reset();
    entitySelectRef.current.selectOption(entity);

    const formData = new FormData(formRef.current);
    formData.set('telemetryKey', entity.telemetryKey!);
    startNewSearch(formData);
  };

  return (
    <>
      <fieldset disabled={isLoading}>
        <Form className="mb-3" onSubmit={handleSubmit} ref={formRef}>
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
              inline
              defaultChecked
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
              <Form.Select name="kind">
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
              placeholder="e.g. 5b8aa5a2d2c872e8321cf37308d69df2"
              ref={traceIdRef}
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
            <Form.Select name="serviceName">
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
                title="Only match spans belonging to a particular visualization entity. Note that only those entities are shown for which any telemetry data exists."
                placement="top"
              />
            </Form.Label>
            <EntitySelect
              name={'telemetryKey'}
              excludeCities
              excludeDistricts
              getFormValue={(e) => e.telemetryKey}
              ref={entitySelectRef}
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
              <Form.Control type="datetime-local" name="from" step={1} />
            </Form.Group>

            <Form.Group className="mb-3 col-md-6">
              <Form.Label>
                Date end{' '}
                <HelpTooltip
                  title="Only match spans starting before the given point in time. Should be specified in your local timezone. Leave empty for no upper bound on the starting timestamp."
                  placement="top"
                />
              </Form.Label>
              <Form.Control type="datetime-local" name="to" step={1} />
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
                defaultChecked
              />
              <Form.Check
                inline
                type="radio"
                name="sortBy"
                value="oldest"
                label="Oldest"
              />
              <Form.Check
                inline
                type="radio"
                name="sortBy"
                value="duration"
                label="Duration"
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
                  rowProps={{
                    spans: spans,
                    onTraceIdClick: handleTraceIdClick,
                    onSearchEntityClick: handleSearchEntityClick,
                  }}
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
  onTraceIdClick,
  onSearchEntityClick,
}: RowComponentProps<{
  spans: Span[];
  onTraceIdClick?(traceId: string): void;
  onSearchEntityClick?(entity: Building): void;
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
              <code>{`${formatUnixNanoseconds(span.startUnixNano)}`}</code>{' '}
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
