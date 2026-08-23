import { SearchIcon } from '@primer/octicons-react';
import AttributesTable from 'explorviz-frontend/src/components/attributes-table';
import DualRangeSlider from 'explorviz-frontend/src/components/dual-range-slider';
import HelpTooltip from 'explorviz-frontend/src/components/help-tooltip';
import { useAuthStore } from 'explorviz-frontend/src/stores/auth';
import { useLandscapeTokenStore } from 'explorviz-frontend/src/stores/landscape-token';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import { getLogServiceUrl } from 'explorviz-frontend/src/utils/landscape-http-request-util';
import {
  isLog,
  Log,
} from 'explorviz-frontend/src/utils/landscape-schemes/telemetry/logs';
import { useState } from 'react';
import { Accordion, Badge, Button, Card, Form, Spinner } from 'react-bootstrap';
import { List, RowComponentProps, useDynamicRowHeight } from 'react-window';
import { useInfiniteLoader } from 'react-window-infinite-loader';
import ComponentOpener from '../../component-opener';
import { ToolbarOpenerProps } from '../../types';

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

function formatUnixNanoseconds(ns: bigint) {
  const date = new Date(Number(ns / 1_000_000n));
  return date.toISOString();
}

const PAGINATION_SIZE = 50;

export default function LogSearch() {
  const cities = useModelStore((state) => state.cities);
  const landscapeToken = useLandscapeTokenStore((state) => state.token)?.value;
  const accessToken = useAuthStore((state) => state.accessToken);
  const showErrorToastMessage = useToastHandlerStore(
    (state) => state.showErrorToastMessage
  );

  const [logs, setLogs] = useState<Log[] | null>(null);
  const [formData, setFormData] = useState<FormData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [allItemsLoaded, setAllItemsLoaded] = useState<boolean>(false);
  const [severityAsNumber, setSeverityAsNumber] = useState<boolean>(true);
  const [severityTextValues, setSeverityTextValues] = useState<string[] | null>(
    null
  );

  const loadMoreLogs = async (newFormData?: FormData) => {
    const logServiceUrl = getLogServiceUrl();
    if (logServiceUrl === '') {
      showErrorToastMessage('Log service URL not configured');
      return;
    }

    if (!landscapeToken) {
      showErrorToastMessage('No landscape token selected');
      return;
    }

    const requestUrl = new URL(
      `${logServiceUrl}/v3/landscapes/${landscapeToken}/logs`
    );
    const queryParams = new URLSearchParams((newFormData ?? formData) as any);
    queryParams.set('limit', PAGINATION_SIZE.toString());
    queryParams.set('offset', (logs?.length ?? 0).toString());
    requestUrl.search = queryParams.toString();

    const response = await fetch(requestUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Access-Control-Allow-Origin': '*',
      },
    });
    if (!response.ok) {
      setIsLoading(false);
      showErrorToastMessage(
        `Failed to retrieve logs: Received non-ok response status ${response.status}`
      );
      return;
    }

    const receivedLogs = JSON.parse(await response.text(), (k, v) => {
      return k === 'timeUnixNano' ? BigInt(v) : v;
    });
    if (!Array.isArray(receivedLogs) || !receivedLogs.every(isLog)) {
      setIsLoading(false);
      showErrorToastMessage(
        'Failed to retrieve logs: Received invalid response'
      );
      console.error(`JSON fails type guard ${isLog.name}`);
      return;
    }
    setLogs((state) =>
      state === null ? receivedLogs : [...state, ...receivedLogs]
    );
    setIsLoading(false);
    if (receivedLogs.length < PAGINATION_SIZE) {
      setAllItemsLoaded(true);
    }
  };

  const onRowsRendered = useInfiniteLoader({
    rowCount: (logs?.length ?? 0) + (allItemsLoaded ? 0 : 1),
    isRowLoaded: (index) => index < (logs?.length ?? 0),
    loadMoreRows: async () => {
      if (isLoading || allItemsLoaded) {
        return;
      }
      setIsLoading(true);
      return loadMoreLogs();
    },
  });

  const rowHeight = useDynamicRowHeight({
    defaultRowHeight: 50,
  });

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();

    const newFormData = new FormData(e.currentTarget);
    for (const [key, value] of Array.from(newFormData.entries())) {
      if (value === '' || typeof value !== 'string') {
        newFormData.delete(key);
      }
    }

    setLogs(null);
    setIsLoading(true);
    setAllItemsLoaded(false);
    setFormData(newFormData);
    loadMoreLogs(newFormData);
  };

  const handleSeverityTextSelectFocus: React.FocusEventHandler = async () => {
    if (severityTextValues !== null && severityTextValues.length > 0) {
      return;
    }

    const logServiceUrl = getLogServiceUrl();
    if (logServiceUrl === '') {
      showErrorToastMessage('Log service URL not configured');
      return;
    }

    if (!landscapeToken) {
      showErrorToastMessage('No landscape token selected');
      return;
    }

    const requestUrl = new URL(
      `${logServiceUrl}/v3/landscapes/${landscapeToken}/log-levels`
    );

    let response: Response;
    try {
      response = await fetch(requestUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch (error) {
      setSeverityTextValues([]);
      showErrorToastMessage(
        'Failed to retrieve log severity levels: A network error has occurred'
      );
      console.error(error);
      return;
    }
    if (!response.ok) {
      setSeverityTextValues([]);
      showErrorToastMessage(
        `Failed to retrieve log severity levels: Received non-ok response status ${response.status}`
      );
      return;
    }

    const receivedSeverities = await response.json();
    if (
      !Array.isArray(receivedSeverities) ||
      !receivedSeverities.every((v) => typeof v === 'string')
    ) {
      setSeverityTextValues([]);
      showErrorToastMessage(
        'Failed to retrieve log severity levels: Received invalid response'
      );
      console.error(`JSON is not string array`);
      return;
    }

    setSeverityTextValues(receivedSeverities);
  };

  return (
    <>
      <h5 className="text-center">Log Search</h5>
      <p className="text-center text-muted">
        Find log telemetry data related to landscape entities.
      </p>
      <section className="border rounded p-3 mb-3">
        <fieldset disabled={isLoading}>
          <Form onSubmit={handleSubmit}>
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
                placeholder='e.g. "successful", "network error", &hellip;'
                className="mb-2"
              />
              <Form.Check
                name="includeAttributeKeys"
                type="checkbox"
                value="true"
                label={
                  <>
                    Include attribute keys{' '}
                    <HelpTooltip
                      title="Also search the log, scope, and resource attributes' keys for the provided search tokens. This can be useful to ensure a specific attribute is present."
                      placement="top"
                    />
                  </>
                }
                inline
              />
              <Form.Check
                name="includeAttributeValues"
                type="checkbox"
                value="true"
                label={
                  <>
                    Include attribute values{' '}
                    <HelpTooltip
                      title="Also search the log, scope, and resource attributes' values for the provided search tokens."
                      placement="top"
                    />
                  </>
                }
                defaultChecked
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
              <Form.Select name="serviceName">
                <option value="">All</option>
                {Object.values(cities).map((city) => (
                  <option key={city.id} value={city.name}>
                    {city.name}
                  </option>
                ))}
              </Form.Select>
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
                  checked={severityAsNumber}
                  onChange={() => setSeverityAsNumber(true)}
                />
                <Form.Check
                  inline
                  type="radio"
                  label="Text"
                  checked={!severityAsNumber}
                  onChange={() => setSeverityAsNumber(false)}
                />
              </div>

              <div style={{ minHeight: '2.4em' }}>
                {severityAsNumber ? (
                  <DualRangeSlider
                    min={0}
                    max={24}
                    lowerFormName="minSeverity"
                    upperFormName="maxSeverity"
                    disabled={isLoading}
                    getTooltipText={(val) =>
                      `${val} (${severityNumberToName(val)})`
                    }
                  />
                ) : (
                  <Form.Select
                    name="severityText"
                    onFocus={handleSeverityTextSelectFocus}
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
                  Trace ID{' '}
                  <HelpTooltip
                    title="Only match logs that are associated with a specific trace."
                    placement="top"
                  />
                </Form.Label>
                <Form.Control
                  name="traceId"
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
                  placeholder="e.g. 051581bf3cb55c13"
                ></Form.Control>
              </Form.Group>
            </div>

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
      </section>

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
                  rowKey={(index, data) => data.logs[index].id}
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

function LogItem({ index, logs, style }: RowComponentProps<{ logs: Log[] }>) {
  const log = logs[index];
  const severityName = severityNumberToName(log.severity);

  return (
    <div style={style}>
      <Accordion.Item className="mb-2 me-2 border rounded-0" eventKey={log.id}>
        <Accordion.Button
          className="border-0 rounded-0"
          style={{ padding: '8px 12px' }}
        >
          <Badge pill bg={severityNameToBsColor(severityName)} className="me-2">
            <samp>{severityName.at(0)?.toUpperCase()}</samp>
          </Badge>
          <samp className="text-truncate">{`${formatUnixNanoseconds(log.timeUnixNano)} ${log.messageBody}`}</samp>
        </Accordion.Button>
        <Accordion.Body>
          <Card>
            <Card.Body>
              <dl>
                <dt>Message Body</dt>
                <dd>
                  <pre style={{ whiteSpace: 'pre-wrap' }}>
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

                {log.telemetryKey && (
                  <>
                    <dt>Entity</dt>
                    <dd>
                      <small>
                        <a href="#">{log.telemetryKey}</a>
                      </small>
                    </dd>
                  </>
                )}

                {log.serviceName && (
                  <>
                    <dt>Service Name</dt>
                    <dd>
                      <small>
                        <a href="#">{log.serviceName}</a>
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

export function LogSearchOpener({
  openedComponent,
  toggleToolsSidebarComponent,
}: ToolbarOpenerProps) {
  return (
    <ComponentOpener
      openedComponent={openedComponent}
      componentTitle="Log Search"
      componentId="log-search"
      toggleComponent={toggleToolsSidebarComponent}
    />
  );
}
