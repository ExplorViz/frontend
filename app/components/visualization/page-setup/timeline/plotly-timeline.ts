import { action } from '@ember/object';
import Component from '@glimmer/component';
import debugLogger from 'ember-debug-logger';
import { SelectedCommit } from 'explorviz-frontend/controllers/visualization';
import { Timestamp } from 'explorviz-frontend/utils/landscape-schemes/timestamp';
import Plotly from 'plotly.js-dist';

interface IMarkerStates {
  [timestampId: string]: {
    color: string;
    size: number;
    emberModel: Timestamp;
  };
}

interface IArgs {
  timestamps?: Timestamp[][];
  defaultMarkerColor?: string;
  defaultMarkerSize?: number;
  highlightedMarkerColor?: string;
  highlightedMarkerSize?: number;
  selectionCount?: number;
  slidingWindowLowerBoundInMinutes?: number;
  slidingWindowUpperBoundInMinutes?: number;
  setChildReference?(timeline: PlotlyTimeline, selectedTimeline: number): void;
  clicked?(selectedTimeline: number, selectedTimestamps: Timestamp[]): void;
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

  initDone = [false, false];

  oldPlotlySlidingWindow = [{ min: 0, max: 0 }, { min: 0, max: 0 }];

  userSlidingWindow = null;

  // variable used for output when clicked
  selectedTimestamps: Timestamp[][] = [[],[]];

  markerState: IMarkerStates[] = [{}, {}];

  timelineDiv: any[] = [[],[]];

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
  didRender(plotlyDiv: any, params: any[]) {
    const selectedTimeline = params[0];
    // register this component at its parent if set via template
    const parentFunction = this.args.setChildReference;
    if (parentFunction) {
      parentFunction(this, selectedTimeline);
    }

    this.timelineDiv[selectedTimeline] = plotlyDiv;
    console.log("SELECTED TIMELINE DID RENDER ::::::", selectedTimeline);

    if (this.initDone[selectedTimeline]) {
      this.extendPlotlyTimelineChart(this.timestamps, selectedTimeline);
    } else {
      this.setupPlotlyTimelineChart(this.timestamps, selectedTimeline);
      if (this.initDone[selectedTimeline]) {
        this.setupPlotlyListener(selectedTimeline);
      }
    }
  }

  setupPlotlyListener(selectedTimeline: number) {
    const dragLayer: any = document.getElementsByClassName('nsewdrag')[0];

    const plotlyDiv = this.timelineDiv[selectedTimeline];

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
          self.resetSelectionInStateObjects(selectedTimeline);

          colors = Array(numberOfPoints).fill(self.defaultMarkerColor);
          sizes = Array(numberOfPoints).fill(self.defaultMarkerSize);
        }

        const { highlightedMarkerSize, highlightedMarkerColor } = self;

        colors[pn] = highlightedMarkerColor;
        sizes[pn] = highlightedMarkerSize;

        const timestampId = data.points[0].data.timestampId[pn];

        self.markerState[selectedTimeline][timestampId].color = highlightedMarkerColor;
        self.markerState[selectedTimeline][timestampId].size = highlightedMarkerSize;

        const update = { marker: { color: colors, size: sizes } };

        // trace number, necessary for the restyle function
        const tn = data.points[0].curveNumber;
        Plotly.restyle(plotlyDiv, update, [tn]);

        self.selectedTimestamps[selectedTimeline].push(self.markerState[selectedTimeline][timestampId].emberModel);

