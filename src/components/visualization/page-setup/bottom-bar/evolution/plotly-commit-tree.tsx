import LinkButton from 'explorviz-frontend/src/components/link-button.tsx';
import { useEvolutionAnimationStore } from 'explorviz-frontend/src/components/visualization/page-setup/bottom-bar/animation/evolution-animation-store';
import CommitChartAuthorFilters from 'explorviz-frontend/src/components/visualization/page-setup/bottom-bar/evolution/commit-chart-author-filters';
import CommitChartFilters from 'explorviz-frontend/src/components/visualization/page-setup/bottom-bar/evolution/commit-chart-filters';
import CommitChartSearch from 'explorviz-frontend/src/components/visualization/page-setup/bottom-bar/evolution/commit-chart-search';
import CommitStatisticsWindow from 'explorviz-frontend/src/components/visualization/page-setup/bottom-bar/evolution/commit-statistics-window';
import { useCommitTreeStateStore } from 'explorviz-frontend/src/stores/commit-tree-state';
import {
  addCommitToSelection,
  BranchChartSeries,
  branchHasAnalyzedCommits,
  buildBranchChartLineSegments,
  buildBranchChartSeries,
  formatCommitDate,
  getCommitAuthorOptionsFromCommitTree,
  getFirstBranchWithCommits,
  getMetricValue,
  hasSkippedCommitsBetweenVisiblePoints,
  removeCommitsNotInCommitTrees,
  removeFilteredCommitsFromSelection,
  toggleCommitInSelection,
} from 'explorviz-frontend/src/utils/evolution-data-helpers';
import {
  Branch,
  Commit,
  CommitNode,
  CommitXAxisPlacement,
  CROSS_COMMIT_IDENTIFIER,
  getAvailableMetricNames,
  getDefaultMetricName,
  hasActiveAuthorFilter,
  hasActiveCommitTreeFilters,
  NONE_METRIC,
  RepoNameCommitTreeMap,
} from 'explorviz-frontend/src/utils/evolution-schemes/evolution-data';
import {
  buildCommitChartLinkUrl,
  getCommitChartLinkLabel,
  getCommitChartLinkTooltip,
} from 'explorviz-frontend/src/utils/repository-file-url';
import Plotly from 'plotly.js-dist';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import Button from 'react-bootstrap/Button';

interface PlotlyCommitTreeArgs {
  repoNameCommitTreeMap: RepoNameCommitTreeMap;
  selectedRepoName: string;
  selectedCommits: Map<string, Commit[]>;
  triggerVizRenderingForSelectedCommits(): void;
  setSelectedCommits(newSelectedCommits: Map<string, Commit[]>): void;
  getCloneOfRepoNameAndBranchNameToColorMap(): Map<string, string>;
  setRepoNameAndBranchNameToColorMap(
    newRepoNameAndBranchNameToColorMap: Map<string, string>
  ): void;
}

const MAX_COMMIT_SELECTION_PER_APP = 2;
const COMMIT_UNSELECTED_SIZE = 8;
const COMMIT_TAGGED_SIZE = 16;
const COMMIT_SELECTED_SIZE = 20;
const HIGHLIGHTED_MARKER_COLOR = 'red';
const ANIMATION_POSITION_BAR_COLOR = 'red';
const ANIMATION_POSITION_BAR_WIDTH = 1;
const BRANCH_LINE_COLOR = 'rgba(70, 130, 180, 1)';
const SKIPPED_COMMIT_LINE_COLOR = 'rgba(70, 130, 180, 0.55)';
const EMPTY_SELECTED_COMMITS: Commit[] = [];
const DEFAULT_METRIC_CHANGE_THRESHOLD = 0;
const MARKER_TRACE_INDEX = 0;
const LABEL_TRACE_INDEX = 1;
const INTERACTION_SETTLE_MS = 120;
const COMMIT_HOVER_DISTANCE_PX = 20;
const PLOTLY_CHART_CONFIG: Partial<Plotly.Config> = {
  displayModeBar: false,
  doubleClick: false,
  responsive: false,
  scrollZoom: true,
  plotGlPixelRatio: 1,
};

const X_AXIS_PLACEMENT_OPTIONS: Array<{
  value: CommitXAxisPlacement;
  label: string;
}> = [
  { value: 'equidistant', label: 'Equidistant' },
  { value: 'time', label: 'Time-based' },
];

type PlotlyChartDiv = HTMLDivElement & {
  removeAllListeners?: (event: string) => void;
  on?: (event: string, handler: (data: Plotly.PlotMouseEvent) => void) => void;
};

type CommitChartListenerRefs = {
  chartCommitsRef: RefObject<CommitNode[]>;
  chartXValuesRef: RefObject<number[]>;
  chartYValuesRef: RefObject<Array<number | null>>;
  branchNameRef: RefObject<string>;
  selectedCommitsRef: RefObject<Map<string, Commit[]>>;
  selectedRepoNameRef: RefObject<string>;
  repoNameCommitTreeMapRef: RefObject<RepoNameCommitTreeMap>;
  xAxisPlacementRef: RefObject<CommitXAxisPlacement>;
  setSelectedCommitsRef: RefObject<
    (newSelectedCommits: Map<string, Commit[]>) => void
  >;
  triggerVizRenderingRef: RefObject<() => void>;
  dashedLineTraceIndexRef: RefObject<number | null>;
  interactionTimeoutRef: RefObject<number | undefined>;
  isInteractingRef: RefObject<boolean>;
};

function toNumericDatum(value: Plotly.Datum): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsedDate = Date.parse(value);
    if (!Number.isNaN(parsedDate)) {
      return parsedDate;
    }

    const parsedNumber = Number(value);
    if (Number.isFinite(parsedNumber)) {
      return parsedNumber;
    }
  }

  return null;
}

function resolveClickedCommitIndex(
  data: Plotly.PlotMouseEvent,
  xValues: number[],
  yValues: Array<number | null>
): number | null {
  const markerPoint = data.points.find(
    (point) => point.curveNumber === MARKER_TRACE_INDEX
  );
  if (markerPoint?.pointNumber != null) {
    return markerPoint.pointNumber;
  }

  const clickedPoint = data.points[0];
  if (!clickedPoint) {
    return null;
  }

  const clickX = toNumericDatum(clickedPoint.x);
  const clickY = toNumericDatum(clickedPoint.y);
  if (clickX == null || clickY == null) {
    return null;
  }

  let bestIndex: number | null = null;
  let bestDistance = Infinity;

  for (let index = 0; index < xValues.length; index++) {
    const yValue = yValues[index];
    if (yValue == null) {
      continue;
    }

    const dx = xValues[index] - clickX;
    const dy = yValue - clickY;
    const distance = dx * dx + dy * dy;
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  }

  return bestIndex;
}

