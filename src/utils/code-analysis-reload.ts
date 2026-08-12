import { useCommitTreeStateStore } from 'explorviz-frontend/src/stores/commit-tree-state';
import { useRenderingServiceStore } from 'explorviz-frontend/src/stores/rendering-service';
import { useEvolutionDataRepositoryStore } from 'explorviz-frontend/src/stores/repos/evolution-data-repository';
import { useTimestampPollingStore } from 'explorviz-frontend/src/stores/timestamp-polling';
import { buildNewestCommitSelectionMap } from 'explorviz-frontend/src/utils/evolution-data-helpers';

/**
 * Reloads the visualization after code analysis completes.
 * Code analysis stores commit-scoped structure data, so we refresh commit trees
 * and render the newest analyzed commit instead of using runtime timestamps.
 */
export async function reloadLandscapeAfterCodeAnalysis(): Promise<void> {
  const refreshed = await useEvolutionDataRepositoryStore
    .getState()
    .fetchAndStoreRepositoryCommitTrees();

  if (!refreshed) {
    await useTimestampPollingStore.getState().manuallyPollTimestamps();
    return;
  }

  const repoNameCommitTreeMap =
    useEvolutionDataRepositoryStore.getState()._repoNameCommitTreeMap;

  const selectedCommits = buildNewestCommitSelectionMap(
    repoNameCommitTreeMap,
    useCommitTreeStateStore.getState().getXAxisPlacement()
  );

  if (selectedCommits.size === 0) {
    await useTimestampPollingStore.getState().manuallyPollTimestamps();
    return;
  }

  const firstRepoName = selectedCommits.keys().next().value!;
  useCommitTreeStateStore
    .getState()
    .setCurrentSelectedRepositoryName(firstRepoName);
  useCommitTreeStateStore.getState().setSelectedCommits(selectedCommits);
  await useRenderingServiceStore
    .getState()
    .triggerRenderingForSelectedCommits();
}
