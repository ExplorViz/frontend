import { action } from '@ember/object';
import Component from '@glimmer/component';
import debugLogger from 'ember-debug-logger';
import { Timestamp } from 'explorviz-frontend/utils/landscape-schemes/timestamp';
import Plotly from 'plotly.js-dist';

export interface IMarkerStates {
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
  setChildReference?(timeline: PlotlyTimeline): void;
  clicked?(
    selectedTimeline: number,
    selectedTimestamps: Timestamp[],
    markerState: IMarkerStates
  ): void;
  markerState?: IMarkerStates[];
  selectedTimestamps?: [Timestamp[]?, Timestamp[]?];
  timelineColors?: [string?, string?];
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

  get markerState() {
    return this.args.markerState || [{}, {}];
  }

  get timelineColors() {
    return this.args.timelineColors;
  }

  // variable used for output when clicked
  selectedTimestamps: Timestamp[][] = [[], []];

  // END template-argument getters for default values

  readonly debug = debugLogger();

  initDone = false;

  oldPlotlySlidingWindow = { min: 0, max: 0 };

  userSlidingWindow = null;

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
  didRender(plotlyDiv: any, params: any[]) {
    const numberOfTimelines = params[0];
    // register this component at its parent if set via template
    const parentFunction = this.args.setChildReference;
    if (parentFunction) {
      parentFunction(this);
    }
    this.timelineDiv = plotlyDiv;

    if (this.args.selectedTimestamps) {
      if (this.args.selectedTimestamps[0]) {
        this.selectedTimestamps[0] = this.args.selectedTimestamps[0];
      }
      if (this.args.selectedTimestamps[1]) {
        this.selectedTimestamps[1] = this.args.selectedTimestamps[1];
      }
    }

    if (this.initDone) {
      this.extendPlotlyTimelineChart(
        this.timestamps,
        numberOfTimelines?.length
      );
    } else {
      this.setupPlotlyTimelineChart(this.timestamps, numberOfTimelines?.length);
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

        const selectedTimeline = data.points[0].curveNumber;

        // reset old selection, since maximum selection value is achieved
        // and user clicked on a new point
        if (
          self.selectedTimestamps[selectedTimeline].length ===
          self.selectionCount
        ) {
          self.resetSelectionInStateObjects(selectedTimeline);
          colors = Array(numberOfPoints).fill(
            self.timelineColors![selectedTimeline]
          );
          sizes = Array(numberOfPoints).fill(self.defaultMarkerSize);
        }

        const { highlightedMarkerSize, highlightedMarkerColor } = self;

        colors[pn] = highlightedMarkerColor;
        sizes[pn] = highlightedMarkerSize;

        const timestampId = data.points[0].data.timestampId[pn];

        self.markerState[selectedTimeline][timestampId].color =
          highlightedMarkerColor;
        self.markerState[selectedTimeline][timestampId].size =
          highlightedMarkerSize;

        const update = { marker: { color: colors, size: sizes } };

        // trace number, necessary for the restyle function
        const tn = data.points[0].curveNumber;
        Plotly.restyle(plotlyDiv, update, [tn]);

        //self.selectedTimestamps[selectedTimeline][0] = self.markerState[selectedTimeline][timestampId].emberModel;
        self.selectedTimestamps[selectedTimeline].push(
          self.markerState[selectedTimeline][timestampId].emberModel
        );

        // Check if component should pass the selected timestamps
        // to its parent
        if (self.selectionCount > 1) {
          if (
            self.selectedTimestamps[selectedTimeline].length ===
            self.selectionCount
          ) {
            // closure action
            if (self.args.clicked)
              self.args.clicked(
                selectedTimeline,
                self.selectedTimestamps[selectedTimeline],
                self.markerState[selectedTimeline]
              );
          }
        } else if (self.args.clicked) {
          // closure action
          self.args.clicked(
            selectedTimeline,
            self.selectedTimestamps[selectedTimeline],
            self.markerState[selectedTimeline]
          );
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

  setupPlotlyTimelineChart(
    timestamps: Timestamp[][],
    numberOfTimelines: number
  ) {
    if (numberOfTimelines === 1 && timestamps[0].length === 0) {
      this.createDummyTimeline();
      return;
    }

    const data: any[] = [];
    let shapez: any[] = [];
    let plotlyTimestampsWithoutNullValuesTemp: number = 0;
    // let windowMax = undefined;
    // let windowMin = undefined;
    for (let i = 0; i < numberOfTimelines; i++) {
      data.push(
        this.getUpdatedPlotlyDataObject(timestamps[i], this.markerState[i], i)
      );

      plotlyTimestampsWithoutNullValuesTemp += data.lastObject.x.filter(
        (x: any) => !!x
      ).length;

      const { shapes } = data[data.length - 1];
      shapez = [...shapez, ...shapes];
    }

    this.plotlyTimestampsWithoutNullValues =
      plotlyTimestampsWithoutNullValuesTemp;

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

    layout = { ...layout, ...{ shapes: shapez } };

    Plotly.newPlot(
      this.timelineDiv,
      data,
      layout,
      this.getPlotlyOptionsObject()
    );

    this.initDone = true;
  }

  extendPlotlyTimelineChart(
    timestamps: Timestamp[][],
    numberOfTimelines: number
  ) {
    if (!numberOfTimelines) {
      return;
    }

    const data: any[] = [];
    const shapez: any[] = [];
    let plotlyTimestampsWithoutNullValuesTemp: number = 0;
    for (let i = 0; i < numberOfTimelines; i++) {
      if (timestamps[i].length === 0) {
        continue;
      }

      data.push(
        this.getUpdatedPlotlyDataObject(timestamps[i], this.markerState[i], i)
      );

      const { shapes } = data[data.length - 1];
      shapez.push(...shapes);
      plotlyTimestampsWithoutNullValuesTemp += data.lastObject.x.filter(
        (x: any) => !!x
      ).length;
    }

    if (data.length === 0) {
      return;
    }

    this.plotlyTimestampsWithoutNullValues =
      plotlyTimestampsWithoutNullValuesTemp;

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

    layout = { ...layout, ...{ shapes: shapez } };

    Plotly.react(this.timelineDiv, data, layout, this.getPlotlyOptionsObject());
  }

  continueTimeline(
    oldSelectedTimestampRecords: [Timestamp[]?, Timestamp[]?],
    selectedTimeline: number
  ) {
    this.resetHighlingInStateObjects(selectedTimeline);

    // call this to initialize the internal marker state variable
    this.getUpdatedPlotlyDataObject(
      this.timestamps[selectedTimeline],
      this.markerState[selectedTimeline],
      selectedTimeline
    );

    const { highlightedMarkerColor, highlightedMarkerSize } = this;

    oldSelectedTimestampRecords[selectedTimeline]?.forEach((timestamp) => {
      const timestampId = timestamp.epochMilli;

      this.markerState[selectedTimeline][timestampId].color =
        highlightedMarkerColor;
      this.markerState[selectedTimeline][timestampId].size =
        highlightedMarkerSize;
      this.markerState[selectedTimeline][timestampId].emberModel = timestamp;

      this.selectedTimestamps[selectedTimeline].push(
        this.markerState[selectedTimeline][timestampId].emberModel
      );
    });

    this.extendPlotlyTimelineChart(this.timestamps, selectedTimeline);
  }

  resetHighlighting(selectedTimeline: number) {
    this.resetHighlingInStateObjects(selectedTimeline);
    this.extendPlotlyTimelineChart(this.timestamps, selectedTimeline);
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
      xaxis2: {
        type: 'category',
        tickmode: 'auto',
        nticks: 5,
        tickangle: 0,
        range: [minRange, maxRange],
        tickfont: {
          font: {
            size: 6,
          },
        },
        title: {
          font: {
            color: '#7f7f7f',
            size: 16,
          },
          text: 'Time',
        },
        overlaying: 'x',
        side: 'top',
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
          t: 40,
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
    markerStates: IMarkerStates,
    selectedTimeline: number
  ) {
    function getTimestampTickLabel(timestampEpoch: number) {
      const timestampDate = new Date(timestampEpoch);
      return timestampDate
        .toISOString()
        .replace('T', '<br>')
        .replace('.000Z', '');
    }

    function getGapRectangleObj(timeline: number) {
      if (timeline === 0) {
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

      return {
        layer: 'below',
        type: 'rect',
        xref: 'x2',
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

    const timestampIds: [number[], number[]] = [[], []];

    const shapes = [];

    let tempGapRectObj = null;

    let nextExpectedTimestamp = 0;
    let i = 0;

    while (i < timestamps.length) {
      const timestamp = timestamps[i];
      const timestampId = timestamp.epochMilli;

      timestampIds[selectedTimeline].push(timestampId);

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
          tempGapRectObj = getGapRectangleObj(selectedTimeline);
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
        let ts = undefined;
        if (
          this.selectedTimestamps &&
          (ts = this.selectedTimestamps[selectedTimeline]!.find(
            (ts: Timestamp) => ts.epochMilli === timestampId
          ))
        ) {
          colors.push(this.highlightedMarkerColor);
          sizes.push(this.highlightedMarkerSize);

          // eslint-disable-next-line
          markerStates[timestampId] = {
            color: this.highlightedMarkerColor,
            emberModel: ts,
            size: this.highlightedMarkerSize,
          };
        } else {
          // new point
          const defaultColor = this.timelineColors![selectedTimeline]!;
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
      }
      //console.log("timestampId: ", timestampId);
      //timestampIds.push(timestampId);
    }
    this.markerState[selectedTimeline] = markerStates;

    if (selectedTimeline === 1) {
      return {
        ...this.getPlotlyDataObject(
          x,
          y,
          colors,
          this.timelineColors![selectedTimeline]!,
          sizes,
          timestampIds[1]
        ),
        xaxis: 'x2',
        ...{ shapes: shapes },
      };
    }

    return {
      ...this.getPlotlyDataObject(
        x,
        y,
        colors,
        this.timelineColors![selectedTimeline]!,
        sizes,
        timestampIds[0]
      ),
      ...{ shapes: shapes },
    };
  }

  getPlotlyDataObject(
    dates: (string | null)[],
    requests: (number | null)[],
    colors: string[],
    timelineColor: string,
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
      line: { color: timelineColor },
      mode: 'lines+markers',
      connectgaps: false,
      text: this.hoverText(dates, requests),
      timestampId: timestampIds,
      x: dates,
      y: requests,
    };
  }

  resetHighlingInStateObjects(selectedTimeline: number) {
    this.selectedTimestamps[selectedTimeline] = [];
    this.markerState[selectedTimeline] = {};
  }

  resetSelectionInStateObjects(selectedTimeline: number) {
    const selTimestamps: Timestamp[] =
      this.selectedTimestamps[selectedTimeline];
    const defaultMarkerColor = this.timelineColors![selectedTimeline]!;
    const { defaultMarkerSize } = this;

    selTimestamps.forEach((t) => {
      this.markerState[selectedTimeline][t.epochMilli].color =
        defaultMarkerColor;
      this.markerState[selectedTimeline][t.epochMilli].size = defaultMarkerSize;
    });

    this.selectedTimestamps[selectedTimeline] = [];
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