type PlotlyFullLayoutAxis = {
  _rangeInitial0?: number | string;
  _rangeInitial1?: number | string;
  range?: [unknown, unknown];
};

type PlotlyChartDivWithLayout = PlotlyChartDiv & {
  _fullLayout?: {
    xaxis: PlotlyFullLayoutAxis;
    yaxis: PlotlyFullLayoutAxis;
  };
};

function getDefaultAxisRange(
  axis: PlotlyFullLayoutAxis | undefined,
  fallbackRange?: [unknown, unknown]
): [unknown, unknown] | undefined {
  if (
    axis?._rangeInitial0 !== undefined &&
    axis?._rangeInitial1 !== undefined
  ) {
    return [axis._rangeInitial0, axis._rangeInitial1];
  }

  if (fallbackRange) {
    return fallbackRange;
  }

  if (axis?.range) {
    return [axis.range[0], axis.range[1]];
  }

  return undefined;
}

function getLayoutAxisRanges(chartLayout: ReturnType<typeof buildLayout>): {
  xRange?: [unknown, unknown];
  yRange?: [unknown, unknown];
} {
  const yValues = chartLayout.yaxis.range;
  const yRange =
    yValues && yValues.length >= 2
      ? ([yValues[0], yValues[1]] as [unknown, unknown])
      : undefined;

  const xValues = chartLayout.xaxis.range;
  if (!xValues || xValues.length < 2) {
    return { yRange };
  }

  const xAxis = chartLayout.xaxis;
  const xRange =
    'type' in xAxis && xAxis.type === 'date'
      ? ([
          new Date(xValues[0]).toISOString(),
          new Date(xValues[1]).toISOString(),
        ] as [unknown, unknown])
      : ([xValues[0], xValues[1]] as [unknown, unknown]);

  return { xRange, yRange };
}

function attachCommitChartListeners(
  plotlyDiv: PlotlyChartDiv,
  refs: CommitChartListenerRefs
) {
  plotlyDiv.removeAllListeners?.('plotly_hover');
  plotlyDiv.removeAllListeners?.('plotly_unhover');
  plotlyDiv.removeAllListeners?.('plotly_relayouting');
  plotlyDiv.removeAllListeners?.('plotly_click');

  const dragLayer = plotlyDiv.querySelector('.nsewdrag') as HTMLElement | null;

  const restoreInteractionState = () => {
    if (!refs.isInteractingRef.current) {
      return;
    }

    refs.isInteractingRef.current = false;

    const tracesToShow = [LABEL_TRACE_INDEX];
    const dashedLineTraceIndex = refs.dashedLineTraceIndexRef.current;
    if (dashedLineTraceIndex != null) {
      tracesToShow.push(dashedLineTraceIndex);
    }

    void Plotly.restyle(plotlyDiv, { visible: true }, tracesToShow);
  };

  const scheduleInteractionRestore = () => {
    window.clearTimeout(refs.interactionTimeoutRef.current);
    refs.interactionTimeoutRef.current = window.setTimeout(() => {
      restoreInteractionState();
    }, INTERACTION_SETTLE_MS);
  };

  plotlyDiv.on?.('plotly_hover', () => {
    if (refs.isInteractingRef.current) {
      return;
    }
    if (dragLayer) {
      dragLayer.style.cursor = 'pointer';
    }
  });

  plotlyDiv.on?.('plotly_unhover', () => {
    if (dragLayer) {
      dragLayer.style.cursor = '';
    }
  });

  plotlyDiv.on?.('plotly_relayouting', () => {
    if (!refs.isInteractingRef.current) {
      refs.isInteractingRef.current = true;

      const tracesToHide = [LABEL_TRACE_INDEX];
      const dashedLineTraceIndex = refs.dashedLineTraceIndexRef.current;
      if (dashedLineTraceIndex != null) {
        tracesToHide.push(dashedLineTraceIndex);
      }

      void Plotly.restyle(plotlyDiv, { visible: false }, tracesToHide);
    }

    scheduleInteractionRestore();
  });

  plotlyDiv.on?.('plotly_click', (data) => {
    const pointNumber = resolveClickedCommitIndex(
      data,
      refs.chartXValuesRef.current ?? [],
      refs.chartYValuesRef.current ?? []
    );
    if (pointNumber == null) {
      return;
    }

    const commitId =
      refs.chartCommitsRef.current?.[pointNumber]?.hash ??
      CROSS_COMMIT_IDENTIFIER;

    const animStore = useEvolutionAnimationStore.getState();
    if (animStore.totalCount > 0 && commitId !== CROSS_COMMIT_IDENTIFIER) {
      const frameIndex = resolveFrameIndexForCommit(commitId);
      if (frameIndex !== null) {
        animStore.actions.seekTo(
          Math.min(frameIndex, animStore.totalCount - 1)
        );
        return;
      }
    }

    const selectedCommit: Commit = {
      commitId,
      branchName: refs.branchNameRef.current ?? '',
    };

    const newSelectedCommits = toggleCommitInSelection(
      refs.selectedCommitsRef.current ?? new Map(),
      refs.selectedRepoNameRef.current ?? '',
      selectedCommit,
      refs.repoNameCommitTreeMapRef.current ?? new Map(),
      refs.xAxisPlacementRef.current ?? 'equidistant',
      MAX_COMMIT_SELECTION_PER_APP
    );

    refs.setSelectedCommitsRef.current?.(newSelectedCommits);
    refs.triggerVizRenderingRef.current?.();
  });
}

