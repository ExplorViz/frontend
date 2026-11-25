import {
  accumulateBuildingMetrics,
  formatAggregatedMetric,
  formatMetricDifference,
} from 'explorviz-frontend/src/components/visualization/rendering/popups/city-popups/building-metrics-utils';
import { useLiveBuildings } from 'explorviz-frontend/src/components/visualization/rendering/popups/city-popups/use-live-flat-entity';
import { getOrderedBuildingMetricEntries } from 'explorviz-frontend/src/utils/settings/settings-schemas';
import { useMemo } from 'react';

interface AggregatedBuildingMetricsTableProps {
  buildingIds: string[];
}

export default function AggregatedBuildingMetricsTable({ buildingIds }: AggregatedBuildingMetricsTableProps) {
  const buildings = useLiveBuildings();
  const buildingIdsKey = buildingIds.join(',');

  const aggregatedMetrics = useMemo(
    () => accumulateBuildingMetrics(buildingIds),
    [buildingIds, buildingIdsKey, buildings]
  );

  const metricEntries = useMemo(() => getOrderedBuildingMetricEntries(aggregatedMetrics), [aggregatedMetrics]);

  if (buildingIds.length === 0) {
    return <div className="text-center text-muted py-3">No contained buildings</div>;
  }

  if (metricEntries.length === 0) {
    return <div className="text-center text-muted py-3">No metrics available</div>;
  }

  return (
    <div className="mt-3" style={{ maxHeight: '300px', overflowY: 'auto' }}>
      <table className="table table-sm mb-0">
        <tbody>
          {metricEntries.map(([name, value]) => {
            const { current, previous } = value;
            // Without buildings that have the metric, there is nothing to add up.
            const diff = previous ? (current?.sum ?? 0) - previous.sum : 0;

            return (
              <tr key={name}>
                <td className="fw-bold">{name}:</td>
                <td className="text-right">
                  {diff === 0 ? (
                    formatAggregatedMetric(name, current)
                  ) : (
                    <>
                      <span className={diff < 0 ? 'text-danger' : 'text-success'}>
                        {formatMetricDifference(name, diff)}
                      </span>
                      <span className="ml-2 small text-muted">
                        (C1: {formatAggregatedMetric(name, previous)}, C2: {formatAggregatedMetric(name, current)})
                      </span>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
