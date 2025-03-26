import { action } from '@ember/object';
import Component from '@glimmer/component';
import Plotly from 'plotly.js-dist';

interface IArgs {
  traceTimeline: number[][];
}

export default class PlotlyTimeline extends Component<IArgs> {
  private timelineDiv: any;

  private selectorOptions = {
    buttons: [
      {
        step: 'month',
        stepmode: 'backward',
        count: 1,
        label: '1m',
      },
      {
        step: 'month',
        stepmode: 'backward',
        count: 6,
        label: '6m',
      },
      {
        step: 'year',
        stepmode: 'todate',
        count: 1,
        label: 'YTD',
      },
      {
        step: 'year',
        stepmode: 'backward',
        count: 1,
        label: '1y',
      },
      {
        step: 'all',
      },
    ],
  };

  public prepData() {
    const x: number[] = [];
    const y: number[] = [];

    this.args.traceTimeline.forEach((point) => {
      x.push(point[0]);
      y.push(point[1]);
    });

    return [
      {
        type: 'bar',
        width: 0.1,
        orientation: 'v',
        x: x,
        y: y,
      },
    ];
  }

  getPlotlyOptionsObject() {
    return {
      displayModeBar: false,
      doubleClick: true,
      responsive: true,
      scrollZoom: false,
    };
  }

  @action
  setupPlotlyTimelineChart(plotlyDiv: any) {
    this.timelineDiv = plotlyDiv;

    const data = this.prepData();

    const layout = {
      xaxis: {
        rangeselector: this.selectorOptions,
        rangeslider: {},
        title: 'ms',
      },
      yaxis: {
        range: [0, 1],
        fixedrange: true,
        showline: false,
        showticklabels: false,
      },
    };

    Plotly.newPlot(
      this.timelineDiv,
      data,
      layout,
      this.getPlotlyOptionsObject()
    );
  }
}