export default function PlotlyCommitTree({
  repoNameCommitTreeMap,
  selectedRepoName,
  selectedCommits,
  triggerVizRenderingForSelectedCommits,
  setSelectedCommits,
}: PlotlyCommitTreeArgs) {
  const plotlyCommitDivRef = useRef<HTMLDivElement>(null);
  const lastAnimationBarXRef = useRef<number | null>(null);
  const [selectedBranchName, setSelectedBranchName] = useState('');
  const [selectedMetric, setSelectedMetric] = useState(NONE_METRIC);
  const [appliedMetricChangeThreshold, setAppliedMetricChangeThreshold] =
    useState(DEFAULT_METRIC_CHANGE_THRESHOLD);
  const [showFiltersRow, setShowFiltersRow] = useState(false);
  const [showAuthorsRow, setShowAuthorsRow] = useState(false);
  const [showStatisticsWindow, setShowStatisticsWindow] = useState(false);
  const appliedCommitTreeFilters = useCommitTreeStateStore(
    (state) => state._commitTreeFilters
  );
  const xAxisPlacement = useCommitTreeStateStore(
    (state) => state._xAxisPlacement
  );
  const setXAxisPlacement = useCommitTreeStateStore(
    (state) => state.setXAxisPlacement
  );
  const animationFrameVersion = useEvolutionAnimationStore(
    (state) => state.frameVersion
  );
  const animationActive = useEvolutionAnimationStore(
    (state) => state.totalCount > 0
  );

  const commitTree = repoNameCommitTreeMap.get(selectedRepoName);
  const selectedCommitsForRepo =
    selectedCommits.get(selectedRepoName) ?? EMPTY_SELECTED_COMMITS;
  const chartLinkUrl = useMemo(
    () =>
      buildCommitChartLinkUrl(commitTree?.remoteUrl, selectedCommitsForRepo),
    [commitTree?.remoteUrl, selectedCommitsForRepo]
  );
  const chartLinkLabel = getCommitChartLinkLabel(selectedCommitsForRepo.length);
  const chartLinkTooltip = getCommitChartLinkTooltip(
    selectedCommitsForRepo.length
  );
  const selectedBranch = commitTree?.branches.find(
    (branch) => branch.name === selectedBranchName
  );
  const availableMetrics = selectedBranch
    ? getAvailableMetricNames(selectedBranch)
    : [];
  const hasActiveFilters = hasActiveCommitTreeFilters(
    appliedCommitTreeFilters,
    appliedMetricChangeThreshold
  );
  const hasAuthorOptions = useMemo(
    () => getCommitAuthorOptionsFromCommitTree(commitTree).length > 0,
    [commitTree]
  );
  const isAuthorFilterActive = hasActiveAuthorFilter(appliedCommitTreeFilters);

  useEffect(() => {
    const commitTreeForRepo = repoNameCommitTreeMap.get(selectedRepoName);
    const currentBranchStillValid =
      selectedBranchName !== '' &&
      commitTreeForRepo?.branches.some(
        (branch) =>
          branch.name === selectedBranchName && branchHasAnalyzedCommits(branch)
      );

    if (currentBranchStillValid) {
      return;
    }

    const branch = getFirstBranchWithCommits(commitTreeForRepo);
    if (branch) {
      setSelectedBranchName(branch.name);
      setSelectedMetric(getDefaultMetricName(branch));
    } else {
      setSelectedBranchName('');
      setSelectedMetric(NONE_METRIC);
    }
  }, [selectedRepoName, repoNameCommitTreeMap, selectedBranchName]);

  useEffect(() => {
    if (!selectedBranch) {
      return;
    }

    if (
      selectedMetric !== NONE_METRIC &&
      !availableMetrics.includes(selectedMetric)
    ) {
      setSelectedMetric(getDefaultMetricName(selectedBranch));
    }
  }, [selectedBranch, selectedMetric, availableMetrics]);

  const metricChangeThreshold = appliedMetricChangeThreshold;
  const isMetricChangeFilterActive =
    selectedMetric !== NONE_METRIC && metricChangeThreshold > 0;
  const authorKeys = appliedCommitTreeFilters.authorKeys;

  const branchChartSeriesOptions = {
    ...(isMetricChangeFilterActive ? { metricChangeThreshold } : {}),
    ...(authorKeys !== undefined ? { authorKeys } : {}),
  };

  const chartSeries = useMemo(() => {
    if (!selectedBranch) {
      return null;
    }

    return buildBranchChartSeries(
      selectedBranch,
      xAxisPlacement,
      selectedMetric,
      branchChartSeriesOptions
    );
  }, [
    selectedBranch,
    xAxisPlacement,
    selectedMetric,
    isMetricChangeFilterActive,
    metricChangeThreshold,
    authorKeys,
  ]);
  const updateAnimationPositionBar = () => {
    const plotlyDiv = plotlyCommitDivRef.current;
    if (!plotlyDiv || !chartSeries || !selectedBranch) {
      return;
    }

    const animStore = useEvolutionAnimationStore.getState();
    if (animStore.totalCount === 0) {
      if (lastAnimationBarXRef.current !== null) {
        Plotly.relayout(plotlyDiv, { shapes: [] });
        lastAnimationBarXRef.current = null;
      }
      return;
    }

    const x = resolveAnimationPositionX(
      chartSeries,
      selectedBranch,
      xAxisPlacement
    );
    if (x == null || x === lastAnimationBarXRef.current) {
      return;
    }

    lastAnimationBarXRef.current = x;
    Plotly.relayout(plotlyDiv, {
      shapes: [buildAnimationPositionBarShape(x)],
    });
  };

  useEffect(() => {
    lastAnimationBarXRef.current = null;
  }, [chartSeries]);

  useEffect(() => {
    updateAnimationPositionBar();
  }, [
    animationFrameVersion,
    animationActive,
    chartSeries,
    selectedBranch,
    xAxisPlacement,
  ]);
  const useSegmentedLines = useMemo(() => {
    if (!chartSeries) {
      return false;
    }

    return (
      isMetricChangeFilterActive ||
      hasSkippedCommitsBetweenVisiblePoints(chartSeries.originalIndices)
    );
  }, [chartSeries, isMetricChangeFilterActive]);

  const hoverText = useMemo(
    () =>
      chartSeries ? buildHoverText(chartSeries.commits, selectedMetric) : [],
    [chartSeries, selectedMetric]
  );

  const baseMarkerStyles = useMemo(() => {
    if (!chartSeries) {
      return null;
    }

    const colors = chartSeries.commits.map(() => BRANCH_LINE_COLOR);
    const sizes = chartSeries.commits.map(() => COMMIT_UNSELECTED_SIZE);
    const texts = chartSeries.commits.map(() => '');
    markTaggedCommits(chartSeries.commits, sizes, texts);

    return { colors, sizes, texts };
  }, [chartSeries]);

  const chartLayout = useMemo(() => {
    if (!chartSeries) {
      return null;
    }

    return buildLayout(
      selectedMetric,
      chartSeries.yValues,
      chartSeries.xValues,
      xAxisPlacement,
      chartSeries.commits.length
    );
  }, [chartSeries, selectedMetric, xAxisPlacement]);

  const chartUiRevision = useMemo(() => {
    if (!chartSeries || !selectedBranch) {
      return '';
    }

    const firstCommitHash = chartSeries.commits[0]?.hash ?? '';
    const lastCommitHash =
      chartSeries.commits[chartSeries.commits.length - 1]?.hash ?? '';

    return [
      selectedBranch.name,
      selectedMetric,
      xAxisPlacement,
      appliedMetricChangeThreshold,
      authorKeys?.join('|') ?? 'all-authors',
      chartSeries.commits.length,
      firstCommitHash,
      lastCommitHash,
    ].join(':');
  }, [
    chartSeries,
    selectedBranch,
    selectedMetric,
    xAxisPlacement,
    appliedMetricChangeThreshold,
    authorKeys,
  ]);

  const chartCommitsRef = useRef<CommitNode[]>([]);
  const chartXValuesRef = useRef<number[]>([]);
  const chartYValuesRef = useRef<Array<number | null>>([]);
  const branchNameRef = useRef('');
  const selectedRepoNameRef = useRef(selectedRepoName);
  const repoNameCommitTreeMapRef = useRef(repoNameCommitTreeMap);
  const xAxisPlacementRef = useRef(xAxisPlacement);
  const setSelectedCommitsRef = useRef(setSelectedCommits);
  const triggerVizRenderingRef = useRef(triggerVizRenderingForSelectedCommits);
  const chartReadyRef = useRef(false);
  const dashedLineTraceIndexRef = useRef<number | null>(null);
  const interactionTimeoutRef = useRef<number | undefined>(undefined);
  const isInteractingRef = useRef(false);
  const defaultAxisRangesRef = useRef<{
    x: [unknown, unknown];
    y: [unknown, unknown];
  } | null>(null);
  const selectedCommitsRef = useRef(selectedCommits);

  useEffect(() => {
    selectedCommitsRef.current = selectedCommits;
    selectedRepoNameRef.current = selectedRepoName;
    repoNameCommitTreeMapRef.current = repoNameCommitTreeMap;
    xAxisPlacementRef.current = xAxisPlacement;
    setSelectedCommitsRef.current = setSelectedCommits;
    triggerVizRenderingRef.current = triggerVizRenderingForSelectedCommits;
  }, [
    selectedCommits,
    selectedRepoName,
    repoNameCommitTreeMap,
    xAxisPlacement,
    setSelectedCommits,
    triggerVizRenderingForSelectedCommits,
  ]);

  const applySelectionToMarkerStyles = useCallback(
    (styles: { colors: string[]; sizes: number[]; texts: string[] }) => {
      if (!chartSeries) {
        return styles;
      }

      const colors = [...styles.colors];
      const sizes = [...styles.sizes];
      const texts = [...styles.texts];
      markSelectedCommits(
        selectedCommitsForRepo,
        chartSeries.commits,
        colors,
        sizes,
        texts
      );

      return { colors, sizes, texts };
    },
    [chartSeries, selectedCommitsForRepo]
  );

  useEffect(() => {
    if (!selectedRepoName) {
      return;
    }

    const updatedSelectedCommits = removeFilteredCommitsFromSelection(
      selectedCommits,
      selectedRepoName,
      repoNameCommitTreeMap,
      selectedMetric,
      isMetricChangeFilterActive ? metricChangeThreshold : 0,
      authorKeys
    );

    if (updatedSelectedCommits === selectedCommits) {
      return;
    }

    setSelectedCommits(updatedSelectedCommits);
    triggerVizRenderingForSelectedCommits();
  }, [
    isMetricChangeFilterActive,
    metricChangeThreshold,
    authorKeys,
    selectedMetric,
    selectedRepoName,
    repoNameCommitTreeMap,
    selectedCommits,
    setSelectedCommits,
    triggerVizRenderingForSelectedCommits,
  ]);

  const listenerRefs: CommitChartListenerRefs = {
    chartCommitsRef,
    chartXValuesRef,
    chartYValuesRef,
    branchNameRef,
    selectedCommitsRef,
    selectedRepoNameRef,
    repoNameCommitTreeMapRef,
    xAxisPlacementRef,
    setSelectedCommitsRef,
    triggerVizRenderingRef,
    dashedLineTraceIndexRef,
    interactionTimeoutRef,
    isInteractingRef,
  };

  const renderCommitChart = useCallback(
    (
      markerStyles: { colors: string[]; sizes: number[]; texts: string[] },
      uiRevision: string
    ) => {
      if (
        !plotlyCommitDivRef.current ||
        !chartLayout ||
        !chartSeries ||
        !selectedBranch
      ) {
        return false;
      }

      chartCommitsRef.current = chartSeries.commits;
      chartXValuesRef.current = chartSeries.xValues;
      chartYValuesRef.current = chartSeries.yValues;
      branchNameRef.current = selectedBranch.name;

      const { traces, dashedLineTraceIndex } = buildPlotlyTraces({
        branchName: selectedBranch.name,
        colors: markerStyles.colors,
        sizes: markerStyles.sizes,
        texts: markerStyles.texts,
        xValues: chartSeries.xValues,
        yValues: chartSeries.yValues,
        originalIndices: chartSeries.originalIndices,
        hoverText,
        useSegmentedLines,
        xAxisPlacement,
      });
      dashedLineTraceIndexRef.current = dashedLineTraceIndex;

      Plotly.react(
        plotlyCommitDivRef.current,
        traces,
        {
          ...chartLayout,
          uirevision: uiRevision,
        },
        PLOTLY_CHART_CONFIG
      );

      attachCommitChartListeners(
        plotlyCommitDivRef.current as PlotlyChartDiv,
        listenerRefs
      );

      queueMicrotask(() => {
        const plotlyDiv =
          plotlyCommitDivRef.current as PlotlyChartDivWithLayout | null;
        const layoutRanges = getLayoutAxisRanges(chartLayout);
        const xRange = getDefaultAxisRange(
          plotlyDiv?._fullLayout?.xaxis,
          layoutRanges.xRange
        );
        const yRange = getDefaultAxisRange(
          plotlyDiv?._fullLayout?.yaxis,
          layoutRanges.yRange
        );

        if (xRange && yRange) {
          defaultAxisRangesRef.current = { x: xRange, y: yRange };
        }
      });

      chartReadyRef.current = true;
      return true;
    },
    [
      chartLayout,
      chartSeries,
      selectedBranch,
      hoverText,
      useSegmentedLines,
      xAxisPlacement,
    ]
  );

  useEffect(() => {
    if (!selectedBranch || !baseMarkerStyles) {
      chartReadyRef.current = false;
      return;
    }

    renderCommitChart(baseMarkerStyles, chartUiRevision);
  }, [selectedBranch, baseMarkerStyles, chartUiRevision, renderCommitChart]);

  useEffect(() => {
    if (
      !chartReadyRef.current ||
      !plotlyCommitDivRef.current ||
      !baseMarkerStyles
    ) {
      return;
    }

    const markerStyles = applySelectionToMarkerStyles(baseMarkerStyles);
    const labelTraceData = buildLabelTraceData(
      chartSeries?.xValues ?? [],
      chartSeries?.yValues ?? [],
      markerStyles.texts
    );

    void Plotly.restyle(
      plotlyCommitDivRef.current,
      {
        'marker.color': [markerStyles.colors],
        'marker.size': [markerStyles.sizes],
      },
      [MARKER_TRACE_INDEX]
    );

    if (labelTraceData) {
      void Plotly.restyle(
        plotlyCommitDivRef.current,
        {
          x: [labelTraceData.x],
          y: [labelTraceData.y],
          text: [labelTraceData.text],
          visible: isInteractingRef.current ? false : true,
        },
        [LABEL_TRACE_INDEX]
      );
    } else {
      void Plotly.restyle(plotlyCommitDivRef.current, { visible: false }, [
        LABEL_TRACE_INDEX,
      ]);
    }
  }, [
    selectedCommitsForRepo,
    baseMarkerStyles,
    applySelectionToMarkerStyles,
    chartSeries,
  ]);

  useEffect(() => {
    const plotlyDiv = plotlyCommitDivRef.current;
    return () => {
      window.clearTimeout(interactionTimeoutRef.current);
      if (plotlyDiv) {
        Plotly.purge(plotlyDiv);
      }
      chartReadyRef.current = false;
    };
  }, []);

  const refocusChart = () => {
    const plotlyDiv =
      plotlyCommitDivRef.current as PlotlyChartDivWithLayout | null;
    if (!plotlyDiv?._fullLayout) {
      return;
    }

    isInteractingRef.current = false;
    window.clearTimeout(interactionTimeoutRef.current);

    const layoutRanges = chartLayout
      ? getLayoutAxisRanges(chartLayout)
      : { xRange: undefined, yRange: undefined };
    const storedRanges = defaultAxisRangesRef.current;
    const xRange =
      storedRanges?.x ??
      getDefaultAxisRange(plotlyDiv._fullLayout.xaxis, layoutRanges.xRange);
    const yRange =
      storedRanges?.y ??
      getDefaultAxisRange(plotlyDiv._fullLayout.yaxis, layoutRanges.yRange);

    if (!xRange || !yRange) {
      return;
    }

    void Plotly.relayout(plotlyDiv, {
      'xaxis.autorange': false,
      'xaxis.range[0]': xRange[0],
      'xaxis.range[1]': xRange[1],
      'yaxis.autorange': false,
      'yaxis.range[0]': yRange[0],
      'yaxis.range[1]': yRange[1],
    }).then(() => {
      const tracesToShow = [LABEL_TRACE_INDEX];
      const dashedLineTraceIndex = dashedLineTraceIndexRef.current;
      if (dashedLineTraceIndex != null) {
        tracesToShow.push(dashedLineTraceIndex);
      }

      void Plotly.restyle(plotlyDiv, { visible: true }, tracesToShow);
    });
  };

  const handleSearchSelectCommit = (commit: Commit) => {
    if (commit.branchName !== selectedBranchName) {
      const branch = commitTree?.branches.find(
        (candidate) => candidate.name === commit.branchName
      );
      setSelectedBranchName(commit.branchName);
      if (branch) {
        setSelectedMetric(getDefaultMetricName(branch));
      }
    }

    const newSelectedCommits = addCommitToSelection(
      selectedCommits,
      selectedRepoName,
      commit,
      repoNameCommitTreeMap,
      xAxisPlacement,
      MAX_COMMIT_SELECTION_PER_APP
    );

    setSelectedCommits(newSelectedCommits);
    triggerVizRenderingForSelectedCommits();
  };

  const handleFiltersApplied = (metricChangeThreshold: number) => {
    setAppliedMetricChangeThreshold(metricChangeThreshold);

    const updatedSelectedCommits = removeCommitsNotInCommitTrees(
      selectedCommits,
      repoNameCommitTreeMap
    );

    let nextSelectedCommits = updatedSelectedCommits;
    if (selectedRepoName) {
      nextSelectedCommits = removeFilteredCommitsFromSelection(
        updatedSelectedCommits,
        selectedRepoName,
        repoNameCommitTreeMap,
        selectedMetric,
        selectedMetric !== NONE_METRIC && metricChangeThreshold > 0
          ? metricChangeThreshold
          : 0,
        authorKeys
      );
    }

    if (nextSelectedCommits !== selectedCommits) {
      setSelectedCommits(nextSelectedCommits);
      triggerVizRenderingForSelectedCommits();
    }
  };

  const handleAuthorFilterApplied = () => {
    handleFiltersApplied(appliedMetricChangeThreshold);
  };

  if (
    !repoNameCommitTreeMap ||
    !selectedRepoName ||
    !commitTree?.branches?.some((branch) => branch.commits.length > 0)
  ) {
    return repoNameCommitTreeMap && repoNameCommitTreeMap.size > 0 ? (
      <div className="commit-tree-no-data-container">
        <div className="commit-tree-no-data-message">
          {selectedRepoName
            ? 'No commit tree data available!'
            : 'No repository selected!'}
        </div>
      </div>
    ) : null;
  }

  return (
    <div
      className={
        showFiltersRow || showAuthorsRow
          ? 'commit-metrics-chart'
          : 'commit-metrics-chart commit-metrics-chart--filters-collapsed'
      }
    >
      <div className="commit-metrics-chart-controls">
        <Button
          variant={
            hasActiveFilters
              ? 'success'
              : showFiltersRow
                ? 'secondary'
                : 'outline-secondary'
          }
          size="sm"
          className="commit-metrics-chart-filters-toggle"
          onClick={() => setShowFiltersRow((visible) => !visible)}
          aria-expanded={showFiltersRow}
          aria-controls="commit-chart-filter-row"
          title={
            showFiltersRow
              ? 'Hide the filter row below'
              : 'Show the filter row below'
          }
        >
          <span className="commit-metrics-chart-filters-toggle-label">
            {showFiltersRow ? 'Hide filters' : 'Show filters'}
          </span>
          <span
            className={`commit-metrics-chart-filters-toggle-chevron${showFiltersRow ? ' commit-metrics-chart-filters-toggle-chevron--expanded' : ''}`}
            aria-hidden="true"
          >
            ▼
          </span>
        </Button>
        {hasAuthorOptions && (
          <Button
            variant={
              isAuthorFilterActive
                ? 'success'
                : showAuthorsRow
                  ? 'secondary'
                  : 'outline-secondary'
            }
            size="sm"
            className="commit-metrics-chart-filters-toggle"
            onClick={() => setShowAuthorsRow((visible) => !visible)}
            aria-expanded={showAuthorsRow}
            aria-controls="commit-chart-author-row"
            title={
              showAuthorsRow
                ? 'Hide the author filter section below'
                : 'Show the author filter section below'
            }
          >
            <span className="commit-metrics-chart-filters-toggle-label">
              {showAuthorsRow ? 'Hide authors' : 'Authors'}
            </span>
            <span
              className={`commit-metrics-chart-filters-toggle-chevron${showAuthorsRow ? ' commit-metrics-chart-filters-toggle-chevron--expanded' : ''}`}
              aria-hidden="true"
            >
              ▼
            </span>
          </Button>
        )}
        <label className="commit-metrics-chart-control">
          <span className="commit-metrics-chart-control-label">Branch</span>
          <select
            value={selectedBranchName}
            onChange={(event) => {
              const branchName = event.target.value;
              const branch = commitTree.branches.find(
                (candidate) => candidate.name === branchName
              );
              setSelectedBranchName(branchName);
              if (branch) {
                setSelectedMetric(getDefaultMetricName(branch));
              }
            }}
            aria-label="Select branch"
            className="commit-metrics-chart-select"
          >
            {commitTree.branches
              .filter((branch) => branch.commits.length > 0)
              .map((branch) => (
                <option key={branch.name} value={branch.name}>
                  {branch.name}
                </option>
              ))}
          </select>
        </label>
        <label className="commit-metrics-chart-control">
          <span className="commit-metrics-chart-control-label">Metric</span>
          <select
            value={selectedMetric}
            onChange={(event) => setSelectedMetric(event.target.value)}
            aria-label="Select metric"
            className="commit-metrics-chart-select"
          >
            <option value={NONE_METRIC}>{NONE_METRIC}</option>
            {availableMetrics.map((metricName) => (
              <option key={metricName} value={metricName}>
                {metricName}
              </option>
            ))}
          </select>
        </label>
        <label className="commit-metrics-chart-control">
          <span className="commit-metrics-chart-control-label">X-axis</span>
          <select
            value={xAxisPlacement}
            onChange={(event) =>
              setXAxisPlacement(event.target.value as CommitXAxisPlacement)
            }
            aria-label="Select x-axis placement"
            className="commit-metrics-chart-select"
          >
            {X_AXIS_PLACEMENT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <Button
          variant="outline-secondary"
          size="sm"
          className="commit-metrics-chart-refocus-button"
          onClick={refocusChart}
          title="Reset pan and zoom to show all commits"
        >
          Re-focus
        </Button>
        <LinkButton
          url={chartLinkUrl}
          disabled={!chartLinkUrl}
          appearance="outline-button"
          className="commit-metrics-chart-refocus-button"
          label={chartLinkUrl ? chartLinkLabel : 'Open Repository'}
          tooltip={
            chartLinkUrl ? chartLinkTooltip : 'Repository URL unavailable'
          }
        />
        <CommitChartSearch
          commitTree={commitTree}
          onSelectCommit={handleSearchSelectCommit}
        />
      </div>
      <CommitChartFilters
        expanded={showFiltersRow}
        selectedMetric={selectedMetric}
        appliedMetricChangeThreshold={appliedMetricChangeThreshold}
        onFiltersApplied={handleFiltersApplied}
      />
      <CommitChartAuthorFilters
        expanded={showAuthorsRow}
        commitTree={commitTree}
        onAuthorFilterApplied={handleAuthorFilterApplied}
      />
      <div ref={plotlyCommitDivRef} className="plotlyCommitDiv" />
      {showStatisticsWindow && (
        <CommitStatisticsWindow
          repoNameCommitTreeMap={repoNameCommitTreeMap}
          initialRepoName={selectedRepoName}
          initialBranchName={selectedBranchName}
          onClose={() => setShowStatisticsWindow(false)}
        />
      )}
    </div>
  );
}

function buildLabelTraceData(
  xValues: Plotly.Datum[],
  yValues: Array<number | null>,
  texts: string[]
): { x: Plotly.Datum[]; y: number[]; text: string[] } | null {
  const x: Plotly.Datum[] = [];
  const y: number[] = [];
  const text: string[] = [];

  for (let index = 0; index < texts.length; index++) {
    const label = texts[index];
    if (!label) {
      continue;
    }

    x.push(xValues[index]);
    y.push(yValues[index] ?? 0);
    text.push(label);
  }

  if (x.length === 0) {
    return null;
  }

  return { x, y, text };
}

function toPlotlyDateValue(ms: number): string {
  return new Date(ms).toISOString();
}

function toPlotlyXValues(
  xValues: number[],
  placement: CommitXAxisPlacement
): Plotly.Datum[] {
  if (placement !== 'time') {
    return xValues;
  }

  return xValues.map((value) =>
    Number.isFinite(value) ? toPlotlyDateValue(value) : value
  );
}

function toPlotlyNullableXValues(
  xValues: Array<number | null>,
  placement: CommitXAxisPlacement
): Array<Plotly.Datum | null> {
  if (placement !== 'time') {
    return xValues;
  }

  return xValues.map((value) =>
    value != null && Number.isFinite(value) ? toPlotlyDateValue(value) : value
  );
}

function buildPlotlyTraces({
  branchName,
  colors,
  sizes,
  texts,
  xValues,
  yValues,
  originalIndices,
  hoverText,
  useSegmentedLines,
  xAxisPlacement,
}: {
  branchName: string;
  colors: string[];
  sizes: number[];
  texts: string[];
  xValues: number[];
  yValues: Array<number | null>;
  originalIndices: number[];
  hoverText: string[];
  useSegmentedLines: boolean;
  xAxisPlacement: CommitXAxisPlacement;
}): { traces: Plotly.Data[]; dashedLineTraceIndex: number | null } {
  const plotlyXValues = toPlotlyXValues(xValues, xAxisPlacement);

  const markerTrace: Plotly.Data = {
    name: branchName,
    type: 'scattergl',
    marker: { color: colors, size: sizes },
    mode: 'markers',
    hoverinfo: 'text',
    hoveron: 'points',
    hoverlabel: { align: 'left' },
    cliponaxis: true,
    hovertext: hoverText,
    x: plotlyXValues,
    y: yValues,
  };

  const labelTraceData = buildLabelTraceData(plotlyXValues, yValues, texts);
  const labelTrace: Plotly.Data = {
    type: 'scatter',
    mode: 'text',
    x: labelTraceData?.x ?? [],
    y: labelTraceData?.y ?? [],
    text: labelTraceData?.text ?? [],
    textposition: 'middle center',
    textfont: {
      color: 'white',
      size: 10,
      family: 'Arial, sans-serif',
    },
    hoverinfo: 'skip',
    showlegend: false,
    visible: labelTraceData != null,
    cliponaxis: false,
  };

  const traces: Plotly.Data[] = [markerTrace, labelTrace];
  let dashedLineTraceIndex: number | null = null;

  if (!useSegmentedLines) {
    traces.push({
      type: 'scattergl',
      mode: 'lines',
      x: plotlyXValues,
      y: yValues,
      line: { color: BRANCH_LINE_COLOR, width: 2 },
      hoverinfo: 'skip',
      showlegend: false,
      connectgaps: false,
    });
    return { traces, dashedLineTraceIndex };
  }

  const lineSegments = buildBranchChartLineSegments(
    xValues,
    yValues,
    originalIndices
  );

  if (lineSegments.solid.x.length > 0) {
    traces.push({
      type: 'scattergl',
      mode: 'lines',
      x: toPlotlyNullableXValues(lineSegments.solid.x, xAxisPlacement),
      y: lineSegments.solid.y,
      line: { color: BRANCH_LINE_COLOR, width: 2 },
      hoverinfo: 'skip',
      showlegend: false,
      connectgaps: false,
    });
  }

  if (lineSegments.dashed.x.length > 0) {
    dashedLineTraceIndex = traces.length;
    traces.push({
      type: 'scatter',
      mode: 'lines',
      x: toPlotlyNullableXValues(lineSegments.dashed.x, xAxisPlacement),
      y: lineSegments.dashed.y,
      line: {
        color: SKIPPED_COMMIT_LINE_COLOR,
        width: 2,
        dash: 'dash',
      },
      hoverinfo: 'skip',
      showlegend: false,
      connectgaps: false,
    });
  }

  return { traces, dashedLineTraceIndex };
}

function buildAnimationPositionBarShape(x: number) {
  return {
    type: 'line' as const,
    xref: 'x' as const,
    yref: 'paper' as const,
    x0: x,
    x1: x,
    y0: 0,
    y1: 1,
    line: {
      color: ANIMATION_POSITION_BAR_COLOR,
      width: ANIMATION_POSITION_BAR_WIDTH,
    },
    layer: 'above' as const,
  };
}

function resolveAnimationPositionX(
  chartSeries: BranchChartSeries,
  branch: Branch,
  xAxisPlacement: CommitXAxisPlacement
): number | null {
  const animStore = useEvolutionAnimationStore.getState();
  const frameIndex = animStore.currentFrameIndex;
  const activeFrame = animStore.deltaMode
    ? animStore.deltaFrames.get(frameIndex)
    : animStore.loadedFrames.get(frameIndex);

  if (!activeFrame) {
    return null;
  }

  if (xAxisPlacement === 'time') {
    if (Number.isFinite(activeFrame.authorDate)) {
      return activeFrame.authorDate;
    }

    const chartIndex = chartSeries.commits.findIndex(
      (commit) => commit.hash === activeFrame.commitHash
    );
    if (chartIndex !== -1) {
      return chartSeries.xValues[chartIndex];
    }
  }

  const chartIndex = chartSeries.commits.findIndex(
    (commit) => commit.hash === activeFrame.commitHash
  );
  if (chartIndex !== -1) {
    return chartSeries.xValues[chartIndex];
  }

  const branchIndex = branch.commits.findIndex(
    (commit) => commit.hash === activeFrame.commitHash
  );
  if (branchIndex === -1 || chartSeries.originalIndices.length === 0) {
    return null;
  }

  let nearestChartIndex = 0;
  let nearestDistance = Number.POSITIVE_INFINITY;
  chartSeries.originalIndices.forEach((originalIndex, index) => {
    const distance = Math.abs(originalIndex - branchIndex);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestChartIndex = index;
    }
  });

  return chartSeries.xValues[nearestChartIndex] ?? null;
}

