import { useCommitTreeStateStore } from 'explorviz-frontend/src/stores/commit-tree-state';
import { useRenderingServiceStore } from 'explorviz-frontend/src/stores/rendering-service';
import { buildNewestCommitSelectionMap } from 'explorviz-frontend/src/utils/evolution-data-helpers';
import { RepoNameCommitTreeMap } from 'explorviz-frontend/src/utils/evolution-schemes/evolution-data';
import Button from 'react-bootstrap/Button';
import { useShallow } from 'zustand/react/shallow';

export default function EvolutionRenderingButtons({
  repoNameCommitTreeMap,
}: {
  repoNameCommitTreeMap: RepoNameCommitTreeMap;
}) {
  const commitTreeState = useCommitTreeStateStore(
    useShallow((state) => ({
      resetSelectedCommits: state.resetSelectedCommits,
      setSelectedCommits: state.setSelectedCommits,
    }))
  );

  const renderingService = useRenderingServiceStore(
    useShallow((state) => ({
      triggerRenderingForSelectedCommits:
        state.triggerRenderingForSelectedCommits,
    }))
  );

  const hasSelectableCommits = Array.from(repoNameCommitTreeMap.values()).some(
    (tree) => tree.branches.some((branch) => branch.commits.length > 0)
  );

  const unselectAllSelectedCommits = () => {
    commitTreeState.resetSelectedCommits();
    renderingService.triggerRenderingForSelectedCommits();
  };

  const selectNewestCommitsEveryRepo = () => {
    const newestPerRepo = buildNewestCommitSelectionMap(repoNameCommitTreeMap);
    commitTreeState.setSelectedCommits(newestPerRepo);
    renderingService.triggerRenderingForSelectedCommits();
  };

  return (
    <div className="commit-tree-evolution-actions">
      <Button
        type="button"
        variant="outline-secondary"
        size="sm"
        onClick={() => unselectAllSelectedCommits()}
        title="Unselect all commits"
      >
        Unselect Commits
      </Button>
      <Button
        type="button"
        variant="outline-secondary"
        size="sm"
        disabled={!hasSelectableCommits}
        onClick={() => selectNewestCommitsEveryRepo()}
        title={
          !hasSelectableCommits
            ? 'No commit data available'
            : 'Clear selections and pick the newest commit per repository'
        }
      >
        Select Newest Commits
      </Button>
    </div>
  );
}
