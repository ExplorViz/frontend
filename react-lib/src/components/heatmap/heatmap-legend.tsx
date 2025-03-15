import React, { useEffect, useRef } from 'react';
import HelpTooltip from 'react-lib/src/components/help-tooltip.tsx';
import {
  useHeatmapConfigurationStore,
  HeatmapMode,
} from 'react-lib/src/stores/heatmap/heatmap-configuration';
import Button from 'react-bootstrap/Button';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import Tooltip from 'react-bootstrap/Tooltip';
import { ShareAndroidIcon } from '@primer/octicons-react';

interface Args {
  descriptions?: {
    aggregatedHeatmap: string;
    windowedHeatmap: string;
    snapshotHeatmap: string;
  };
}

function getSubHeader(mode: HeatmapMode) {
  if (mode === 'snapshotHeatmap') {
    return 'Snapshot score:';
  }
  if (mode === 'aggregatedHeatmap') {
    return 'Cont. score:';
  }
  if (mode === 'windowedHeatmap') {
    return 'Windowed (average) score:';
  }
  return 'Subheader';
}

function getDescriptions(descriptions: any) {
  return (
    descriptions ?? {
      aggregatedHeatmap:
        'Continuously aggregates metric scores by adding a part of the previous metric score to the new (visualized) value.',
      windowedHeatmap:
        'Visualizes the average for the selected metric considering the last ten scores.',
      snapshotHeatmap:
        'Visualizes the metric scores of the currently rendered snapshot.',
    }
  );
}

export default function HeatmapLegend(args: Args) {
  const heatmapShared = useHeatmapConfigurationStore(
    (state) => state.heatmapShared
  );

  const currentApplication = useHeatmapConfigurationStore(
    (state) => state.currentApplication
  );

  const selectedMetric = useHeatmapConfigurationStore(
    (state) => state.getSelectedMetric
  )();

  const selectedMode = useHeatmapConfigurationStore(
    (state) => state.selectedMode
  );

  useHeatmapConfigurationStore((state) => state.selectedMetricName); // For reactivity on metric change

  const toggleShared = useHeatmapConfigurationStore(
    (state) => state.toggleShared
  );

  const switchHeatmapMode = useHeatmapConfigurationStore(
    (state) => state.switchMode
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

    const heatmapGradient = useHeatmapConfigurationStore
      .getState()
      .getSimpleHeatGradient();

    Object.keys(heatmapGradient).forEach((key) => {
      grad.addColorStop(Number(key), heatmapGradient[key]);
    });

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  });

  return (
    <div id="heatmap-legend-container" className="d-flex flex-column p-2">
      <div id="legend-header">
        {/* THIS WAS ALREADY COMMENTED {{!-- <div>
                <span id='legend-header-content'>Heatmap</span>
                {{#if (eq this.heatmapConfiguration.selectedMode 'aggregatedHeatmap')}}
                    <div
                    {{react
                    this.helpTooltipComponent
                    title=this.descriptions.aggregatedHeatmap
                    }}/>
                {{else if (eq this.heatmapConfiguration.selectedMode 'windowedHeatmap')}}
                    <div
                    {{react
                    this.helpTooltipComponent
                    title=this.descriptions.windowedHeatmap
                    }}/>
                {{else}}
                    <div
                    {{react
                    this.helpTooltipComponent
                    title=this.descriptions.snapshotHeatmap
                    }}/>
                {{/if}}
                </div>
                <div>
                <button
                    class='button-svg-with-hover'
                    type='button'
                    {{on 'click' this.switchHeatMapMode}}
                >
                    {{svg-jar 'arrow-switch-16' class='octicon align-middle'}}
                    <BsTooltip @placement='bottom' @triggerEvents='hover'>
                    Switch Heat Map Mode.
                    </BsTooltip>
                </button>
                </div> --}} */}

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
          <HelpTooltip title="Select an application by clicking on its foundation" />
        </div>
        <div>
          <input
            id="collapsible"
            className="heatmap-legend-toggle"
            type="checkbox"
            checked
          />
          <label
            htmlFor="collapsible"
            className="collapse-toggle-label"
            data-toggle="collapse"
            href="#heatmapCollapseContainer" // TODO uses invalid attribute 'href' on label
            aria-expanded="false"
            aria-controls="heatmapCollapseContainer"
          ></label>
        </div>
      </div>

      <div id="heatmapCollapseContainer" className="collapse show">
        <div
          id="legend-subheader"
          className="mt-1"
          style={{ fontSize: '0.75rem' }}
        >
          {getSubHeader(selectedMode)}
        </div>
        <div className="d-flex flex-row mt-2">
          {currentApplication ? (
            <>
              <div id="heatmap-legend" ref={legendRef}>
                <canvas
                  id="legend-canvas"
                  height="100%"
                  ref={canvasRef}
                ></canvas>
              </div>
              <div id="heatmap-legend-label">
                <span className="heatmap-label">{selectedMetric!.max}</span>
                <span className="heatmap-label">
                  {(selectedMetric!.max / 2).toFixed(0)}
                </span>
                <span className="heatmap-label">{selectedMetric!.min}</span>
              </div>
            </>
          ) : (
            <>Please select an application by clicking on its foundation</>
          )}
        </div>
      </div>
    </div>
  );
}
