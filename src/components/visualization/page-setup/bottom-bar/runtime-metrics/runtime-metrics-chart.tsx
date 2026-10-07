import { useAuthStore } from 'explorviz-frontend/src/stores/auth';
import { useLandscapeTokenStore } from 'explorviz-frontend/src/stores/landscape-token';
import { useToastHandlerStore } from 'explorviz-frontend/src/stores/toast-handler';
import { getMetricsServiceUrl } from 'explorviz-frontend/src/utils/landscape-http-request-util';
import {
  isMetricValues,
  MetricOverview,
  MetricValues,
} from 'explorviz-frontend/src/utils/landscape-schemes/telemetry/metrics';
import { useEffect, useState } from 'react';
import { Dropdown, DropdownButton } from 'react-bootstrap';
import { GaugeMetricChart } from './gauge-metric-chart';

export type MetricsWindow = '1h' | '4h' | '24h';

const METRICS_AGGREGATIONS = ['avg', 'sum', 'min', 'max'] as const;
type MetricsAggregation = (typeof METRICS_AGGREGATIONS)[number];

function getAggregationLabel(aggregation: MetricsAggregation): string {
  switch (aggregation) {
    case 'avg':
      return 'Average';
    case 'sum':
      return 'Sum';
    case 'min':
      return 'Minimum';
    case 'max':
      return 'Maximum';
  }
}

interface RuntimeMetricsChartProps {
  metric: MetricOverview | null;
}

export default function RuntimeMetricsChart({
  metric,
}: RuntimeMetricsChartProps) {
  const services = metric?.services.toSorted();

  const landscapeToken = useLandscapeTokenStore((state) => state.token);
  const accessToken = useAuthStore((state) => state.accessToken);
  const showErrorToastMessage = useToastHandlerStore(
    (state) => state.showErrorToastMessage
  );

  const [metricValues, setMetricValues] = useState<
    MetricValues | null | undefined
  >(undefined);
  const [selectedService, setSelectedService] = useState<string | null>(
    services?.[0] ?? null
  );
  const [window, setWindow] = useState<MetricsWindow>('1h');
  const [aggregation, setAggregation] = useState<MetricsAggregation>('avg');

  useEffect(() => {
    const fetchMetricValues = async () => {
      if (!metric) {
        showErrorToastMessage('No metric is currently selected');
        setMetricValues(null);
        return;
      }

      const metricsServiceUrl = getMetricsServiceUrl();
      if (metricsServiceUrl === '') {
        showErrorToastMessage('Metrics service URL not configured');
        setMetricValues(null);
        return;
      }

      if (!landscapeToken) {
        showErrorToastMessage('No landscape token selected');
        setMetricValues(null);
        return;
      }

      const requestUrl = new URL(
        `${metricsServiceUrl}/v3/landscapes/${landscapeToken.value}/metric`
      );

      const queryParams = new URLSearchParams();
      queryParams.set('name', metric.name);
      queryParams.set('pointKind', metric.pointKind);
      queryParams.set('window', window);
      queryParams.set('aggregation', aggregation);
      if (selectedService) {
        queryParams.set('service', selectedService);
      }

      requestUrl.search = queryParams.toString();

      let response: Response;
      try {
        response = await fetch(requestUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Access-Control-Allow-Origin': '*',
          },
        });
      } catch (error) {
        console.error(error);
        showErrorToastMessage('A network error has occurred');
        setMetricValues(null);
        return;
      }

      if (!response.ok) {
        showErrorToastMessage(
          `Received non-ok response status ${response.status}`
        );
        setMetricValues(null);
        return;
      }

      const receivedMetricValues = await response.json();

      if (!isMetricValues(receivedMetricValues)) {
        console.error(`JSON fails type guard ${isMetricValues.name}`);
        showErrorToastMessage('Received invalid response');
        setMetricValues(null);
        return;
      }

      setMetricValues(receivedMetricValues);
    };

    fetchMetricValues();
  }, [
    metric,
    selectedService,
    window,
    aggregation,
    landscapeToken,
    accessToken,
    showErrorToastMessage,
  ]);

  if (!metric) {
    return (
      <div className="timeline-no-timestamps-outer">
        <div className="timeline-no-timestamps-inner">
          No metric is selected
        </div>
      </div>
    );
  }

  return (
    <div className="mx-3">
      <div className="d-flex flex-column align-items-center justify-content-center">
        <h5 className="mb-0">
          <code>{metric.name}</code>
        </h5>
        <span className="text-muted text-truncate">{metric.description}</span>
      </div>

      <div
        className="d-grid"
        style={{ gridTemplateColumns: 'max-content 1fr' }}
      >
        <div
          className="d-grid align-self-center align-items-center row-gap-2 column-gap-2 pe-3"
          style={{
            gridTemplateColumns: 'max-content auto',
          }}
        >
          {services && services.length > 0 && (
            <>
              <span>Service:</span>
              <DropdownButton
                id="metric-service-dropdown"
                title={selectedService ?? 'Service'}
              >
                {services.map((s) => (
                  <Dropdown.Item key={s} onClick={() => setSelectedService(s)}>
                    {s}
                  </Dropdown.Item>
                ))}
              </DropdownButton>
            </>
          )}

          <span>Window:</span>
          <DropdownButton id="metric-window-dropdown" title={window}>
            <Dropdown.Item onClick={() => setWindow('1h')}>1h</Dropdown.Item>
            <Dropdown.Item onClick={() => setWindow('4h')}>4h</Dropdown.Item>
            <Dropdown.Item onClick={() => setWindow('24h')}>24h</Dropdown.Item>
          </DropdownButton>

          <span>Aggregation:</span>
          <DropdownButton
            id="metric-window-dropdown"
            title={getAggregationLabel(aggregation)}
          >
            {METRICS_AGGREGATIONS.map((agg) => (
              <Dropdown.Item key={agg} onClick={() => setAggregation(agg)}>
                {getAggregationLabel(agg)}
              </Dropdown.Item>
            ))}
          </DropdownButton>
        </div>
        {metricValues && (
          <>
            {(metricValues.pointKind === 'gauge' ||
              metricValues.pointKind === 'sum') && (
              <GaugeMetricChart metric={metricValues} window={window} />
            )}
          </>
        )}
        {metricValues === null && (
          <div className="timeline-no-timestamps-outer mt-3">
            <div className="timeline-no-timestamps-inner">
              No data for metric available
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
