import { useCommitTreeStateStore } from 'explorviz-frontend/src/stores/commit-tree-state';
import { useRenderingServiceStore } from 'explorviz-frontend/src/stores/rendering-service';
import { useShallow } from 'zustand/react/shallow';

export default function EvolutionRenderingButtons() {
  const commitTreeState = useCommitTreeStateStore(
    useShallow((state) => ({
      resetSelectedCommits: state.resetSelectedCommits,
    }))
  );

  const renderingService = useRenderingServiceStore(
    useShallow((state) => ({
      triggerRenderingForSelectedCommits:
        state.triggerRenderingForSelectedCommits,
    }))
  );

  const currentSelectedRepositoryName = useCommitTreeStateStore(
    (state) => state._currentSelectedRepositoryName
  );

  const selectedCommitsMap = useCommitTreeStateStore(
    (state) => state._selectedCommits
  );

  const unselectAllSelectedCommits = () => {
    commitTreeState.resetSelectedCommits();
    renderingService.triggerRenderingForSelectedCommits();
  };

  const currentRepoName = currentSelectedRepositoryName;
  const hasSelectedForCurrentRepo = !!selectedCommitsMap.get(currentRepoName);

  if (!currentRepoName || !hasSelectedForCurrentRepo) {
    return null;
  }

  return (
    <button
      type="button"
      className="btn btn-outline-dark commit-tree-unselect-button"
      onClick={() => unselectAllSelectedCommits()}
      title="Unselect all commits"
    >
      Unselect Commits
    </button>
  );
}
