import { action } from '@ember/object';
import Component from '@glimmer/component';
import debugLogger from 'ember-debug-logger';
import { Timestamp } from 'some-react-lib/src/utils/landscape-schemes/timestamp';
import Plotly from 'plotly.js-dist';

interface IMarkerStates {
  [timestampId: string]: {
    color: string;
    size: number;
    emberModel: Timestamp;
  };
}

interface IArgs {
  timestamps?: Timestamp[];
  defaultMarkerColor?: string;
  defaultMarkerSize?: number;
  highlightedMarkerColor?: string;
  highlightedMarkerSize?: number;
  selectionCount?: number;
  slidingWindowLowerBoundInMinutes?: number;
  slidingWindowUpperBoundInMinutes?: number;
  setChildReference?(timeline: PlotlyTimeline): void;
  clicked?(selectedTimestamps: Timestamp[]): void;
}

export default class PlotlyTimeline extends Component<IArgs> {
  // BEGIN template-argument getters for default values
  get defaultMarkerColor() {
    return this.args.defaultMarkerColor || '#1f77b4';
  }

  get defaultMarkerSize() {
    const fallbackValue = 8;
    return this.args.defaultMarkerSize || fallbackValue;
  }

  get highlightedMarkerColor() {
    return this.args.highlightedMarkerColor || 'red';
  }

  get highlightedMarkerSize() {
    const fallbackValue = 15;
    return this.args.highlightedMarkerSize || fallbackValue;
  }

  get selectionCount() {
    return this.args.selectionCount || 1;
  }

  get slidingWindowLowerBoundInMinutes() {
    const fallbackValue = 4;
    return this.args.slidingWindowLowerBoundInMinutes || fallbackValue;
  }

  get slidingWindowUpperBoundInMinutes() {
    const fallbackValue = 4;
    return this.args.slidingWindowUpperBoundInMinutes || fallbackValue;
  }

  get timestamps() {
    return this.args.timestamps || [];
  }
  // END template-argument getters for default values

  readonly debug = debugLogger();

  initDone = false;

  oldPlotlySlidingWindow = { min: 0, max: 0 };

  userSlidingWindow = null;

  // variable used for output when clicked
  selectedTimestamps: Timestamp[] = [];

  markerState: IMarkerStates = {};

  timelineDiv: any;

  plotlyTimestampsWithoutNullValues: any;

  // BEGIN Ember Div Events
  @action
  handleMouseEnter(plotlyDiv: any) {
    // if user hovers over plotly, save his
    // sliding window, so that updating the
    // plot won't modify his current viewport
    if (plotlyDiv && plotlyDiv.layout) {
      this.userSlidingWindow = plotlyDiv.layout;
    }
  }

  @action
  handleMouseLeave() {
    //this.userSlidingWindow = null;
  }
  // END Ember Div Events

  @action
  didRender(plotlyDiv: any) {
    // register this component at its parent if set via template
    const parentFunction = this.args.setChildReference;
    if (parentFunction) {
      parentFunction(this);
    }

    this.timelineDiv = plotlyDiv;

    if (this.initDone) {
      this.extendPlotlyTimelineChart(this.timestamps);
    } else {
      this.setupPlotlyTimelineChart(this.timestamps);
      if (this.initDone) {
        this.setupPlotlyListener();
      }
    }
  }

  setupPlotlyListener() {
    const dragLayer: any = document.getElementsByClassName('nsewdrag')[0];

    const plotlyDiv = this.timelineDiv;

    if (plotlyDiv && plotlyDiv.layout) {
      const self: PlotlyTimeline = this;

      // singe click
      plotlyDiv.on('plotly_click', (data: any) => {
        // https://plot.ly/javascript/reference/#scatter-marker

        const pn = data.points[0].pointNumber;

        const numberOfPoints = data.points[0].fullData.x.length;

        let colors = data.points[0].fullData.marker.color;
        let sizes = data.points[0].fullData.marker.size;

        // reset old selection, since maximum selection value is achieved
        // and user clicked on a new point
        if (self.selectedTimestamps.length === self.selectionCount) {
          self.resetSelectionInStateObjects();

          colors = Array(numberOfPoints).fill(self.defaultMarkerColor);
          sizes = Array(numberOfPoints).fill(self.defaultMarkerSize);
        }

        const { highlightedMarkerSize, highlightedMarkerColor } = self;

        colors[pn] = highlightedMarkerColor;
        sizes[pn] = highlightedMarkerSize;

        const timestampId = data.points[0].data.timestampId[pn];

        self.markerState[timestampId].color = highlightedMarkerColor;
        self.markerState[timestampId].size = highlightedMarkerSize;

        const update = { marker: { color: colors, size: sizes } };

        // trace number, necessary for the restyle function
        const tn = data.points[0].curveNumber;
        Plotly.restyle(plotlyDiv, update, [tn]);

        self.selectedTimestamps.push(self.markerState[timestampId].emberModel);

        // Check if component should pass the selected timestamps
        // to its parent
        if (self.selectionCount > 1) {
          if (self.selectedTimestamps.length === self.selectionCount) {
            // closure action
            if (self.args.clicked) self.args.clicked(self.selectedTimestamps);
          }
        } else if (self.args.clicked) {
          // closure action
          self.args.clicked(self.selectedTimestamps);
        }
      });

      // double click
      plotlyDiv.on('plotly_doubleclick', () => {
        self.userSlidingWindow = null;
        const min = this.plotlyTimestampsWithoutNullValues - 30;
        const max = this.plotlyTimestampsWithoutNullValues;
        const update = this.getPlotlyAxisXObject(min, max);
        Plotly.relayout(plotlyDiv, update);
      });

      // Show cursor when hovering data point
      if (dragLayer) {
        plotlyDiv.on('plotly_hover', () => {
          dragLayer.style.cursor = 'pointer';
        });

        plotlyDiv.on('plotly_unhover', () => {
          dragLayer.style.cursor = '';
        });

        plotlyDiv.on('plotly_relayouting', () => {
          // if user drags the plot, save his
          // sliding window, so that updating the
          // plot won't modify his current viewport
          if (plotlyDiv && plotlyDiv.layout) {
            self.userSlidingWindow = plotlyDiv.layout;
          }
        });
      }
    }
  }

