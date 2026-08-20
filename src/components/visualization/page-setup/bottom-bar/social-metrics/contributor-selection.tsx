import HelpTooltip from 'explorviz-frontend/src/components/help-tooltip';
import { ContributorDto } from 'explorviz-frontend/src/stores/evolution-data-fetch-service';
import { useSocialMetricsStore } from 'explorviz-frontend/src/stores/social-metrics';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import { useShallow } from 'zustand/react/shallow';

const displayName = (c: ContributorDto): string =>
  c.githubLogin || c.gitUsername || c.email || `#${c.contributorId}`;

export default function ContributorSelection() {
  const { contributors, selectedContributorIds, setSelectedContributorIds } =
    useSocialMetricsStore(
      useShallow((state) => ({
        contributors: state.contributors,
        selectedContributorIds: state.selectedContributorIds,
        setSelectedContributorIds: state.setSelectedContributorIds,
      }))
    );

  const toggle = (id: number) => {
    const next = new Set(selectedContributorIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedContributorIds(next);
  };

  const getIds = (list: ContributorDto[]) =>
    new Set(list.map((c) => c.contributorId));

  const isBot = (c: ContributorDto): boolean => {
    const name = (
      c.githubLogin ??
      c.gitUsername ??
      c.email ??
      ''
    ).toLowerCase();
    return name.includes('[bot]');
  };

  const selectPreset = (preset: 'all' | 'none' | 'core' | 'edge' | 'human') => {
    switch (preset) {
      case 'all':
        return setSelectedContributorIds(getIds(contributors));
      case 'none':
        return setSelectedContributorIds(new Set());
      case 'core':
        return setSelectedContributorIds(
          getIds(contributors.filter((c) => c.isCore))
        );
      case 'edge':
        return setSelectedContributorIds(
          getIds(contributors.filter((c) => !c.isCore))
        );
      case 'human':
        return setSelectedContributorIds(
          getIds(contributors.filter((c) => !isBot(c)))
        );
    }
  };

  return (
    <div className="social-metrics-control-block">
      <span className="social-metrics-control-label">
        Presets
        <HelpTooltip
          title="Select a contributor Preset to be applied to the selection list. Hover the preset buttons for more information."
          placement="top"
        />
      </span>
      <div className="social-metrics-preset-group">
        <Button
          size="sm"
          variant="outline-secondary"
          title="select everyone"
          onClick={() => selectPreset('all')}
        >
          All
        </Button>
        <Button
          size="sm"
          variant="outline-secondary"
          title="clear selection"
          onClick={() => selectPreset('none')}
        >
          None
        </Button>
        <Button
          size="sm"
          variant="outline-secondary"
          title="Top contributors making >= 80% of all commits"
          onClick={() => selectPreset('core')}
        >
          Core
        </Button>
        <Button
          size="sm"
          variant="outline-secondary"
          title="Everyone outside of core"
          onClick={() => selectPreset('edge')}
        >
          Edge
        </Button>
        <Button
          size="sm"
          variant="outline-secondary"
          title="Excludes any names containing “BOT”"
          onClick={() => selectPreset('human')}
        >
          Human
        </Button>
      </div>
      <div className="social-metrics-contributor-list">
        {contributors.map((c) => (
          <Form.Check
            key={c.contributorId}
            type="checkbox"
            id={`social-contributor-${c.contributorId}`}
            checked={selectedContributorIds.has(c.contributorId)}
            onChange={() => toggle(c.contributorId)}
            label={
              <span className="social-metrics-contributor-row">
                <img
                  className="social-metrics-avatar"
                  src={c.avatarUrl || '/images/avatar-default.png'}
                  alt=""
                  loading="lazy"
                />
                <span className="social-metrics-contributor-name">
                  {displayName(c)}
                </span>
                <span className="social-metrics-commit-count">
                  {c.commitCount}
                </span>
                {c.isCore && (
                  <span className="social-metrics-core-badge">core</span>
                )}
              </span>
            }
          />
        ))}
      </div>
    </div>
  );
}
