import { SearchIcon } from '@primer/octicons-react';
import AttributesTable from 'explorviz-frontend/src/components/attributes-table';
import DualRangeSlider from 'explorviz-frontend/src/components/dual-range-slider';
import EntitySelect from 'explorviz-frontend/src/components/entity-select';
import HelpTooltip from 'explorviz-frontend/src/components/help-tooltip';
import useLogFetch, {
  LogSearchParams,
} from 'explorviz-frontend/src/hooks/fetch/useLogFetch';
import useLogSeverityFetch from 'explorviz-frontend/src/hooks/fetch/useLogSeverityFetch';
import { useCameraControlsStore } from 'explorviz-frontend/src/stores/camera-controls-store';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import {
  datetimeLocalToUnixNano,
  unixNanosecondsToDatetimeLocal,
} from 'explorviz-frontend/src/utils/datetime/datetime-local-convert';
import { Log } from 'explorviz-frontend/src/utils/landscape-schemes/telemetry/logs';
import { pingByModelId } from 'explorviz-frontend/src/view-objects/3d/city/animated-ping-r3f';
import React, { use, useCallback, useEffect, useState } from 'react';
import { Accordion, Badge, Button, Card, Form, Spinner } from 'react-bootstrap';
import { List, RowComponentProps, useDynamicRowHeight } from 'react-window';
import { useInfiniteLoader } from 'react-window-infinite-loader';

function severityNumberToName(severityNumber: number) {
  const labels = [
    'unspecified',
    'trace',
    'debug',
    'info',
    'warn',
    'error',
    'fatal',
  ];

  return labels[Math.ceil(severityNumber / 4)] ?? 'invalid';
}

function severityNameToBsColor(severityName: string): string {
  const colors: Record<string, string> = {
    unspecified: 'secondary',
    trace: 'primary',
    debug: 'success',
    info: 'info',
    warn: 'warning',
    error: 'danger',
    fatal: 'danger',
  };

  return colors[severityName] ?? 'secondary';
}

const defaultSearchParams: LogSearchParams = {
  includeAttributeValues: true,
  sortBy: 'newest',
};

const PAGINATION_SIZE = 50;

