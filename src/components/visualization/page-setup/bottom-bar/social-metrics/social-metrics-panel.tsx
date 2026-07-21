import { useSocialMetricsStore } from 'explorviz-frontend/src/stores/social-metrics';
import ContributorSelection from 'explorviz-frontend/src/components/visualization/page-setup/bottom-bar/social-metrics/contributor-selection';
import { ContributorDto } from 'explorviz-frontend/src/stores/evolution-data-fetch-service';
import { SyncIcon } from '@primer/octicons-react';
import { useState } from 'react';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { useShallow } from 'zustand/react/shallow';

const displayName = (c: ContributorDto) : string => c.githubLogin ?? c.gitUsername ?? c.email ?? `#${c.contributorId}`;

export default function SocialMetricsPanel() {
  const { contributors, selectedContributorIds, setSelectedContributorIds, updateSocialMetrics } = useSocialMetricsStore(
    useShallow((state) => ({
      contributors: state.contributors,
      selectedContributorIds: state.selectedContributorIds,
      setSelectedContributorIds: state.setSelectedContributorIds,
      updateSocialMetrics: state.updateSocialMetrics,
    }))
  );
  const [isUpdating, setIsUpdating] = useState(false);

  const onUpdate = async () => {
    setIsUpdating(true);
    try { await updateSocialMetrics(); } finally { setIsUpdating(false); }
  };

  if (contributors.length === 0) {
    return <div className="social-metrics-panel"> contributor data missing</div>;
  }

  return (
    <div className="social-metrics-panel">
      <ContributorSelection />
      <Button variant="outline-secondary" size="sm" disabled={isUpdating || selectedContributorIds.size === 0}
      onClick={onUpdate}>
        <SyncIcon size="small" className={isUpdating ? 'spinning' : ''} /> Update
      </Button>
    </div>
  )
}
