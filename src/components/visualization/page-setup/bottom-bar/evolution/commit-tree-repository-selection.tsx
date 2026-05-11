import { useCommitTreeStateStore } from 'explorviz-frontend/src/stores/commit-tree-state';
import { RepoNameCommitTreeMap } from 'explorviz-frontend/src/utils/evolution-schemes/evolution-data';
import { useEffect } from 'react';
import Button from 'react-bootstrap/Button';

export default function CommitTreeRepositorySelection({
  repoNameCommitTreeMap,
  selectedRepoName,
}: {
  repoNameCommitTreeMap: RepoNameCommitTreeMap;
  selectedRepoName: string;
}) {
  useEffect(() => {
    const repoNames = Array.from(repoNameCommitTreeMap.keys());

    if (repoNames.length === 0) {
      return;
    }

    if (!selectedRepoName || !repoNames.includes(selectedRepoName)) {
      useCommitTreeStateStore
        .getState()
        .setCurrentSelectedRepositoryName(repoNames[0]);
    }
  }, [repoNameCommitTreeMap, selectedRepoName]);

  if (repoNameCommitTreeMap!.size > 0) {
    const repoNames = Array.from(repoNameCommitTreeMap.keys());

    return (
      <div className="w-100 d-flex align-items-center gap-2 px-2 repository-selection-container">
        <span className="h5 mb-0 py-2 repository-label flex-shrink-0">
          Repositories:
        </span>
        <div className="d-flex flex-nowrap align-items-center gap-2 overflow-x-auto repository-buttons-container flex-grow-1 min-w-0">
          {repoNames.map((repoName) => (
            <Button
              key={repoName}
              variant={
                selectedRepoName === repoName ? 'primary' : 'outline-secondary'
              }
              size="sm"
              className="flex-shrink-0"
              onClick={() =>
                useCommitTreeStateStore
                  .getState()
                  .setCurrentSelectedRepositoryName(repoName)
              }
            >
              {repoName}
            </Button>
          ))}
        </div>
      </div>
    );
  } else {
    return (
      <div className="timeline-no-timestamps-outer">
        <div className="timeline-no-timestamps-inner">
          No data on commits is available
        </div>
      </div>
    );
  }
}
