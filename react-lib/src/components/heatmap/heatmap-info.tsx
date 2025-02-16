import React, { useEffect, useRef } from 'react';
import { Metric } from 'react-lib/src/utils/metric-schemes/metric-data';
import { useUserSettingsStore } from 'react-lib/src/stores/user-settings';
import MetricSelector from 'react-lib/src/components/heatmap/metric-selector';

// TODO: Original from modifiers/interaction-modifier. Import again after modifer is migrated
type Position2D = {
    x: number;
    y: number;
  };

interface HeatmapInfoArgs {
  metrics: Metric[];
  updateMetric(metric: Metric): void;
  selectedMetric: Metric | null;
}

export default function HeatmapInfo({
    metrics,
    updateMetric,
    selectedMetric,
}: HeatmapInfoArgs) {
    const heatmapRef = useRef(null);

    useEffect(() => {
    return () => {
        useUserSettingsStore.getState().updateSetting('heatmapEnabled', false);
    };
    }, []);

    let element!: HTMLElement;

    let lastMousePosition: Position2D = {
    x: 0,
    y: 0,
    };

    const dragMouseDown = (event: MouseEvent) => {
    event.stopPropagation();
    // get the mouse cursor position at startup:
    lastMousePosition.x = event.clientX;
    lastMousePosition.y = event.clientY;
    document.onpointerup = this.closeDragElement;
    // call a function whenever the cursor moves:
    document.onpointermove = this.elementDrag;
    }

    // eslint-disable-next-line class-methods-use-this
    const closeDragElement = () => {
    /* stop moving when mouse button is released: */
    document.onpointerup = null;
    document.onpointermove = null;
    }

    const elementDrag = (event: MouseEvent) => {
    event.preventDefault();
    // calculate the new cursor position:
    const diffX = lastMousePosition.x - event.clientX;
    const diffY = lastMousePosition.y - event.clientY;
    lastMousePosition.x = event.clientX;
    lastMousePosition.y = event.clientY;
    // set the element's new position:
    const containerDiv = element.parentElement as HTMLElement;

    const popoverHeight = element.clientHeight;
    const popoverWidth = element.clientWidth;

    let newPositionX = element.offsetLeft - diffX;
    let newPositionY = element.offsetTop - diffY;

    if (newPositionX < 0) {
        newPositionX = 0;
    } else if (
        containerDiv.clientWidth &&
        newPositionX > containerDiv.clientWidth - popoverWidth
    ) {
        newPositionX = containerDiv.clientWidth - popoverWidth;
    }

    if (newPositionY < 0) {
        newPositionY = 0;
    } else if (
        containerDiv.clientHeight &&
        newPositionY > containerDiv.clientHeight - popoverHeight
    ) {
        newPositionY = containerDiv.clientHeight - popoverHeight;
    }

    element.style.top = `${newPositionY}px`;
    element.style.left = `${newPositionX}px`;
    }

    const setPopupPosition = (popoverDiv: HTMLDivElement) => {
    element = popoverDiv;

    const containerDiv = element.parentElement as HTMLElement;

    element.style.top = '100px';
    element.style.left = `${containerDiv.clientWidth / 2}px`;
    }

    return (
    <div
        id='heatmapInfo'
        className='foreground'
        style={{position: 'absolute', cursor: 'move'}}
        onPointerDown={() => dragMouseDown}
        ref={heatmapRef}
        >
        <MetricSelector/>
        {/* TODO: Insert HeatmapLegend <Heatmap::HeatmapLegend /> */}
    </div>
    )

}
