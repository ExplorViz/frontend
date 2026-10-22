import ContributorSelection from 'explorviz-frontend/src/components/visualization/page-setup/bottom-bar/social-metrics/contributor-selection';
import MetricNotes from 'explorviz-frontend/src/components/visualization/page-setup/bottom-bar/social-metrics/metric-notes';
import MetricShortcuts from 'explorviz-frontend/src/components/visualization/page-setup/bottom-bar/social-metrics/metric-shortcuts';
import NormalizationSelection from 'explorviz-frontend/src/components/visualization/page-setup/bottom-bar/social-metrics/normalization-selection';
import TimeRangeSelection from 'explorviz-frontend/src/components/visualization/page-setup/bottom-bar/social-metrics/timeframe-selection';
import { useSocialMetricsStore } from 'explorviz-frontend/src/stores/social-metrics';
import { useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';

export default function SocialMetricsPanel() {
  const {
    contributors,
    selectedContributorIds,
    selectedTimeRange,
    normalization,
    updateSocialMetrics,
  } = useSocialMetricsStore(
    useShallow((state) => ({
      contributors: state.contributors,
      selectedContributorIds: state.selectedContributorIds,
      selectedTimeRange: state.selectedTimeRange,
      normalization: state.normalization,
      updateSocialMetrics: state.updateSocialMetrics,
    }))
  );

  const didMountRef = useRef(false);
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    if (selectedContributorIds.size === 0) return;
    const t = setTimeout(() => {
      updateSocialMetrics();
    }, 300);
    return () => clearTimeout(t);
  }, [
    selectedContributorIds,
    selectedTimeRange,
    normalization,
    updateSocialMetrics,
  ]);

  if (contributors.length === 0) {
    return (
      <div className="timeline-no-timestamps-outer">
        <div className="timeline-no-timestamps-inner">
          No contributor data is available
        </div>
      </div>
    );
  }

  return (
    <div className="social-metrics-panel">
      <div className="social-metrics-selection-row">
        <ContributorSelection />
        <NormalizationSelection />
        <TimeRangeSelection />
        <MetricShortcuts />
      </div>
      <MetricNotes />
    </div>
  );
}
