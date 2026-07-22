import BuildingComparisonFilterDropdown from 'explorviz-frontend/src/components/visualization/page-setup/bottom-bar/evolution/building-comparison-filter-dropdown';
import { useCommitTreeStateStore } from 'explorviz-frontend/src/stores/commit-tree-state';
import { useRenderingServiceStore } from 'explorviz-frontend/src/stores/rendering-service';
import { useVisibilityServiceStore } from 'explorviz-frontend/src/stores/visibility-service';
import { BuildingComparisonVisibility } from 'explorviz-frontend/src/utils/city-rendering/building-comparison-visibility';
import {
  branchHasAnalyzedCommits,
  buildNewestCommitSelectionMap,
} from 'explorviz-frontend/src/utils/evolution-data-helpers';
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

  const {
    buildingComparisonVisibility,
    applyEvolutionModeRenderingConfiguration,
  } = useVisibilityServiceStore(
    useShallow((state) => ({
      buildingComparisonVisibility:
        state._evolutionModeRenderingConfiguration.buildingComparisonVisibility,
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

  const setBuildingComparisonVisibility = (
    visibility: BuildingComparisonVisibility
  ) => {
    const currentConfig = useVisibilityServiceStore
      .getState()
      .getCloneOfEvolutionModeRenderingConfiguration();

    const hasChanged = (
      Object.keys(visibility) as (keyof BuildingComparisonVisibility)[]
    ).some(
      (key) =>
        currentConfig.buildingComparisonVisibility[key] !== visibility[key]
    );

    if (!hasChanged) {
      return;
    }

    applyEvolutionModeRenderingConfiguration({
      ...currentConfig,
      buildingComparisonVisibility: visibility,
    });
    renderingService.rerenderEvolutionLandscapeWithCurrentFilter();
  };

  return (
    <div className="commit-tree-evolution-actions">
      <BuildingComparisonFilterDropdown
        visibility={buildingComparisonVisibility}
        disabled={!isDiffMode}
        onVisibilityChange={setBuildingComparisonVisibility}
      />
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
