import {
  accumulateBuildingMetrics,
  coerceMetricNumber,
  formatInteger,
  formatMetricValue,
} from 'explorviz-frontend/src/components/visualization/rendering/popups/city-popups/building-metrics-utils';
import { useLiveBuildings } from 'explorviz-frontend/src/components/visualization/rendering/popups/city-popups/use-live-flat-entity';
import { getOrderedBuildingMetricEntries } from 'explorviz-frontend/src/utils/settings/settings-schemas';
import { useMemo } from 'react';

interface AggregatedBuildingMetricsTableProps {
  buildingIds: string[];
}

export default function AggregatedBuildingMetricsTable({
  buildingIds,
}: AggregatedBuildingMetricsTableProps) {
  const buildings = useLiveBuildings();
  const buildingIdsKey = buildingIds.join(',');

  const aggregatedMetrics = useMemo(
    () => accumulateBuildingMetrics(buildingIds),
    [buildingIds, buildingIdsKey, buildings]
  );

  const metricEntries = useMemo(
    () => getOrderedBuildingMetricEntries(aggregatedMetrics),
    [aggregatedMetrics]
  );

  if (buildingIds.length === 0) {
    return (
      <div className="text-center text-muted py-3">No contained buildings</div>
    );
  }

  if (metricEntries.length === 0) {
    return (
      <div className="text-center text-muted py-3">No metrics available</div>
    );
  }

  return (
    <div className="mt-3" style={{ maxHeight: '300px', overflowY: 'auto' }}>
      <table className="table table-sm mb-0">
        <tbody>
          {metricEntries.map(([name, value]) => {
            const currentValue = coerceMetricNumber(value.current);
            const previousValue = coerceMetricNumber(value.previous);
            const hasChanged =
              previousValue !== null &&
              currentValue !== null &&
              currentValue !== previousValue;
            const diff =
              previousValue !== null && currentValue !== null
                ? currentValue - previousValue
                : 0;
            const diffText =
              diff > 0 ? `+${formatInteger(diff)}` : `${formatInteger(diff)}`;

            return (
              <tr key={name}>
                <td className="fw-bold">{name}:</td>
                <td className="text-right">
                  {!hasChanged ? (
                    formatMetricValue(name, value.current)
                  ) : (
                    <>
                      <span
                        className={diff < 0 ? 'text-danger' : 'text-success'}
                      >
                        {diffText}
                      </span>
                      <span className="ml-2 small text-muted">
                        (C1: {formatMetricValue(name, previousValue)}, C2:{' '}
                        {formatMetricValue(name, currentValue)})
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
