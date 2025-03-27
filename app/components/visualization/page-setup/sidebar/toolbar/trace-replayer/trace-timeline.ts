import { action } from '@ember/object';
import Component from '@glimmer/component';
import Plotly from 'plotly.js-dist';
import { TraceNode } from 'explorviz-frontend/components/visualization/page-setup/sidebar/toolbar/trace-replayer/trace-tree';
import { tracked } from '@glimmer/tracking';
import Ember from 'ember';
import observer = Ember.observer;
import { layouts } from 'chart.js';

interface Args {
  timeline: TraceNode[];
  observer: ((cursor: number) => void)[];
  callback: ((cursor: number) => void)[];
}

export default class PlotlyTimeline extends Component<Args> {
  private div: any;

  get options() {
    return {
      displayModeBar: false,
      doubleClick: true,
      responsive: true,
      scrollZoom: false,
    };
  }

  private data: any = {};
  private layout: any = {};

  @action
  setup(div: any) {
    this.div = div;

    const start: number[] = [];
    const end: number[] = [];
    const text: string[] = [];

    console.log(this.args.timeline);

    this.args.timeline.forEach((node: TraceNode) => {
      start.push(node.start + node.startDelay);
      end.push(node.end + node.endDelay);
      text.push(node.id);
    });

    this.data = [
      {
        mode: 'markers',
        type: 'scatter',
        text: text,
        hovertemplate: '%{text}<extra></extra>',
        showlegend: false,
        marker: {
          color: '#ff7f0e',
          size: 10,
          symbol: 'triangle-left',
        },
        x: end,
        y: end.map((_: any) => -0.25),
      },
      {
        mode: 'markers',
        type: 'scatter',
        text: text,
        hovertemplate: '%{text}<extra></extra>',
        showlegend: false,
        marker: {
          color: '#1f77b4',
          size: 10,
          symbol: 'triangle-right',
        },
        x: start,
        y: start.map((_: any) => 0.25),
      },
    ];

    const max = Math.max(...end);

    this.layout = {
      dragmode: 'pan',
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
        title: 'ms',
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
        {
          type: 'line',
          x0: 0,
          y0: -1,
          x1: 0,
          y1: 1,
          line: {
            color: '#d62728',
            width: 3,
          },
        },
      ],
    };

    Plotly.newPlot(this.div, this.data, this.layout, this.options);

    this.div.on('plotly_click', (data: any) => {
      const cursor = data.points[0].pointNumber;
      this.args.observer.forEach((observer) => {
        observer(cursor);
      });
      this.args.callback.forEach((callback) => {
        callback(cursor);
      });
    });

    this.args.observer.push((cursor: number) => {
      this.layout['shapes'][2]['x0'] = Math.max(Math.min(cursor, max), 0);
      this.layout['shapes'][2]['x1'] = Math.max(Math.min(cursor, max), 0);

      Plotly.redraw(this.div);
    });
  }
}