function resolveFrameIndexForCommit(commitHash: string): number | null {
  const store = useEvolutionAnimationStore.getState();
  const ordinal = store.orderedCommitHashes.indexOf(commitHash);
  if (ordinal < 0) {
    return null;
  }

  if (store.timeMode !== 'time') {
    return Math.floor(ordinal / Math.max(1, store.granularity));
  }

  const timestamps = store.orderedCommitTimestamps;
  if (timestamps.length === 0) {
    return null;
  }
  const bucket = Math.max(1, store.bucketSize);
  const offset = timestamps[ordinal] - timestamps[0];
  return Math.max(0, Math.ceil(offset / bucket) - 1);
}

function markTaggedCommits(
  chartCommits: CommitNode[],
  sizes: number[],
  texts: string[]
) {
  chartCommits.forEach((commit, index) => {
    if (commit.tags?.length) {
      sizes[index] = COMMIT_TAGGED_SIZE;
      texts[index] = 'T';
    }
  });
}

function markSelectedCommits(
  allSelectedCommits: Commit[],
  chartCommits: CommitNode[],
  colors: string[],
  sizes: number[],
  texts: string[]
) {
  const commitIndexByHash = new Map<string, number>();
  chartCommits.forEach((commit, index) => {
    commitIndexByHash.set(commit.hash, index);
  });

  allSelectedCommits.forEach((selectedCommit, selectionIndex) => {
    const index = commitIndexByHash.get(selectedCommit.commitId);
    if (index !== undefined) {
      colors[index] = HIGHLIGHTED_MARKER_COLOR;
      sizes[index] = COMMIT_SELECTED_SIZE;
      texts[index] = (selectionIndex + 1).toString();
    }
  });
}

