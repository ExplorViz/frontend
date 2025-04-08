import React, { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist';
import { TraceNode } from 'explorviz-frontend/src/components/visualization/page-setup/sidebar/toolbar/trace-replayer/trace-tree';

interface TraceTimelineProps {
  timeline: TraceNode[];
  select: boolean;
  cursor: boolean;
  observer: ((cursor: number) => void)[];
  selection: (start: number, end: number) => void;
  callback: (cursor: number) => void;
}

export default function TraceTimeline({
  timeline,
  select,
  cursor,
  observer,
  selection,
  callback,
}: TraceTimelineProps) {
  const divRef = useRef<HTMLDivElement | null>(null);

  const options = {
    displayModeBar: false,
    doubleClick: true,
    responsive: true,
    scrollZoom: false,
  };

  const max = Math.max(...timeline.map((node) => node.end));

  const data = [
    {
      mode: 'markers',
      type: 'scatter',
      text: timeline.map((node) => node.name),
      hovertemplate: '%{text}<extra></extra>',
      showlegend: false,
      marker: {
        color: '#ff7f0e',
        size: 10,
        symbol: 'triangle-left',
      },
      x: timeline.map((node) => node.end),
      y: timeline.map(() => -0.25),
    },
    {
      mode: 'markers',
      type: 'scatter',
      text: timeline.map((node) => node.name),
      hovertemplate: '%{text}<extra></extra>',
      showlegend: false,
      marker: {
        color: '#1f77b4',
        size: 10,
        symbol: 'triangle-right',
      },
      x: timeline.map((node) => node.start),
      y: timeline.map(() => 0.25),
    },
  ];

  const layout = {
    dragmode: select ? 'select' : 'pan',
    selectdirection: 'h',
    showlegend: false,
    hovermode: 'closest',
    margin: {
      b: 50,
      pad: 10,
      t: 0,
      r: 20,
      l: 20,
    },
    xaxis: {
      title: 'ns',
      range: [-1, max + 1],
      fixedrange: true,
      showline: false,
      zeroline: false,
      showgrid: true,
    },
    yaxis: {
      range: [-1, 1],
      fixedrange: true,
      showline: false,
      showticklabels: false,
      zeroline: true,
      showgrid: false,
    },
    shapes: [
      {
        type: 'line',
        x0: 0,
        y0: -1,
        x1: 0,
        y1: 1,
        line: {
          color: 'black',
          width: 1,
        },
      },
      {
        type: 'line',
        x0: max,
        y0: -1,
        x1: max,
        y1: 1,
        line: {
          color: 'black',
          width: 1,
        },
      },
    ],
  };

  if (cursor) {
    layout.shapes.push({
      type: 'line',
      x0: 0,
      y0: -1,
      x1: 0,
      y1: 1,
      line: {
        color: '#d62728',
        width: 3,
      },
    });
  }

  useEffect(() => {
    if (divRef.current) {
      Plotly.newPlot(divRef.current, data, layout, options);

      const handleClick = (data: any) => {
        if (data && cursor) {
          const cursorValue = data.points[0].x;
          observer.forEach((obs) => obs(cursorValue));
          callback(cursorValue);
        }
      };

      const handleSelect = (data: any) => {
        if (data && select) {
          const points = data.points.map((point: any) => point.x);
          selection(Math.min(...points), Math.max(...points));
        }
      };

      divRef.current.on('plotly_click', handleClick);
      divRef.current.on('plotly_selected', handleSelect);

      observer.push((cursorValue: number) => {
        if (cursor) {
          layout.shapes[2].x0 = Math.max(Math.min(cursorValue, max), 0);
          layout.shapes[2].x1 = Math.max(Math.min(cursorValue, max), 0);
          Plotly.redraw(divRef.current);
        }
      });

      return () => {
        if (divRef.current) {
          divRef.current.removeEventListener('plotly_click', handleClick);
          divRef.current.removeEventListener('plotly_selected', handleSelect);
        }
      };
    }
  }, [
    data,
    layout,
    options,
    cursor,
    select,
    observer,
    callback,
    selection,
    timeline,
    max,
  ]);

  return <div style={{ width: '100%' }} className="plotlyDiv" ref={divRef} />;
}