  // BEGIN Plot Logic

  setupPlotlyTimelineChart(timestamps: Timestamp[]) {
    if (timestamps.length === 0) {
      this.createDummyTimeline();
      return;
    }

    const data = this.getUpdatedPlotlyDataObject(timestamps, this.markerState);

    const { shapes } = data;

    this.plotlyTimestampsWithoutNullValues = data.x.filter(
      (x: any) => !!x
    ).length;

    let layout = this.userSlidingWindow
      ? this.userSlidingWindow
      : this.getPlotlyLayoutObject(
        this.plotlyTimestampsWithoutNullValues - 30,
        this.plotlyTimestampsWithoutNullValues
      );

    this.oldPlotlySlidingWindow = {
      min: this.plotlyTimestampsWithoutNullValues - 30,
      max: this.plotlyTimestampsWithoutNullValues,
    };

    layout = { ...layout, ...{ shapes: shapes } };

    Plotly.newPlot(
      this.timelineDiv,
      [data],
      layout,
      this.getPlotlyOptionsObject()
    );

    this.initDone = true;
  }

  extendPlotlyTimelineChart(timestamps: Timestamp[]) {
    if (timestamps.length === 0) {
      return;
    }

    const data = this.getUpdatedPlotlyDataObject(timestamps, this.markerState);

    const { shapes } = data;

    this.plotlyTimestampsWithoutNullValues = data.x.filter(
      (x: any) => !!x
    ).length;

    let layout = this.userSlidingWindow
      ? this.userSlidingWindow
      : this.getPlotlyLayoutObject(
        this.plotlyTimestampsWithoutNullValues - 30,
        this.plotlyTimestampsWithoutNullValues
      );

    this.oldPlotlySlidingWindow = {
      min: this.plotlyTimestampsWithoutNullValues - 30,
      max: this.plotlyTimestampsWithoutNullValues,
    };

    layout = { ...layout, ...{ shapes: shapes } };

    Plotly.react(
      this.timelineDiv,
      [data],
      layout,
      this.getPlotlyOptionsObject()
    );
  }

  continueTimeline(oldSelectedTimestampRecords: Timestamp[]) {
    this.resetHighlingInStateObjects();

    // call this to initialize the internal marker state variable
    this.getUpdatedPlotlyDataObject(this.timestamps, this.markerState);

    const { highlightedMarkerColor, highlightedMarkerSize } = this;

    oldSelectedTimestampRecords.forEach((timestamp) => {
      const timestampId = timestamp.epochMilli;

      this.markerState[timestampId].color = highlightedMarkerColor;
      this.markerState[timestampId].size = highlightedMarkerSize;
      this.markerState[timestampId].emberModel = timestamp;

      this.selectedTimestamps.push(this.markerState[timestampId].emberModel);
    });

    this.extendPlotlyTimelineChart(this.timestamps);
  }

  resetHighlighting() {
    this.resetHighlingInStateObjects();
    this.extendPlotlyTimelineChart(this.timestamps);
  }

  createDummyTimeline() {
    const minRange = 0;
    const maxRange = 90;
    Plotly.newPlot(
      this.timelineDiv,
      null,
      this.getPlotlyLayoutObject(minRange, maxRange),
      this.getPlotlyOptionsObject()
    );
  }

  // END Plot Logic

  // BEGIN Helper functions

  getPlotlyAxisXObject(minRange: number, maxRange: number) {
    return {
      xaxis: {
        type: 'category',
        tickmode: 'auto',
        nticks: 5,
        tickangle: 0,
        range: [minRange, maxRange],
        title: {
          font: {
            color: '#7f7f7f',
            size: 16,
          },
          text: 'Time',
        },
      },
    };
  }

  hoverText(x: (string | null)[], y: (number | null)[]) {
    return x.map(
      (xi, i) => `<b>Time</b>: ${xi}<br><b>Requests</b>: ${y[i]}<br>`
    );
  }

