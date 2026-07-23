import { BuildingMetricIds, useHeatmapStore } from 'explorviz-frontend/src/stores/heatmap/heatmap-store';
import HelpTooltip from 'explorviz-frontend/src/components/help-tooltip';
import { useShallow } from 'zustand/react/shallow';
import { useState } from 'react';


export type Applicability = 'yes' | 'auto' | 'no';

export interface MetricNote {
  contributorSelection: Applicability;
  timeSelection: Applicability;
  normalization: Applicability;
  note?: string;
}

export const METRIC_NOTES: Partial<Record<BuildingMetricIds, MetricNote>> = {
  // [BuildingMetricIds.commitCount]: {
  //   contributorSelection: 'yes',
  //   timeSelection: 'yes',
  //   normalization: 'no',
  //   note: 'CommitCount: Normalization configuration does not apply to this metric. It is designed to contain real values to be displayed in the File popup.'
  // },
  // [BuildingMetricIds.knowledgeStaleness]: {
  //   contributorSelection: 'yes',
  //   timeSelection: 'yes',
  //   normalization: 'no',
  //   note: 'KnowledgeStaleness: Normalization configuration does not apply to this metric.'
  // },
  [BuildingMetricIds.knowledgeSilo]: {
    contributorSelection: 'no',
    timeSelection: 'yes',
    normalization: 'no',
    note: 'KnowledgeSilo: Contributor selection does not apply for this metric, since we measure the single most active contributor per file. That is by design.'
  },
  [BuildingMetricIds.coreContributorActivity]: {
    contributorSelection: 'no',
    timeSelection: 'yes',
    normalization: 'no',
    note: 'CoreContributorActivity: Contributor selection does not apply to this metric. Uses the auto detected core developer team.'
  },
  [BuildingMetricIds.abandonedKnowledgeSilo]: {
    contributorSelection: 'no',
    timeSelection: 'yes',
    normalization: 'no',
    note: 'AbandonedKnowledgeSilo: Contributor selection does not apply. Calculated using knowledgeSilo metric which does not allow for selection by design.'
  },
  [BuildingMetricIds.reviewFriction]: {
    contributorSelection: 'no',
    timeSelection: 'no',
    normalization: 'yes',
    note: 'ReviewFriction: Contributor selection does not apply.'
  },
  [BuildingMetricIds.bugDensity]: {
    contributorSelection: 'no',
    timeSelection: 'no',
    normalization: 'yes',
    note: 'BugDensity: Contributor selection does not apply.'
  },
}

export default function MetricNotes() {
const metricName = useHeatmapStore(useShallow((s) => s.selectedBuildingMetric.name));
  const [showAll, setShowAll] = useState(false);
  const note = METRIC_NOTES[metricName]?.note;

  if (!note) return null;
  return (
    <div className="social-metrics-note text-muted small">
      {note && (
        <div className="social-metrics-note-line">
          <HelpTooltip title="Some metrics ignore certain selections by design." placement="top" /> {note}
        </div>
      )}
  </div>
  );
}