export default function LogSearch() {
  const cities = useModelStore((state) => state.cities);
  const showErrorToastMessage = useToastHandlerStore(
    (state) => state.showErrorToastMessage
  );

  const [logs, setLogs] = useState<Log[] | null>(null);
  const [searchParams, setSearchParams] =
    useState<LogSearchParams>(defaultSearchParams);
  const [lastSubmittedParams, setLastSubmittedParams] =
    useState<LogSearchParams | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [allItemsLoaded, setAllItemsLoaded] = useState<boolean>(false);
  const [isSeverityAsNumber, setIsSeverityAsNumber] = useState<boolean>(true);
  const [severityTextValues, setSeverityTextValues] = useState<string[] | null>(
    null
  );

  const fetchLogs = useLogFetch();
  const fetchLogSeverities = useLogSeverityFetch();

  const updateSearchParams = (newParams: Partial<LogSearchParams>) =>
    setSearchParams((state) => ({ ...state, ...newParams }));

  const loadLogs = useCallback(
    async (params: LogSearchParams) => {
      try {
        const receivedLogs = await fetchLogs({
          ...params,
          limit: PAGINATION_SIZE,
        });

        setLogs((state) =>
          state === null ? receivedLogs : [...state, ...receivedLogs]
        );

        setIsLoading(false);
        if (receivedLogs.length < PAGINATION_SIZE) {
          setAllItemsLoaded(true);
        }
      } catch (error) {
        setIsLoading(false);
        setAllItemsLoaded(true);
        showErrorToastMessage(
          `Failed to retrieve logs: ${error instanceof Error ? error.message : error}`
        );
      }
    },
    [fetchLogs, showErrorToastMessage]
  );

  const onRowsRendered = useInfiniteLoader({
    rowCount: (logs?.length ?? 0) + (allItemsLoaded ? 0 : 1),
    isRowLoaded: (index) => index < (logs?.length ?? 0),
    loadMoreRows: async () => {
      if (isLoading || allItemsLoaded || !lastSubmittedParams || !logs) {
        return;
      }

      setIsLoading(true);

      const lastSeenLog = logs[logs.length - 1];
      const params = { ...lastSubmittedParams };
      params.cursor = {
        cursorId: lastSeenLog.id,
        cursorTimestamp: lastSeenLog.timeUnixNano,
        cursorSeverity: lastSeenLog.severity,
      };
      return loadLogs(params);
    },
  });

  const rowHeight = useDynamicRowHeight({
    defaultRowHeight: 50,
  });

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setLogs(null);
    setIsLoading(true);
    setAllItemsLoaded(false);
    loadLogs(searchParams);
    setLastSubmittedParams(searchParams);
  };

  const handleSeverityTextSelectFocus: React.FocusEventHandler = async () => {
    if (severityTextValues !== null && severityTextValues.length > 0) {
      return;
    }

    try {
      const receivedSeverities = await fetchLogSeverities();
      setSeverityTextValues(receivedSeverities);
    } catch (error) {
      setSeverityTextValues([]);
      showErrorToastMessage(
        `Failed to retrieve log severity levels: ${error instanceof Error ? error.message : error}`
      );
    }
  };

    }


  return (
    <>
      <fieldset disabled={isLoading}>
        <Form className="mb-3" onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>
              Message Body{' '}
              <HelpTooltip
                title="Only match logs where the message text contains all of the provided tokens. Search is case-insensitive."
                placement="top"
              />
            </Form.Label>
            <Form.Control
              name="messageBody"
              value={searchParams.messageBody ?? ''}
              onChange={(e) =>
                updateSearchParams({ messageBody: e.target.value })
              }
              placeholder='e.g. "successful", "network error", &hellip;'
              className="mb-2"
            />
            <Form.Check
              name="includeAttributeKeys"
              type="checkbox"
              label={
                <>
                  Include attribute keys{' '}
                  <HelpTooltip
                    title="Also search the log, scope, and resource attributes' keys for the provided search tokens. This can be useful to ensure a specific attribute is present."
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
                    title="Also search the log, scope, and resource attributes' values for the provided search tokens."
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
              Service{' '}
              <HelpTooltip
                title="Only match logs originating from a specific application or service."
                placement="top"
              />
            </Form.Label>
            <Form.Select
              name="serviceName"
              value={searchParams.serviceName ?? ''}
              onChange={(e) =>
                updateSearchParams({ serviceName: e.target.value })
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
                title="Only match logs produced by a particular visualization entity. Note that entities which are known to have no associated telemetry data are hidden."
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

          <Form.Group className="mb-3">
            <Form.Label>
              Severity{' '}
              <HelpTooltip
                title="Only match logs with a certain severity level. The severity can be specified as either a numeric value range in accordance with the OpenTelemetry Logs data model (0-24), or as a text string from the list of available severity strings."
                placement="top"
              />
            </Form.Label>
            <div className="mb-1">
              <Form.Check
                inline
                type="radio"
                label="Number Range"
                checked={isSeverityAsNumber}
                onChange={() => {
                  setIsSeverityAsNumber(true);
                  updateSearchParams({ severityText: undefined });
                }}
              />
              <Form.Check
                inline
                type="radio"
                label="Text"
                checked={!isSeverityAsNumber}
                onChange={() => {
                  setIsSeverityAsNumber(false);
                  updateSearchParams({
                    minSeverity: undefined,
                    maxSeverity: undefined,
                  });
                }}
              />
            </div>

            <div style={{ minHeight: '2.4em' }}>
              {isSeverityAsNumber ? (
                <DualRangeSlider
                  min={0}
                  max={24}
                  lowerFormName="minSeverity"
                  upperFormName="maxSeverity"
                  value={[searchParams.minSeverity, searchParams.maxSeverity]}
                  onChange={([min, max]) =>
                    updateSearchParams({ minSeverity: min, maxSeverity: max })
                  }
                  disabled={isLoading}
                  getTooltipText={(val) =>
                    `${val} (${severityNumberToName(val)})`
                  }
                />
              ) : (
                <Form.Select
                  name="severityText"
                  onFocus={handleSeverityTextSelectFocus}
                  value={searchParams.severityText ?? ''}
                  onChange={(e) =>
                    updateSearchParams({ severityText: e.target.value })
                  }
                >
                  <option value="">Any</option>
                  {severityTextValues && severityTextValues.length > 0 && (
                    <option disabled>────────</option>
                  )}
                  {severityTextValues ? (
                    severityTextValues.map((severity) => (
                      <option key={severity}>{severity}</option>
                    ))
                  ) : (
                    <option disabled>Loading &hellip;</option>
                  )}
                </Form.Select>
              )}
            </div>
          </Form.Group>

          <div className="row">
            <Form.Group className="mb-3 col-md-6">
              <Form.Label>
                Date start{' '}
                <HelpTooltip
                  title="Only match logs with a timestamp after the given point in time. Should be specified in your local timezone. Leave empty for no lower bound on the timestamp."
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
                    from: datetimeLocalToUnixNano(e.target.value),
                  })
                }
              />
            </Form.Group>

            <Form.Group className="mb-3 col-md-6">
              <Form.Label>
                Date end{' '}
                <HelpTooltip
                  title="Only match logs with a timestamp before the given point in time. Should be specified in your local timezone. Leave empty for no upper bound on the timestamp."
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
                    to: datetimeLocalToUnixNano(e.target.value),
                  })
                }
              />
            </Form.Group>
          </div>

          <div className="row">
            <Form.Group className="mb-3 col-md-6">
              <Form.Label>
                Trace ID{' '}
                <HelpTooltip
                  title="Only match logs that are associated with a specific trace."
                  placement="top"
                />
              </Form.Label>
              <Form.Control
                name="traceId"
                value={searchParams.traceId ?? ''}
                onChange={(e) =>
                  updateSearchParams({ traceId: e.target.value })
                }
                placeholder="e.g. 5b8aa5a2d2c872e8321cf37308d69df2"
              ></Form.Control>
            </Form.Group>

            <Form.Group className="mb-3 col-md-6">
              <Form.Label>
                Span ID{' '}
                <HelpTooltip
                  title="Only match logs that are associated with a specific span."
                  placement="top"
                />
              </Form.Label>
              <Form.Control
                name="spanId"
                value={searchParams.spanId ?? ''}
                onChange={(e) => updateSearchParams({ spanId: e.target.value })}
                placeholder="e.g. 051581bf3cb55c13"
              ></Form.Control>
            </Form.Group>
          </div>

          <Form.Group className="mb-3">
            <Form.Label>
              Sort by{' '}
              <HelpTooltip
                title="Determines the order in which matching logs are retrieved and displayed."
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
                value="severity"
                label="Severity"
                checked={searchParams.sortBy === 'severity'}
                onChange={(e) => {
                  if (e.target.checked)
                    updateSearchParams({ sortBy: 'severity' });
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
            <div>Search Logs</div>
          </Button>
        </Form>
      </fieldset>

      {logs && (
        <section className="border rounded p-3 mb-3">
          {logs.length > 0 ? (
            <>
              <Accordion alwaysOpen={true} className="pe-1">
                <List
                  rowComponent={LogItem}
                  rowCount={logs.length}
                  rowHeight={rowHeight}
                  rowProps={{ logs }}
                  rowKey={(index, { logs }) => logs[index].id}
                  onRowsRendered={onRowsRendered}
                  style={{
                    minHeight: '80vh',
                    maxHeight: '80vh',
                  }}
                />
              </Accordion>
            </>
          ) : (
            <span>No logs found for the current search criteria.</span>
          )}

          {isLoading && <Spinner variant="primary" />}
        </section>
      )}
    </>
  );
}