function buildHoverText(
  chartCommits: CommitNode[],
  metricName: string
): string[] {
  return chartCommits.map((commit) => {
    const lines = [`Commit ID: ${commit.hash}`];
    const formattedCommitDate = formatCommitDate(commit);
    if (formattedCommitDate) {
      lines.push(`Date: ${formattedCommitDate}`);
    }
    if (metricName !== NONE_METRIC) {
      const metricValue = getMetricValue(commit, metricName);
      lines.push(
        metricValue == null
          ? `${metricName}: pending`
          : `${metricName}: ${metricValue.toLocaleString('en-US')}`
      );
    }
    if (!commit.hasAccumulatedMetrics) {
      lines.push('Metrics pending');
    }
    return lines.join('<br>');
  });
}

function getNumericMinMax(values: Array<number | null>): {
  min: number;
  max: number;
} {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (const value of values) {
    if (value == null || !Number.isFinite(value)) {
      continue;
    }
    min = Math.min(min, value);
    max = Math.max(max, value);
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return { min: 0, max: 1 };
  }

  return { min, max };
}

function buildLayout(
  metricName: string,
  yValues: Array<number | null>,
  xValues: number[],
  placement: CommitXAxisPlacement,
  commitCount = yValues.length
) {
  const { min: rawMinY, max: rawMaxY } = getNumericMinMax(yValues);
  const minY = metricName === NONE_METRIC ? -1 : rawMinY;
  const maxY = metricName === NONE_METRIC ? 1 : rawMaxY;
  const yPadding = metricName === NONE_METRIC ? 0 : (maxY - minY || 1) * 0.1;

  const xAxis =
    placement === 'time'
      ? buildTimeXAxis(xValues)
      : buildEquidistantXAxis(commitCount)

  return {
    hovermode: 'closest',
    hoverdistance: COMMIT_HOVER_DISTANCE_PX,
    spikedistance: 0,
    dragmode: 'pan',
    margin: {
      autoexpand: placement === 'time',
      b: placement === 'time' ? 70 : 50,
      l: metricName === NONE_METRIC ? 20 : 60,
      pad: 5,
      t: 10,
      r: 20,
    },
    xaxis: xAxis,
    yaxis: {
      range: [minY - yPadding, maxY + yPadding],
      showgrid: metricName !== NONE_METRIC,
      zeroline: metricName !== NONE_METRIC,
      showline: metricName !== NONE_METRIC,
      showticklabels: metricName !== NONE_METRIC,
      automargin: false,
      ticklabeloverflow: 'allow',
      tickformat: metricName === NONE_METRIC ? undefined : '.2s',
      tickfont: { color: '#7f7f7f', size: 11 },
      title: {
        font: { color: '#7f7f7f', size: 13 },
        text: metricName === NONE_METRIC ? '' : metricName,
      },
    },
    annotations: [],
  };
}

