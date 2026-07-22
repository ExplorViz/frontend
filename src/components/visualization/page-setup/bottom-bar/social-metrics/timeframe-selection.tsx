import { useSocialMetricsStore } from 'explorviz-frontend/src/stores/social-metrics';
import HelpTooltip from 'explorviz-frontend/src/components/help-tooltip';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { useShallow } from 'zustand/react/shallow';
import { useState } from 'react';

const DAY = 24 * 60 * 60 * 1000;

const PRESETS = [
  {key: 'all', label: 'All', days: null as number | null},
  {key: '30d', label: '30d', days: 30 },
  {key: '90d', label: '90d', days: 90 },
  {key: '1y', label: '1y', days: 365 },
];

const toISO   = (epochMs: number) => new Date(epochMs).toISOString().slice(0, 10);
const fromISO = (str: string)     => Date.parse(str);

export default function TimeRangeSelection() {
  const { availableTimeRange, selectedTimeRange, setSelectedTimeRange } =
    useSocialMetricsStore(useShallow((s) => ({
    availableTimeRange: s.availableTimeRange,
    selectedTimeRange: s.selectedTimeRange,
    setSelectedTimeRange: s.setSelectedTimeRange,
  })));
  const [showCustom, setShowCustom] = useState(false);
  if (!availableTimeRange) return null;

  const applyPreset = (days: number | null) => {
    setShowCustom(false);
    if (days === null) return setSelectedTimeRange(null);
    const to = availableTimeRange.to;
    const from = Math.max(availableTimeRange.from, to - days * DAY);
    setSelectedTimeRange({ from , to })
  };


  return (
    <div className="social-metrics-control-block">
      <span className="social-metrics-control-label">Time frame
        <HelpTooltip title="Restrict commit-based metrics to the selected time window. Does not apply to pull-request- and issue-based metrics by design." placement="top" />
      </span>
      <span className="social-metrics-control-label social-metrics-control-subheading">Presets</span>
      <div className="social-metrics-preset-group">
        {PRESETS.map((p) => (
          <Button key={p.key} size="sm" variant="outline-secondary"
            onClick={() => applyPreset(p.days)}>{p.label}</Button>
        ))}
      </div>
      <div className="social-metrics-custom-range">
        <span className="social-metrics-control-label social-metrics-control-subheading">Custom</span>
         <Form.Control  type="date" size="sm"
         min={toISO(availableTimeRange.from)}
         max={toISO(availableTimeRange.to)}
         value={toISO(selectedTimeRange?.from ?? availableTimeRange.from)}
         onChange={(e) => setSelectedTimeRange(
            { from: fromISO(e.target.value), to: selectedTimeRange?.to ?? availableTimeRange.to })}
         />
         <Form.Control  type="date" size="sm"
         min={toISO(availableTimeRange.from)}
         max={toISO(availableTimeRange.to)}
         value={toISO(selectedTimeRange?.to ?? availableTimeRange.to)}
         onChange={(e) => setSelectedTimeRange(
            { from: selectedTimeRange?.from ?? availableTimeRange.from, to: fromISO(e.target.value) })}
         />
      </div>
    </div>
  )
}


        {/* <Button size="sm" variant='outline-secondary' onClick={() => setShowCustom((v) => !v)}>Custom</Button> */}