function LogItem({
  index,
  logs,
  style,
}: RowComponentProps<{
  logs: Log[];
}>) {
  const cities = useModelStore((state) => state.cities);
  const buildings = useModelStore((state) => state.buildings);
  const telemetryKeyToEntityId = useModelStore(
    (state) => state.telemetryKeyToEntityId
  );
  const lookAtEntity = useCameraControlsStore((state) => state.lookAtEntity);
  const showErrorToastMessage = useToastHandlerStore(
    (state) => state.showErrorToastMessage
  );

  const log = logs[index];
  const severityName = severityNumberToName(log.severity);
  const entityId = telemetryKeyToEntityId.get(log.telemetryKey);
  const entity = entityId ? buildings[entityId] : undefined;

  const handleServiceNameClicked = () => {
    if (!log.serviceName) {
      console.error('Service name of log is undefined in handler');
      return;
    }

    const city = Object.values(cities).find((c) => c.name === log.serviceName);
    if (!city) {
      showErrorToastMessage(
        'The service could not be found in the current visualization'
      );
      return;
    }

    lookAtEntity(city.id);
    pingByModelId(city.id);
  };

  const handleEntityClicked = () => {
    if (!entity) {
      console.error('Entity related to log is undefined in handler');
      return;
    }

    lookAtEntity(entity.id);
    pingByModelId(entity.id);
  };

  return (
    <div style={style}>
      <Accordion.Item className="mb-2 me-2 border rounded-0" eventKey={log.id}>
        <Accordion.Button
          className="border-0 rounded-0"
          style={{ padding: '8px 12px' }}
        >
          <small>
            <Badge
              pill
              bg={severityNameToBsColor(severityName)}
              className="me-2"
            >
              <samp>{severityName.at(0)?.toUpperCase()}</samp>
            </Badge>
          </small>
          <samp className="text-truncate">
            <small>
              <code>{unixNanosecondsToDatetimeLocal(log.timeUnixNano)}</code>{' '}
              {`${log.messageBody}`}
            </small>
          </samp>
        </Accordion.Button>
        <Accordion.Body>
          <Card>
            <Card.Body>
              <dl>
                <dt>Message Body</dt>
                <dd>
                  <pre className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                    <samp className="small">{log.messageBody}</samp>
                  </pre>
                </dd>

                <dt>Severity</dt>
                <dd>
                  <Badge bg={severityNameToBsColor(severityName)}>
                    {log.severity}{' '}
                    <code className="text-light">
                      ({severityName.toUpperCase()})
                    </code>
                  </Badge>
                </dd>

                {log.severityText && (
                  <>
                    <dt>Severity Text</dt>
                    <dd>
                      <code>{log.severityText}</code>
                    </dd>
                  </>
                )}

                {log.eventName && (
                  <>
                    <dt>Event Name</dt>
                    <dd>
                      <code>{log.eventName}</code>
                    </dd>
                  </>
                )}

                {entity && (
                  <>
                    <dt>Entity</dt>
                    <dd>
                      <small>
                        <a href="#" onClick={handleEntityClicked}>
                          {entity.fqn ?? entity.name}
                        </a>
                      </small>
                    </dd>
                  </>
                )}

                {log.serviceName && (
                  <>
                    <dt>Service Name</dt>
                    <dd>
                      <small>
                        <a href="#" onClick={handleServiceNameClicked}>
                          {log.serviceName}
                        </a>
                      </small>
                    </dd>
                  </>
                )}

                {log.traceId && (
                  <>
                    <dt>Trace ID</dt>
                    <dd>
                      <code>{log.traceId}</code>
                    </dd>
                  </>
                )}

                {log.spanId && (
                  <>
                    <dt>Span ID</dt>
                    <dd>
                      <code>{log.spanId}</code>
                    </dd>
                  </>
                )}

                <dt>Log Attributes</dt>
                <dd>
                  <AttributesTable attributes={log.logAttributes} />
                </dd>

                <dt>Resource Attributes</dt>
                <dd>
                  <AttributesTable attributes={log.resourceAttributes} />
                </dd>
              </dl>
            </Card.Body>
          </Card>
        </Accordion.Body>
      </Accordion.Item>
    </div>
  );
}
