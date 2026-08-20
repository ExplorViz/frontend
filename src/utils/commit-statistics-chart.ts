import {
  CommitStatisticsChartData,
  CommitStatisticsYearGroup,
} from 'explorviz-frontend/src/utils/commit-statistics-helpers';
import Plotly from 'plotly.js-dist';

const MIN_PIXELS_PER_MONTH_LABEL = 25;
const MIN_PIXELS_PER_YEAR_LABEL = 30;

const AXIS_LABEL_STYLE = { color: '#7f7f7f', size: 11 };
const AXIS_TITLE_STYLE = { color: '#7f7f7f', size: 13 };

function getGroupCenter(group: CommitStatisticsYearGroup): number {
  return (group.startIndex + group.endIndex) / 2;
}

function getVisibleYearGroupIndices(
  yearGroups: CommitStatisticsYearGroup[],
  barCount: number,
  chartWidth: number
): Set<number> {
  const visibleIndices = new Set<number>();

  if (yearGroups.length === 0 || barCount === 0 || chartWidth === 0) {
    return visibleIndices;
  }

  const pixelsPerBar = chartWidth / barCount;

  yearGroups.forEach((group, index) => {
    const center = getGroupCenter(group);
    const groupWidthPx = (group.endIndex - group.startIndex + 1) * pixelsPerBar;

    if (groupWidthPx < MIN_PIXELS_PER_YEAR_LABEL) {
      return;
    }

    if (index > 0) {
      const previousCenter = getGroupCenter(yearGroups[index - 1]);
      if (
        (center - previousCenter) * pixelsPerBar <
        MIN_PIXELS_PER_YEAR_LABEL
      ) {
        return;
      }
    }

    if (index < yearGroups.length - 1) {
      const nextCenter = getGroupCenter(yearGroups[index + 1]);
      if ((nextCenter - center) * pixelsPerBar < MIN_PIXELS_PER_YEAR_LABEL) {
        return;
      }
    }

    visibleIndices.add(index);
  });

  return visibleIndices;
}

function getLegendRowCount(
  legendItemCount: number,
  chartWidth: number
): number {
  const itemsPerRow = Math.max(1, Math.floor((chartWidth - 40) / 120));
  return Math.ceil(Math.max(legendItemCount, 1) / itemsPerRow);
}

function getLegendAreaHeight(rowCount: number): number {
  return 12 + rowCount * 22;
}

function getAxisBottomMargin(
  hasYearGroups: boolean,
  showMonthLabels: boolean,
  hasAnyYearLabels: boolean
): number {
  if (!hasYearGroups) {
    return 60;
  }

  if (showMonthLabels && hasAnyYearLabels) {
    return 85;
  }

  if (showMonthLabels) {
    return 70;
  }

  if (hasAnyYearLabels) {
    return 58;
  }

  return 40;
}

function getBottomLayout(
  chartHeight: number,
  chartWidth: number,
  axisBottomMargin: number,
  showLegend: boolean,
  legendItemCount: number
): { marginBottom: number; legendY: number } {
  const topMargin = 20;
  const axisLegendGap = 10;

  if (!showLegend) {
    return { marginBottom: axisBottomMargin, legendY: 0 };
  }

  const legendRowCount = getLegendRowCount(legendItemCount, chartWidth);
  const legendAreaHeight = getLegendAreaHeight(legendRowCount);
  const marginBottom = axisBottomMargin + axisLegendGap + legendAreaHeight;
  const plotHeight = Math.max(chartHeight - topMargin - marginBottom, 1);
  const legendY = -(axisBottomMargin + axisLegendGap) / plotHeight;

  return { marginBottom, legendY };
}

function buildSingleSeriesData(
  chartData: CommitStatisticsChartData,
  barColor: string
): Plotly.Data[] {
  return [
    {
      type: 'bar',
      x: chartData.labels,
      y: chartData.values,
      marker: { color: barColor },
      customdata: chartData.hoverLabels ?? chartData.labels,
      hovertemplate: '%{customdata}<br>%{y} commits<extra></extra>',
    },
  ];
}

function buildAuthorSeriesData(
  chartData: CommitStatisticsChartData
): Plotly.Data[] {
  const hoverLabels = chartData.hoverLabels ?? chartData.labels;

  return (chartData.authorSeries ?? []).map((series) => ({
    type: 'bar' as const,
    name: series.label,
    x: chartData.labels,
    y: series.values,
    marker: { color: series.color },
    customdata: hoverLabels,
    hovertemplate:
      '%{customdata}<br>%{fullData.name}: %{y} commits<extra></extra>',
  }));
}