function buildEquidistantXAxis(commitCount: number) {
  const tickvals = getEquidistantTickValues(commitCount, 6);

  return {
    range: [-0.5, Math.max(commitCount - 0.5, 0.5)],
    showline: true,
    linecolor: '#adb5bd',
    showgrid: false,
    showticklabels: true,
    tickmode: 'array' as const,
    tickvals,
    ticktext: tickvals.map((value) => String(value + 1)),
    tickangle: 0,
    ticklabeloverflow: 'allow',
    tickfont: { color: '#7f7f7f', size: 11 },
    title: {
      text: 'Commits',
      font: { color: '#7f7f7f', size: 13 },
      standoff: 12,
    },
  };
}

function getEquidistantTickValues(
  commitCount: number,
  maxTicks: number
): number[] {
  if (commitCount <= 0) {
    return [0];
  }

  if (commitCount <= maxTicks) {
    return Array.from({ length: commitCount }, (_, index) => index);
  }

  const step = Math.ceil((commitCount - 1) / (maxTicks - 1));
  const tickvals: number[] = [];

  for (let index = 0; index < commitCount; index += step) {
    tickvals.push(index);
  }

  if (tickvals[tickvals.length - 1] !== commitCount - 1) {
    tickvals.push(commitCount - 1);
  }

  return tickvals;
}

function buildTimeXAxis(xValues: number[]) {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;

  for (const value of xValues) {
    if (!Number.isFinite(value)) {
      continue;
    }
    minX = Math.min(minX, value);
    maxX = Math.max(maxX, value);
  }

  if (!Number.isFinite(minX) || !Number.isFinite(maxX)) {
    minX = Date.now();
    maxX = minX + 86_400_000;
  }
  const spanMs = maxX - minX;
  const xPadding = Math.max(spanMs * 0.05, 86_400_000);
  const tickFormat = spanMs > 365 * 86_400_000 ? '%b %Y' : '%b %d, %Y';

  return {
    type: 'date' as const,
    range: [
      toPlotlyDateValue(minX - xPadding),
      toPlotlyDateValue(maxX + xPadding),
    ],
    showline: true,
    linecolor: '#adb5bd',
    showgrid: true,
    gridcolor: '#e9ecef',
    showticklabels: true,
    automargin: true,
    tickangle: 0,
    tickformat: tickFormat,
    hoverformat: '%b %d, %Y',
    tickfont: { color: '#7f7f7f', size: 11 },
    title: {
      text: 'Commit date',
      font: { color: '#7f7f7f', size: 13 },
      standoff: 8,
    },
  };
}
