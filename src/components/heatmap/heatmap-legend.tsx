import { useEffect, useRef } from 'react';

import { ShareAndroidIcon } from '@primer/octicons-react';
import { useHeatmapStore } from 'explorviz-frontend/src/stores/heatmap/heatmap-store';
import Button from 'react-bootstrap/Button';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import { useShallow } from 'zustand/react/shallow';
import {
  getDefaultGradient,
  revertKey,
} from 'explorviz-frontend/src/utils/heatmap/simple-heatmap';
import { CloseButton } from 'react-bootstrap';

export default function HeatmapLegend() {
  const {
    deactivate,
    heatmapShared,
    selectedClassMetric,
    toggleShared,
    showLegendValues,
    setShowLegendValues,
  } = useHeatmapStore(
    useShallow((state) => ({
      deactivate: state.deactivate,
      heatmapShared: state.heatmapShared,
      selectedClassMetric: state.getSelectedClassMetric(),
      showLegendValues: state.showLegendValues,
      setShowLegendValues: state.setShowLegendValues,
      toggleShared: state.toggleShared,
    }))
  );

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const legendRef = useRef<HTMLDivElement>(null);

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

    const heatmapGradient = revertKey(getDefaultGradient());

    Object.keys(heatmapGradient).forEach((key) => {
      grad.addColorStop(Number(key), heatmapGradient[key]);
    });

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  });

  return (
    <div id="heatmap-legend-container" className="d-flex flex-column p-2">
      <div className="d-flex justify-content-between align-items-center">
        <div id="legend-subheader" style={{ fontSize: '1.25rem' }}>
          Heatmap
        </div>
        <CloseButton
          title="Close heatmap legend"
          onClick={() => {
            deactivate;
          }}
        />
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
                <span className="heatmap-label">
                  {selectedClassMetric?.max}
                </span>
                <span className="heatmap-label">
                  {selectedClassMetric &&
                    (selectedClassMetric.max - selectedClassMetric.min) / 2}
                </span>
                <span className="heatmap-label">
                  {selectedClassMetric?.min}
                </span>
              </div>
            </>
          </div>
        </div>
      )}
    </div>
  );
}