  getPlotlyLayoutObject(minRange: number, maxRange: number) {
    // Regarding minRange and maxRange for category type
    // https://plotly.com/javascript/reference/layout/xaxis/#layout-xaxis-range
    return {
      ...{
        dragmode: 'pan',
        hoverdistance: 10,
        hovermode: 'closest',
        margin: {
          b: 40,
          pad: 5,
          t: 20,
          r: 40,
        },
        yaxis: {
          fixedrange: true,
          title: {
            font: {
              color: '#7f7f7f',
              size: 16,
            },
            text: 'Requests',
          },
        },
      },
      ...this.getPlotlyAxisXObject(minRange, maxRange),
    };
  }

  getUpdatedPlotlyDataObject(
    timestamps: Timestamp[],
    markerStates: IMarkerStates
  ) {
    function getTimestampTickLabel(timestampEpoch: number) {
      const timestampDate = new Date(timestampEpoch);
      return timestampDate
        .toISOString()
        .replace('T', '<br>')
        .replace('.000Z', '');
    }

    function getGapRectangleObj() {
      return {
        layer: 'below',
        type: 'rect',
        xref: 'x',
        yref: 'paper',
        x0: '0',
        y0: 0.1,
        x1: '0',
        y1: 1,
        fillcolor: '#d3d3d3',
        opacity: 0.4,
        line: {
          width: 3,
          dash: 'dot',
        },
      };
    }

    const colors: string[] = [];
    const sizes: number[] = [];

    const x: (string | null)[] = [];
    const y: (number | null)[] = [];

    const timestampIds: number[] = [];

    const shapes = [];

    let tempGapRectObj = null;

    let nextExpectedTimestamp = 0;
    let i = 0;

    while (i < timestamps.length) {
      const timestamp = timestamps[i];
      const timestampId = timestamp.epochMilli;

      if (nextExpectedTimestamp === 0) {
        // first timestamp in series
        x.push(getTimestampTickLabel(timestampId));
        y.push(timestamp.spanCount);
        nextExpectedTimestamp = timestampId;
        i++;
      } else if (nextExpectedTimestamp === timestampId) {
        // subsequent timestamps
        x.push(getTimestampTickLabel(timestampId));
        y.push(timestamp.spanCount);
        i++;
        if (tempGapRectObj) {
          tempGapRectObj.x1 = getTimestampTickLabel(timestampId);
          shapes.push(tempGapRectObj);
          tempGapRectObj = null;
        }
      } else if (timestamp.epochMilli === null) {
        // edge case if API will return null values in the future
        x.push(null);
        y.push(null);
        i++;
      } else {
        // gap fills for timestamps that did not occur
        x.push(null);
        y.push(null);
        if (!tempGapRectObj) {
          tempGapRectObj = getGapRectangleObj();
          tempGapRectObj.x0 = getTimestampTickLabel(
            nextExpectedTimestamp - 10000
          );
        }
      }

      nextExpectedTimestamp += 10000;

      const markerState = markerStates[timestampId];

      if (markerState) {
        // already plotted -> take old values
        colors.push(markerState.color);
        sizes.push(markerState.size);
      } else {
        // new point
        const defaultColor = this.defaultMarkerColor;
        const defaultSize = this.defaultMarkerSize;

        colors.push(defaultColor);
        sizes.push(defaultSize);

        // eslint-disable-next-line
        markerStates[timestampId] = {
          color: defaultColor,
          emberModel: timestamp,
          size: defaultSize,
        };
      }
      timestampIds.push(timestampId);
    }

    this.markerState = markerStates;

    return {
      ...this.getPlotlyDataObject(x, y, colors, sizes, timestampIds),
      ...{ shapes: shapes },
    };
  }

  getPlotlyDataObject(
    dates: (string | null)[],
    requests: (number | null)[],
    colors: string[],
    sizes: number[],
    timestampIds: number[]
  ) {
    return {
      // IMPORTANT BUG WORKAROUND https://community.plotly.com/t/scatter-line-plot-fill-option-fills-gaps/21264
      //fill: 'tozeroy',
      hoverinfo: 'text',
      hoverlabel: {
        align: 'left',
      },
      marker: { color: colors, size: sizes },
      mode: 'lines+markers',
      connectgaps: false,
      text: this.hoverText(dates, requests),
      timestampId: timestampIds,
      x: dates,
      y: requests,
    };
  }

  resetHighlingInStateObjects() {
    this.selectedTimestamps = [];
    this.markerState = {};
  }

  resetSelectionInStateObjects() {
    const selTimestamps: Timestamp[] = this.selectedTimestamps;

    const { defaultMarkerColor, defaultMarkerSize } = this;

    selTimestamps.forEach((t) => {
      this.markerState[t.epochMilli].color = defaultMarkerColor;
      this.markerState[t.epochMilli].size = defaultMarkerSize;
    });

    this.selectedTimestamps = [];
  }

  getPlotlyOptionsObject() {
    return {
      displayModeBar: false,
      doubleClick: false,
      responsive: true,
      scrollZoom: true,
    };
  }

  // END Helper functions
}
