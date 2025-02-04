import { action } from '@ember/object';
import Component from '@glimmer/component';
import debugLogger from 'ember-debug-logger';
import { Timestamp } from 'explorviz-frontend/utils/landscape-schemes/timestamp';
import Plotly from 'plotly.js-dist';
// #region Template Imports
import { TimelineDataObject } from 'explorviz-frontend/utils/timeline/timeline-data-object-handler';
// #endregion

export interface IMarkerStates {
  [timestampId: string]: {
    color: string;
    size: number;
    emberModel: Timestamp;
  };
}

interface IArgs {
  timelineDataObject: TimelineDataObject;
  clicked(selectedTimestamps: Map<string, Timestamp[]>): void;
}

export default class PlotlyTimeline extends Component<IArgs> {
  // variable used for output when clicked
  selectedCommitTimestampsMap: Map<string, Timestamp[]> = new Map();

  markerStateMap: Map<string, IMarkerStates> = new Map();

  // END template-argument getters for default values

  readonly debug = debugLogger('PlotlyTimeline');

  oldPlotlySlidingWindow = { min: 0, max: 0 };

  userSlidingWindow = null;

  timelineDiv: any;

  plotlyTimestampsWithoutNullValues: any;

  minRequestFilter = 10;
  maxRequestFilter = Number.MAX_SAFE_INTEGER;

  // BEGIN template-argument getters for default values
  get defaultMarkerColor() {
    return '#1f77b4';
  }

  get defaultMarkerSize() {
    const fallbackValue = 8;
    return fallbackValue;
  }

  get highlightedMarkerSize() {
    const fallbackValue = 15;
    return fallbackValue;
  }

  get selectionCount() {
    return 1;
  }

  get slidingWindowLowerBoundInMinutes() {
    const fallbackValue = 4;
    return fallbackValue;
  }

  get slidingWindowUpperBoundInMinutes() {
    const fallbackValue = 4;
    return fallbackValue;
  }

  get timestamps() {
    return [];
  }

  get timelineColors() {
    return [undefined, undefined];
  }

  get numberOfTimelines() {
    return this.args.timelineDataObject.size ?? 0;
  }

  get showDummyTimeline() {
    if (!this.args.timelineDataObject) {
      return true;
    }

    for (const [, data] of this.args.timelineDataObject) {
      if (data.timestamps.length > 0) {
        return false;
      }
    }
    return true;
  }

  getHighlightedMarkerColorForCommitId(commitId: string) {
    const timelineDataForCommit = this.args.timelineDataObject.get(commitId);

    return timelineDataForCommit?.highlightedMarkerColor || 'red';
  }

  getSelectedTimestampsForCommitId(commitId: string | undefined) {
    if (commitId === null || commitId === undefined) {
      return [];
    }
    const timelineDataForCommit = this.args.timelineDataObject.get(commitId);
    return timelineDataForCommit?.selectedTimestamps;
  }

  getTimestampsForCommitIndex(index: number) {
    return this.getTimestampsForCommitId(
      this.getCommitIdBasedForMapIndex(index)
    );
  }

  getTimestampsForCommitId(commitId: string | undefined) {
    if (commitId === null || commitId === undefined) {
      return [];
    }
    const timelineDataForCommit = this.args.timelineDataObject.get(commitId);
    return timelineDataForCommit?.timestamps;
  }

  getCommitIdBasedForMapIndex(index: number) {
    return Array.from(this.args.timelineDataObject.keys())[index];
  }

  getCommitToSelectedTimestampsMap() {
    const commitToSelectedTimestampMap = new Map();

    for (const [
      gitCommitId,
      timelineDataForCommit,
    ] of this.args.timelineDataObject.entries()) {
      const selectedTimestampsForCommit =
        timelineDataForCommit.selectedTimestamps;

      commitToSelectedTimestampMap.set(
        gitCommitId,
        selectedTimestampsForCommit
      );
    }
    return commitToSelectedTimestampMap;
  }

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