        // Check if component should pass the selected timestamps
        // to its parent
        if (self.selectionCount > 1) {
          if (self.selectedTimestamps.length === self.selectionCount) {
            // closure action
            if (self.args.clicked) self.args.clicked(selectedTimeline, self.selectedTimestamps[selectedTimeline]);
          }
        } else if (self.args.clicked) {
          // closure action
          self.args.clicked(selectedTimeline, self.selectedTimestamps[selectedTimeline]);
        }
      });

      // double click
      plotlyDiv.on('plotly_doubleclick', () => {
        const { min, max } = self.oldPlotlySlidingWindow[selectedTimeline];
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

  setupPlotlyTimelineChart(timestamps: Timestamp[][], selectedTimeline: number) {

    if (timestamps[selectedTimeline].length === 0) {
      this.createDummyTimeline(selectedTimeline);
      return;
    }

    
    const data = this.getUpdatedPlotlyDataObject(timestamps[selectedTimeline], this.markerState[selectedTimeline], selectedTimeline);
    const latestTimestamp = timestamps[selectedTimeline][timestamps[selectedTimeline].length - 1];
    const latestTimestampValue = new Date(latestTimestamp.epochMilli);

    const windowInterval = PlotlyTimeline.getSlidingWindowInterval(
      latestTimestampValue,
      this.slidingWindowLowerBoundInMinutes,
      this.slidingWindowUpperBoundInMinutes
    );

    const layout = PlotlyTimeline.getPlotlyLayoutObject(
      windowInterval.min,
      windowInterval.max
    );

    this.oldPlotlySlidingWindow[selectedTimeline] = windowInterval;
    Plotly.newPlot(
      this.timelineDiv[selectedTimeline],
      data,
      layout,
      PlotlyTimeline.getPlotlyOptionsObject()
    );

    this.initDone[selectedTimeline] = true;
  }

  extendPlotlyTimelineChart(timestamps: Timestamp[][], selectedTimeline: number) {
    if (timestamps[selectedTimeline].length === 0) {
      return;
    }

    const data: any = this.getUpdatedPlotlyDataObject(
      timestamps[selectedTimeline],
      this.markerState[selectedTimeline],
      selectedTimeline
    );

    const latestTimestamp: Timestamp = timestamps[selectedTimeline][timestamps[selectedTimeline].length - 1];
    const latestTimestampValue = new Date(latestTimestamp.epochMilli);

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

    this.oldPlotlySlidingWindow[selectedTimeline] = windowInterval;

    Plotly.react(
      this.timelineDiv[selectedTimeline],
      data,
      layout,
      PlotlyTimeline.getPlotlyOptionsObject()
    );
  }

  continueTimeline(oldSelectedTimestampRecords: Timestamp[][], selectedTimeline: number) {
    this.resetHighlingInStateObjects(selectedTimeline);

    // call this to initialize the internal marker state variable
    this.getUpdatedPlotlyDataObject(this.timestamps[selectedTimeline], this.markerState[selectedTimeline], selectedTimeline);

    const { highlightedMarkerColor, highlightedMarkerSize } = this;

    oldSelectedTimestampRecords[selectedTimeline].forEach((timestamp) => {
      const timestampId = timestamp.epochMilli;

      this.markerState[selectedTimeline][timestampId].color = highlightedMarkerColor;
      this.markerState[selectedTimeline][timestampId].size = highlightedMarkerSize;
      this.markerState[selectedTimeline][timestampId].emberModel = timestamp;

      this.selectedTimestamps[selectedTimeline].push(this.markerState[selectedTimeline][timestampId].emberModel);
    });

    this.extendPlotlyTimelineChart(this.timestamps, selectedTimeline);
  }

  resetHighlighting(selectedTimeline: number) {
    this.resetHighlingInStateObjects(selectedTimeline);
    this.extendPlotlyTimelineChart(this.timestamps, selectedTimeline);
  }

  createDummyTimeline(selectedTimeline: number) {
    const minRange = 0;
    const maxRange = 90;
    Plotly.newPlot(
      this.timelineDiv[selectedTimeline],
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
  ) {
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

  static getPlotlyLayoutObject(minRange: number, maxRange: number) {
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
    markerStates: IMarkerStates,
    selectedTimeline: number
  ) {
    const colors: string[] = [];
    const sizes: number[] = [];

    const x: Date[] = [];
    const y: number[] = [];

    const timestampIds: number[] = [];

    timestamps.forEach((timestamp) => {
      const timestampId = timestamp.epochMilli;

      x.push(new Date(timestamp.epochMilli));
      y.push(timestamp.spanCount);

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

    this.markerState[selectedTimeline] = markerStates;

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
    timestampIds: number[]
  ) {
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
        type: 'scatter',
        x: dates,
        y: requests,
      },
    ];
  }

  resetHighlingInStateObjects(selectedTimeline: number) {
    this.selectedTimestamps[selectedTimeline] = [];
    this.markerState[selectedTimeline] = {};
  }

  resetSelectionInStateObjects(selectedTimeline: number) {
    const selTimestamps: Timestamp[] = this.selectedTimestamps[selectedTimeline];

    const { defaultMarkerColor, defaultMarkerSize } = this;

    selTimestamps.forEach((t) => {
      this.markerState[selectedTimeline][t.epochMilli].color = defaultMarkerColor;
      this.markerState[selectedTimeline][t.epochMilli].size = defaultMarkerSize;
    });

    this.selectedTimestamps[selectedTimeline] = [];
  }

  static getPlotlyOptionsObject() {
    return {
      displayModeBar: false,
      doubleClick: false,
      responsive: true,
      scrollZoom: true,
    };
  }

  // END Helper functions
}
