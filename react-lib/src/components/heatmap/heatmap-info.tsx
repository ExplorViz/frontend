import React, { useEffect, useRef } from 'react';
import { useUserSettingsStore } from 'react-lib/src/stores/user-settings';
import HeatmapLegend from 'react-lib/src/components/heatmap/heatmap-legend.tsx';
import MetricSelector from 'react-lib/src/components/heatmap/metric-selector.tsx';
import { Position2D } from 'react-lib/src/hooks/interaction-modifier';

export default function HeatmapInfo() {
  const heatmapRef = useRef(null);
  const element = useRef<HTMLElement | null>(null);
  let lastMousePosition = useRef<Position2D>({ x: 0, y: 0 });

  const dragMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    // get the mouse cursor position at startup:
    lastMousePosition.current.x = event.clientX;
    lastMousePosition.current.y = event.clientY;
    document.onpointerup = closeDragElement;
    // call a function whenever the cursor moves:
    document.onpointermove = elementDrag;
  };

  // eslint-disable-next-line class-methods-use-this
  const closeDragElement = () => {
    /* stop moving when mouse button is released: */
    document.onpointerup = null;
    document.onpointermove = null;
  };

  const elementDrag = (event: MouseEvent) => {
    event.preventDefault();
    // calculate the new cursor position:
    const diffX = lastMousePosition.current.x - event.clientX;
    const diffY = lastMousePosition.current.y - event.clientY;
    lastMousePosition.current.x = event.clientX;
    lastMousePosition.current.y = event.clientY;

    // set the element's new position:
    const containerDiv = element.current!.parentElement as HTMLElement;

    const popoverHeight = element.current!.clientHeight;
    const popoverWidth = element.current!.clientWidth;

    let newPositionX = element.current!.offsetLeft - diffX;
    let newPositionY = element.current!.offsetTop - diffY;

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

    element.current!.style.top = `${newPositionY}px`;
    element.current!.style.left = `${newPositionX}px`;
  };

  const setPopupPosition = (popoverDiv: HTMLDivElement) => {
    element.current = popoverDiv;

    const containerDiv = element.current.parentElement as HTMLElement;
    console.log(
      'containerDiv: ' + containerDiv + ' ' + containerDiv.clientWidth
    );

    element.current!.style.top = '100px';
    element.current!.style.left = `${containerDiv.clientWidth / 2}px`;
  };

  useEffect(() => {
    if (heatmapRef.current != null) {
      setPopupPosition(heatmapRef.current);
    }

    return () => {
      useUserSettingsStore.getState().updateSetting('heatmapEnabled', false);
    };
  }, []);

  return (
    <div
      id="heatmapInfo"
      className="foreground"
      style={{ position: 'absolute', cursor: 'move' }}
      onPointerDown={dragMouseDown}
      ref={heatmapRef}
    >
      <HeatmapLegend />
      <MetricSelector />
    </div>
  );
}