  @action
  setupPlotlyTimelineChart(plotlyDiv: any) {
    this.debug('setupPlotlyTimelineChart');

    this.timelineDiv = plotlyDiv;

    this.updateMarkerStates();

    if (
      this.numberOfTimelines === 1 &&
      this.getTimestampsForCommitIndex(0)?.length === 0
    ) {
      this.createDummyTimeline();
      return;
    }

    const data: any[] = [];
    let shapez: any[] = [];
    let plotlyTimestampsWithoutNullValuesTemp: number = 0;

    for (const [
      gitCommitId,
      timelineDataForCommit,
    ] of this.args.timelineDataObject.entries()) {
      // init inner representation of selected timestamps
      // timestamps might be selected upon first rendering
      const selectedTimestampsForCommit =
        timelineDataForCommit.selectedTimestamps;

      if (selectedTimestampsForCommit.length) {
        this.selectedCommitTimestampsMap.set(
          gitCommitId,
          selectedTimestampsForCommit
        );
      }

      data.push(
        this.getUpdatedPlotlyDataObject(
          timelineDataForCommit.timestamps,
          this.markerStateMap.get(gitCommitId) || {},
          gitCommitId
        )
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

    this.setupPlotlyListener();
  }

  private setupPlotlyListener() {
    const dragLayer: any = document.getElementsByClassName('nsewdrag')[0];

    const plotlyDiv = this.timelineDiv;
    if (plotlyDiv && plotlyDiv.layout) {
      const self: PlotlyTimeline = this;

      // single click
      plotlyDiv.on('plotly_click', (data: any) => {
        // https://plot.ly/javascript/reference/#scatter-marker

        const pn = data.points[0].pointNumber;

        const numberOfPoints = data.points[0].fullData.x.length;

        let colors = data.points[0].fullData.marker.color;
        let sizes = data.points[0].fullData.marker.size;

        const selectedTimeline = data.points[0].curveNumber;

        // reset old selection, since maximum selection value is achieved
        // and user clicked on a new point
        if (self.selectedCommitTimestampsMap.size === self.selectionCount) {
          self.resetSelectionInStateObjects();
          colors = Array(numberOfPoints).fill(
            self.timelineColors![selectedTimeline]
          );
          sizes = Array(numberOfPoints).fill(self.defaultMarkerSize);
        }

        const { highlightedMarkerSize } = self;

        const commitId = this.getCommitIdBasedForMapIndex(selectedTimeline);

        const highlightedMarkerColor =
          this.getHighlightedMarkerColorForCommitId(commitId);

        colors[pn] = highlightedMarkerColor;
        sizes[pn] = highlightedMarkerSize;

        const timestampId = data.points[0].data.timestampId[pn];

        // TODO: Get real commit ID based on plot data, insert commit somewhere else

        self.markerStateMap.get(commitId)![timestampId].color =
          highlightedMarkerColor;
        self.markerStateMap.get(commitId)![timestampId].size =
          highlightedMarkerSize;

        const update = { marker: { color: colors, size: sizes } };

        // trace number, necessary for the restyle function
        const tn = data.points[0].curveNumber;
        Plotly.restyle(plotlyDiv, update, [tn]);

        const selectedTimestampsForCommit =
          self.selectedCommitTimestampsMap.get(commitId) || [];
        selectedTimestampsForCommit.push(
          self.markerStateMap.get(commitId)![timestampId].emberModel
        );
        self.selectedCommitTimestampsMap.set(
          commitId,
          selectedTimestampsForCommit
        );

        // Check if component should pass the selected timestamps
        // to its parent
        if (self.selectionCount > 1) {
          if (self.selectedCommitTimestampsMap.size === self.selectionCount) {
            // closure action
            if (self.args.clicked)
              self.args.clicked(self.selectedCommitTimestampsMap);
          }
        } else if (self.args.clicked) {
          // closure action
          self.args.clicked(self.selectedCommitTimestampsMap);
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

  updateMarkerStates() {
    if (this.args.timelineDataObject.size == 0) {
      return;
    }

    this.debug('updateMarkerStates');
    this.resetHighlightInStateObjects();

    for (const [
      commitId,
      timelineDataForCommit,
    ] of this.args.timelineDataObject.entries()) {
      // call this to initialize the internal marker state variable
      this.getUpdatedPlotlyDataObject(
        timelineDataForCommit.timestamps,
        this.markerStateMap.get(commitId) || {},
        commitId
      );

      const markerStates = this.markerStateMap.get(commitId) || {};

      const selectedTimestampsForCommit =
        timelineDataForCommit.selectedTimestamps;

      selectedTimestampsForCommit.forEach((timestamp) => {
        const timestampId = timestamp.epochMilli;
        if (markerStates[timestampId]) {
          markerStates[timestampId].color =
            timelineDataForCommit.highlightedMarkerColor;
          markerStates[timestampId].size = this.highlightedMarkerSize;
          markerStates[timestampId].emberModel = timestamp;
        }
      });
      this.markerStateMap.set(commitId, markerStates);
    }
  }

  // BEGIN Plot Logic

  @action
  updatePlotlyTimelineChart() {
    if (
      !this.args.timelineDataObject ||
      this.args.timelineDataObject.size == 0
    ) {
      return;
    }

    this.updateMarkerStates();

    this.debug('updatePlot');

    const data: any[] = [];
    const shapez: any[] = [];
    let plotlyTimestampsWithoutNullValuesTemp: number = 0;

    for (const [
      commitId,
      timelineDataForCommit,
    ] of this.args.timelineDataObject.entries()) {
      data.push(
        this.getUpdatedPlotlyDataObject(
          timelineDataForCommit.timestamps,
          this.markerStateMap.get(commitId) || {},
          commitId
        )
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

  autoScale() {
    Plotly.relayout(this.timelineDiv, {
      'xaxis.autorange': true,
      'yaxis.autorange': true,
    });
  }

  @action
  setMinRequestFilter(event: any) {
    const minRequestInput = event.target.value;
    this.minRequestFilter = Number.parseInt(minRequestInput) || 0;
    this.updatePlotlyTimelineChart();
    this.autoScale();
  }

  @action
  setMaxRequestFilter(event: any) {
    const maxRequestInput = event.target.value;
    this.maxRequestFilter =
      Number.parseInt(maxRequestInput) || Number.MAX_SAFE_INTEGER;
    this.updatePlotlyTimelineChart();
    this.autoScale();
  }

  hoverText(x: (string | null)[], y: (number | null)[], commit: string) {
    return x.map(
      (xi, i) =>
        `<b>Commit</b>: ${commit}<br><b>Time</b>: ${xi}<br><b>Requests</b>: ${y[i]}<br>`
    );
  }

  getPlotlyLayoutObject(minRange: number, maxRange: number) {
    // Regarding minRange and maxRange for category type
    // https://plotly.com/javascript/reference/layout/xaxis/#layout-xaxis-range
    return {
      ...{
        dragmode: 'pan',
        hoverdistance: 3,
        hovermode: 'closest',
        margin: {
          b: 50,
          pad: 0,
          t: 0,
          r: 20,
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
    unfilteredTimestampsOfOneCommit: Timestamp[],
    markerStatesOfOneCommit: IMarkerStates,
    commitId: string
  ) {
    function getTimestampTickLabel(timestampEpoch: number) {
      const timestampDate = new Date(timestampEpoch);
      return timestampDate
        .toISOString()
        .replace('T', '<br>')
        .replace('.000Z', '');
    }

    function getDashedLine() {
      return {
        layer: 'below',
        type: 'line',
        xref: 'x',
        yref: 'y',
        x0: '0',
        y0: 0.1,
        x1: '0',
        y1: 1,
        fillcolor: '#d3d3d3',
        opacity: 0.4,
        line: {
          width: 1,
          dash: 'dot',
        },
      };
    }

    const timestampsOfOneCommit = unfilteredTimestampsOfOneCommit.filter(
      (timestamp) =>
        timestamp.spanCount > this.minRequestFilter &&
        timestamp.spanCount < this.maxRequestFilter
    );

    const colors: string[] = [];
    const sizes: number[] = [];

    const x: (string | null)[] = [];
    const y: (number | null)[] = [];

    const timestampIds: number[] = [];

    const shapes = [];

    let tempDottedLine = null;

    let nextExpectedTimestamp = 0;
    let i = 0;

    const TIMESTAMP_INTERVAL = 10000;

    while (i < timestampsOfOneCommit.length) {
      const timestamp = timestampsOfOneCommit[i];
      const timestampId = timestamp.epochMilli;

      // Only add real timestamps and shapes in the data arrays
      let addCurrentTimestampToDataObject = false;

      if (nextExpectedTimestamp === 0) {
        // First timestamp, must exist do to while loop condition
        x.push(getTimestampTickLabel(timestampId));
        y.push(timestamp.spanCount);
        nextExpectedTimestamp = timestampId + TIMESTAMP_INTERVAL;
        i++;
        addCurrentTimestampToDataObject = true;
      } else if (nextExpectedTimestamp >= timestampId) {
        // Next timestamp is within expected time frame
        x.push(getTimestampTickLabel(timestampId));
        y.push(timestamp.spanCount);
        i++;
        if (tempDottedLine) {
          tempDottedLine.x1 = getTimestampTickLabel(timestampId);
          tempDottedLine.y1 = timestamp.spanCount;
          shapes.push(tempDottedLine);
          tempDottedLine = null;
        }
        addCurrentTimestampToDataObject = true;
        nextExpectedTimestamp = timestampId + TIMESTAMP_INTERVAL;
      } else if (timestamp.epochMilli === null) {
        // Edge case if API will return null values in the future
        x.push(null);
        y.push(null);
        i++;
      } else {
        // Gap fills for missing timestamps (outside of expected timestamp interval)
        if (!tempDottedLine) {
          addCurrentTimestampToDataObject = true;
          x.push(null);
          y.push(null);
          tempDottedLine = getDashedLine();
          const lastNonNullTimestamp =
            nextExpectedTimestamp - TIMESTAMP_INTERVAL;
          tempDottedLine.x0 = getTimestampTickLabel(lastNonNullTimestamp);
          // Get last non-null value
          tempDottedLine.y0 = y.filter((y) => y != null).at(-1)!;
        }
        nextExpectedTimestamp =
          timestampsOfOneCommit[i].epochMilli ||
          timestampId + TIMESTAMP_INTERVAL;
      }

      const markerState = markerStatesOfOneCommit[timestampId];

      if (addCurrentTimestampToDataObject) {
        if (markerState) {
          colors.push(markerState.color);
          sizes.push(markerState.size);
        } else {
          const defaultColor = this.defaultMarkerColor;
          const defaultSize = this.defaultMarkerSize;

          colors.push(defaultColor);
          sizes.push(defaultSize);

          markerStatesOfOneCommit[timestampId] = {
            color: defaultColor,
            emberModel: timestamp,
            size: defaultSize,
          };
        }
        timestampIds.push(timestampId);
      }
      addCurrentTimestampToDataObject = false;
    }

    this.markerStateMap.set(commitId, markerStatesOfOneCommit);

    const updatedPlotlyDataObject = {
      ...this.getPlotlyDataObject(x, y, colors, sizes, timestampIds, commitId),
      ...{ shapes: shapes },
    };

    this.debug('getUpdatedPlotlyDataObject', updatedPlotlyDataObject);

    return updatedPlotlyDataObject;
  }

  getPlotlyDataObject(
    dates: (string | null)[],
    requests: (number | null)[],
    colors: string[],
    sizes: number[],
    timestampIds: number[],
    commit: string
  ) {
    return {
      hoverinfo: 'text',
      hoverlabel: {
        align: 'left',
      },
      marker: { color: colors, size: sizes },
      mode: 'lines+markers',
      connectgaps: false,
      text: this.hoverText(dates, requests, commit),
      timestampId: timestampIds,
      x: dates,
      y: requests,
      commit: commit,
    };
  }

  resetHighlightInStateObjects() {
    this.selectedCommitTimestampsMap = new Map();
    this.markerStateMap = new Map();
  }

  resetSelectionInStateObjects() {
    this.selectedCommitTimestampsMap.forEach((timestamps, commit) => {
      const markerState = this.markerStateMap.get(commit);
      if (markerState) {
        timestamps.forEach((t) => {
          markerState[t.epochMilli].color = this.defaultMarkerColor;
          markerState[t.epochMilli].size = this.defaultMarkerSize;
        });
      }
    });
    this.selectedCommitTimestampsMap = new Map();
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
