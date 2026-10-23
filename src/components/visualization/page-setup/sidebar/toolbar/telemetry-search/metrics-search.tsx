import { SearchIcon } from '@primer/octicons-react';
import EntitySelect from 'explorviz-frontend/src/components/entity-select';
import HelpTooltip from 'explorviz-frontend/src/components/help-tooltip';
import useRuntimeMetricsFetch, {
  MetricsSearchParams,
} from 'explorviz-frontend/src/hooks/fetch/useRuntimeMetricsFetch';
import { useLandscapeTokenStore } from 'explorviz-frontend/src/stores/landscape-token';
import { useModelStore } from 'explorviz-frontend/src/stores/repos/model-repository';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import {
  MetricOverview,
  MetricsPointKind,
} from 'explorviz-frontend/src/utils/landscape-schemes/telemetry/metrics';
import { pingByModelId } from 'explorviz-frontend/src/view-objects/3d/city/animated-ping-r3f';
import React, { use, useCallback, useEffect, useState } from 'react';
import {
  Accordion,
  Badge,
  Button,
  Card,
  Form,
  OverlayTrigger,
  Spinner,
  Tooltip,
} from 'react-bootstrap';
import { List, RowComponentProps, useDynamicRowHeight } from 'react-window';
import { useInfiniteLoader } from 'react-window-infinite-loader';
import { BottomBarContext } from '../../../bottom-bar/bottom-bar-context';
import { ToolbarContext } from '../toolbar-context';

const POINT_KIND_TO_LABEL = new Map<MetricsPointKind, string>([
  ['sum', 'Sum'],
  ['gauge', 'Gauge'],
  ['histogram', 'Histogram'],
  ['exp_histogram', 'Exponential Histogram'],
]);

/**
 * Returns a human-friendly textual representation for the given metrics datapoint kind.
 * If the input is not a valid model type according to {@link MetricsPointKind}, undefined is returned.
 */
function getLabelForPointKind(pointKind: MetricsPointKind) {
  return POINT_KIND_TO_LABEL.get(pointKind);
}

const defaultSearchParams: MetricsSearchParams = {
  includeDescription: true,
  includeAttributeKeys: false,
  includeAttributeValues: true,
  sortBy: 'nameAsc',
};

const PAGINATION_SIZE = 50;

