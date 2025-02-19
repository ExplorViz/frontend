import React, { useEffect, useRef } from 'react';
import HelpTooltip from 'react-lib/src/components/help-tooltip.tsx';
import { useHeatmapConfigurationStore } from 'react-lib/src/stores/heatmap/heatmap-configuration';
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

export default function HeatmapLegend() {
//   helpTooltipComponent = HelpTooltip;
    const canvasRef = useRef(null);
    const legendRef = useRef(null);
    const labelRef = useRef(null);

    let canvas!: HTMLCanvasElement;

    let labelCanvas!: HTMLCanvasElement;

    useEffect(() => {}, []);

    

    const getDescriptions = () => {
        return (
        this.args.descriptions ?? {
            aggregatedHeatmap:
            'Continuously aggregates metric scores by adding a part of the previous metric score to the new (visualized) value.',
            windowedHeatmap:
            'Visualizes the average for the selected metric considering the last ten scores.',
            snapshotHeatmap:
            'Visualizes the metric scores of the currently rendered snapshot.',
        }
        );
    }

    const getSubHeader = () => {
        const mode = useHeatmapConfigurationStore.getState().selectedMode;
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

    // didInsertCanvas(canvas: HTMLCanvasElement) {
    //     this.canvas = canvas;
    // }

    const didInsertLegend = (div: HTMLDivElement) => {
        this.canvas.width = div.clientWidth;
        this.canvas.height = div.clientHeight;

        const ctx = this.canvas.getContext('2d')!;
        const grad = ctx.createLinearGradient(0, this.canvas.height, 0, 0);

        const heatmapGradient = useHeatmapConfigurationStore
        .getState()
        .getSimpleHeatGradient();
        Object.keys(heatmapGradient).forEach((key) => {
        grad.addColorStop(Number(key), heatmapGradient[key]);
        });

        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // @action
    // didInsertCanvaslabel(canvas: HTMLCanvasElement) {
    //     this.labelCanvas = canvas;
    // }

    const switchHeatMapMode= () => {
        useHeatmapConfigurationStore.getState().switchMode();
    }

    let legend;
    if (useHeatmapConfigurationStore.getState().currentApplication) {
        legend = (
            <>
            <div id='heatmap-legend' ref={legendRef}>
                <canvas id='legend-canvas' height='100%' ref={canvasRef}/>
            </div>
            <div id='heatmap-legend-label'>
                <span className='heatmap-label'>
                    {useHeatmapConfigurationStore.getState().getSelectedMetric()!.max}
                </span>
                <span className='heatmap-label'>
                    {Math.floor(useHeatmapConfigurationStore.getState().getSelectedMetric()!.max / 2)}
                </span>
                <span className='heatmap-label'>
                    {useHeatmapConfigurationStore.getState().getSelectedMetric()!.min}
                </span>
            </div>
            </>
        );
    } else {
        legend = (
            <div className='d-flex flex-row mt-2'>
                Please select an application by clicking on its foundation
            </div>
        );
    }

    return (
        <div id='heatmap-legend-container' className='d-flex flex-column p-2'>
            <div id='legend-header'>
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
                        trigger="hover"
                        overlay={
                            <Tooltip>
                                Share heatmap with other users? Green: Yes, Grey: No
                            </Tooltip>
                        }
                        >
                        <Button 
                            variant={useHeatmapConfigurationStore.getState().heatmapShared ? 'success' : 'secondary'} 
                            onClick={() => useHeatmapConfigurationStore.getState().toggleShared()}
                        >
                            <ShareAndroidIcon verticalAlign="middle" size="small" fill="#777" />
                        </Button>
                    </OverlayTrigger>
                    <HelpTooltip title='Select an application by clicking on its foundation'/>
                </div>
                <div>
                <input
                    id='collapsible'
                    className='heatmap-legend-toggle'
                    type='checkbox'
                    checked
                />
                {/* HOW? <label
                    htmlFor='collapsible'
                    className='collapse-toggle-label'
                    data-toggle='collapse'
                    href='#heatmapCollapseContainer'
                    aria-expanded='false'
                    aria-controls='heatmapCollapseContainer'
                ></label> */}
                </div>
            </div>

            <div id='heatmapCollapseContainer' className='collapse show'>
                <div id='legend-subheader' className='mt-1' style={{fontSize: '0.75rem'}}>
                    {getSubHeader()}
                </div>
                <div className='d-flex flex-row mt-2'>
                    {legend}
                </div>
            </div>
        </div>
    );
}
