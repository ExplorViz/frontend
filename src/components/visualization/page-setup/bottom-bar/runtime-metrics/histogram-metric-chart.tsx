import { HistogramMetricValues } from 'explorviz-frontend/src/utils/landscape-schemes/telemetry/metrics';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface HistogramMetricChartProps {
  values: HistogramMetricValues;
  unit?: string;
  height?: number;
}

/**
 * A bar chart for visualizing OpenTelemetry histogram values.
 * @see {@link HistogramMetricValues}
 */
export default function HistogramMetricChart({
  values,
  unit = '',
  height = 300,
}: HistogramMetricChartProps) {
  const data = values.points.map((v, i) => {
    const upper = v.bound ?? '+∞';
    const lower = values.points[i - 1]?.bound ?? '-∞';

    return {
      label: `(${lower}${i > 0 ? unit : ''}, ${upper}${v.bound !== undefined ? unit : ''}]`,
      labelShort: `≤ ${upper}${v.bound !== undefined ? unit : ''}`,
      value: v.count,
    };
  });

  const formatXAxisTick = (value: any, index: number) =>
    data.length > 14 ? data[index].labelShort : value;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        margin={{ top: 20, right: 10, left: 20, bottom: 20 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          scale="point"
          tickFormatter={formatXAxisTick}
          label={{
            value: 'Histogram Bounds',
            position: 'bottom',
          }}
          padding={{ left: 75, right: 75 }}
          interval={0} /** Always show all ticks */
        />
        <YAxis
          dataKey="value"
          allowDecimals={false}
          label={{
            value: 'Frequency (Count)',
            angle: -90,
            position: 'left',
            textAnchor: 'middle',
          }}
        />
        <Tooltip
          labelFormatter={(label) =>
            data.length > 1
              ? `Bucket: ${label}`
              : `Measurements: ${values.count}`
          }
          formatter={(value) =>
            data.length > 1 ? [value, 'Count'] : [values.sum, 'Sum']
          }
        />

        <Bar dataKey="value" maxBarSize={100} fill="#3182bd" />
      </BarChart>
    </ResponsiveContainer>
  );
}
