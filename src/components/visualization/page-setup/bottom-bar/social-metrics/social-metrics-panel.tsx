import { useSocialMetricsStore } from 'explorviz-frontend/src/stores/social-metrics';
import ContributorSelection from 'explorviz-frontend/src/components/visualization/page-setup/bottom-bar/social-metrics/contributor-selection';
import NormalizationSelection from 'explorviz-frontend/src/components/visualization/page-setup/bottom-bar/social-metrics/normalization-selection';
import { useRef, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';

export default function SocialMetricsPanel() {
  const { contributors, selectedContributorIds, selectedTimeRange, normalization, updateSocialMetrics } =
    useSocialMetricsStore(
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
    const t = setTimeout(() => { updateSocialMetrics(); }, 300);
    return () => clearTimeout(t);
  }, [selectedContributorIds, selectedTimeRange, normalization, updateSocialMetrics]);

  if (contributors.length === 0) {
    return <div className="social-metrics-panel"> contributor data missing</div>;
  }

  return (
    <div className="social-metrics-panel">
      <div className="social-metrics-selection-row">
        <ContributorSelection />
        <NormalizationSelection />
      </div>
    </div>
  );
}
