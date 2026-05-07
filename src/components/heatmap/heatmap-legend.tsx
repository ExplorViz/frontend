import { useEffect, useMemo, useRef } from 'react';

import { ShareAndroidIcon } from '@primer/octicons-react';
import {
  HeatmapGradient,
  HeatmapValueMapping,
  useHeatmapStore,
} from 'explorviz-frontend/src/stores/heatmap/heatmap-store';
import { useUserSettingsStore } from 'explorviz-frontend/src/stores/user-settings';
import {
  getColorGradient,
  revertKey,
} from 'explorviz-frontend/src/utils/heatmap/simple-heatmap';
import { CloseButton } from 'react-bootstrap';
import Button from 'react-bootstrap/Button';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import { useShallow } from 'zustand/react/shallow';

const LEGEND_RATIOS = [1, 0.75, 0.5, 0.25, 0];

export default function HeatmapLegend() {
  const {
    heatmapShared,
    selectedClassMetric,
    selectedGradient,
    selectedValueMapping,
    setGradient,
    setValueMapping,
    setShowLegendValues,
    showLegendValues,
    toggleShared,
  } = useHeatmapStore(
    useShallow((state) => ({
      heatmapShared: state.heatmapShared,
      selectedClassMetric: state.getSelectedBuildingMetric(),
      selectedGradient: state.getSelectedGradient(),
      selectedValueMapping: state.getSelectedValueMapping(),
      setGradient: state.setSelectedGradient,
      setValueMapping: state.setSelectedValueMapping,
      setShowLegendValues: state.setShowLegendValues,
      showLegendValues: state.showLegendValues,
      toggleShared: state.toggleShared,
    }))
  );

  const updateSetting = useUserSettingsStore((state) => state.updateSetting);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);

  const legendLabels = useMemo(() => {
    if (!selectedClassMetric) {
      return LEGEND_RATIOS.map((ratio) => ratio.toFixed(2));
    }

    const min = selectedClassMetric.min;
    const max = selectedClassMetric.max;
    const safeMax = Number.isFinite(max) && max > 0 ? max : 0;

    return LEGEND_RATIOS.map((ratio) => {
      let value: number;

      if (selectedValueMapping === HeatmapValueMapping.LOGARITHMIC) {
        value = Math.expm1(ratio * Math.log1p(safeMax));
      } else {
        value = ratio * safeMax;
      }

      // Keep labels consistent with selected metric boundaries in the UI.
      const boundedValue = Math.min(max, Math.max(min, value));
      return formatLegendValue(boundedValue);
    });
  }, [selectedClassMetric, selectedValueMapping]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const div = legendRef.current;

    if (!canvas || !div) {
      return;
    }

    canvas.width = div.clientWidth;
    canvas.height = div.clientHeight;

    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, canvas.height, 0, 0);

    const heatmapGradient = revertKey(getColorGradient());

    Object.keys(heatmapGradient).forEach((key) => {
      grad.addColorStop(Number(key), heatmapGradient[key]);
    });

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, [selectedGradient]);

  return (
    <div id="heatmap-legend-container" className="d-flex flex-column p-2">
      <div className="d-flex justify-content-between align-items-center">
        <div id="legend-subheader" style={{ fontSize: '1.25rem' }}>
          Heatmap
        </div>
        <CloseButton
          title="Close heatmap legend"
          onClick={() => {
            updateSetting('heatmapEnabled', false);
          }}
        />
      </div>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <div>Gradient:</div>
        <select
          onChange={(e) => setGradient(e.target.value as HeatmapGradient)}
          value={selectedGradient}
        >
          <option value={HeatmapGradient.DEFAULT_GRADIENT}>Default</option>
          <option value={HeatmapGradient.TEMPERATURE_GRADIENT}>
            Temperature
          </option>
          <option value={HeatmapGradient.MONOCHROME_GRADIENT}>
            Monochrome
          </option>
        </select>
      </div>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <div>Mapping:</div>
        <select
          onChange={(e) =>
            setValueMapping(e.target.value as HeatmapValueMapping)
          }
          value={selectedValueMapping}
        >
          <option value={HeatmapValueMapping.LINEAR}>Linear</option>
          <option value={HeatmapValueMapping.LOGARITHMIC}>Logarithmic</option>
        </select>
      </div>

      <div
        id="legend-header"
        className="d-flex justify-content-between align-items-center"
      >
        <div>
          <OverlayTrigger
            placement="top"
            trigger={['hover', 'focus']}
            overlay={
              <Tooltip>
                Share heatmap with other users? Green: Yes, Grey: No
              </Tooltip>
            }
          >
            <Button
              variant={heatmapShared ? 'success' : 'secondary'}
              onClick={toggleShared}
            >
              <ShareAndroidIcon
                verticalAlign="middle"
                size="small"
                fill="#777"
              />
            </Button>
          </OverlayTrigger>
        </div>
        <div>
          <input
            id="collapsible"
            className="heatmap-legend-toggle"
            type="checkbox"
            checked={showLegendValues}
            onChange={(e) => {
              setShowLegendValues(e.target.checked);
            }}
          />
          <label
            htmlFor="collapsible"
            className="collapse-toggle-label"
            data-toggle="collapse"
            aria-expanded="false"
            aria-controls="heatmapCollapseContainer"
          ></label>
        </div>
      </div>

      {showLegendValues && (
        <div id="heatmapCollapseContainer" className="collapse show">
          <div className="d-flex flex-row mt-2">
            <>
              <div id="heatmap-legend" ref={legendRef}>
                <canvas
                  id="legend-canvas"
                  height="100%"
                  ref={canvasRef}
                ></canvas>
              </div>
              <div id="heatmap-legend-label">
                {LEGEND_RATIOS.map((ratio, index) => (
                  <span key={`legend-label-${ratio}`} className="heatmap-label">
                    {legendLabels[index]}
                  </span>
                ))}
              </div>
            </>
          </div>
        </div>
      )}
    </div>
  );
}

function formatLegendValue(value: number): string {
  if (!Number.isFinite(value)) {
    return '0';
  }

  return Math.round(value).toString();
}
