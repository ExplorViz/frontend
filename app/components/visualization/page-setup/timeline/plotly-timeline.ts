import { action } from '@ember/object';
import Component from '@glimmer/component';
import debugLogger from 'ember-debug-logger';
import { Timestamp } from 'explorviz-frontend/services/repos/timestamp-repository';
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
    const fallbackValue = 12;
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
    this.userSlidingWindow = null;
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
        const { min, max } = self.oldPlotlySlidingWindow;
        const update = PlotlyTimeline.getPlotlySlidingWindowUpdateObject(
          min,
          max
        );
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

    const latestTimestamp = timestamps[timestamps.length - 1];
    const latestTimestampValue = new Date(latestTimestamp.timestamp);

    const windowInterval = PlotlyTimeline.getSlidingWindowInterval(
      latestTimestampValue,
      this.slidingWindowLowerBoundInMinutes,
      this.slidingWindowUpperBoundInMinutes
    );

    const layout = PlotlyTimeline.getPlotlyLayoutObject(
      windowInterval.min,
      windowInterval.max
    );

    this.oldPlotlySlidingWindow = windowInterval;

    Plotly.newPlot(
      this.timelineDiv,
      data,
      layout,
      PlotlyTimeline.getPlotlyOptionsObject()
    );

    this.initDone = true;
  }

  extendPlotlyTimelineChart(timestamps: Timestamp[]) {
    if (timestamps.length === 0) {
      return;
    }

    const data: any = this.getUpdatedPlotlyDataObject(
      timestamps,
      this.markerState
    );

    const latestTimestamp: Timestamp = timestamps[timestamps.length - 1];
    const latestTimestampValue = new Date(latestTimestamp.timestamp);

    const windowInterval = PlotlyTimeline.getSlidingWindowInterval(
      latestTimestampValue,
      this.slidingWindowLowerBoundInMinutes,
      this.slidingWindowUpperBoundInMinutes
    );

    const layout = this.userSlidingWindow
      ? this.userSlidingWindow
      : PlotlyTimeline.getPlotlyLayoutObject(
          windowInterval.min,
          windowInterval.max
        );

    this.oldPlotlySlidingWindow = windowInterval;

    Plotly.react(
      this.timelineDiv,
      data,
      layout,
      PlotlyTimeline.getPlotlyOptionsObject()
    );
  }

  continueTimeline(oldSelectedTimestampRecords: Timestamp[]) {
    this.resetHighlingInStateObjects();

    // call this to initialize the internal marker state variable
    this.getUpdatedPlotlyDataObject(this.timestamps, this.markerState);

    const { highlightedMarkerColor, highlightedMarkerSize } = this;

    oldSelectedTimestampRecords.forEach((timestamp) => {
      const timestampId = timestamp.id;

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
      PlotlyTimeline.getPlotlyLayoutObject(minRange, maxRange),
      PlotlyTimeline.getPlotlyOptionsObject()
    );
  }

  // END Plot Logic

  // BEGIN Helper functions

  static getPlotlySlidingWindowUpdateObject(
    minTimestamp: number,
    maxTimestamp: number
  ): { xaxis: { type: 'date'; range: number[]; title: {} } } {
    return {
      xaxis: {
        range: [minTimestamp, maxTimestamp],
        title: {
          font: {
            color: '#7f7f7f',
            size: 16,
          },
          text: 'Time',
        },
        type: 'date',
      },
    };
  }

  static hoverText(x: Date[], y: number[]) {
    return x.map(
      (xi, i) => `<b>Time</b>: ${xi}<br><b>Requests</b>: ${y[i]}<br>`
    );
  }

  static getSlidingWindowInterval(
    t: Date,
    lowerBound: number,
    upperBound: number
  ): { min: number; max: number } {
    const minTimestamp = t.setMinutes(t.getMinutes() - lowerBound);
    const maxTimestamp = t.setMinutes(t.getMinutes() + upperBound);

    return { min: minTimestamp, max: maxTimestamp };
  }

  static getPlotlyLayoutObject(minRange: number, maxRange: number): {} {
    return {
      dragmode: 'pan',
      hoverdistance: 10,
      hovermode: 'closest',
      margin: {
        b: 40,
        pad: 5,
        t: 20,
        r: 40,
      },
      xaxis: {
        range: [minRange, maxRange],
        title: {
          font: {
            color: '#7f7f7f',
            size: 16,
          },
          text: 'Time',
        },
        type: 'date',
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
    };
  }

  getUpdatedPlotlyDataObject(
    timestamps: Timestamp[],
    markerStates: IMarkerStates
  ): [{}] {
    const colors: string[] = [];
    const sizes: number[] = [];

    const x: Date[] = [];
    const y: number[] = [];

    const timestampIds: string[] = [];

    timestamps.forEach((timestamp) => {
      const timestampId = timestamp.id;

      x.push(new Date(timestamp.timestamp));
      y.push(timestamp.totalRequests);

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
    });

    this.markerState = markerStates;

    return PlotlyTimeline.getPlotlyDataObject(
      x,
      y,
      colors,
      sizes,
      timestampIds
    );
  }

  static getPlotlyDataObject(
    dates: Date[],
    requests: number[],
    colors: string[],
    sizes: number[],
    timestampIds: string[]
  ): [{}] {
    return [
      {
        fill: 'tozeroy',
        hoverinfo: 'text',
        hoverlabel: {
          align: 'left',
        },
        marker: { color: colors, size: sizes },
        mode: 'lines+markers',
        text: PlotlyTimeline.hoverText(dates, requests),
        timestampId: timestampIds,
        type: 'scattergl',
        x: dates,
        y: requests,
      },
    ];
  }

  resetHighlingInStateObjects() {
    this.selectedTimestamps = [];
    this.markerState = {};
  }

  resetSelectionInStateObjects() {
    const selTimestamps: Timestamp[] = this.selectedTimestamps;

    const { defaultMarkerColor, defaultMarkerSize } = this;

    selTimestamps.forEach((t) => {
      this.markerState[t.id].color = defaultMarkerColor;
      this.markerState[t.id].size = defaultMarkerSize;
    });

    this.selectedTimestamps = [];
  }

  static getPlotlyOptionsObject(): {} {
    return {
      displayModeBar: false,
      doubleClick: false,
      responsive: true,
      scrollZoom: true,
    };
  }

  // END Helper functions
}
