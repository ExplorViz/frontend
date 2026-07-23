import { useSocialMetricsStore } from 'explorviz-frontend/src/stores/social-metrics';
import HelpTooltip from 'explorviz-frontend/src/components/help-tooltip';
import Form from 'react-bootstrap/Form';
import { useShallow } from 'zustand/react/shallow';

const ANCHOR_VALUES = [
  { value: 0.95, label: 'p95' },
  { value: 0.99, label: 'p99' },
  { value: 1.0,  label: 'max' },
]

export default function NormalizationSelection() {
  const { normalization, setNormalization } = useSocialMetricsStore(
    useShallow((state) => ({
      normalization: state.normalization,
      setNormalization: state.setNormalization,
    }))
  );

  return (
    <div className="social-metrics-control-block">
      <span className="social-metrics-control-label">Normalization
        <HelpTooltip
          title="Log scale smoothens heavily skewed values, especially useful for larger repositories. The anchor sets which value maps to the top of the color range."
          placement="top"
        />
      </span>
      <Form.Check
        type="switch"
        id="social-normalization-logscale"
        label="Log scale"
        checked={normalization.logScale}
        onChange={(e) => setNormalization({ ...normalization, logScale: e.target.checked })}
        />
      <Form.Select
        size="sm"
        aria-label="Normalization Anchor"
        value={String(normalization.quantile)}
        onChange={(e) => setNormalization({ ...normalization, quantile: Number(e.target.value) })}
        >
        {ANCHOR_VALUES.map((a) => (
          <option key={a.value} value={a.value}>Anchor: {a.label}
          </option>
        ))}
      </Form.Select>
      <div className="social-metrics-note text-muted small py-2">
        <div className="social-metrics-note-line">
          <HelpTooltip title="" placement="top" />
          This setting only applies to the following metrics:
          commitActivity,
          issueActivity,
          reviewFriction.
        </div>
      </div>
    </div>
  )

}
