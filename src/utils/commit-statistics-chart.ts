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

function getBottomMargin(
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

export function buildCommitStatisticsPlotlyFigure(
  chartData: CommitStatisticsChartData,
  chartWidth: number,
  barColor: string
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

  const data: Plotly.Data[] = [
    {
      type: 'bar',
      x: chartData.labels,
      y: chartData.values,
      marker: { color: barColor },
      customdata: chartData.hoverLabels ?? chartData.labels,
      hovertemplate: '%{customdata}<br>%{y} commits<extra></extra>',
    },
  ];

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
    margin: {
      b: getBottomMargin(hasYearGroups, showMonthLabels, hasAnyYearLabels),
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
      automargin: true,
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
