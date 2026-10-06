import { MetricOverview } from 'explorviz-frontend/src/utils/landscape-schemes/telemetry/metrics';
import { useState } from 'react';
import { Dropdown, DropdownButton } from 'react-bootstrap';

type MetricsWindow = '1h' | '4h' | '24h';

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

  const [selectedService, setSelectedService] = useState<string | null>(
    services?.[0] ?? null
  );
  const [window, setWindow] = useState<MetricsWindow>('1h');
  const [aggregation, setAggregation] = useState<MetricsAggregation>('avg');

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
      <div className="d-flex align-items-center justify-content-center">
        <h5>
          <code>{metric.name}</code>
        </h5>
      </div>
      <div
        className="d-grid align-items-center gap-1 column-gap-2"
        style={{ gridTemplateColumns: 'max-content auto' }}
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
    </div>
  );
}
