import {
  GaugeMetricValues,
  SumMetricValues,
} from 'explorviz-frontend/src/utils/landscape-schemes/telemetry/metrics';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { MetricsWindow } from './runtime-metrics-chart';

const ONE_HOUR_IN_MILLIS = 1000 * 60 * 60;
const FOUR_HOURS_IN_MILLIS = 4 * ONE_HOUR_IN_MILLIS;
const ONE_DAY_IN_MILLIS = 24 * ONE_HOUR_IN_MILLIS;

interface GaugeMetricChartProps {
  values: GaugeMetricValues | SumMetricValues;
  window: MetricsWindow;
  unit?: string;
  alwaysShowZero?: boolean;
  isLogScale?: boolean;
  height?: number;
}

/**
 * A bar chart for visualizing OpenTelemetry gauge or sum values.
 * @see {@link GaugeMetricValues}, {@link SumMetricValues}
 */
export function GaugeMetricChart({
  values,
  window,
  unit = '',
  alwaysShowZero = true,
  isLogScale = false,
  height = 300,
}: GaugeMetricChartProps) {
  const data = values.points.map((point) => ({
    time: point.timeUnixMilli,
    value: point.value,
  }));

  const hasDecimals = data.some((d) => !Number.isInteger(d.value));

  const formatTime = (timestamp: number) =>
    new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

  const domainEnd = values.endUnixMilli;
  let domainStart;
  switch (window) {
    case '1h':
      domainStart = domainEnd - ONE_HOUR_IN_MILLIS;
      break;
    case '4h':
      domainStart = domainEnd - FOUR_HOURS_IN_MILLIS;
      break;
    case '24h':
      domainStart = domainEnd - ONE_DAY_IN_MILLIS;
      break;
    default:
      domainStart = values.startUnixMilli;
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 28, right: 10, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" />

        <XAxis
          dataKey="time"
          type="number"
          domain={[domainStart, domainEnd]}
          tickFormatter={formatTime}
        />

        <YAxis
          domain={alwaysShowZero ? undefined : ['auto', 'auto']}
          scale={isLogScale ? 'symlog' : 'linear'}
          allowDecimals={hasDecimals}
          width="auto"
          tickFormatter={(v) => `${v}${unit}`}
        />

        <Tooltip
          labelFormatter={(timestamp) => formatTime(Number(timestamp))}
          formatter={(value) => [
            `${Number(Number(value).toFixed(6))}${unit}`,
            'Value',
          ]}
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
