import { useRenderingServiceStore } from 'explorviz-frontend/src/stores/rendering-service';
import { DebugSnapshot } from 'explorviz-frontend/src/stores/repos/debug-snapshot-repository';
import { nanosecondsToMilliseconds } from 'explorviz-frontend/src/utils/landscape-http-request-util';
import { Timestamp } from 'explorviz-frontend/src/utils/landscape-schemes/timestamp';
import { TimelineDataObject } from 'explorviz-frontend/src/utils/timeline/timeline-data-object-handler';
import Plotly from 'plotly.js-dist';
import { useEffect, useRef } from 'react';
// const Plotly = require('plotly.js-dist');

export interface IMarkerStates {
  [timestampId: string]: {
    color: string;
    size: number;
    emberModel: Timestamp;
  };
}

interface PlotlyTimelineArgs {
  timelineDataObject: TimelineDataObject;
  debugSnapshots?: DebugSnapshot[];
  timelineUpdateVersion?: number;
  clicked(selectedTimestamps: Map<string, Timestamp[]>): void;
}

export default function PlotlyTimeline({
  timelineDataObject,
  debugSnapshots,
  timelineUpdateVersion,
  clicked,
}: PlotlyTimelineArgs) {
  //#region Refs and Effects

  const markerStateMap = useRef<Map<string, IMarkerStates>>(new Map());
  const selectedCommitTimestampsMap = useRef<Map<string, Timestamp[]>>(
    new Map()
  );

  const oldPlotlySlidingWindow = useRef({ min: 0, max: 0 });
  const userSlidingWindow = useRef<any>(null);

  const timelineDiv = useRef<any>(null);
  const plotlyDivRef = useRef(null);
  const plotlyDivDummyRef = useRef(null);

  const plotlyTimestampsWithoutNullValues = useRef<any>(null);

  const minRequestFilter = useRef<number>(0);
  const maxRequestFilter = useRef<number>(Number.MAX_SAFE_INTEGER);

  const defaultMarkerColor = useRef<string>('#1f77b4');
  const debugSnapshotMarkerColor = useRef<string>('#000000');
  const defaultMarkerSize = useRef<number>(8);
  const highlightedMarkerSize = useRef<number>(15);
  const selectionCount = useRef<number>(2);
  const timelineColors = useRef([undefined, undefined]);

  const renderingServiceVisualizationPaused = useRenderingServiceStore(
    (state) => state._visualizationPaused
  );

  // would React's useMemo be beneficial here?
  const showDummyTimeline = (() => {
    if (!timelineDataObject || timelineDataObject.size === 0) {
      return true;
    }

    for (const [, data] of timelineDataObject) {
      if (data.timestamps.length > 0) {
        return false;
      }
    }
    return true;
  })();

  useEffect(() => {
    // Initialize chart when div is available

    const targetDiv = showDummyTimeline
      ? plotlyDivDummyRef.current
      : plotlyDivRef.current;

    if (!targetDiv) return;

    if (!timelineDiv.current || timelineDiv.current !== targetDiv) {
      setupPlotlyTimelineChart(targetDiv);
    }
  }, [showDummyTimeline]);

  useEffect(() => {
    // Update chart when data changes, but only if chart is already initialized
    if (
      plotlyDivRef.current &&
      timelineDiv.current &&
      !showDummyTimeline &&
      timelineDataObject &&
      timelineDataObject.size > 0
    ) {
      updatePlotlyTimelineChart();
    }
  }, [timelineDataObject, timelineUpdateVersion, showDummyTimeline]);

  // #endregion

  const getHighlightedMarkerColorForCommitId = (commitId: string) => {
    const timelineDataForCommit = timelineDataObject.get(commitId);
    return timelineDataForCommit?.highlightedMarkerColor || 'red';
  };

  const getSelectedTimestampsForCommitId = (commitId: string) => {
    const timelineDataForCommit = timelineDataObject.get(commitId);
    return timelineDataForCommit?.selectedTimestamps;
  };

  const getTimestampsForCommitIndex = (index: number) => {
    return getTimestampsForCommitId(getCommitIdBasedForMapIndex(index));
  };

  const getTimestampsForCommitId = (commitId: string) => {
    const timelineDataForCommit = timelineDataObject.get(commitId);
    return timelineDataForCommit?.timestamps;
  };

  const getCommitIdBasedForMapIndex = (index: number) => {
    return Array.from(timelineDataObject.keys())[index];
  };

  // #endregion

  // #region Div Events
  const handleMouseEnter = () => {
    // if user hovers over plotly, save his
    // sliding window, so that updating the
    // plot won't modify his current viewport
    const plotlyDiv = timelineDiv.current;
    if (plotlyDiv && plotlyDiv.layout) {
      userSlidingWindow.current = plotlyDiv.layout;
    }
  };

  const handleMouseLeave = () => {
    //userSlidingWindow = null;
  };

  const setupPlotlyTimelineChart = (plotlyDiv: any) => {
    timelineDiv.current = plotlyDiv;

    updateMarkerStates();

    if (
      timelineDataObject.size === 1 &&
      getTimestampsForCommitIndex(0)?.length === 0
    ) {
      createDummyTimeline();
      return;
    }

    const data: any[] = [];
    let shapes: any[] = [];
    let plotlyTimestampsWithoutNullValuesTemp: number = 0;

    for (const [
      gitCommitId,
      timelineDataForCommit,
    ] of timelineDataObject.entries()) {
      // init inner representation of selected timestamps
      // timestamps might be selected upon first rendering

      selectedCommitTimestampsMap.current.set(
        gitCommitId,
        timelineDataForCommit.selectedTimestamps
      );

      const trace = buildPlotlyDataObjectForCommit(
        timelineDataForCommit.timestamps,
        markerStateMap.current.get(gitCommitId) || {},
        gitCommitId
      );

      data.push(trace);

      plotlyTimestampsWithoutNullValuesTemp += trace.x.filter(
        (x: any) => !!x
      ).length;

      shapes = [...shapes, ...trace.shapes];
    }

    plotlyTimestampsWithoutNullValues.current =
      plotlyTimestampsWithoutNullValuesTemp;

    let layout = userSlidingWindow.current
      ? userSlidingWindow.current
      : getPlotlyLayoutObject(
          plotlyTimestampsWithoutNullValues.current - 30,
          plotlyTimestampsWithoutNullValues.current
        );

    oldPlotlySlidingWindow.current = {
      min: plotlyTimestampsWithoutNullValues.current - 30,
      max: plotlyTimestampsWithoutNullValues.current,
    };

    layout = { ...layout, shapes };

    Plotly.newPlot(timelineDiv.current, data, layout, getPlotlyOptionsObject());

    setupPlotlyListener();
  };

  const setupPlotlyListener = () => {
    const dragLayer: any = document.getElementsByClassName('nsewdrag')[0];
    const plotlyDiv: any = timelineDiv.current;

    if (!plotlyDiv || !plotlyDiv.layout) return;

    // single click
    plotlyDiv.on('plotly_click', (data: any) => {
      // https://plot.ly/javascript/reference/#scatter-marker
      const pn = data.points[0].pointNumber;

      const selectedTimeline = data.points[0].curveNumber;
      const commitId = getCommitIdBasedForMapIndex(selectedTimeline);

      const highlightedMarkerColor =
        getHighlightedMarkerColorForCommitId(commitId);

      const timestampId = data.points[0].data.timestampId[pn];

      if (
        selectedCommitTimestampsMap.current.get(commitId)?.length ===
        selectionCount.current
      ) {
        removeAllSelections(commitId);
      }

      const markerStatesForCommit = markerStateMap.current.get(commitId) || {};
      markerStatesForCommit[timestampId].color = highlightedMarkerColor;
      markerStatesForCommit[timestampId].size = highlightedMarkerSize.current;
      markerStateMap.current.set(commitId, markerStatesForCommit); // important

      const selectedTimestampsForCommit =
        selectedCommitTimestampsMap.current.get(commitId) || [];
      selectedTimestampsForCommit.push(
        markerStatesForCommit[timestampId].emberModel
      );
      selectedCommitTimestampsMap.current.set(
        commitId,
        selectedTimestampsForCommit
      );

      clicked(selectedCommitTimestampsMap.current);
    });

    // double click
    plotlyDiv.on('plotly_doubleclick', () => {
      userSlidingWindow.current = null;
      const min = plotlyTimestampsWithoutNullValues.current - 30;
      const max = plotlyTimestampsWithoutNullValues.current;
      const update = getPlotlyAxisXObject(min, max);
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
          userSlidingWindow.current = plotlyDiv.layout;
        }
      });
    }
  };

  const updateMarkerStates = () => {
    if (timelineDataObject.size === 0) return;

    for (const [
      commitId,
      timelineDataForCommit,
    ] of timelineDataObject.entries()) {
      let markerStates = markerStateMap.current.get(commitId) || {};

      // 1. Create markers for all timestamps
      for (const timestamp of timelineDataForCommit.timestamps) {
        const tsId = timestamp.epochNano;

        if (!markerStates[tsId]) {
          const isDebugTs = debugSnapshots?.some(
            (ds) => ds.timestamp.epochNano === timestamp.epochNano
          );
          const defaultColor = isDebugTs
            ? debugSnapshotMarkerColor.current
            : defaultMarkerColor.current;

          markerStates[tsId] = {
            color: defaultColor,
            size: defaultMarkerSize.current,
            emberModel: timestamp,
          };
        }
      }

      // 2. highlight selected timestamps
      for (const selectedTimestamp of timelineDataForCommit.selectedTimestamps) {
        const tsId = selectedTimestamp.epochNano;
        const state = markerStates[tsId];
        if (state) {
          state.color = timelineDataForCommit.highlightedMarkerColor;
          state.size = highlightedMarkerSize.current;
        }
      }
      markerStateMap.current.set(commitId, markerStates);
    }
  };

  // #endregion

  // #region Plot Logic

  const updatePlotlyTimelineChart = () => {
    if (!timelineDataObject || timelineDataObject.size == 0) {
      return;
    }

    // If chart hasn't been initialized yet, initialize it first
    if (!timelineDiv.current && plotlyDivRef.current) {
      setupPlotlyTimelineChart(plotlyDivRef.current);
      return;
    }

    if (!timelineDiv.current) {
      return;
    }

    for (const [
      commitId,
      timelineDataForCommit,
    ] of timelineDataObject.entries()) {
      const hasNewTimestamp = timelineDataForCommit.selectedTimestamps.some(
        (ts) =>
          !(selectedCommitTimestampsMap.current.get(commitId) ?? []).some(
            (ts2) => ts2.epochNano === ts.epochNano
          )
      );

      if (!renderingServiceVisualizationPaused && hasNewTimestamp) {
        // mark new incoming timestamp from polling as the only one selected
        resetHighlightInStateObjects();
        selectedCommitTimestampsMap.current.set(
          commitId,
          timelineDataForCommit.selectedTimestamps
        );
      }
    }

    updateMarkerStates();

    const data: any[] = [];
    const shapez: any[] = [];
    let plotlyTimestampsWithoutNullValuesTemp: number = 0;

    for (const [
      commitId,
      timelineDataForCommit,
    ] of timelineDataObject.entries()) {
      data.push(
        buildPlotlyDataObjectForCommit(
          timelineDataForCommit.timestamps,
          markerStateMap.current.get(commitId) || {},
          commitId
        )
      );

      const { shapes } = data[data.length - 1];
      shapez.push(...shapes);
      plotlyTimestampsWithoutNullValuesTemp += data
        .at(-1)
        .x.filter((x: any) => !!x).length;
    }

    if (data.length === 0) {
      return;
    }

    plotlyTimestampsWithoutNullValues.current =
      plotlyTimestampsWithoutNullValuesTemp;

    let layout = userSlidingWindow.current
      ? userSlidingWindow.current
      : getPlotlyLayoutObject(
          plotlyTimestampsWithoutNullValues.current - 30,
          plotlyTimestampsWithoutNullValues.current
        );

    oldPlotlySlidingWindow.current = {
      min: plotlyTimestampsWithoutNullValues.current - 30,
      max: plotlyTimestampsWithoutNullValues.current,
    };

    layout = { ...layout, ...{ shapes: shapez } };

    Plotly.react(timelineDiv.current, data, layout, getPlotlyOptionsObject());
  };

  const createDummyTimeline = () => {
    const minRange = 0;
    const maxRange = 90;
    Plotly.newPlot(
      timelineDiv.current,
      null,
      getPlotlyLayoutObject(minRange, maxRange),
      getPlotlyOptionsObject()
    );
  };

  // #endregion Plot Logic

  // #region Helper functions

  const getPlotlyAxisXObject = (minRange: number, maxRange: number) => {
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
  };

  const autoScale = () => {
    Plotly.relayout(timelineDiv.current, {
      'xaxis.autorange': true,
      'yaxis.autorange': true,
    });
  };

  const setMinRequestFilter = (event: any) => {
    const minRequestInput = event.target.value;
    minRequestFilter.current = Number.parseInt(minRequestInput) || 0;
    updatePlotlyTimelineChart();
    autoScale();
  };

  const setMaxRequestFilter = (event: any) => {
    const maxRequestInput = event.target.value;
    maxRequestFilter.current =
      Number.parseInt(maxRequestInput) || Number.MAX_SAFE_INTEGER;
    updatePlotlyTimelineChart();
    autoScale();
  };

  const hoverText = (
    x: (string | null)[],
    y: (number | null)[],
    commit: string
  ) => {
    return x.map(
      (xi, i) =>
        `<b>Commit</b>: ${commit}<br><b>Time</b>: ${xi}<br><b>Requests</b>: ${y[i]}<br>`
    );
  };

  const getPlotlyLayoutObject = (minRange: number, maxRange: number) => {
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
      ...getPlotlyAxisXObject(minRange, maxRange),
    };
  };

  const buildPlotlyDataObjectForCommit = (
    unfilteredTimestampsOfOneCommit: Timestamp[],
    markerStatesOfOneCommit: IMarkerStates,
    commitId: string
  ) => {
    function getTimestampTickLabel(timestampEpochNanos: number) {
      // Convert nanoseconds to milliseconds for Date object
      const timestampEpochMillis =
        nanosecondsToMilliseconds(timestampEpochNanos);
      const timestampDate = new Date(timestampEpochMillis);
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

    function styleNewDayIndicator(gapIndicator: any) {
      gapIndicator.type = 'rect';
      gapIndicator.yref = 'paper';
      gapIndicator.y0 = 0.05;
      gapIndicator.y1 = 1;
      gapIndicator.fillcolor = '#ff0000';
    }

    const timestampsOfOneCommit = unfilteredTimestampsOfOneCommit.filter(
      (timestamp) =>
        timestamp.spanCount > minRequestFilter.current &&
        timestamp.spanCount < maxRequestFilter.current
    );

    const colors: string[] = [];
    const sizes: number[] = [];

    const x: (string | null)[] = [];
    const y: (number | null)[] = [];

    const timestampIds: number[] = [];

    const shapes = [];

    let tempGapIndicator = null;

    let nextExpectedTimestamp = 0;
    let i = 0;

    // 10 seconds in nanoseconds = 10_000_000_000 nanoseconds
    const TIMESTAMP_INTERVAL = 10_000_000_000;

    while (i < timestampsOfOneCommit.length) {
      const timestamp = timestampsOfOneCommit[i];
      const timestampId = timestamp.epochNano;

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
        // Add missing coordinates to gap indicator
        if (tempGapIndicator) {
          tempGapIndicator.x1 = getTimestampTickLabel(timestampId);
          tempGapIndicator.y1 = timestamp.spanCount;
          const END_OF_ISO_DATE = 10;
          if (
            tempGapIndicator.x0.substring(0, END_OF_ISO_DATE) !=
            tempGapIndicator.x1.substring(0, END_OF_ISO_DATE)
          ) {
            styleNewDayIndicator(tempGapIndicator);
          }

          shapes.push(tempGapIndicator);
          tempGapIndicator = null;
        }
        addCurrentTimestampToDataObject = true;
        nextExpectedTimestamp = timestampId + TIMESTAMP_INTERVAL;
      } else if (timestamp.epochNano === null) {
        // Edge case if API will return null values in the future
        x.push(null);
        y.push(null);
        i++;
      } else {
        // Gap fills for missing timestamps (outside of expected timestamp interval)
        if (!tempGapIndicator) {
          addCurrentTimestampToDataObject = true;
          x.push(null);
          y.push(null);
          tempGapIndicator = getDashedLine();
          const lastNonNullTimestamp =
            nextExpectedTimestamp - TIMESTAMP_INTERVAL;
          tempGapIndicator.x0 = getTimestampTickLabel(lastNonNullTimestamp);
          // Get last non-null value
          tempGapIndicator.y0 = y.filter((y) => y != null).at(-1)!;
        }
        nextExpectedTimestamp =
          timestampsOfOneCommit[i].epochNano ||
          timestampId + TIMESTAMP_INTERVAL;
      }

      const markerState = markerStatesOfOneCommit[timestampId];

      if (addCurrentTimestampToDataObject) {
        if (!markerState) {
          // Should not happen
          // console.warn("Missing markerState for timestamp", commitId, timestampId);
          continue;
        }
        colors.push(markerState.color);
        sizes.push(markerState.size);
        timestampIds.push(timestampId);
      }
    }
    const updatedPlotlyDataObject = {
      ...getPlotlyDataObject(x, y, colors, sizes, timestampIds, commitId),
      ...{ shapes: shapes },
    };

    return updatedPlotlyDataObject;
  };

  const getPlotlyDataObject = (
    dates: (string | null)[],
    requests: (number | null)[],
    colors: string[],
    sizes: number[],
    timestampIds: number[],
    commit: string
  ) => {
    return {
      hoverinfo: 'text',
      hoverlabel: {
        align: 'left',
      },
      marker: { color: colors, size: sizes },
      mode: 'lines+markers',
      connectgaps: false,
      text: hoverText(dates, requests, commit),
      timestampId: timestampIds,
      x: dates,
      y: requests,
      commit: commit,
    };
  };

  const resetHighlightInStateObjects = () => {
    selectedCommitTimestampsMap.current = new Map();
    markerStateMap.current = new Map();
  };

  const removeAllSelections = (commitId: string) => {
    const selectedTimestamps =
      selectedCommitTimestampsMap.current.get(commitId);

    const markerState = markerStateMap.current.get(commitId);

    if (markerState) {
      selectedTimestamps?.forEach((timestamp) => {
        markerState[timestamp.epochNano].color = debugSnapshots?.some(
          (ds) => ds.timestamp.epochNano === timestamp.epochNano
        )
          ? debugSnapshotMarkerColor.current
          : defaultMarkerColor.current;
        markerState[timestamp.epochNano].size = defaultMarkerSize.current;
      });
    }

    selectedCommitTimestampsMap.current.set(commitId, []);
  };

  const getPlotlyOptionsObject = () => {
    return {
      displayModeBar: false,
      doubleClick: false,
      responsive: true,
      scrollZoom: true,
    };
  };

  // #endregion

  return (
    <>
      {showDummyTimeline ? (
        <>
          <div className="timeline-no-timestamps-outer">
            <div className="timeline-no-timestamps-inner">
              No timestamps available!
            </div>
          </div>
          <div
            className="plotlyDiv timeline-blur-effect"
            ref={plotlyDivDummyRef}
          ></div>
        </>
      ) : (
        <div style={{ display: 'flex' }} className="flex-row">
          <div style={{ width: '75px', marginLeft: '5px' }}>
            <div style={{ fontWeight: 'bold' }}>Filter</div>
            <div>Max:</div>
            <input
              id="maxRequestFilter"
              className="form-control input-lg"
              placeholder="∞"
              onInput={setMaxRequestFilter}
            />
            <div>Min:</div>
            <input
              id="minRequestFilter"
              className="form-control input-lg"
              placeholder="0"
              onInput={setMinRequestFilter}
            />
          </div>
          <div
            style={{ width: '100%' }}
            className="plotlyDiv"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            ref={plotlyDivRef}
          ></div>
        </div>
      )}
    </>
  );
}