export default function MetricsSearch() {
  const cities = Object.values(useModelStore((state) => state.cities)).toSorted(
    (a, b) => a.name.localeCompare(b.name)
  );
  const landscapeToken = useLandscapeTokenStore((state) => state.token);
  const showErrorToastMessage = useToastHandlerStore(
    (state) => state.showErrorToastMessage
  );

  const toolbarContext = use(ToolbarContext);
  const searchRequest =
    toolbarContext.telemetrySearchState.metricsSearchRequest;

  const [metrics, setMetrics] = useState<MetricOverview[] | null>(null);
  const [searchParams, setSearchParams] =
    useState<MetricsSearchParams>(defaultSearchParams);
  const [lastSubmittedParams, setLastSubmittedParams] =
    useState<MetricsSearchParams | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [allItemsLoaded, setAllItemsLoaded] = useState<boolean>(false);
  const [prevSearchRequest, setPrevSearchRequest] =
    useState<MetricsSearchParams | null>(null);

  const fetchMetrics = useRuntimeMetricsFetch();

  const updateSearchParams = (newParams: Partial<MetricsSearchParams>) =>
    setSearchParams((state) => ({ ...state, ...newParams }));

  const loadMetrics = useCallback(
    async (params: MetricsSearchParams) => {
      if (!landscapeToken) {
        return;
      }

      try {
        const receivedMetrics = await fetchMetrics({
          ...params,
          landscapeTokenId: landscapeToken.value,
          limit: PAGINATION_SIZE,
        });

        setMetrics((state) =>
          state === null ? receivedMetrics : [...state, ...receivedMetrics]
        );
        setIsLoading(false);
        if (receivedMetrics.length < PAGINATION_SIZE) {
          setAllItemsLoaded(true);
        }
      } catch (error) {
        setIsLoading(false);
        setAllItemsLoaded(true);
        showErrorToastMessage(
          `Failed to retrieve metrics: ${error instanceof Error ? error.message : error}`
        );
      }
    },
    [landscapeToken, fetchMetrics, showErrorToastMessage]
  );

  const onRowsRendered = useInfiniteLoader({
    rowCount: (metrics?.length ?? 0) + (allItemsLoaded ? 0 : 1),
    isRowLoaded: (index) => index < (metrics?.length ?? 0),
    loadMoreRows: async () => {
      if (isLoading || allItemsLoaded || !lastSubmittedParams || !metrics) {
        return;
      }

      setIsLoading(true);

      const lastSeenMetric = metrics[metrics.length - 1];
      const params = { ...lastSubmittedParams };
      params.cursor = {
        cursorName: lastSeenMetric.name,
        cursorPointKind: lastSeenMetric.pointKind,
      };
      return loadMetrics(params);
    },
  });

  const rowHeight = useDynamicRowHeight({
    defaultRowHeight: 50,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMetrics(null);
    setIsLoading(true);
    setAllItemsLoaded(false);
    loadMetrics(searchParams);
    setLastSubmittedParams(searchParams);
  };

  if (searchRequest !== prevSearchRequest) {
    if (searchRequest) {
      const params = { ...defaultSearchParams, ...searchRequest };
      setSearchParams(params);
      setLastSubmittedParams(params);
      setMetrics(null);
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
        await loadMetrics({ ...defaultSearchParams, ...searchRequest });
        toolbarContext.searchMetrics(null); // Reset request to prevent repeated triggering
      };

      load();
    },
    [searchRequest, toolbarContext, loadMetrics]
  );

  return (
    <>
      <fieldset disabled={isLoading}>
        <Form className="mb-3" onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>
              Text Search{' '}
              <HelpTooltip
                title="Only match metrics whose name contains all of the provided tokens. Search is case-insensitive."
                placement="top"
              />
            </Form.Label>
            <Form.Control
              name="name"
              value={searchParams.searchString ?? ''}
              onChange={(e) =>
                updateSearchParams({ searchString: e.target.value })
              }
              placeholder='e.g. "http.client.open_connections", "jvm", &hellip;'
              className="mb-2"
            />
            <Form.Check
              name="includeDescription"
              type="checkbox"
              label={
                <>
                  Include description{' '}
                  <HelpTooltip
                    title="Also search the metric description for the provided search tokens."
                    placement="top"
                  />
                </>
              }
              checked={searchParams.includeDescription ?? false}
              onChange={(e) =>
                updateSearchParams({ includeDescription: e.target.checked })
              }
              inline
            />
            <Form.Check
              name="includeAttributeKeys"
              type="checkbox"
              label={
                <>
                  Include attribute keys{' '}
                  <HelpTooltip
                    title="Also search the metric, scope and resource attribute keys for the provided search tokens."
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
                    title="Also search the metric, scope and resource attribute values for the provided search tokens."
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
              Datapoint Kind{' '}
              <HelpTooltip
                title="Only match metrics where the datapoints are of a specific type."
                placement="top"
              />
            </Form.Label>

            <div style={{ minHeight: '2.4em' }}>
              <Form.Select
                name="pointKind"
                value={searchParams.pointKind ?? ''}
                onChange={(e) =>
                  updateSearchParams({
                    pointKind: e.target.value as MetricsPointKind,
                  })
                }
              >
                <option value="">Any</option>
                <option disabled>────────</option>
                <option value="sum">Sum</option>
                <option value="gauge">Gauge</option>
                <option value="histogram">Histogram</option>
                <option value="exp_histogram">Exponential Histogram</option>
              </Form.Select>
            </div>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>
              Service{' '}
              <HelpTooltip
                title="Only match metrics that are present for a specific application or service."
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
              {cities.length > 0 && (
                <>
                  <option disabled>────────</option>
                  {cities.map((city) => (
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
                title="Only match metrics that are present for a particular visualization entity. Note that entities which are known to have no associated telemetry data are hidden."
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
              Sort by{' '}
              <HelpTooltip
                title="Determines the order in which matching metrics are retrieved and displayed."
                placement="top"
              />
            </Form.Label>
            <div className="mb-1">
              <Form.Check
                inline
                type="radio"
                name="sortBy"
                value="nameAsc"
                label="Name (Ascending)"
                checked={searchParams.sortBy === 'nameAsc'}
                onChange={(e) => {
                  if (e.target.checked)
                    updateSearchParams({ sortBy: 'nameAsc' });
                }}
              />
              <Form.Check
                inline
                type="radio"
                name="sortBy"
                value="nameDesc"
                label="Name (Descending)"
                checked={searchParams.sortBy === 'nameDesc'}
                onChange={(e) => {
                  if (e.target.checked)
                    updateSearchParams({ sortBy: 'nameDesc' });
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
            <div>Search Metrics</div>
          </Button>
        </Form>
      </fieldset>

      {metrics && (
        <section className="border rounded p-3 mb-3">
          {metrics.length > 0 ? (
            <>
              <Accordion alwaysOpen={true} className="pe-1">
                <List
                  rowComponent={MetricItem}
                  rowCount={metrics.length}
                  rowHeight={rowHeight}
                  rowProps={{ metrics: metrics }}
                  rowKey={(index, { metrics }) =>
                    `${metrics[index].pointKind}_${metrics[index].name}`
                  }
                  onRowsRendered={onRowsRendered}
                  style={{
                    minHeight: '80vh',
                    maxHeight: '80vh',
                  }}
                />
              </Accordion>
            </>
          ) : (
            <span>No metrics found for the current search criteria.</span>
          )}

          {isLoading && <Spinner variant="primary" />}
        </section>
      )}
    </>
  );
}

function MetricItem({
  index,
  metrics,
  style,
}: RowComponentProps<{
  metrics: MetricOverview[];
}>) {
  const metric = metrics[index];

  const unit =
    metric.unit.startsWith('{') && metric.unit.endsWith('}')
      ? metric.unit.slice(1, -1)
      : metric.unit;

  const telemetryKeyToEntityId = useModelStore(
    (state) => state.telemetryKeyToEntityId
  );
  const buildings = useModelStore((state) => state.buildings);
  const buildingsWithMetric = metric.entities.flatMap((k) => {
    const id = telemetryKeyToEntityId.get(k);
    const building = id !== undefined ? buildings[id] : undefined;
    return building === undefined ? [] : [building];
  });

  const bottomBarContext = use(BottomBarContext);
  const toolbarContext = use(ToolbarContext);

  const handleMetricSelect = () => {
    bottomBarContext.setIsExpanded(true);
    bottomBarContext.setSelectedChart('runtime-metrics');
    bottomBarContext.setSelectedMetric(metric);
    toolbarContext.setShowSidebar(false);
  };

  const handleEntitiesClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    buildingsWithMetric.forEach((b) => pingByModelId(b.id));
  };

  return (
    <div className="pe-2 pb-2" style={style}>
      <Card className="metrics-search-card" onClick={handleMetricSelect}>
        <Card.Body>
          <Card.Title className="text-break mb-1">
            <code>{metric.name}</code>
          </Card.Title>

          <div>
            <small>
              <p className="text-break mb-2">{metric.description}</p>
              <small>
                <div className="text-muted mb-0">
                  <Badge bg="secondary">
                    {getLabelForPointKind(metric.pointKind) ?? metric.pointKind}
                  </Badge>{' '}
                  &middot; {unit != '' && <>{unit} &middot; </>}
                  <OverlayTrigger
                    placement={'top'}
                    trigger={['hover', 'focus']}
                    overlay={
                      <Tooltip>{metric.services.toSorted().join(', ')}</Tooltip>
                    }
                  >
                    <span>{metric.services.length} Services</span>
                  </OverlayTrigger>{' '}
                  &middot;{' '}
                  <OverlayTrigger
                    placement={'top'}
                    trigger={['hover', 'focus']}
                    overlay={
                      <Tooltip>
                        {buildingsWithMetric
                          .map((b) => b.name)
                          .toSorted()
                          .join(', ')}
                      </Tooltip>
                    }
                  >
                    <span role="button" onClick={handleEntitiesClick}>
                      {metric.entities.length} Entities
                    </span>
                  </OverlayTrigger>
                </div>
              </small>
            </small>
          </div>
        </Card.Body>
      </Card>

      <style>
        {`
          .metrics-search-card {
            cursor: pointer;
          }

          .metrics-search-card:hover {
            background: var(--bs-gray-100);
          }

          .metrics-search-card:active {
            background: var(--bs-gray-200);
          }
        `}
      </style>
    </div>
  );
}