export function buildCommitStatisticsPlotlyFigure(
  chartData: CommitStatisticsChartData,
  chartWidth: number,
  chartHeight: number,
  barColor: string,
  colorByAuthor = false
): {
  data: Plotly.Data[];
  layout: Partial<Plotly.Layout>;
  config: Partial<Plotly.Config>;
} {
  const yearGroups = chartData.yearGroups ?? [];
  const hasYearGroups = yearGroups.length > 0;
  const barCount = chartData.values.length;
  const showMonthLabels =
    hasYearGroups && barCount * MIN_PIXELS_PER_MONTH_LABEL <= chartWidth;
  const visibleYearGroupIndices = hasYearGroups
    ? getVisibleYearGroupIndices(yearGroups, barCount, chartWidth)
    : new Set<number>();
  const hasAnyYearLabels = visibleYearGroupIndices.size > 0;
  const useAuthorSeries =
    colorByAuthor && (chartData.authorSeries?.length ?? 0) > 0;
  const showLegend = useAuthorSeries;
  const legendItemCount = chartData.authorSeries?.length ?? 0;
  const axisBottomMargin = getAxisBottomMargin(
    hasYearGroups,
    showMonthLabels,
    hasAnyYearLabels
  );
  const { marginBottom, legendY } = getBottomLayout(
    chartHeight,
    chartWidth,
    axisBottomMargin,
    showLegend,
    legendItemCount
  );

  const data = useAuthorSeries
    ? buildAuthorSeriesData(chartData)
    : buildSingleSeriesData(chartData, barColor);

  const yearAnnotations: Partial<Plotly.Annotations>[] = yearGroups.flatMap(
    (group, index) =>
      visibleYearGroupIndices.has(index)
        ? [
            {
              x: getGroupCenter(group),
              y: showMonthLabels ? -0.16 : -0.08,
              xref: 'x' as const,
              yref: 'paper' as const,
              text: group.year,
              showarrow: false,
              xanchor: 'center' as const,
              yanchor: 'top' as const,
              font: AXIS_LABEL_STYLE,
            },
          ]
        : []
  );

  const yearDividerShapes: Partial<Plotly.Shape>[] = hasYearGroups
    ? yearGroups.slice(1).map((group) => ({
        type: 'line',
        xref: 'x',
        yref: 'paper',
        x0: group.startIndex - 0.5,
        x1: group.startIndex - 0.5,
        y0: showMonthLabels ? -0.02 : -0.01,
        y1: showMonthLabels ? -0.22 : hasAnyYearLabels ? -0.14 : -0.04,
        line: { color: '#c8c8c8', width: 1 },
      }))
    : [];

  const layout: Partial<Plotly.Layout> = {
    hovermode: 'closest',
    dragmode: false,
    barmode: useAuthorSeries ? 'stack' : 'group',
    showlegend: showLegend,
    legend: showLegend
      ? {
          orientation: 'h',
          yanchor: 'top',
          y: legendY,
          xanchor: 'left',
          x: 0,
          font: AXIS_LABEL_STYLE,
        }
      : undefined,
    margin: {
      b: marginBottom,
      l: 50,
      pad: 5,
      t: 20,
      r: 20,
    },
    xaxis: {
      type: 'category',
      categoryorder: 'array',
      categoryarray: chartData.labels,
      ...(hasYearGroups && showMonthLabels
        ? {
            tickmode: 'array' as const,
            tickvals: chartData.labels,
            ticktext: chartData.monthLabels ?? chartData.labels,
            tickangle: -45,
            showticklabels: true,
          }
        : hasYearGroups
          ? { showticklabels: false }
          : {}),
      title: {
        text: hasYearGroups ? '' : chartData.xAxisTitle,
        font: AXIS_TITLE_STYLE,
      },
      tickfont: AXIS_LABEL_STYLE,
      automargin: !showLegend,
    },
    yaxis: {
      title: {
        text: chartData.yAxisTitle,
        font: AXIS_TITLE_STYLE,
      },
      tickfont: AXIS_LABEL_STYLE,
      rangemode: 'tozero',
    },
    annotations: yearAnnotations,
    shapes: yearDividerShapes,
  };

  const config: Partial<Plotly.Config> = {
    displayModeBar: false,
    responsive: true,
  };

  return { data, layout, config };
}
