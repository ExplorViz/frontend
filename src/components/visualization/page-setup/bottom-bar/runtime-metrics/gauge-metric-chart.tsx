import { GaugeMetricValues } from 'explorviz-frontend/src/utils/landscape-schemes/telemetry/metrics';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface GaugeMetricChartProps {
  metric: GaugeMetricValues;
  height?: number;
}

export function GaugeMetricChart({
  metric,
  height = 300,
}: GaugeMetricChartProps) {
  const data = metric.points
    .slice()
    .sort((a, b) => a.timeUnixMilli - b.timeUnixMilli)
    .map((point) => ({
      time: point.timeUnixMilli,
      value: point.value,
    }));

  const formatTime = (timestamp: number) =>
    new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={data}
        margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
      >
        <CartesianGrid strokeDasharray="3 3" />

        <XAxis
          dataKey="time"
          type="number"
          domain={[metric.startUnixMilli, metric.endUnixMilli]}
          tickFormatter={formatTime}
        />

        <YAxis domain={['auto', 'auto']} />

        <Tooltip
          labelFormatter={(timestamp) => formatTime(Number(timestamp))}
          formatter={(value) => [value, 'Value']}
        />

        <Line
          type="linear"
          dataKey="value"
          name="Value"
          dot={true}
          strokeWidth={2}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
