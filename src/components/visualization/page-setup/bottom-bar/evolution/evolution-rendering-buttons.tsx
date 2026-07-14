import { useCommitTreeStateStore } from 'explorviz-frontend/src/stores/commit-tree-state';
import { useRenderingServiceStore } from 'explorviz-frontend/src/stores/rendering-service';
import { useVisibilityServiceStore } from 'explorviz-frontend/src/stores/visibility-service';
import {
  branchHasAnalyzedCommits,
  buildNewestCommitSelectionMap,
} from 'explorviz-frontend/src/utils/evolution-data-helpers';
import { RepoNameCommitTreeMap } from 'explorviz-frontend/src/utils/evolution-schemes/evolution-data';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
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
      selectedCommits: state._selectedCommits,
      currentSelectedRepositoryName: state._currentSelectedRepositoryName,
    }))
  );

  const renderingService = useRenderingServiceStore(
    useShallow((state) => ({
      triggerRenderingForSelectedCommits:
        state.triggerRenderingForSelectedCommits,
      rerenderEvolutionLandscapeWithCurrentFilter:
        state.rerenderEvolutionLandscapeWithCurrentFilter,
    }))
  );

  const { removeUnchangedFromLayout, applyEvolutionModeRenderingConfiguration } =
    useVisibilityServiceStore(
      useShallow((state) => ({
        removeUnchangedFromLayout:
          state._evolutionModeRenderingConfiguration.removeUnchangedFromLayout,
        applyEvolutionModeRenderingConfiguration:
          state.applyEvolutionModeRenderingConfiguration,
      }))
    );

  const hasSelectableCommits = Array.from(repoNameCommitTreeMap.values()).some(
    (tree) => tree.branches.some((branch) => branchHasAnalyzedCommits(branch))
  );

  const isDiffMode =
    (commitTreeState.selectedCommits.get(
      commitTreeState.currentSelectedRepositoryName
    )?.length || 0) === 2;

  const unselectAllSelectedCommits = () => {
    commitTreeState.resetSelectedCommits();
    renderingService.triggerRenderingForSelectedCommits();
  };

  const selectNewestCommitsEveryRepo = () => {
    const newestPerRepo = buildNewestCommitSelectionMap(
      repoNameCommitTreeMap,
      useCommitTreeStateStore.getState().getXAxisPlacement()
    );
    commitTreeState.setSelectedCommits(newestPerRepo);
    renderingService.triggerRenderingForSelectedCommits();
  };

  const setRemoveUnchangedFromLayout = (enabled: boolean) => {
    const currentConfig = useVisibilityServiceStore
      .getState()
      .getCloneOfEvolutionModeRenderingConfiguration();

    if (currentConfig.removeUnchangedFromLayout === enabled) {
      return;
    }

    applyEvolutionModeRenderingConfiguration({
      ...currentConfig,
      removeUnchangedFromLayout: enabled,
    });
    renderingService.rerenderEvolutionLandscapeWithCurrentFilter();
  };

  return (
    <div className="commit-tree-evolution-actions">
      {isDiffMode && (
        <div className="commit-tree-changed-buildings-toggle">
          <Form.Check
            type="switch"
            id="commit-tree-only-changed-buildings"
            className="commit-tree-changed-buildings-switch"
            label="Only changed buildings"
            checked={removeUnchangedFromLayout}
            onChange={(event) =>
              setRemoveUnchangedFromLayout(event.target.checked)
            }
            title="Remove unchanged buildings from the layout and show only added, modified, and deleted buildings"
          />
        </div>
      )}
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
