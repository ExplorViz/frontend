import type { MetricRange } from 'explorviz-frontend/src/stores/entity-filtering-store';
import {
  MetricSettingId,
  MetricSettings,
  SettingLevel,
  ToggleableMetric,
  VisualizationSettings,
} from 'explorviz-frontend/src/utils/settings/settings-schemas';

/** Metrics that can be enabled and disabled, in the order in which they are listed. */
const METRIC_DESCRIPTIONS: Record<ToggleableMetric, string> = {
  size: 'Size of the file.',
  lineCount: 'Number of lines.',
  sloc: 'Source lines of code, i.e. without comments and blank lines.',
  cloc: 'Number of comment lines.',
  importCount: 'Number of imports.',
  classCount: 'Number of classes.',
  functionCount: 'Number of functions.',
  variableCount: 'Number of variables.',
  cyclomaticComplexity: 'Sum of the cyclomatic complexities of the functions.',
  averageCyclomaticComplexity: 'Average cyclomatic complexity per function.',
  npathComplexity: 'Largest number of acyclic execution paths of a function.',
  nestedBlockDepth: 'Deepest nesting of control structures.',
  lcom4: 'Lack of cohesion of methods: largest number of unrelated groups of methods in a class.',
  unmaintainabilityIndex: 'Inverse of the maintainability index, from 0 (maintainable) to 100.',
  commitCount: 'Social metric: number of commits.',
  commitActivity: 'Social metric: commit activity.',
  coreContributorActivity: 'Social metric: activity of the core contributors.',
  knowledgeSilo: 'Social metric: share of the most active contributor.',
  issueActivity: 'Social metric: issue activity.',
  reviewFriction: 'Social metric: review friction.',
  knowledgeStaleness: 'Social metric: time since the last commit.',
  abandonedKnowledgeSilo: 'Social metric: knowledge silos that have been abandoned.',
  fileCount: 'Number of files of a commit, only available in the commit chart.',
};

export const TOGGLEABLE_METRICS = Object.keys(METRIC_DESCRIPTIONS) as ToggleableMetric[];

const METRICS_ENABLED_BY_DEFAULT: ReadonlySet<ToggleableMetric> = new Set([
  'cloc',
  'cyclomaticComplexity',
  'lineCount',
  'size',
  'sloc',
  'unmaintainabilityIndex',
  'commitCount',
  'fileCount',
]);

export function getMetricSettingId(metric: ToggleableMetric): MetricSettingId {
  return `metric${metric.charAt(0).toUpperCase()}${metric.slice(1)}` as MetricSettingId;
}

export const DEFAULT_METRIC_SETTINGS = Object.fromEntries(
  TOGGLEABLE_METRICS.map((metric) => [
    getMetricSettingId(metric),
    {
      level: SettingLevel.DEFAULT,
      value: METRICS_ENABLED_BY_DEFAULT.has(metric),
      group: 'Metrics',
      displayName: metric,
      description: METRIC_DESCRIPTIONS[metric],
      isFlagSetting: true,
    },
  ])
) as MetricSettings;

/** Metrics that the user has disabled. Metrics without a setting, e.g. of other analyses, are never disabled. */
export function getDisabledMetrics(settings: VisualizationSettings): ReadonlySet<string> {
  return new Set(TOGGLEABLE_METRICS.filter((metric) => settings[getMetricSettingId(metric)]?.value === false));
}

/**
 * Metrics to choose from. A disabled metric stays listed while it is selected, e.g. by a Snapshot
 * or the Host of a Room.
 */
export function getSelectableMetrics<T extends string>(
  metrics: readonly T[],
  disabledMetrics: ReadonlySet<string>,
  selectedMetric: string
): T[] {
  return metrics.filter((metric) => metric === selectedMetric || !disabledMetrics.has(metric));
}

/** Ranges start at zero and are open at the top unless they exclude buildings. */
export function isActiveMetricRange(range: MetricRange | undefined): boolean {
  return range !== undefined && (range.min > 0 || Number.isFinite(range.max));
}
